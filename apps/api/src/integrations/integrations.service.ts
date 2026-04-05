import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CryptoService } from '../common/services/crypto.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class IntegrationsService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
  ) {}

  async list(tenantId: string) {
    return this.prisma.integration.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        status: true,
        config: true,
        lastSyncAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async connect(tenantId: string, data: {
    provider: string;
    config?: Record<string, unknown>;
  }) {
    return this.prisma.integration.create({
      data: {
        tenantId,
        provider: data.provider,
        config: (data.config || {}) as any,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        provider: true,
        status: true,
        config: true,
        createdAt: true,
      },
    });
  }

  async disconnect(tenantId: string, id: string) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.integration.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });
  }

  async updateConfig(tenantId: string, id: string, config: Record<string, unknown>) {
    const integration = await this.prisma.integration.findFirst({ where: { id, tenantId } });
    if (!integration) throw new NotFoundException('Integration not found');

    return this.prisma.integration.update({
      where: { id },
      data: { config: config as any },
      select: {
        id: true,
        provider: true,
        status: true,
        config: true,
        updatedAt: true,
      },
    });
  }

  // API Keys management
  async listApiKeys(tenantId: string, userId: string) {
    return this.prisma.apiKey.findMany({
      where: { tenantId, userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createApiKey(tenantId: string, userId: string, data: { name: string; expiresInDays?: number }) {
    const rawKey = `nxs_${this.cryptoService.generateToken(32)}`;
    const hashedKey = await this.cryptoService.hashPassword(rawKey);

    const apiKey = await this.prisma.apiKey.create({
      data: {
        tenantId,
        userId,
        name: data.name,
        keyHash: hashedKey,
        keyPrefix: rawKey.substring(0, 12),
        expiresAt: data.expiresInDays
          ? new Date(Date.now() + data.expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey,
      keyPrefix: apiKey.keyPrefix,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  async revokeApiKey(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');

    return this.prisma.apiKey.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async getApiKeyUsage(tenantId: string, id: string) {
    const key = await this.prisma.apiKey.findFirst({ where: { id, tenantId } });
    if (!key) throw new NotFoundException('API key not found');

    return {
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
    };
  }
}
