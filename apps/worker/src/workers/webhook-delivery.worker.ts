// ============================================================================
// Omniflow Worker - Webhook Delivery Worker
// Queue: 'webhook-delivery'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('webhook-delivery-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface WebhookDeliveryJobData {
  tenantId: string;
  webhookId: string | null;
  deliveryId: string | null;
  url: string;
  payload: Record<string, unknown>;
  secret: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_CONSECUTIVE_FAILURES = 10;
const REQUEST_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createWebhookDeliveryWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const worker = new Worker<WebhookDeliveryJobData>(
    'webhook-delivery',
    async (job: Job<WebhookDeliveryJobData>) => {
      const { tenantId, webhookId, deliveryId, url, payload, secret } = job.data;

      log.info({ jobId: job.id, url, webhookId, tenantId }, 'Processing webhook delivery');

      // ---- Build signed payload ----
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signaturePayload = `${timestamp}.${body}`;
      const signature = secret
        ? crypto
            .createHmac('sha256', secret)
            .update(signaturePayload)
            .digest('hex')
        : '';

      // ---- Make HTTP POST ----
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      let responseStatus: number | undefined;
      let responseBody: string | undefined;

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Omniflow-Signature': signature,
            'X-Omniflow-Timestamp': timestamp,
            'X-Omniflow-Event': (payload.event as string) || 'webhook',
            'User-Agent': 'Omniflow-Webhook/1.0',
          },
          body,
          signal: controller.signal,
        });

        responseStatus = response.status;
        responseBody = await response.text().catch(() => '');

        clearTimeout(timeoutId);

        // ---- Track delivery status ----
        const isSuccess = responseStatus >= 200 && responseStatus < 300;

        if (deliveryId) {
          await prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              responseStatus,
              responseBody: (responseBody || '').slice(0, 4096),
              attempts: { increment: 1 },
              deliveredAt: isSuccess ? new Date() : undefined,
              failedAt: !isSuccess ? new Date() : undefined,
            },
          });
        }

        if (isSuccess && webhookId) {
          // Reset failure count on success
          await prisma.webhook.update({
            where: { id: webhookId },
            data: {
              lastTriggeredAt: new Date(),
              failureCount: 0,
            },
          });

          log.info({ jobId: job.id, url, status: responseStatus }, 'Webhook delivered successfully');
          return { status: 'delivered', responseStatus };
        }

        // Non-2xx response -- treat as failure
        if (webhookId) {
          await incrementWebhookFailure(prisma, webhookId);
        }

        throw new Error(`Webhook delivery failed with status ${responseStatus}`);
      } catch (err) {
        clearTimeout(timeoutId);
        const error = err as Error;

        if (deliveryId) {
          await prisma.webhookDelivery.update({
            where: { id: deliveryId },
            data: {
              responseStatus: responseStatus || null,
              responseBody: error.message.slice(0, 4096),
              attempts: { increment: 1 },
              failedAt: new Date(),
            },
          }).catch(() => { /* ignore update errors */ });
        }

        if (webhookId) {
          await incrementWebhookFailure(prisma, webhookId);
        }

        log.error(
          { jobId: job.id, url, error: error.message, attempt: job.attemptsMade },
          'Webhook delivery failed',
        );

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
      'Webhook delivery job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Webhook delivery worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Increment the failure count on a webhook. If it exceeds the threshold,
 * deactivate the webhook.
 */
async function incrementWebhookFailure(prisma: PrismaClient, webhookId: string) {
  try {
    const webhook = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
        lastTriggeredAt: new Date(),
      },
    });

    if (webhook.failureCount >= MAX_CONSECUTIVE_FAILURES) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive: false },
      });

      log.warn(
        { webhookId, failureCount: webhook.failureCount },
        'Webhook deactivated after too many consecutive failures',
      );
    }
  } catch (err) {
    log.error({ webhookId, error: (err as Error).message }, 'Failed to update webhook failure count');
  }
}
