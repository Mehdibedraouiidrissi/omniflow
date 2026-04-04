import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class PipelinesService {
  private readonly logger = new Logger(PipelinesService.name);

  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: { name: string; stages?: Array<{ name: string; position: number; color?: string; probability?: number }> }) {
    return this.prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.create({
        data: { tenantId, name: data.name },
      });

      if (data.stages?.length) {
        await tx.pipelineStage.createMany({
          data: data.stages.map((stage) => ({
            tenantId,
            pipelineId: pipeline.id,
            name: stage.name,
            position: stage.position,
            color: stage.color,
            probability: stage.probability || 0,
          })),
        });
      }

      return tx.pipeline.findUnique({
        where: { id: pipeline.id },
        include: {
          stages: { orderBy: { position: 'asc' } },
          _count: { select: { opportunities: true } },
        },
      });
    });
  }

  async list(tenantId: string) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { opportunities: true } } },
        },
        _count: { select: { opportunities: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate totals for each pipeline
    const result = [];
    for (const pipeline of pipelines) {
      const totalValue = await this.prisma.opportunity.aggregate({
        where: { pipelineId: pipeline.id, status: 'OPEN', deletedAt: null },
        _sum: { value: true },
      });
      result.push({
        ...pipeline,
        totalValue: totalValue._sum.value || 0,
      });
    }

    return result;
  }

  async findOne(tenantId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        stages: {
          orderBy: { position: 'asc' },
          include: { _count: { select: { opportunities: true } } },
        },
      },
    });

    if (!pipeline) throw new NotFoundException('Pipeline not found');

    // Compute stats per stage
    const stagesWithValues = [];
    for (const stage of pipeline.stages) {
      const agg = await this.prisma.opportunity.aggregate({
        where: { stageId: stage.id, status: 'OPEN', deletedAt: null },
        _sum: { value: true },
      });
      stagesWithValues.push({
        ...stage,
        totalValue: agg._sum.value || 0,
      });
    }

    return { ...pipeline, stages: stagesWithValues };
  }

  async update(tenantId: string, id: string, data: { name?: string; description?: string }) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    return this.prisma.pipeline.update({
      where: { id },
      data,
      include: { stages: { orderBy: { position: 'asc' } } },
    });
  }

  async delete(tenantId: string, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    return this.prisma.pipeline.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Stages ---

  async addStage(tenantId: string, pipelineId: string, data: { name: string; position: number; color?: string; probability?: number }) {
    const pipeline = await this.prisma.pipeline.findFirst({ where: { id: pipelineId, tenantId, deletedAt: null } });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    return this.prisma.pipelineStage.create({
      data: {
        tenantId,
        pipelineId,
        name: data.name,
        position: data.position,
        color: data.color,
        probability: data.probability || 0,
      },
    });
  }

  async updateStage(tenantId: string, pipelineId: string, stageId: string, data: { name?: string; color?: string; position?: number; probability?: number }) {
    const stage = await this.prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId, tenantId } });
    if (!stage) throw new NotFoundException('Stage not found');

    return this.prisma.pipelineStage.update({ where: { id: stageId }, data });
  }

  async deleteStage(tenantId: string, pipelineId: string, stageId: string) {
    const stage = await this.prisma.pipelineStage.findFirst({ where: { id: stageId, pipelineId, tenantId } });
    if (!stage) throw new NotFoundException('Stage not found');

    // Check for opportunities in this stage
    const count = await this.prisma.opportunity.count({ where: { stageId, deletedAt: null } });
    if (count > 0) {
      throw new NotFoundException(`Cannot delete stage with ${count} active opportunities. Move them first.`);
    }

    return this.prisma.pipelineStage.delete({ where: { id: stageId } });
  }

  // --- Opportunities ---

  async createOpportunity(tenantId: string, data: {
    name: string;
    pipelineId: string;
    stageId: string;
    contactId: string;
    value?: number;
    assigneeId?: string;
    expectedCloseDate?: string;
    source?: string;
  }) {
    return this.prisma.opportunity.create({
      data: {
        tenantId,
        name: data.name,
        pipelineId: data.pipelineId,
        stageId: data.stageId,
        contactId: data.contactId,
        value: data.value,
        assigneeId: data.assigneeId,
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        source: data.source,
        status: 'OPEN',
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async listOpportunities(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (query.pipelineId) where.pipelineId = query.pipelineId;
    if (query.stageId) where.stageId = query.stageId;
    if (query.status) where.status = query.status;
    if (query.assigneeId) where.assigneeId = query.assigneeId;

    if (query.minValue || query.maxValue) {
      where.value = {};
      if (query.minValue) (where.value as any).gte = parseFloat(query.minValue);
      if (query.maxValue) (where.value as any).lte = parseFloat(query.maxValue);
    }

    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          stage: { select: { id: true, name: true, color: true, position: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          pipeline: { select: { id: true, name: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOpportunity(tenantId: string, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
        pipeline: { select: { id: true, name: true } },
        tasks: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');
    return opp;
  }

  async updateOpportunity(tenantId: string, id: string, data: {
    name?: string;
    stageId?: string;
    value?: number;
    assigneeId?: string;
    status?: string;
    lostReason?: string;
    expectedCloseDate?: string;
  }) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.stageId !== undefined) updateData.stageId = data.stageId;
    if (data.value !== undefined) updateData.value = data.value;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.expectedCloseDate !== undefined) updateData.expectedCloseDate = new Date(data.expectedCloseDate);

    // Handle status changes (won/lost tracking)
    if (data.status) {
      updateData.status = data.status;
      if (data.status === 'WON') updateData.wonDate = new Date();
      if (data.status === 'LOST') {
        updateData.lostDate = new Date();
        if (data.lostReason) updateData.lostReason = data.lostReason;
      }
    }

    return this.prisma.opportunity.update({
      where: { id },
      data: updateData,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        stage: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async deleteOpportunity(tenantId: string, id: string) {
    const opp = await this.prisma.opportunity.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!opp) throw new NotFoundException('Opportunity not found');

    return this.prisma.opportunity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async addOpportunityNote(tenantId: string, opportunityId: string, userId: string, content: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id: opportunityId, tenantId, deletedAt: null },
    });
    if (!opp) throw new NotFoundException('Opportunity not found');

    // Use contact notes linked to the opportunity's contact
    return this.prisma.contactNote.create({
      data: { tenantId, contactId: opp.contactId, userId, content },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async addOpportunityTask(tenantId: string, opportunityId: string, userId: string, data: {
    title: string;
    description?: string;
    dueDate?: string;
    assigneeId?: string;
    priority?: string;
  }) {
    const opp = await this.prisma.opportunity.findFirst({ where: { id: opportunityId, tenantId, deletedAt: null } });
    if (!opp) throw new NotFoundException('Opportunity not found');

    return this.prisma.task.create({
      data: {
        tenantId,
        opportunityId,
        contactId: opp.contactId,
        createdById: userId,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId || userId,
        priority: (data.priority as any) || 'MEDIUM',
      },
    });
  }

  // --- Pipeline Report ---

  async getPipelineReport(tenantId: string, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, deletedAt: null },
    });
    if (!pipeline) throw new NotFoundException('Pipeline not found');

    const stages = await this.prisma.pipelineStage.findMany({
      where: { pipelineId, tenantId },
      orderBy: { position: 'asc' },
    });

    const stageStats = [];
    for (const stage of stages) {
      const [count, agg, wonCount, lostCount] = await Promise.all([
        this.prisma.opportunity.count({ where: { stageId: stage.id, status: 'OPEN', deletedAt: null } }),
        this.prisma.opportunity.aggregate({
          where: { stageId: stage.id, status: 'OPEN', deletedAt: null },
          _sum: { value: true },
          _avg: { value: true },
        }),
        this.prisma.opportunity.count({ where: { stageId: stage.id, status: 'WON' } }),
        this.prisma.opportunity.count({ where: { stageId: stage.id, status: 'LOST' } }),
      ]);

      stageStats.push({
        id: stage.id,
        name: stage.name,
        position: stage.position,
        probability: stage.probability,
        openCount: count,
        totalValue: agg._sum.value || 0,
        avgValue: agg._avg.value || 0,
        wonCount,
        lostCount,
        conversionRate: wonCount + lostCount > 0
          ? ((wonCount / (wonCount + lostCount)) * 100).toFixed(1)
          : '0',
      });
    }

    const totalPipeline = await this.prisma.opportunity.aggregate({
      where: { pipelineId, deletedAt: null },
      _sum: { value: true },
      _count: true,
    });

    return {
      pipeline: { id: pipeline.id, name: pipeline.name },
      stages: stageStats,
      totals: {
        totalOpportunities: totalPipeline._count,
        totalValue: totalPipeline._sum.value || 0,
      },
    };
  }
}
