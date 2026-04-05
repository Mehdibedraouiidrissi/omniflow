import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface TrackEventOptions {
  tenantId: string;
  contactId?: string;
  sessionId?: string;
  eventType: string;
  eventName: string;
  properties?: Record<string, unknown>;
  pageUrl?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async track(options: TrackEventOptions): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          tenantId: options.tenantId,
          contactId: options.contactId,
          sessionId: options.sessionId,
          eventType: options.eventType,
          eventName: options.eventName,
          properties: (options.properties || {}) as any,
          pageUrl: options.pageUrl,
          referrer: options.referrer,
          utmSource: options.utmSource,
          utmMedium: options.utmMedium,
          utmCampaign: options.utmCampaign,
          ipAddress: options.ipAddress,
          userAgent: options.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to track event ${options.eventName}: ${error}`);
    }
  }

  async getEventCounts(
    tenantId: string,
    eventType: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.analyticsEvent.groupBy({
      by: ['eventName'],
      where: {
        tenantId,
        eventType,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: true,
      orderBy: { _count: { eventName: 'desc' } },
    });
  }

  async getAttributionStats(tenantId: string, startDate: Date, endDate: Date) {
    return this.prisma.analyticsEvent.groupBy({
      by: ['utmSource', 'utmMedium', 'utmCampaign'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        utmSource: { not: null },
      },
      _count: true,
      orderBy: { _count: { utmSource: 'desc' } },
    });
  }
}
