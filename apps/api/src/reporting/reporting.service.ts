import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportingService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats(tenantId: string) {
    const [
      contactsCount, opportunitiesCount, openConversations, activeWorkflows,
      recentContacts, pipelineValues, appointmentsToday, revenueThisMonth,
    ] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.opportunity.count({ where: { tenantId, status: 'OPEN', deletedAt: null } }),
      this.prisma.conversation.count({ where: { tenantId, status: 'OPEN' } }),
      this.prisma.workflow.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.contact.count({
        where: {
          tenantId, deletedAt: null,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.opportunity.aggregate({
        where: { tenantId, status: 'OPEN', deletedAt: null },
        _sum: { value: true },
      }),
      this.prisma.appointment.count({
        where: {
          tenantId,
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
          startTime: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lte: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          tenantId, status: 'SUCCEEDED',
          createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      contacts: { total: contactsCount, newLast30Days: recentContacts },
      opportunities: { open: opportunitiesCount, totalValue: pipelineValues._sum.value || 0 },
      conversations: { open: openConversations },
      workflows: { active: activeWorkflows },
      appointments: { today: appointmentsToday },
      revenue: { thisMonth: revenueThisMonth._sum.amount || 0 },
    };
  }

  async getContactsReport(tenantId: string, query: Record<string, string>) {
    const days = query.period === '7d' ? 7 : query.period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [growth, bySources, byStatus] = await Promise.all([
      this.prisma.contact.groupBy({
        by: ['createdAt'],
        where: { tenantId, deletedAt: null, createdAt: { gte: startDate } },
        _count: true,
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.contact.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null, source: { not: null } },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
      this.prisma.contact.groupBy({
        by: ['status'],
        where: { tenantId, deletedAt: null },
        _count: true,
      }),
    ]);

    return { growth, sources: bySources, statusBreakdown: byStatus };
  }

  async getPipelineReport(tenantId: string, query: Record<string, string>) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query.pipelineId) where.pipelineId = query.pipelineId;

    const stages = await this.prisma.pipelineStage.findMany({
      where: { tenantId, ...(query.pipelineId ? { pipelineId: query.pipelineId } : {}) },
      orderBy: { position: 'asc' },
      include: {
        opportunities: {
          where: { status: 'OPEN', deletedAt: null },
          select: { value: true },
        },
        _count: { select: { opportunities: true } },
      },
    });

    const wonThisPeriod = await this.prisma.opportunity.aggregate({
      where: {
        tenantId, status: 'WON',
        wonDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      _sum: { value: true },
      _count: true,
    });

    return {
      stages: stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        position: stage.position,
        count: stage._count.opportunities,
        totalValue: stage.opportunities.reduce((sum, opp) => sum + Number(opp.value || 0), 0),
      })),
      wonThisMonth: {
        count: wonThisPeriod._count,
        value: wonThisPeriod._sum.value || 0,
      },
    };
  }

  async getConversationStats(tenantId: string) {
    const [byChannel, byStatus, avgResponseTime] = await Promise.all([
      this.prisma.conversation.groupBy({
        by: ['channel'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.message.count({
        where: { tenantId, direction: 'OUTBOUND' },
      }),
    ]);

    return { byChannel, byStatus, totalOutboundMessages: avgResponseTime };
  }

  async getAppointmentStats(tenantId: string, query: Record<string, string>) {
    const days = query.period === '7d' ? 7 : query.period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byStatus, total, noShows] = await Promise.all([
      this.prisma.appointment.groupBy({
        by: ['status'],
        where: { tenantId, startTime: { gte: startDate } },
        _count: true,
      }),
      this.prisma.appointment.count({
        where: { tenantId, startTime: { gte: startDate } },
      }),
      this.prisma.appointment.count({
        where: { tenantId, status: 'NO_SHOW', startTime: { gte: startDate } },
      }),
    ]);

    return {
      byStatus,
      total,
      noShows,
      noShowRate: total > 0 ? ((noShows / total) * 100).toFixed(1) : '0',
    };
  }

  async getPaymentStats(tenantId: string, query: Record<string, string>) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();

    const [revenue, orders, subscriptions] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { tenantId, status: 'SUCCEEDED', createdAt: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: true,
      }),
      this.prisma.order.count({
        where: { tenantId, status: 'PAID', createdAt: { gte: startDate, lte: endDate } },
      }),
      this.prisma.subscription.count({ where: { tenantId, status: 'ACTIVE' } }),
    ]);

    return {
      totalRevenue: revenue._sum.amount || 0,
      paymentCount: revenue._count,
      paidOrders: orders,
      activeSubscriptions: subscriptions,
    };
  }

  async getWorkflowStats(tenantId: string) {
    const [active, runs, byStatus] = await Promise.all([
      this.prisma.workflow.count({ where: { tenantId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.workflowRun.count({ where: { tenantId } }),
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
    ]);

    return { activeWorkflows: active, totalRuns: runs, runsByStatus: byStatus };
  }

  async getEmailStats(tenantId: string) {
    const [byStatus, total] = await Promise.all([
      this.prisma.message.groupBy({
        by: ['status'],
        where: { tenantId, channel: 'EMAIL', direction: 'OUTBOUND' },
        _count: true,
      }),
      this.prisma.message.count({
        where: { tenantId, channel: 'EMAIL', direction: 'OUTBOUND' },
      }),
    ]);

    const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));

    return {
      total,
      sent: statusMap.SENT || 0,
      delivered: statusMap.DELIVERED || 0,
      failed: statusMap.FAILED || 0,
      bounced: statusMap.BOUNCED || 0,
      deliveryRate: total > 0 ? (((statusMap.DELIVERED || 0) / total) * 100).toFixed(1) : '0',
    };
  }

  async getAttributionReport(tenantId: string) {
    const [bySources, contactSources] = await Promise.all([
      this.prisma.analyticsEvent.groupBy({
        by: ['utmSource', 'utmMedium', 'utmCampaign'],
        where: { tenantId, utmSource: { not: null } },
        _count: true,
        orderBy: { _count: { utmSource: 'desc' } },
        take: 20,
      }),
      this.prisma.contact.groupBy({
        by: ['source'],
        where: { tenantId, deletedAt: null, source: { not: null } },
        _count: true,
        orderBy: { _count: { source: 'desc' } },
      }),
    ]);

    return { utmAttribution: bySources, contactSources };
  }

  async exportReport(tenantId: string, reportType: string, filters?: Record<string, string>) {
    let data: any;
    switch (reportType) {
      case 'contacts':
        data = await this.getContactsReport(tenantId, filters || {});
        break;
      case 'pipelines':
        data = await this.getPipelineReport(tenantId, filters || {});
        break;
      case 'payments':
        data = await this.getPaymentStats(tenantId, filters || {});
        break;
      default:
        data = await this.getDashboardStats(tenantId);
    }

    // Convert to CSV
    const rows = Array.isArray(data) ? data : [data];
    if (rows.length === 0) return { csv: '', count: 0 };

    const headers = Object.keys(rows[0]);
    const csvRows = rows.map((row: any) =>
      headers.map((h) => `"${typeof row[h] === 'object' ? JSON.stringify(row[h]) : row[h]}"`).join(','),
    );
    const csv = [headers.join(','), ...csvRows].join('\n');

    return { csv, count: rows.length, reportType };
  }
}
