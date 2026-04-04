import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    @InjectQueue('webhooks') private webhookQueue: Queue,
  ) {}

  async create(tenantId: string, data: {
    url: string;
    events: string[];
    secret?: string;
  }) {
    const secret = data.secret || this.cryptoService.generateToken(16);

    return this.prisma.webhook.create({
      data: {
        tenantId,
        url: data.url,
        events: data.events,
        secret,
        isActive: true,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.webhook.findMany({
      where: { tenantId },
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        lastTriggeredAt: true,
        failureCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    return {
      id: webhook.id,
      url: webhook.url,
      events: webhook.events,
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt,
      failureCount: webhook.failureCount,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }

  async update(tenantId: string, id: string, data: {
    url?: string;
    events?: string[];
    isActive?: boolean;
  }) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    return this.prisma.webhook.update({
      where: { id },
      data,
      select: {
        id: true,
        url: true,
        events: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async delete(tenantId: string, id: string) {
    const webhook = await this.prisma.webhook.findFirst({ where: { id, tenantId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    // Delete associated deliveries first
    await this.prisma.webhookDelivery.deleteMany({ where: { webhookId: id } });

    return this.prisma.webhook.delete({ where: { id } });
  }

  async listDeliveries(tenantId: string, webhookId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { webhookId, tenantId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.webhookDelivery.count({ where: { webhookId, tenantId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async retryDelivery(tenantId: string, webhookId: string, deliveryId: string) {
    const delivery = await this.prisma.webhookDelivery.findFirst({
      where: { id: deliveryId, webhookId, tenantId },
    });

    if (!delivery) throw new NotFoundException('Delivery not found');

    await this.webhookQueue.add('deliver', {
      webhookId,
      tenantId,
      event: delivery.event,
      payload: delivery.payload as Record<string, unknown>,
    });

    return { message: 'Delivery retry queued' };
  }

  /**
   * Dispatch a webhook event to all matching active webhooks for a tenant.
   * Uses BullMQ for async delivery with retries.
   */
  async dispatchWebhook(tenantId: string, event: string, payload: Record<string, unknown>) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        tenantId,
        isActive: true,
      },
      select: { id: true, events: true },
    });

    // Filter webhooks whose events JSON array contains the event
    const matchingWebhooks = webhooks.filter((wh) => {
      const events = wh.events as string[];
      return Array.isArray(events) && events.includes(event);
    });

    if (matchingWebhooks.length === 0) return;

    this.logger.log(`Dispatching webhook event '${event}' to ${matchingWebhooks.length} endpoint(s)`);

    for (const webhook of matchingWebhooks) {
      await this.webhookQueue.add('deliver', {
        webhookId: webhook.id,
        tenantId,
        event,
        payload,
      });
    }
  }
}
