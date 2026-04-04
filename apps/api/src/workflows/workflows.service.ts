import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, userId: string, data: {
    name: string;
    description?: string;
    triggerType: string;
    triggerConfig?: Record<string, unknown>;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflow.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description,
          triggerType: data.triggerType as any,
          triggerConfig: data.triggerConfig || {},
          createdById: userId,
          status: 'DRAFT',
        },
      });

      await tx.workflowVersion.create({
        data: {
          tenantId,
          workflowId: workflow.id,
          version: 1,
          steps: [],
        },
      });

      return workflow;
    });
  }

  async list(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.workflow.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { runs: true, enrollments: true } },
        },
      }),
      this.prisma.workflow.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOne(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        versions: { orderBy: { version: 'desc' }, take: 5 },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { runs: true, enrollments: true } },
      },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');
    return workflow;
  }

  async update(tenantId: string, id: string, data: { name?: string; description?: string; triggerConfig?: Record<string, unknown> }) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    return this.prisma.workflow.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    return this.prisma.workflow.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async activate(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId: id },
      orderBy: { version: 'desc' },
    });

    if (!latestVersion) {
      throw new BadRequestException('Cannot activate workflow without a version');
    }

    const steps = latestVersion.steps as any[];
    if (!steps || steps.length === 0) {
      throw new BadRequestException('Cannot activate workflow without steps');
    }

    return this.prisma.workflow.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        publishedVersion: latestVersion.version,
      },
    });
  }

  async deactivate(tenantId: string, id: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    return this.prisma.workflow.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
  }

  async updateSteps(tenantId: string, workflowId: string, steps: Record<string, unknown>[]) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });

    if (!latestVersion) throw new BadRequestException('No workflow version found');

    const newVersion = await this.prisma.workflowVersion.create({
      data: {
        tenantId,
        workflowId,
        version: latestVersion.version + 1,
        steps,
      },
    });

    await this.prisma.workflow.update({
      where: { id: workflowId },
      data: { version: newVersion.version },
    });

    return newVersion;
  }

  async listRuns(tenantId: string, workflowId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const where: Record<string, unknown> = { tenantId, workflowId };
    if (query.status) where.status = query.status;

    const [data, total] = await Promise.all([
      this.prisma.workflowRun.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { startedAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          _count: { select: { steps: true } },
        },
      }),
      this.prisma.workflowRun.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getRunDetail(tenantId: string, workflowId: string, runId: string) {
    const run = await this.prisma.workflowRun.findFirst({
      where: { id: runId, workflowId, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        steps: { orderBy: { stepIndex: 'asc' } },
        workflowVersion: { select: { version: true, steps: true } },
      },
    });

    if (!run) throw new NotFoundException('Workflow run not found');
    return run;
  }

  async testWorkflow(tenantId: string, workflowId: string, sampleData: Record<string, unknown>) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId },
      orderBy: { version: 'desc' },
    });

    if (!latestVersion) throw new BadRequestException('No workflow version found');

    const steps = latestVersion.steps as any[];
    const testResults = steps.map((step: any, index: number) => ({
      stepIndex: index,
      stepType: step.type || step.stepType,
      config: step.config || step,
      status: 'simulated',
      result: `Step ${index + 1} (${step.type || step.stepType}) would execute with provided data`,
    }));

    return {
      workflow: { id: workflow.id, name: workflow.name },
      version: latestVersion.version,
      sampleData,
      steps: testResults,
      message: 'Test completed - steps simulated without actual execution',
    };
  }

  async enrollContact(tenantId: string, workflowId: string, contactId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, status: 'ACTIVE', deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found or not active');

    // Check if already enrolled
    const existing = await this.prisma.workflowEnrollment.findFirst({
      where: { workflowId, contactId, status: 'ACTIVE' },
    });
    if (existing) throw new BadRequestException('Contact is already enrolled in this workflow');

    const enrollment = await this.prisma.workflowEnrollment.create({
      data: { tenantId, workflowId, contactId, status: 'ACTIVE' },
    });

    // Create a workflow run
    const latestVersion = await this.prisma.workflowVersion.findFirst({
      where: { workflowId, version: workflow.publishedVersion || workflow.version },
    });

    if (latestVersion) {
      await this.prisma.workflowRun.create({
        data: {
          tenantId,
          workflowId,
          workflowVersionId: latestVersion.id,
          contactId,
          status: 'RUNNING',
          triggerData: { enrolledManually: true },
        },
      });
    }

    return enrollment;
  }

  async getAnalytics(tenantId: string, workflowId: string) {
    const workflow = await this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId, deletedAt: null },
    });
    if (!workflow) throw new NotFoundException('Workflow not found');

    const [totalRuns, statusCounts, enrollmentCount, recentRuns] = await Promise.all([
      this.prisma.workflowRun.count({ where: { workflowId, tenantId } }),
      this.prisma.workflowRun.groupBy({
        by: ['status'],
        where: { workflowId, tenantId },
        _count: true,
      }),
      this.prisma.workflowEnrollment.count({ where: { workflowId, tenantId } }),
      this.prisma.workflowRun.findMany({
        where: { workflowId, tenantId },
        take: 10,
        orderBy: { startedAt: 'desc' },
        select: { id: true, status: true, startedAt: true, completedAt: true },
      }),
    ]);

    const statusMap = Object.fromEntries(statusCounts.map((s) => [s.status, s._count]));

    return {
      totalRuns,
      totalEnrollments: enrollmentCount,
      completionRate: totalRuns > 0
        ? (((statusMap.COMPLETED || 0) / totalRuns) * 100).toFixed(1)
        : '0',
      statusBreakdown: statusMap,
      recentRuns,
    };
  }
}
