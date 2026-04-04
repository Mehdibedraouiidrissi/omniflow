// ============================================================================
// Omniflow Worker - Billing & Usage Metering Worker
// Queue: 'billing'
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('billing-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface BillingJobData {
  tenantId: string;
  metric: string; // CONTACTS, EMAILS, SMS, WORKFLOWS, PAGES, STORAGE
  quantity: number;
}

// ---------------------------------------------------------------------------
// Usage limits by plan (example thresholds)
// ---------------------------------------------------------------------------

const USAGE_WARNING_THRESHOLD = 0.8;  // 80% of limit
const USAGE_CRITICAL_THRESHOLD = 0.95; // 95% of limit

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createBillingWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const emailQueue = new Queue('email', { connection });

  const worker = new Worker<BillingJobData>(
    'billing',
    async (job: Job<BillingJobData>) => {
      const { tenantId, metric, quantity } = job.data;

      log.info({ jobId: job.id, tenantId, metric, quantity }, 'Processing billing usage');

      // ---- Record usage ----
      const period = new Date().toISOString().slice(0, 7); // YYYY-MM

      await prisma.usageRecord.upsert({
        where: {
          tenantId_metric_period: {
            tenantId,
            metric: metric as any,
            period,
          },
        },
        update: {
          quantity: { increment: quantity },
          recordedAt: new Date(),
        },
        create: {
          tenantId,
          metric: metric as any,
          quantity,
          period,
        },
      });

      // ---- Check limits ----
      const entitlement = await prisma.featureEntitlement.findFirst({
        where: { tenantId, feature: metric },
      });

      if (!entitlement || !entitlement.limit) {
        // No limit set -- just record usage
        return { status: 'recorded', metric, quantity };
      }

      // Get current total usage for this period
      const usageRecord = await prisma.usageRecord.findUnique({
        where: {
          tenantId_metric_period: { tenantId, metric: metric as any, period },
        },
      });

      const currentUsage = usageRecord?.quantity || 0;
      const limit = entitlement.limit;
      const usageRatio = currentUsage / limit;

      // ---- Update entitlement used count ----
      await prisma.featureEntitlement.update({
        where: { tenantId_feature: { tenantId, feature: metric } },
        data: { used: currentUsage },
      });

      // ---- Send warnings ----
      if (usageRatio >= USAGE_CRITICAL_THRESHOLD && usageRatio < 1) {
        await sendUsageWarning(prisma, emailQueue, tenantId, metric, currentUsage, limit, 'critical');
        log.warn({ tenantId, metric, currentUsage, limit }, 'Critical usage threshold reached');
      } else if (usageRatio >= USAGE_WARNING_THRESHOLD && usageRatio < USAGE_CRITICAL_THRESHOLD) {
        await sendUsageWarning(prisma, emailQueue, tenantId, metric, currentUsage, limit, 'warning');
        log.info({ tenantId, metric, currentUsage, limit }, 'Usage warning threshold reached');
      }

      // ---- Check if limit exceeded ----
      if (currentUsage >= limit) {
        log.warn({ tenantId, metric, currentUsage, limit }, 'Usage limit exceeded');

        // Create a notification for tenant admins
        const admins = await prisma.tenantMembership.findMany({
          where: { tenantId, status: 'ACTIVE' },
          include: { role: true, user: true },
          take: 5,
        });

        for (const admin of admins) {
          await prisma.notification.create({
            data: {
              tenantId,
              userId: admin.userId,
              type: 'usage_limit_exceeded',
              title: `${metric} limit reached`,
              body: `You have used ${currentUsage} of ${limit} ${metric.toLowerCase()} this month. Please upgrade your plan to continue.`,
              data: { metric, currentUsage, limit },
            },
          });
        }

        return { status: 'limit_exceeded', metric, currentUsage, limit };
      }

      return { status: 'recorded', metric, currentUsage, limit, usageRatio };
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message },
      'Billing job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Billing worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Usage warning email
// ---------------------------------------------------------------------------

async function sendUsageWarning(
  prisma: PrismaClient,
  emailQueue: Queue,
  tenantId: string,
  metric: string,
  currentUsage: number,
  limit: number,
  severity: 'warning' | 'critical',
) {
  // Find the tenant and a primary admin email
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { name: true },
  });

  const adminMember = await prisma.tenantMembership.findFirst({
    where: { tenantId, status: 'ACTIVE' },
    include: { user: { select: { email: true, firstName: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (!adminMember?.user.email) return;

  const percentage = Math.round((currentUsage / limit) * 100);
  const subject =
    severity === 'critical'
      ? `Action Required: ${metric} usage at ${percentage}%`
      : `Usage Alert: ${metric} usage at ${percentage}%`;

  await emailQueue.add('usage-warning', {
    tenantId,
    to: adminMember.user.email,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: ${severity === 'critical' ? '#DC2626' : '#F59E0B'};">
          ${severity === 'critical' ? 'Usage Limit Almost Reached' : 'Usage Warning'}
        </h2>
        <p>Hi ${adminMember.user.firstName || 'there'},</p>
        <p>Your <strong>${tenant?.name || 'account'}</strong> has used
          <strong>${currentUsage}</strong> of <strong>${limit}</strong>
          ${metric.toLowerCase()} this billing period (${percentage}%).
        </p>
        ${
          severity === 'critical'
            ? '<p style="color: #DC2626;"><strong>You are approaching your limit. Services may be restricted once the limit is reached.</strong></p>'
            : ''
        }
        <p>
          <a href="${config.appUrl}/settings/billing" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">
            Upgrade Plan
          </a>
        </p>
      </div>
    `,
    text: `Usage ${severity}: Your account has used ${currentUsage} of ${limit} ${metric.toLowerCase()} (${percentage}%). Visit ${config.appUrl}/settings/billing to upgrade.`,
  });
}
