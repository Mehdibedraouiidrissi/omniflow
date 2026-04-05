import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Job<T = any> = any;
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';

interface WebhookJobData {
  webhookId: string;
  tenantId: string;
  event: string;
  payload: Record<string, unknown>;
}

@Processor('webhooks')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  @Process('deliver')
  async handleDelivery(job: Job<WebhookJobData>) {
    const { webhookId, tenantId, event, payload } = job.data;

    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) {
      this.logger.warn(`Webhook ${webhookId} not found or inactive, skipping delivery`);
      return { status: 'skipped', reason: 'webhook_inactive' };
    }

    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
      webhookId: webhook.id,
    });

    const signature = this.cryptoService.generateHmac(body, webhook.secret);

    let responseStatus: number | undefined;
    let responseBody = '';
    let delivered = false;

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Timestamp': new Date().toISOString(),
          'User-Agent': 'Omniflow-Webhooks/1.0',
        },
        body,
        signal: AbortSignal.timeout(15000),
      });

      responseStatus = response.status;
      responseBody = await response.text().catch(() => '');
      delivered = response.ok;

      if (!response.ok) {
        this.logger.warn(
          `Webhook delivery failed for ${webhook.url}: HTTP ${response.status}`,
        );
      }
    } catch (err) {
      responseBody = err instanceof Error ? err.message : 'Unknown error';
      this.logger.error(`Webhook delivery error for ${webhook.url}: ${responseBody}`);
    }

    // Record delivery attempt
    await this.prisma.webhookDelivery.create({
      data: {
        webhookId: webhook.id,
        tenantId,
        event,
        payload: payload as any,
        responseStatus: responseStatus ?? 0,
        responseBody: responseBody.substring(0, 5000),
        attempts: job.attemptsMade + 1,
        deliveredAt: delivered ? new Date() : null,
        failedAt: delivered ? null : new Date(),
      },
    });

    // Update webhook metadata
    await this.prisma.webhook.update({
      where: { id: webhook.id },
      data: {
        lastTriggeredAt: new Date(),
        failureCount: delivered ? 0 : { increment: 1 },
      },
    });

    if (!delivered) {
      // If all retries exhausted, check if we should deactivate
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        const updatedWebhook = await this.prisma.webhook.findUnique({
          where: { id: webhook.id },
          select: { failureCount: true },
        });

        if (updatedWebhook && updatedWebhook.failureCount >= 10) {
          await this.prisma.webhook.update({
            where: { id: webhook.id },
            data: { isActive: false },
          });
          this.logger.warn(
            `Webhook ${webhook.id} deactivated due to ${updatedWebhook.failureCount} consecutive failures`,
          );
        }
      }

      throw new Error(`Webhook delivery failed: HTTP ${responseStatus ?? 0}`);
    }

    return { status: 'delivered', responseStatus };
  }
}
