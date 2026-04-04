import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  async listAccounts(tenantId: string) {
    return this.prisma.socialAccount.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async connectAccount(tenantId: string, data: {
    platform: string;
    accountId: string;
    accountName?: string;
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: string;
  }) {
    return this.prisma.socialAccount.create({
      data: {
        tenantId,
        platform: data.platform as any,
        accountId: data.accountId,
        accountName: data.accountName,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        tokenExpiry: data.tokenExpiry ? new Date(data.tokenExpiry) : null,
        isActive: true,
      },
    });
  }

  async disconnectAccount(tenantId: string, id: string) {
    const account = await this.prisma.socialAccount.findFirst({ where: { id, tenantId } });
    if (!account) throw new NotFoundException('Social account not found');

    return this.prisma.socialAccount.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async createPost(tenantId: string, data: {
    content?: string;
    platforms?: string[];
    mediaUrls?: string[];
    scheduledAt?: string;
  }) {
    return this.prisma.socialPost.create({
      data: {
        tenantId,
        content: data.content,
        platforms: data.platforms || [],
        mediaUrls: data.mediaUrls || [],
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      },
    });
  }

  async listPosts(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.platform) {
      where.platforms = { array_contains: [query.platform] };
    }

    const [data, total] = await Promise.all([
      this.prisma.socialPost.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.socialPost.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findPost(tenantId: string, id: string) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');
    return post;
  }

  async updatePost(tenantId: string, id: string, data: {
    content?: string;
    platforms?: string[];
    mediaUrls?: string[];
    scheduledAt?: string;
  }) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');

    const updateData: Record<string, unknown> = {};
    if (data.content !== undefined) updateData.content = data.content;
    if (data.platforms !== undefined) updateData.platforms = data.platforms;
    if (data.mediaUrls !== undefined) updateData.mediaUrls = data.mediaUrls;
    if (data.scheduledAt !== undefined) {
      updateData.scheduledAt = new Date(data.scheduledAt);
      updateData.status = 'SCHEDULED';
    }

    return this.prisma.socialPost.update({ where: { id }, data: updateData });
  }

  async deletePost(tenantId: string, id: string) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');

    return this.prisma.socialPost.delete({ where: { id } });
  }

  async approvePost(tenantId: string, id: string, userId: string) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');

    return this.prisma.socialPost.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', approvedBy: userId },
    });
  }

  async publishPost(tenantId: string, id: string) {
    const post = await this.prisma.socialPost.findFirst({ where: { id, tenantId } });
    if (!post) throw new NotFoundException('Social post not found');

    // In a real implementation, this would call each platform's API
    return this.prisma.socialPost.update({
      where: { id },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
  }

  async getCalendar(tenantId: string, query: Record<string, string>) {
    const startDate = query.startDate ? new Date(query.startDate) : new Date();
    const endDate = query.endDate
      ? new Date(query.endDate)
      : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    return this.prisma.socialPost.findMany({
      where: {
        tenantId,
        status: { in: ['SCHEDULED', 'PUBLISHED'] },
        OR: [
          { scheduledAt: { gte: startDate, lte: endDate } },
          { publishedAt: { gte: startDate, lte: endDate } },
        ],
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}
