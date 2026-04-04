// ============================================================================
// Omniflow Worker - Email Sending Worker
// Queue: 'email'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { sendEmail } from '../services/email-transport';
import { renderTemplate, renderNamedTemplate } from '../services/template-engine';
import { createChildLogger } from '../logger';
import { config } from '../config';
import { RETRY_CONFIGS } from '../utils/retry';

const log = createChildLogger('email-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface EmailJobData {
  tenantId: string;
  messageId?: string;
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  templateId?: string;
  variables?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createEmailWorker(prisma: PrismaClient, connection: { host: string; port: number; password?: string }) {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      const { tenantId, messageId, to, subject, from, replyTo, templateId, variables } = job.data;
      let { html, text } = job.data;

      log.info({ jobId: job.id, to, subject, tenantId }, 'Processing email job');

      // ---- Check suppression list ----
      const suppressed = await prisma.suppressionEntry.findFirst({
        where: { tenantId, email: to },
      });

      if (suppressed) {
        log.warn({ to, reason: suppressed.reason }, 'Recipient is suppressed, skipping');
        if (messageId) {
          await updateDeliveryStatus(prisma, tenantId, messageId, to, 'FAILED', 'Recipient suppressed');
        }
        return { status: 'suppressed', to };
      }

      // ---- Render template if templateId is provided ----
      if (templateId) {
        const template = await prisma.messageTemplate.findFirst({
          where: { id: templateId, tenantId, isActive: true },
        });

        if (template) {
          const contact = variables as Record<string, unknown> || {};
          const mergedVars = { ...contact, ...(variables || {}) };
          html = renderNamedTemplate(templateId, template.body, mergedVars);
          if (template.subject && !subject) {
            // subject from template if not overridden (already passed as param)
          }
        } else {
          log.warn({ templateId }, 'Template not found, using raw html');
        }
      } else if (html && variables && Object.keys(variables).length > 0) {
        // Render inline HTML template with variables
        html = renderTemplate(html, variables);
      }

      if (text && variables && Object.keys(variables).length > 0) {
        text = renderTemplate(text, variables);
      }

      // ---- Create delivery record ----
      if (messageId) {
        await prisma.messageDelivery.upsert({
          where: {
            id: `${messageId}-${to}`,
          },
          update: {
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
            status: 'PENDING',
          },
          create: {
            tenantId,
            messageId,
            channel: 'EMAIL',
            recipient: to,
            status: 'PENDING',
            provider: 'ses',
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        }).catch(() => {
          // Delivery record may already exist with generated ID; fall through
        });
      }

      // ---- Send email ----
      const result = await sendEmail({
        to,
        subject,
        html: html || '',
        text,
        from,
        replyTo,
      });

      // ---- Track success ----
      if (messageId) {
        await updateDeliveryStatus(prisma, tenantId, messageId, to, 'SENT', undefined, result.messageId);
      }

      log.info({ jobId: job.id, messageId: result.messageId, to }, 'Email sent successfully');

      return { status: 'sent', messageId: result.messageId, to };
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      limiter: {
        max: 50,
        duration: 1000, // 50 emails per second
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  );

  // ---- Error / failure handlers ----

  worker.on('failed', async (job, error) => {
    if (!job) return;
    const { tenantId, messageId, to } = job.data;
    log.error({ jobId: job.id, to, error: error.message, attempt: job.attemptsMade }, 'Email job failed');

    if (messageId) {
      await updateDeliveryStatus(prisma, tenantId, messageId, to, 'FAILED', error.message);
    }

    // Handle bounces: if the error looks like a bounce, add to suppression list
    if (isBounceError(error)) {
      log.warn({ to, tenantId }, 'Bounce detected, adding to suppression list');
      await prisma.suppressionEntry.create({
        data: {
          tenantId,
          email: to,
          reason: 'BOUNCE',
        },
      }).catch(() => {
        // Ignore duplicate suppression entry
      });
    }
  });

  worker.on('completed', (job) => {
    log.debug({ jobId: job.id }, 'Email job completed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Email worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateDeliveryStatus(
  prisma: PrismaClient,
  tenantId: string,
  messageId: string,
  recipient: string,
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'FAILED',
  errorMessage?: string,
  providerId?: string,
) {
  try {
    const delivery = await prisma.messageDelivery.findFirst({
      where: { messageId, recipient, tenantId },
    });

    if (delivery) {
      await prisma.messageDelivery.update({
        where: { id: delivery.id },
        data: {
          status,
          providerId: providerId || delivery.providerId,
          deliveredAt: status === 'DELIVERED' ? new Date() : delivery.deliveredAt,
          bouncedAt: status === 'BOUNCED' ? new Date() : delivery.bouncedAt,
          metadata: errorMessage ? { error: errorMessage } : undefined,
        },
      });
    }
  } catch (err) {
    log.error({ messageId, recipient, error: (err as Error).message }, 'Failed to update delivery status');
  }
}

function isBounceError(error: Error): boolean {
  const msg = error.message.toLowerCase();
  return (
    msg.includes('550') ||
    msg.includes('bounce') ||
    msg.includes('undeliverable') ||
    msg.includes('mailbox not found') ||
    msg.includes('user unknown') ||
    msg.includes('no such user')
  );
}
