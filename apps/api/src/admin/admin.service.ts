import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async listAllTenants(query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          _count: { select: { memberships: true, contacts: true } },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getTenantDetail(tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null },
      include: {
        _count: {
          select: {
            memberships: true,
            contacts: true,
            pipelines: true,
            workflows: true,
            forms: true,
            conversations: true,
          },
        },
        tenantBilling: { include: { billingPlan: true } },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenant(tenantId: string, data: { status?: string; plan?: string; settings?: Record<string, unknown> }) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data,
    });
  }

  async listAllUsers(query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { deletedAt: null };

    if (query.status) where.status = query.status;
    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
          emailVerified: true,
          lastLoginAt: true,
          createdAt: true,
          _count: { select: { memberships: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getSystemMetrics() {
    const [tenants, users, contacts, conversations, workflows, appointments, orders] = await Promise.all([
      this.prisma.tenant.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.contact.count({ where: { deletedAt: null } }),
      this.prisma.conversation.count(),
      this.prisma.workflow.count({ where: { deletedAt: null } }),
      this.prisma.appointment.count(),
      this.prisma.order.count(),
    ]);

    return {
      tenants,
      users,
      contacts,
      conversations,
      workflows,
      appointments,
      orders,
    };
  }

  async getSystemHealth() {
    const checks: Record<string, { status: string; latency?: number }> = {};

    // DB health
    const dbStart = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', latency: Date.now() - dbStart };
    } catch {
      checks.database = { status: 'unhealthy', latency: Date.now() - dbStart };
    }

    // Basic system check
    checks.api = { status: 'healthy' };
    checks.memory = {
      status: 'healthy',
      latency: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    };

    const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  async getAuditLogs(query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = {};

    if (query.tenantId) where.tenantId = query.tenantId;
    if (query.action) where.action = { contains: query.action };
    if (query.userId) where.userId = query.userId;
    if (query.entityType) where.entityType = query.entityType;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async listFeatureFlags() {
    return this.prisma.featureFlag.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async toggleFeatureFlag(flagId: string, isEnabled: boolean) {
    const flag = await this.prisma.featureFlag.findUnique({ where: { id: flagId } });
    if (!flag) throw new NotFoundException('Feature flag not found');

    return this.prisma.featureFlag.update({
      where: { id: flagId },
      data: { isEnabled },
    });
  }

  async suspendTenant(tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'SUSPENDED' },
    });
  }

  async activateTenant(tenantId: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'ACTIVE' },
    });
  }

  async impersonateTenant(adminUserId: string, tenantId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { id: tenantId, deletedAt: null } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    // Log impersonation for audit
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: 'admin.impersonate',
        entityType: 'tenant',
        entityId: tenantId,
        metadata: { impersonatedBy: adminUserId },
      },
    });

    return {
      tenantId: tenant.id,
      tenantName: tenant.name,
      message: 'Impersonation session started. Use tenant context headers.',
    };
  }
}
