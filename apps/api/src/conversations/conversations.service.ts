import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/services/email.service';
import { SmsService } from '../common/services/sms.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
  ) {}

  async list(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId };

    if (query.status) where.status = query.status;
    if (query.channel) where.channel = query.channel;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    if (query.contactId) where.contactId = query.contactId;
    if (query.unread === 'true') where.unreadCount = { gt: 0 };

    if (params.search) {
      where.OR = [
        { subject: { contains: params.search, mode: 'insensitive' } },
        { contact: { OR: [
          { email: { contains: params.search, mode: 'insensitive' } },
          { firstName: { contains: params.search, mode: 'insensitive' } },
          { lastName: { contains: params.search, mode: 'insensitive' } },
        ]}},
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { lastMessageAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatarUrl: true } },
          assignee: { select: { id: true, firstName: true, lastName: true } },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            select: { id: true, body: true, direction: true, createdAt: true },
          },
        },
      }),
      this.prisma.conversation.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOne(tenantId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, tenantId },
      include: {
        contact: {
          select: {
            id: true, firstName: true, lastName: true, email: true,
            phone: true, avatarUrl: true, companyName: true,
          },
        },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async getMessages(tenantId: string, conversationId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { tenantId, conversationId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.message.count({ where: { tenantId, conversationId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    userId: string,
    data: { body: string; channel?: string },
  ) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, tenantId },
      include: { contact: true },
    });

    if (!conversation) throw new NotFoundException('Conversation not found');

    const message = await this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        contactId: conversation.contactId,
        userId,
        channel: conversation.channel,
        direction: 'OUTBOUND',
        body: data.body,
        status: 'QUEUED',
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Route to appropriate provider
    try {
      if (conversation.channel === 'EMAIL' && conversation.contact.email) {
        await this.emailService.sendEmail({
          to: conversation.contact.email,
          subject: conversation.subject || 'Message from Omniflow',
          html: data.body,
        });
        await this.prisma.message.update({
          where: { id: message.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      } else if (conversation.channel === 'SMS' && conversation.contact.phone) {
        await this.smsService.sendSms({
          to: conversation.contact.phone,
          body: data.body,
        });
        await this.prisma.message.update({
          where: { id: message.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
      }
    } catch {
      await this.prisma.message.update({
        where: { id: message.id },
        data: { status: 'FAILED', failedAt: new Date() },
      });
    }

    // Update conversation last message
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date(), unreadCount: 0 },
    });

    return message;
  }

  async createConversation(
    tenantId: string,
    userId: string,
    data: { contactId: string; channel: string; subject?: string },
  ) {
    return this.prisma.conversation.create({
      data: {
        tenantId,
        contactId: data.contactId,
        channel: data.channel as any,
        subject: data.subject,
        assigneeId: userId,
        status: 'OPEN',
        lastMessageAt: new Date(),
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateConversation(tenantId: string, id: string, data: { status?: string; assigneeId?: string }) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id, tenantId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const updateData: Record<string, unknown> = {};
    if (data.status) updateData.status = data.status;
    if (data.assigneeId) updateData.assigneeId = data.assigneeId;

    return this.prisma.conversation.update({
      where: { id },
      data: updateData,
      include: {
        assignee: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async assign(tenantId: string, id: string, assigneeId: string) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id, tenantId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.conversation.update({
      where: { id },
      data: { assigneeId },
      include: { assignee: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async closeConversation(tenantId: string, id: string) {
    return this.updateConversation(tenantId, id, { status: 'CLOSED' });
  }

  async reopenConversation(tenantId: string, id: string) {
    return this.updateConversation(tenantId, id, { status: 'OPEN' });
  }

  async addInternalNote(tenantId: string, conversationId: string, userId: string, content: string) {
    const conversation = await this.prisma.conversation.findFirst({ where: { id: conversationId, tenantId } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    // Internal notes are stored as messages with a special metadata flag
    return this.prisma.message.create({
      data: {
        tenantId,
        conversationId,
        contactId: conversation.contactId,
        userId,
        channel: conversation.channel,
        direction: 'OUTBOUND',
        body: content,
        status: 'DELIVERED',
        metadata: { isInternalNote: true },
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }
}
