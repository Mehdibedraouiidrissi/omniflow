import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class FunnelsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: {
    name: string;
    description?: string;
    type?: string;
  }) {
    return this.prisma.funnel.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        type: (data.type as any) || 'CUSTOM',
        status: 'DRAFT',
      },
    });
  }

  async list(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (params.search) where.name = { contains: params.search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.funnel.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: { _count: { select: { pages: true } } },
      }),
      this.prisma.funnel.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOne(tenantId: string, id: string) {
    const funnel = await this.prisma.funnel.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        pages: { orderBy: { position: 'asc' } },
      },
    });
    if (!funnel) throw new NotFoundException('Funnel not found');
    return funnel;
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const funnel = await this.prisma.funnel.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!funnel) throw new NotFoundException('Funnel not found');
    return this.prisma.funnel.update({ where: { id }, data: data as any });
  }

  async delete(tenantId: string, id: string) {
    const funnel = await this.prisma.funnel.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!funnel) throw new NotFoundException('Funnel not found');
    return this.prisma.funnel.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async addPage(tenantId: string, funnelId: string, userId: string, data: {
    name: string;
    slug: string;
    path?: string;
    position: number;
  }) {
    const page = await this.prisma.page.create({
      data: {
        tenantId,
        funnelId,
        name: data.name,
        slug: data.slug,
        path: data.path,
        position: data.position,
        status: 'DRAFT',
      },
    });

    // Create first version
    await this.prisma.pageVersion.create({
      data: {
        tenantId,
        pageId: page.id,
        content: {} as any,
        publishedBy: userId,
      },
    });

    return page;
  }

  async updatePage(tenantId: string, pageId: string, userId: string, data: {
    content?: Record<string, unknown>;
    name?: string;
  }) {
    const page = await this.prisma.page.findFirst({ where: { id: pageId, tenantId } });
    if (!page) throw new NotFoundException('Page not found');

    if (data.name) {
      await this.prisma.page.update({ where: { id: pageId }, data: { name: data.name } });
    }

    if (data.content) {
      await this.prisma.pageVersion.create({
        data: {
          tenantId,
          pageId,
          content: data.content as any,
          publishedBy: userId,
        },
      });
    }

    return this.prisma.page.findUnique({
      where: { id: pageId },
      include: {
        versions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }
}
