// ============================================================================
// Omniflow Worker - Report Generation Worker
// Queue: 'reports'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import dayjs from 'dayjs';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('report-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface ReportJobData {
  tenantId: string;
  reportId: string;
  config: {
    type: string;
    metrics?: string[];
    groupBy?: string;
    filters?: Record<string, unknown>;
  };
  dateRange: {
    start: string; // ISO date
    end: string;   // ISO date
  };
}

// ---------------------------------------------------------------------------
// Report cache TTL (1 hour)
// ---------------------------------------------------------------------------

const REPORT_CACHE_TTL = 3600;

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createReportWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const redis = new Redis({
    host: connection.host,
    port: connection.port,
    password: connection.password,
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<ReportJobData>(
    'reports',
    async (job: Job<ReportJobData>) => {
      const { tenantId, reportId, config: reportConfig, dateRange } = job.data;

      log.info({ jobId: job.id, reportId, type: reportConfig.type, tenantId }, 'Generating report');

      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);

      // ---- Generate report data based on type ----
      let reportData: Record<string, unknown>;

      switch (reportConfig.type) {
        case 'contacts_overview':
          reportData = await generateContactsOverview(prisma, tenantId, startDate, endDate);
          break;
        case 'pipeline_performance':
          reportData = await generatePipelineReport(prisma, tenantId, startDate, endDate);
          break;
        case 'email_analytics':
          reportData = await generateEmailAnalytics(prisma, tenantId, startDate, endDate);
          break;
        case 'revenue':
          reportData = await generateRevenueReport(prisma, tenantId, startDate, endDate);
          break;
        case 'appointment_summary':
          reportData = await generateAppointmentSummary(prisma, tenantId, startDate, endDate);
          break;
        case 'workflow_performance':
          reportData = await generateWorkflowReport(prisma, tenantId, startDate, endDate);
          break;
        default:
          reportData = { error: `Unknown report type: ${reportConfig.type}` };
      }

      // ---- Cache results in Redis ----
      const cacheKey = `report:${tenantId}:${reportId}:${dateRange.start}:${dateRange.end}`;
      await redis.setex(cacheKey, REPORT_CACHE_TTL, JSON.stringify(reportData));

      // ---- Update the report record ----
      await prisma.report.update({
        where: { id: reportId },
        data: { lastRunAt: new Date() },
      });

      log.info({ reportId, cacheKey }, 'Report generated and cached');

      return { status: 'generated', cacheKey, reportType: reportConfig.type };
    },
    {
      connection,
      concurrency: 3,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 500 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message },
      'Report generation job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Report worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// Report generators
// ---------------------------------------------------------------------------

async function generateContactsOverview(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [totalContacts, newContacts, contactsByStatus, contactsBySource] = await Promise.all([
    prisma.contact.count({
      where: { tenantId, deletedAt: null },
    }),
    prisma.contact.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.contact.groupBy({
      by: ['status'],
      where: { tenantId, deletedAt: null },
      _count: { id: true },
    }),
    prisma.contact.groupBy({
      by: ['source'],
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    totalContacts,
    newContacts,
    contactsByStatus: contactsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
    contactsBySource: contactsBySource.map((s) => ({ source: s.source || 'Unknown', count: s._count.id })),
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generatePipelineReport(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [pipelines, opportunitiesByStatus, recentOpportunities] = await Promise.all([
    prisma.pipeline.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        stages: { orderBy: { position: 'asc' } },
        _count: { select: { opportunities: true } },
      },
    }),
    prisma.opportunity.groupBy({
      by: ['status'],
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
    prisma.opportunity.count({
      where: {
        tenantId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
  ]);

  return {
    pipelines: pipelines.map((p) => ({
      id: p.id,
      name: p.name,
      stageCount: p.stages.length,
      opportunityCount: p._count.opportunities,
    })),
    opportunitiesByStatus: opportunitiesByStatus.map((s) => ({
      status: s.status,
      count: s._count.id,
    })),
    newOpportunities: recentOpportunities,
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateEmailAnalytics(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [deliveries, deliveriesByStatus] = await Promise.all([
    prisma.messageDelivery.count({
      where: {
        tenantId,
        channel: 'EMAIL',
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.messageDelivery.groupBy({
      by: ['status'],
      where: {
        tenantId,
        channel: 'EMAIL',
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
  ]);

  const statusMap = Object.fromEntries(
    deliveriesByStatus.map((s) => [s.status, s._count.id]),
  );

  return {
    totalSent: deliveries,
    delivered: statusMap['DELIVERED'] || 0,
    bounced: statusMap['BOUNCED'] || 0,
    failed: statusMap['FAILED'] || 0,
    pending: statusMap['PENDING'] || 0,
    deliveryRate:
      deliveries > 0
        ? ((statusMap['DELIVERED'] || 0) / deliveries * 100).toFixed(1) + '%'
        : '0%',
    bounceRate:
      deliveries > 0
        ? ((statusMap['BOUNCED'] || 0) / deliveries * 100).toFixed(1) + '%'
        : '0%',
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateRevenueReport(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [orders, payments] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate },
      },
      select: { totalAmount: true, currency: true, paidAt: true },
    }),
    prisma.payment.findMany({
      where: {
        tenantId,
        status: 'SUCCEEDED',
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { amount: true, currency: true },
    }),
  ]);

  const totalRevenue = payments.reduce(
    (sum, p) => sum + Number(p.amount),
    0,
  );
  const orderCount = orders.length;

  return {
    totalRevenue,
    orderCount,
    averageOrderValue: orderCount > 0 ? totalRevenue / orderCount : 0,
    currency: payments[0]?.currency || 'USD',
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateAppointmentSummary(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [total, byStatus] = await Promise.all([
    prisma.appointment.count({
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endDate },
      },
    }),
    prisma.appointment.groupBy({
      by: ['status'],
      where: {
        tenantId,
        startTime: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
  ]);

  return {
    totalAppointments: total,
    byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
    completionRate:
      total > 0
        ? (
            ((byStatus.find((s) => s.status === 'COMPLETED')?._count.id || 0) /
              total) *
            100
          ).toFixed(1) + '%'
        : '0%',
    noShowRate:
      total > 0
        ? (
            ((byStatus.find((s) => s.status === 'NO_SHOW')?._count.id || 0) /
              total) *
            100
          ).toFixed(1) + '%'
        : '0%',
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}

async function generateWorkflowReport(
  prisma: PrismaClient,
  tenantId: string,
  startDate: Date,
  endDate: Date,
): Promise<Record<string, unknown>> {
  const [totalRuns, runsByStatus, activeWorkflows] = await Promise.all([
    prisma.workflowRun.count({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
    }),
    prisma.workflowRun.groupBy({
      by: ['status'],
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
      },
      _count: { id: true },
    }),
    prisma.workflow.count({
      where: { tenantId, status: 'ACTIVE', deletedAt: null },
    }),
  ]);

  return {
    activeWorkflows,
    totalRuns,
    runsByStatus: runsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
    successRate:
      totalRuns > 0
        ? (
            ((runsByStatus.find((s) => s.status === 'COMPLETED')?._count.id || 0) /
              totalRuns) *
            100
          ).toFixed(1) + '%'
        : '0%',
    period: { start: startDate.toISOString(), end: endDate.toISOString() },
    generatedAt: new Date().toISOString(),
  };
}
