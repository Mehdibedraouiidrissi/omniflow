// ============================================================================
// Omniflow Worker - Workflow Execution Engine
// Queue: 'workflow'
// CORE ENGINE: Processes workflow runs step-by-step
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('workflow-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface WorkflowJobData {
  tenantId: string;
  workflowRunId: string;
  stepIndex: number;
}

// ---------------------------------------------------------------------------
// Step definition shape (stored in WorkflowVersion.steps JSON)
// ---------------------------------------------------------------------------

interface StepDefinition {
  type: string;
  config: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createWorkflowWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  // Queues for sub-jobs (email, sms, webhook, workflow self-reference for delays)
  const emailQueue = new Queue('email', { connection });
  const smsQueue = new Queue('sms', { connection });
  const webhookDeliveryQueue = new Queue('webhook-delivery', { connection });
  const workflowQueue = new Queue('workflow', { connection });

  const worker = new Worker<WorkflowJobData>(
    'workflow',
    async (job: Job<WorkflowJobData>) => {
      const { tenantId, workflowRunId, stepIndex } = job.data;

      log.info({ jobId: job.id, workflowRunId, stepIndex, tenantId }, 'Processing workflow step');

      // ---- 1. Load WorkflowRun ----
      const run = await prisma.workflowRun.findUnique({
        where: { id: workflowRunId },
        include: { contact: true },
      });

      if (!run) {
        log.error({ workflowRunId }, 'Workflow run not found');
        return { status: 'error', reason: 'run_not_found' };
      }

      if (run.status === 'CANCELLED' || run.status === 'FAILED' || run.status === 'COMPLETED') {
        log.info({ workflowRunId, status: run.status }, 'Workflow run is no longer active, skipping');
        return { status: 'skipped', reason: run.status };
      }

      // ---- 2. Load WorkflowVersion to get step definitions ----
      const version = await prisma.workflowVersion.findUnique({
        where: { id: run.workflowVersionId },
      });

      if (!version) {
        log.error({ workflowVersionId: run.workflowVersionId }, 'Workflow version not found');
        await failRun(prisma, workflowRunId, 'Workflow version not found');
        return { status: 'error', reason: 'version_not_found' };
      }

      const steps = version.steps as StepDefinition[];
      if (!Array.isArray(steps) || stepIndex >= steps.length) {
        // No more steps -- complete the run
        await completeRun(prisma, workflowRunId);
        log.info({ workflowRunId }, 'Workflow run completed (no more steps)');
        return { status: 'completed' };
      }

      const stepDef = steps[stepIndex];

      // ---- 3. Create WorkflowStep record ----
      const stepRecord = await prisma.workflowStep.create({
        data: {
          workflowRunId,
          tenantId,
          stepIndex,
          stepType: stepDef.type as any,
          config: stepDef.config || {},
          status: 'RUNNING',
          startedAt: new Date(),
        },
      });

      // ---- 4. Execute step based on type ----
      try {
        const result = await executeStep(
          prisma,
          stepDef,
          run,
          tenantId,
          emailQueue,
          smsQueue,
          webhookDeliveryQueue,
          workflowQueue,
          stepIndex,
        );

        // ---- 5. Mark step completed ----
        await prisma.workflowStep.update({
          where: { id: stepRecord.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            result: result as any,
          },
        });

        // ---- 6. Advance to next step (unless step type handles its own scheduling) ----
        if (stepDef.type !== 'WAIT') {
          await advanceToNextStep(prisma, workflowQueue, workflowRunId, tenantId, stepIndex, steps.length);
        }

        return { status: 'step_completed', stepIndex, stepType: stepDef.type };
      } catch (err) {
        const error = err as Error;
        log.error({ workflowRunId, stepIndex, error: error.message }, 'Workflow step execution failed');

        await prisma.workflowStep.update({
          where: { id: stepRecord.id },
          data: {
            status: 'FAILED',
            error: error.message,
          },
        });

        // Fail the entire run on step failure
        await failRun(prisma, workflowRunId, `Step ${stepIndex} failed: ${error.message}`);

        throw error;
      }
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 2000 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message, attempt: job?.attemptsMade },
      'Workflow job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Workflow worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Step execution dispatcher
// ---------------------------------------------------------------------------

async function executeStep(
  prisma: PrismaClient,
  stepDef: StepDefinition,
  run: any,
  tenantId: string,
  emailQueue: Queue,
  smsQueue: Queue,
  webhookDeliveryQueue: Queue,
  workflowQueue: Queue,
  stepIndex: number,
): Promise<Record<string, unknown>> {
  const stepConfig = stepDef.config || {};
  const contact = run.contact;

  switch (stepDef.type) {
    // ------------------------------------------------------------------
    case 'SEND_EMAIL': {
      const emailData = {
        tenantId,
        to: contact.email || '',
        subject: (stepConfig.subject as string) || 'Notification',
        html: (stepConfig.html as string) || '',
        text: (stepConfig.text as string) || undefined,
        from: stepConfig.from as string | undefined,
        replyTo: stepConfig.replyTo as string | undefined,
        templateId: stepConfig.templateId as string | undefined,
        variables: {
          contactFirstName: contact.firstName,
          contactLastName: contact.lastName,
          contactEmail: contact.email,
          contactPhone: contact.phone,
          contactCompany: contact.companyName,
          ...(stepConfig.variables as Record<string, unknown> || {}),
        },
      };

      if (!emailData.to) {
        return { skipped: true, reason: 'Contact has no email address' };
      }

      await emailQueue.add('workflow-email', emailData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      return { queued: 'email', to: emailData.to };
    }

    // ------------------------------------------------------------------
    case 'SEND_SMS': {
      const smsData = {
        tenantId,
        to: contact.phone || '',
        body: (stepConfig.body as string) || '',
        from: stepConfig.from as string | undefined,
      };

      if (!smsData.to) {
        return { skipped: true, reason: 'Contact has no phone number' };
      }

      await smsQueue.add('workflow-sms', smsData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      });

      return { queued: 'sms', to: smsData.to };
    }

    // ------------------------------------------------------------------
    case 'WAIT': {
      const delayMs = calculateWaitDelay(stepConfig);

      log.info({ workflowRunId: run.id, delayMs, stepIndex }, 'Scheduling delayed next step');

      // Update run status to WAITING
      await prisma.workflowRun.update({
        where: { id: run.id },
        data: { status: 'WAITING' },
      });

      // Schedule the next step after the delay
      await workflowQueue.add(
        'workflow-continue',
        {
          tenantId,
          workflowRunId: run.id,
          stepIndex: stepIndex + 1,
        },
        { delay: delayMs },
      );

      return { waited: true, delayMs };
    }

    // ------------------------------------------------------------------
    case 'IF_ELSE': {
      const field = stepConfig.field as string;
      const operator = stepConfig.operator as string;
      const value = stepConfig.value as unknown;

      const contactData: Record<string, unknown> = {
        email: contact.email,
        phone: contact.phone,
        firstName: contact.firstName,
        lastName: contact.lastName,
        companyName: contact.companyName,
        city: contact.city,
        state: contact.state,
        country: contact.country,
        source: contact.source,
        score: contact.score,
        status: contact.status,
        ...(contact.customFields as Record<string, unknown> || {}),
      };

      const fieldValue = contactData[field];
      const conditionMet = evaluateCondition(fieldValue, operator, value);

      // The IF_ELSE step should have trueBranch and falseBranch step indices
      const nextStepIndex = conditionMet
        ? (stepConfig.trueBranch as number | undefined) ?? stepIndex + 1
        : (stepConfig.falseBranch as number | undefined) ?? stepIndex + 1;

      // Schedule the chosen branch
      await workflowQueue.add('workflow-branch', {
        tenantId,
        workflowRunId: run.id,
        stepIndex: nextStepIndex,
      });

      return { conditionMet, field, operator, nextStepIndex };
    }

    // ------------------------------------------------------------------
    case 'ADD_TAG': {
      const tagName = stepConfig.tagName as string;
      if (!tagName) return { skipped: true, reason: 'No tag name specified' };

      // Find or create the tag
      let tag = await prisma.tag.findFirst({
        where: { tenantId, name: tagName },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: { tenantId, name: tagName },
        });
      }

      // Add tag to contact (ignore if already exists)
      await prisma.contactTag.create({
        data: {
          contactId: contact.id,
          tagId: tag.id,
          tenantId,
        },
      }).catch(() => {
        // Unique constraint -- tag already assigned
      });

      return { tagged: true, tagName };
    }

    // ------------------------------------------------------------------
    case 'REMOVE_TAG': {
      const tagName = stepConfig.tagName as string;
      if (!tagName) return { skipped: true, reason: 'No tag name specified' };

      const tag = await prisma.tag.findFirst({
        where: { tenantId, name: tagName },
      });

      if (tag) {
        await prisma.contactTag.deleteMany({
          where: { contactId: contact.id, tagId: tag.id },
        });
      }

      return { removedTag: true, tagName };
    }

    // ------------------------------------------------------------------
    case 'CREATE_TASK': {
      const task = await prisma.task.create({
        data: {
          tenantId,
          title: (stepConfig.title as string) || `Task for ${contact.firstName || 'Contact'}`,
          description: (stepConfig.description as string) || undefined,
          status: 'TODO',
          priority: (stepConfig.priority as any) || 'MEDIUM',
          assigneeId: (stepConfig.assigneeId as string) || undefined,
          contactId: contact.id,
          createdById: (stepConfig.createdById as string) || contact.ownerId || '',
          dueDate: stepConfig.dueDays
            ? new Date(Date.now() + (stepConfig.dueDays as number) * 86400000)
            : undefined,
        },
      });

      return { taskCreated: true, taskId: task.id };
    }

    // ------------------------------------------------------------------
    case 'MOVE_OPPORTUNITY': {
      const stageId = stepConfig.stageId as string;
      const pipelineId = stepConfig.pipelineId as string;

      if (!stageId) return { skipped: true, reason: 'No stage ID specified' };

      // Find the contact's opportunity in this pipeline
      const opportunity = await prisma.opportunity.findFirst({
        where: {
          tenantId,
          contactId: contact.id,
          ...(pipelineId ? { pipelineId } : {}),
        },
        orderBy: { createdAt: 'desc' },
      });

      if (opportunity) {
        await prisma.opportunity.update({
          where: { id: opportunity.id },
          data: { stageId },
        });
        return { moved: true, opportunityId: opportunity.id, stageId };
      }

      return { skipped: true, reason: 'No opportunity found for contact' };
    }

    // ------------------------------------------------------------------
    case 'WEBHOOK': {
      const url = stepConfig.url as string;
      if (!url) return { skipped: true, reason: 'No webhook URL specified' };

      const payload = {
        event: 'workflow.step.webhook',
        tenantId,
        contactId: contact.id,
        contact: {
          email: contact.email,
          phone: contact.phone,
          firstName: contact.firstName,
          lastName: contact.lastName,
        },
        workflowRunId: run.id,
        data: stepConfig.data || {},
        timestamp: new Date().toISOString(),
      };

      // Use the webhook-delivery queue for proper retry handling
      await webhookDeliveryQueue.add('workflow-webhook', {
        tenantId,
        webhookId: null,
        deliveryId: null,
        url,
        payload,
        secret: (stepConfig.secret as string) || '',
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });

      return { webhookQueued: true, url };
    }

    // ------------------------------------------------------------------
    case 'NOTIFICATION': {
      const userId = (stepConfig.userId as string) || contact.ownerId;
      if (!userId) return { skipped: true, reason: 'No user to notify' };

      await prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: 'workflow',
          title: (stepConfig.title as string) || 'Workflow Notification',
          body: (stepConfig.body as string) || undefined,
          data: {
            workflowRunId: run.id,
            contactId: contact.id,
            contactName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
          },
        },
      });

