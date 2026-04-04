// =============================================================================
// AuthService Unit Tests
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoService } from '../../common/services/crypto.service';
import { EmailService } from '../../common/services/email.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  tenant: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  role: {
    create: jest.fn(),
  },
  tenantMembership: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string, defaultValue?: string) => defaultValue || 'test-secret'),
};

const mockCryptoService = {
  hashPassword: jest.fn(),
  comparePassword: jest.fn(),
  generateToken: jest.fn(),
};

const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CryptoService, useValue: mockCryptoService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // =========================================================================
  // register
  // =========================================================================

  describe('register', () => {
    const registerDto = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      companyName: 'Test Corp',
    };

    it('should register a new user, create tenant, and return tokens', async () => {
      // User does not exist yet
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Crypto mocks
      mockCryptoService.hashPassword.mockResolvedValue('hashed_password');
      mockCryptoService.generateToken.mockReturnValue('verify_token_123');

      // Transaction mock - simulates the full transaction
      const mockUser = {
        id: 'user_1',
        email: 'newuser@example.com',
        firstName: 'John',
        lastName: 'Doe',
        emailVerified: false,
      };
      const mockTenant = {
        id: 'tenant_1',
        name: 'Test Corp',
        slug: 'test-corp',
        type: 'BUSINESS',
      };
      const mockRole = {
        id: 'role_1',
        name: 'admin',
        permissions: {
          contacts: ['create', 'read', 'update', 'delete'],
        },
      };
      const mockMembership = { id: 'membership_1' };

      mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
        const tx = {
          user: { create: jest.fn().mockResolvedValue(mockUser) },
          tenant: {
            create: jest.fn().mockResolvedValue(mockTenant),
            findUnique: jest.fn().mockResolvedValue(null),
          },
          role: { create: jest.fn().mockResolvedValue(mockRole) },
          tenantMembership: { create: jest.fn().mockResolvedValue(mockMembership) },
        };
        return fn(tx);
      });

      // Session creation
      mockPrisma.session.create.mockResolvedValue({
        id: 'session_1',
        token: 'session_token',
        expiresAt: new Date(),
      });

      // Token generation
      mockJwtService.sign
        .mockReturnValueOnce('access_token_abc')
        .mockReturnValueOnce('refresh_token_xyz');

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.tenant.name).toBe('Test Corp');
      expect(mockCryptoService.hashPassword).toHaveBeenCalledWith('SecurePass123!');
      expect(mockEmailService.sendVerificationEmail).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing_user',
        email: 'newuser@example.com',
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // login
  // =========================================================================

  describe('login', () => {
    const email = 'user@example.com';
    const password = 'TestPass123!';

    it('should login with correct credentials and return tokens', async () => {
      // validateUser finds the user
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'user_1',
        email,
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
        deletedAt: null,
      });
      mockCryptoService.comparePassword.mockResolvedValue(true);

      // Get memberships
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email,
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: null,
        emailVerified: true,
        memberships: [
          {
            id: 'membership_1',
            tenantId: 'tenant_1',
            roleId: 'role_1',
            status: 'ACTIVE',
            createdAt: new Date(),
            role: {
              id: 'role_1',
              name: 'admin',
              permissions: { contacts: ['create', 'read', 'update', 'delete'] },
            },
            tenant: {
              id: 'tenant_1',
              name: 'Test Tenant',
              slug: 'test-tenant',
              type: 'BUSINESS',
              status: 'ACTIVE',
              logoUrl: null,
            },
          },
        ],
      });

      // Session
      mockPrisma.session.create.mockResolvedValue({
        id: 'session_1',
        token: 'session_token',
        expiresAt: new Date(),
      });

      // Update lastLoginAt
      mockPrisma.user.update.mockResolvedValue({});

      // Tokens
      mockJwtService.sign
        .mockReturnValueOnce('access_token')
        .mockReturnValueOnce('refresh_token');

      const result = await service.login(email, password);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tenant');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user.email).toBe(email);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'user_1',
        email,
        passwordHash: 'hashed_password',
        status: 'ACTIVE',
        deletedAt: null,
      });
      mockCryptoService.comparePassword.mockResolvedValue(false);

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce(null);

      await expect(service.login('nobody@example.com', password)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if user has no active memberships', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({
        id: 'user_1',
        email,
        passwordHash: 'hash',
        status: 'ACTIVE',
        deletedAt: null,
      });
      mockCryptoService.comparePassword.mockResolvedValue(true);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email,
        memberships: [],
      });

      await expect(service.login(email, password)).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // generateTokens
  // =========================================================================

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      mockJwtService.sign
        .mockReturnValueOnce('access_jwt')
        .mockReturnValueOnce('refresh_jwt');

      const payload = {
        sub: 'user_1',
        email: 'user@test.com',
        tenantId: 'tenant_1',
        roleId: 'role_1',
        permissions: ['contacts:read'],
        sessionId: 'session_1',
      };

      const result = service.generateTokens(payload);

      expect(result).toEqual({
        accessToken: 'access_jwt',
        refreshToken: 'refresh_jwt',
        expiresIn: 900,
      });

      // Access token signed with JWT_SECRET
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, expect.objectContaining({
        expiresIn: '15m',
      }));

      // Refresh token signed with JWT_REFRESH_SECRET
      expect(mockJwtService.sign).toHaveBeenCalledWith(payload, expect.objectContaining({
        expiresIn: '7d',
      }));
    });
  });

  // =========================================================================
  // refreshToken
  // =========================================================================

  describe('refreshToken', () => {
    it('should refresh tokens when refresh token is valid', async () => {
      const decodedPayload = {
        sub: 'user_1',
        email: 'user@test.com',
        tenantId: 'tenant_1',
        roleId: 'role_1',
        permissions: [],
        sessionId: 'session_1',
      };

      mockJwtService.verify.mockReturnValue(decodedPayload);

      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'user@test.com',
      });

      mockPrisma.session.findFirst.mockResolvedValue({
        id: 'session_1',
        userId: 'user_1',
        expiresAt: new Date(Date.now() + 86400_000),
      });

      mockPrisma.tenantMembership.findFirst.mockResolvedValue({
        userId: 'user_1',
        tenantId: 'tenant_1',
        roleId: 'role_1',
        status: 'ACTIVE',
        role: {
          id: 'role_1',
          name: 'admin',
          permissions: { contacts: ['read'] },
        },
      });

      mockPrisma.session.update.mockResolvedValue({});

      mockJwtService.sign
        .mockReturnValueOnce('new_access')
        .mockReturnValueOnce('new_refresh');

      const result = await service.refreshToken('valid_refresh_token');

      expect(result.accessToken).toBe('new_access');
      expect(result.refreshToken).toBe('new_refresh');
      expect(mockPrisma.session.update).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('bad_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if session is expired', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user_1',
        email: 'user@test.com',
        tenantId: 'tenant_1',
        sessionId: 'session_1',
      });

      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user_1', email: 'user@test.com' });
      mockPrisma.session.findFirst.mockResolvedValue(null); // No valid session

      await expect(service.refreshToken('expired_token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // =========================================================================
  // logout
  // =========================================================================

  describe('logout', () => {
    it('should delete specific session when sessionId provided', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.logout('user_1', 'session_1');

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { id: 'session_1', userId: 'user_1' },
      });
    });

    it('should delete all sessions when no sessionId provided', async () => {
      mockPrisma.session.deleteMany.mockResolvedValue({ count: 3 });

      const result = await service.logout('user_1');

      expect(result.message).toBe('Logged out successfully');
      expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user_1' },
      });
    });
  });

  // =========================================================================
  // validateUser
  // =========================================================================

  describe('validateUser', () => {
    it('should return user info when credentials are correct', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'valid@test.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        deletedAt: null,
      });
      mockCryptoService.comparePassword.mockResolvedValue(true);

      const result = await service.validateUser('valid@test.com', 'password');

      expect(result).toEqual({ id: 'user_1', email: 'valid@test.com' });
    });

    it('should return null for non-existent user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null for incorrect password', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'user_1',
        email: 'user@test.com',
        passwordHash: 'hashed',
        status: 'ACTIVE',
        deletedAt: null,
      });
      mockCryptoService.comparePassword.mockResolvedValue(false);

      const result = await service.validateUser('user@test.com', 'wrong_password');

      expect(result).toBeNull();
    });
  });
});
