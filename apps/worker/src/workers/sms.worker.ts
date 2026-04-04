// ============================================================================
// Omniflow Worker - SMS Sending Worker
// Queue: 'sms'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { sendSms } from '../services/sms-transport';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('sms-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface SmsJobData {
  tenantId: string;
  messageId?: string;
  to: string;
  body: string;
  from?: string;
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createSmsWorker(prisma: PrismaClient, connection: { host: string; port: number; password?: string }) {
  const worker = new Worker<SmsJobData>(
    'sms',
    async (job: Job<SmsJobData>) => {
      const { tenantId, messageId, to, body, from } = job.data;

      log.info({ jobId: job.id, to, tenantId }, 'Processing SMS job');

      // ---- Check suppression list ----
      const suppressed = await prisma.suppressionEntry.findFirst({
        where: { tenantId, phone: to },
      });

      if (suppressed) {
        log.warn({ to, reason: suppressed.reason }, 'Recipient phone is suppressed, skipping');
        if (messageId) {
          await updateSmsDeliveryStatus(prisma, tenantId, messageId, to, 'FAILED');
        }
        return { status: 'suppressed', to };
      }

      // ---- Track delivery ----
      if (messageId) {
        await prisma.messageDelivery.create({
          data: {
            tenantId,
            messageId,
            channel: 'SMS',
            recipient: to,
            status: 'PENDING',
            provider: 'twilio',
            attempts: 1,
            lastAttemptAt: new Date(),
          },
        }).catch(() => {
          // Delivery record may already exist
        });
      }

      // ---- Send SMS ----
      const result = await sendSms({
        to,
        body,
        from,
      });

      // ---- Track success ----
      if (result.status === 'skipped') {
        log.warn({ to }, 'SMS skipped - Twilio not configured');
        return { status: 'skipped', to };
      }

      if (messageId) {
        await updateSmsDeliveryStatus(prisma, tenantId, messageId, to, 'SENT', result.sid);
      }

      log.info({ jobId: job.id, sid: result.sid, to }, 'SMS sent successfully');

      return { status: 'sent', sid: result.sid, to };
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      limiter: {
        max: 10,
        duration: 1000, // 10 SMS per second
      },
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  );

  // ---- Error handlers ----

  worker.on('failed', async (job, error) => {
    if (!job) return;
    const { tenantId, messageId, to } = job.data;
    log.error({ jobId: job.id, to, error: error.message, attempt: job.attemptsMade }, 'SMS job failed');

    if (messageId) {
      await updateSmsDeliveryStatus(prisma, tenantId, messageId, to, 'FAILED');
    }
  });

  worker.on('completed', (job) => {
    log.debug({ jobId: job.id }, 'SMS job completed');
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'SMS worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function updateSmsDeliveryStatus(
  prisma: PrismaClient,
  tenantId: string,
  messageId: string,
  recipient: string,
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'BOUNCED' | 'COMPLAINED' | 'FAILED',
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
          deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        },
      });
    }
  } catch (err) {
    log.error({ messageId, recipient, error: (err as Error).message }, 'Failed to update SMS delivery status');
  }
}
