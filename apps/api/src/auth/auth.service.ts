import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import { EmailService } from '../common/services/email.service';
import { RegisterDto } from './dto/register.dto';

interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string;
  roleId: string;
  permissions: string[];
  sessionId: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface UserWithMembership {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  memberships: Array<{
    id: string;
    tenantId: string;
    roleId: string;
    status: string;
    role: {
      id: string;
      name: string;
      permissions: unknown;
    };
    tenant: {
      id: string;
      name: string;
      slug: string;
      type: string;
      status: string;
      logoUrl: string | null;
    };
  }>;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.cryptoService.hashPassword(dto.password);
    const emailVerifyToken = this.cryptoService.generateToken();

    // Create user, tenant, role, and membership in a transaction
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Create user
      const user = await tx.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          emailVerifyToken,
        },
      });

      // Create tenant slug from company name or user name
      const baseName = dto.companyName || `${dto.firstName} ${dto.lastName}`;
      const slug = this.generateSlug(baseName);

      // Ensure slug uniqueness
      let finalSlug = slug;
      let counter = 0;
      while (await tx.tenant.findUnique({ where: { slug: finalSlug } })) {
        counter++;
        finalSlug = `${slug}-${counter}`;
      }

      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: dto.companyName || `${dto.firstName}'s Business`,
          slug: finalSlug,
          type: 'BUSINESS',
          status: 'TRIAL',
          settings: {
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
            currency: 'USD',
          } as any,
        },
      });

      // Create default admin role for the tenant
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

      // Create default member role
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

      // Create membership (user -> tenant as admin)
      const membership = await tx.tenantMembership.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          roleId: adminRole.id,
          status: 'ACTIVE',
        },
      });

      return { user, tenant, membership, adminRole };
    });

    // Send verification email (non-blocking)
    this.emailService
      .sendVerificationEmail(result.user.email, emailVerifyToken, dto.firstName)
      .catch((err) => this.logger.error(`Failed to send verification email: ${err.message}`));

    // Create session and generate tokens
    const session = await this.createSession(
      result.user.id,
      result.tenant.id,
      undefined,
      undefined,
    );

    const permissions = this.extractPermissions(result.adminRole.permissions);

    const tokens = this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      tenantId: result.tenant.id,
      roleId: result.adminRole.id,
      permissions,
      sessionId: session.id,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        emailVerified: false,
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        type: result.tenant.type,
      },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Get user's memberships with roles
    const userWithMemberships = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
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
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!userWithMemberships || userWithMemberships.memberships.length === 0) {
      throw new UnauthorizedException('No active tenant membership found');
    }

    // Use first membership's tenant as default
    const primaryMembership = userWithMemberships.memberships[0]!;
    const permissions = this.extractPermissions(primaryMembership.role.permissions);

    // Create session
    const session = await this.createSession(
      user.id,
      primaryMembership.tenantId,
      undefined,
      undefined,
    );

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: primaryMembership.tenantId,
      roleId: primaryMembership.roleId,
      permissions,
      sessionId: session.id,
    });

    return {
      user: {
        id: userWithMemberships.id,
        email: userWithMemberships.email,
        firstName: userWithMemberships.firstName,
        lastName: userWithMemberships.lastName,
        avatarUrl: userWithMemberships.avatarUrl,
        emailVerified: userWithMemberships.emailVerified,
      },
      tenant: {
        id: primaryMembership.tenant.id,
        name: primaryMembership.tenant.name,
        slug: primaryMembership.tenant.slug,
        type: primaryMembership.tenant.type,
      },
      tenants: userWithMemberships.memberships.map((m: any) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        type: m.tenant.type,
        role: m.role.name,
      })),
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    let payload: TokenPayload;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'omniflow-refresh-secret'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Verify user and session still valid
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, status: 'ACTIVE', deletedAt: null },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const session = await this.prisma.session.findFirst({
      where: {
        id: payload.sessionId,
        userId: payload.sub,
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      throw new UnauthorizedException('Session expired');
    }

    // Get current role/permissions
    const membership = await this.prisma.tenantMembership.findFirst({
      where: {
        userId: payload.sub,
        tenantId: payload.tenantId,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    if (!membership) {
      throw new UnauthorizedException('Membership no longer active');
    }

    const permissions = this.extractPermissions(membership.role.permissions);

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      tenantId: payload.tenantId,
      roleId: membership.roleId,
      permissions,
      sessionId: session.id,
    });

    // Extend session expiry
    await this.prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists, a password reset email has been sent' };
    }

    const resetToken = this.cryptoService.generateToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpiry: resetExpiry,
      },
    });

    await this.emailService
      .sendPasswordResetEmail(user.email, resetToken, user.firstName || undefined)
      .catch((err) => this.logger.error(`Failed to send reset email: ${err.message}`));

    return { message: 'If an account exists, a password reset email has been sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await this.cryptoService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiry: null,
      },
    });

    // Revoke all sessions for security
    await this.prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return { message: 'Password has been reset successfully' };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerifyToken: token,
        emailVerified: false,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = await this.cryptoService.comparePassword(oldPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await this.cryptoService.hashPassword(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  async logout(userId: string, sessionId?: string) {
    if (sessionId) {
      await this.prisma.session.deleteMany({
        where: { id: sessionId, userId },
      });
    } else {
      // Logout all sessions
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }

    return { message: 'Logged out successfully' };
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'ACTIVE',
        deletedAt: null,
      },
    });

    if (!user) {
      return null;
    }

    const isPasswordValid = await this.cryptoService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return null;
    }

    return { id: user.id, email: user.email };
  }

  async getMe(userId: string, tenantId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        phone: true,
        emailVerified: true,
        mfaEnabled: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership = await this.prisma.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
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
            faviconUrl: true,
            primaryColor: true,
            plan: true,
            settings: true,
          },
        },
      },
    });

    // Get all tenant memberships
    const allMemberships = await this.prisma.tenantMembership.findMany({
      where: { userId, status: 'ACTIVE' },
      include: {
        tenant: {
          select: { id: true, name: true, slug: true, type: true, logoUrl: true },
        },
        role: { select: { name: true } },
      },
    });

    return {
      user,
      currentTenant: membership?.tenant,
      role: membership?.role,
      tenants: allMemberships.map((m: any) => ({
        id: m.tenant.id,
        name: m.tenant.name,
        slug: m.tenant.slug,
        type: m.tenant.type,
        logoUrl: m.tenant.logoUrl,
        role: m.role.name,
      })),
    };
  }

  async impersonate(
    adminUserId: string,
    tenantId: string,
    targetUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Verify admin user has admin role
    const adminMembership = await this.prisma.tenantMembership.findFirst({
      where: {
        userId: adminUserId,
        tenantId,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    if (!adminMembership || adminMembership.role.name !== 'admin') {
      throw new UnauthorizedException('Admin access required for impersonation');
    }

    // Find target user
    const targetUser = await this.prisma.user.findFirst({
      where: { id: targetUserId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      throw new BadRequestException('Target user not found or inactive');
    }

    // Find target user's membership in this tenant
    const targetMembership = await this.prisma.tenantMembership.findFirst({
      where: {
        userId: targetUserId,
        tenantId,
        status: 'ACTIVE',
      },
      include: { role: true },
    });

    if (!targetMembership) {
      throw new BadRequestException('Target user is not a member of this tenant');
    }

    // Create audit log for impersonation
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: adminUserId,
        action: 'IMPERSONATE',
        entityType: 'user',
        entityId: targetUserId,
        metadata: {
          targetUserEmail: targetUser.email,
          adminUserId,
          ipAddress,
          userAgent,
        } as any,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    });

    // Create session as target user
    const session = await this.createSession(targetUserId, tenantId, ipAddress, userAgent);

    const permissions = this.extractPermissions(targetMembership.role.permissions);

    const tokens = this.generateTokens({
      sub: targetUserId,
      email: targetUser.email,
      tenantId,
      roleId: targetMembership.roleId,
      permissions,
      sessionId: session.id,
    });

    this.logger.warn(
      `Admin ${adminUserId} impersonating user ${targetUserId} in tenant ${tenantId}`,
    );

    return {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
      },
      impersonatedBy: adminUserId,
      ...tokens,
    };
  }

  generateTokens(payload: TokenPayload): TokenPair {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET', 'omniflow-jwt-secret-change-in-production'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET', 'omniflow-refresh-secret'),
      expiresIn: '7d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  async createSession(
    userId: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const token = this.cryptoService.generateToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.session.create({
      data: {
        userId,
        tenantId,
        token,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt,
      },
    });
  }

  private extractPermissions(permissionsJson: unknown): string[] {
    if (!permissionsJson || typeof permissionsJson !== 'object') return [];

    const permissions: string[] = [];
    const perms = permissionsJson as Record<string, string[]>;

    for (const [resource, actions] of Object.entries(perms)) {
      if (Array.isArray(actions)) {
        for (const action of actions) {
          permissions.push(`${resource}:${action}`);
        }
      }
    }

    return permissions;
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
