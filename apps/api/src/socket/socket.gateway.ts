import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { JwtPayload } from '../common/decorators/current-user.decorator';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/ws',
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private readonly connectedClients = new Map<string, { userId: string; tenantId: string }>();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET', 'omniflow-jwt-secret-change-in-production'),
      });

      this.connectedClients.set(client.id, {
        userId: payload.sub,
        tenantId: payload.tenantId,
      });

      // Join tenant-specific room
      await client.join(`tenant:${payload.tenantId}`);
      // Join user-specific room
      await client.join(`user:${payload.sub}`);

      this.logger.log(
        `Client connected: ${client.id} (user: ${payload.sub}, tenant: ${payload.tenantId})`,
      );
    } catch {
      this.logger.warn(`Client connection rejected: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join-conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conversation:${data.conversationId}`);
    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('leave-conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { event: 'left', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    client.to(`conversation:${data.conversationId}`).emit('user-typing', {
      userId: clientInfo.userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  // Server-side emit helpers for use by services
  emitToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  emitToConversation(conversationId: string, event: string, data: unknown) {
    this.server.to(`conversation:${conversationId}`).emit(event, data);
  }

  emitNewNotification(userId: string, notification: unknown) {
    this.emitToUser(userId, 'notification', notification);
  }

  emitNewMessage(conversationId: string, message: unknown) {
    this.emitToConversation(conversationId, 'new-message', message);
  }

  emitContactUpdate(tenantId: string, contact: unknown) {
    this.emitToTenant(tenantId, 'contact-updated', contact);
  }

  emitOpportunityUpdate(tenantId: string, opportunity: unknown) {
    this.emitToTenant(tenantId, 'opportunity-updated', opportunity);
  }
}