      return { notified: true, userId };
    }

    // ------------------------------------------------------------------
    case 'UPDATE_CONTACT': {
      const updates: Record<string, unknown> = {};
      const allowedFields = [
        'firstName', 'lastName', 'email', 'phone', 'companyName',
        'website', 'address', 'city', 'state', 'country', 'postalCode',
        'timezone', 'source', 'status',
      ];

      const fields = (stepConfig.fields as Record<string, unknown>) || {};
      for (const [key, val] of Object.entries(fields)) {
        if (allowedFields.includes(key) && val !== undefined) {
          updates[key] = val;
        }
      }

      if (Object.keys(updates).length > 0) {
        await prisma.contact.update({
          where: { id: contact.id },
          data: updates as any,
        });
      }

      return { updated: true, fields: Object.keys(updates) };
    }

    // ------------------------------------------------------------------
    default:
      log.warn({ stepType: stepDef.type }, 'Unknown workflow step type');
      return { skipped: true, reason: `Unknown step type: ${stepDef.type}` };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calculateWaitDelay(stepConfig: Record<string, unknown>): number {
  const unit = (stepConfig.unit as string) || 'minutes';
  const duration = (stepConfig.duration as number) || 1;

  const multipliers: Record<string, number> = {
    seconds: 1000,
    minutes: 60 * 1000,
    hours: 60 * 60 * 1000,
    days: 24 * 60 * 60 * 1000,
  };

  return duration * (multipliers[unit] || multipliers.minutes);
}

