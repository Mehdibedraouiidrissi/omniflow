import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationGateway: NotificationGateway,
  ) {}

  async list(tenantId: string, userId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, userId };

    if (query.read === 'true') where.isRead = true;
    if (query.read === 'false') where.isRead = false;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getUnreadCount(tenantId: string, userId: string) {
    const count = await this.prisma.notification.count({
      where: { tenantId, userId, isRead: false },
    });

    return { unreadCount: count };
  }

  async markAsRead(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });

    // Send updated unread count via WebSocket
    const { unreadCount } = await this.getUnreadCount(tenantId, userId);
    this.notificationGateway.sendUnreadCount(userId, unreadCount);

    return updated;
  }

  async markAllAsRead(tenantId: string, userId: string) {
    await this.prisma.notification.updateMany({
      where: { tenantId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });

    // Send updated unread count via WebSocket
    this.notificationGateway.sendUnreadCount(userId, 0);

    return { message: 'All notifications marked as read' };
  }

  async createNotification(tenantId: string, userId: string, data: {
    type: string;
    title: string;
    body?: string;
    link?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notificationData: Record<string, unknown> = {
      link: data.link,
      ...data.metadata,
    };

    const notification = await this.prisma.notification.create({
      data: {
        tenantId,
        userId,
        type: data.type,
        title: data.title,
        body: data.body,
        data: notificationData as any,
      },
    });

    // Push notification via WebSocket in real-time
    this.notificationGateway.sendToUser(userId, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body ?? '',
      metadata: notificationData as Record<string, unknown>,
      createdAt: notification.createdAt,
    });

    return notification;
  }

  async deleteNotification(tenantId: string, userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });

    if (!notification) throw new NotFoundException('Notification not found');

    await this.prisma.notification.delete({ where: { id: notificationId } });

    // Send updated unread count if the notification was unread
    if (!notification.isRead) {
      const { unreadCount } = await this.getUnreadCount(tenantId, userId);
      this.notificationGateway.sendUnreadCount(userId, unreadCount);
    }
  }
}
