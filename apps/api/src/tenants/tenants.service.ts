import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import { EmailService } from '../common/services/email.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private emailService: EmailService,
  ) {}

  async listUserTenants(userId: string) {
    const memberships = await this.prisma.tenantMembership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            logoUrl: true,
            plan: true,
            createdAt: true,
          },
        },
        role: { select: { id: true, name: true } },
      },
    });

    return memberships.map((m) => ({
      ...m.tenant,
      role: m.role.name,
      membershipId: m.id,
    }));
  }

  async create(dto: CreateTenantDto, userId: string) {
    // Generate slug
    const slug = this.generateSlug(dto.name);
    let finalSlug = slug;
    let counter = 0;
    while (await this.prisma.tenant.findUnique({ where: { slug: finalSlug } })) {
      counter++;
      finalSlug = `${slug}-${counter}`;
    }

    // If parentId, verify the user owns the parent tenant
    if (dto.parentId) {
      const parentMembership = await this.prisma.tenantMembership.findFirst({
        where: {
          tenantId: dto.parentId,
          userId,
          status: 'ACTIVE',
        },
        include: { role: true },
      });

      if (!parentMembership || parentMembership.role.name !== 'admin') {
        throw new ForbiddenException('Only admins can create sub-accounts');
      }

      const parent = await this.prisma.tenant.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.type !== 'AGENCY') {
        throw new BadRequestException('Sub-accounts can only be created under agency tenants');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          slug: finalSlug,
          type: dto.type || 'BUSINESS',
          parentId: dto.parentId || null,
          status: 'TRIAL',
          settings: {
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
          } as any,
        },
      });

      // Create default roles
      const adminRole = await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'admin',
          description: 'Full administrative access',
          isSystem: true,
          permissions: {
            contacts: ['create', 'read', 'update', 'delete'],
            pipelines: ['create', 'read', 'update', 'delete'],
            conversations: ['create', 'read', 'update', 'delete'],
            forms: ['create', 'read', 'update', 'delete'],
            calendars: ['create', 'read', 'update', 'delete'],
            workflows: ['create', 'read', 'update', 'delete'],
            payments: ['create', 'read', 'update', 'delete'],
            funnels: ['create', 'read', 'update', 'delete'],
            social: ['create', 'read', 'update', 'delete'],
            reporting: ['read'],
            settings: ['read', 'update'],
            members: ['create', 'read', 'update', 'delete'],
            integrations: ['create', 'read', 'update', 'delete'],
          } as any,
        },
      });

      await tx.role.create({
        data: {
          tenantId: tenant.id,
          name: 'member',
          description: 'Standard team member',
          isSystem: true,
          permissions: {
            contacts: ['create', 'read', 'update'],
            pipelines: ['read', 'update'],
            conversations: ['create', 'read', 'update'],
            forms: ['read'],
            calendars: ['read', 'update'],
            workflows: ['read'],
            reporting: ['read'],
          } as any,
        },
      });

      // Create membership for creator
      await tx.tenantMembership.create({
        data: {
          userId,
          tenantId: tenant.id,
          roleId: adminRole.id,
          status: 'ACTIVE',
        },
      });

      return tenant;
    });
  }

  async findOne(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        _count: {
          select: {
            memberships: true,
            contacts: true,
            pipelines: true,
            workflows: true,
            children: true,
          },
        },
      },
    });
  }

  async update(tenantId: string, userId: string, dto: UpdateTenantDto) {
    await this.verifyAdminAccess(tenantId, userId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: dto.name,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        customDomain: dto.customDomain,
        settings: dto.settings as any,
      },
    });
  }

  async delete(tenantId: string, userId: string) {
    await this.verifyAdminAccess(tenantId, userId);

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { deletedAt: new Date(), status: 'CANCELLED' },
    });
  }

  async listSubAccounts(tenantId: string, userId: string, query: Record<string, string>) {
    await this.verifyAdminAccess(tenantId, userId);

    const params = parsePagination(query);

    const where = {
      parentId: tenantId,
      deletedAt: null,
    };

    const [data, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          _count: {
            select: { memberships: true, contacts: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async inviteMember(tenantId: string, userId: string, dto: InviteMemberDto) {
    await this.verifyAdminAccess(tenantId, userId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check if user already has membership
    let targetUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (targetUser) {
      const existing = await this.prisma.tenantMembership.findUnique({
        where: {
          tenantId_userId: { tenantId, userId: targetUser.id },
        },
      });

      if (existing) {
        throw new BadRequestException('User is already a member of this tenant');
      }
    }

    // Get the role
    let roleId = dto.roleId;
    if (!roleId) {
      const memberRole = await this.prisma.role.findFirst({
        where: { tenantId, name: 'member' },
      });
      if (!memberRole) {
        throw new BadRequestException('Default member role not found');
      }
      roleId = memberRole.id;
    }

    const inviteToken = this.cryptoService.generateToken();
    const inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // If user doesn't exist, we still create the membership (they'll register later)
    if (!targetUser) {
      // Create a placeholder user
      targetUser = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash: '', // Will be set on registration/invite acceptance
          status: 'ACTIVE',
        },
      });
    }

    const membership = await this.prisma.tenantMembership.create({
      data: {
        userId: targetUser.id,
        tenantId,
        roleId,
        status: 'INVITED',
        inviteToken,
        inviteExpiry,
      },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
        role: { select: { name: true } },
      },
    });

    // Get inviter name
    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true },
    });

    const inviterName = inviter
      ? `${inviter.firstName || ''} ${inviter.lastName || ''}`.trim() || inviter.email
      : 'A team member';

    await this.emailService
      .sendInviteEmail(dto.email, inviterName, tenant.name, inviteToken)
      .catch((err) => this.logger.error(`Failed to send invite email: ${err.message}`));

    return membership;
  }

  async listMembers(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    return this.prisma.tenantMembership.findMany({
      where: { tenantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            lastLoginAt: true,
          },
        },
        role: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateMember(tenantId: string, memberId: string, userId: string, dto: UpdateMemberDto) {
    await this.verifyAdminAccess(tenantId, userId);

    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    // Prevent admin from demoting themselves
    if (membership.userId === userId && dto.roleId) {
      const newRole = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
      if (newRole && newRole.name !== 'admin') {
        throw new BadRequestException('You cannot change your own admin role');
      }
    }

    return this.prisma.tenantMembership.update({
      where: { id: memberId },
      data: {
        roleId: dto.roleId,
        status: dto.status,
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        role: { select: { id: true, name: true } },
      },
    });
  }

  async removeMember(tenantId: string, memberId: string, userId: string) {
    await this.verifyAdminAccess(tenantId, userId);

    const membership = await this.prisma.tenantMembership.findFirst({
      where: { id: memberId, tenantId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.userId === userId) {
      throw new BadRequestException('You cannot remove yourself from the tenant');
    }

    return this.prisma.tenantMembership.delete({
      where: { id: memberId },
    });
  }

  async switchTenant(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: {
        role: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
            status: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You do not have active access to this tenant');
    }

    if (membership.tenant.status === 'CANCELLED' || membership.tenant.status === 'SUSPENDED') {
      throw new ForbiddenException('This tenant is no longer active');
    }

    return {
      tenant: membership.tenant,
      role: membership.role,
    };
  }

  private async verifyAdminAccess(tenantId: string, userId: string) {
    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: { tenantId, userId },
      },
      include: { role: true },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    if (membership.role.name !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }
}