function evaluateCondition(fieldValue: unknown, operator: string, compareValue: unknown): boolean {
  switch (operator) {
    case 'equals':
      return String(fieldValue) === String(compareValue);
    case 'not_equals':
      return String(fieldValue) !== String(compareValue);
    case 'contains':
      return String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
    case 'not_contains':
      return !String(fieldValue || '').toLowerCase().includes(String(compareValue || '').toLowerCase());
    case 'starts_with':
      return String(fieldValue || '').toLowerCase().startsWith(String(compareValue || '').toLowerCase());
    case 'ends_with':
      return String(fieldValue || '').toLowerCase().endsWith(String(compareValue || '').toLowerCase());
    case 'is_empty':
      return fieldValue == null || fieldValue === '';
    case 'is_not_empty':
      return fieldValue != null && fieldValue !== '';
    case 'greater_than':
      return Number(fieldValue) > Number(compareValue);
    case 'less_than':
      return Number(fieldValue) < Number(compareValue);
    case 'greater_or_equal':
      return Number(fieldValue) >= Number(compareValue);
    case 'less_or_equal':
      return Number(fieldValue) <= Number(compareValue);
    default:
      log.warn({ operator }, 'Unknown condition operator, defaulting to false');
      return false;
  }
}

async function advanceToNextStep(
  prisma: PrismaClient,
  workflowQueue: Queue,
  workflowRunId: string,
  tenantId: string,
  currentStepIndex: number,
  totalSteps: number,
) {
  const nextIndex = currentStepIndex + 1;

  if (nextIndex >= totalSteps) {
    await completeRun(prisma, workflowRunId);
    log.info({ workflowRunId }, 'Workflow run completed');
    return;
  }

  // Update current step index on the run
  await prisma.workflowRun.update({
    where: { id: workflowRunId },
    data: { currentStepIndex: nextIndex, status: 'RUNNING' },
  });

  // Queue the next step immediately
  await workflowQueue.add('workflow-step', {
    tenantId,
    workflowRunId,
    stepIndex: nextIndex,
  });
}

async function completeRun(prisma: PrismaClient, workflowRunId: string) {
  await prisma.workflowRun.update({
    where: { id: workflowRunId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  // Update enrollment status
  const run = await prisma.workflowRun.findUnique({
    where: { id: workflowRunId },
    select: { workflowId: true, contactId: true },
  });

  if (run) {
    await prisma.workflowEnrollment.updateMany({
      where: {
        workflowId: run.workflowId,
        contactId: run.contactId,
        status: 'ACTIVE',
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
  }
}

async function failRun(prisma: PrismaClient, workflowRunId: string, error: string) {
  await prisma.workflowRun.update({
    where: { id: workflowRunId },
    data: {
      status: 'FAILED',
      failedAt: new Date(),
      error,
    },
  });
}
