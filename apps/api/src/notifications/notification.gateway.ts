import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
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
  namespace: '/notifications',
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly connectedUsers = new Map<string, Set<string>>();

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

      // Join user-specific and tenant-specific rooms
      await client.join(`user:${payload.sub}`);
      await client.join(`tenant:${payload.tenantId}`);

      // Track connected clients per user
      if (!this.connectedUsers.has(payload.sub)) {
        this.connectedUsers.set(payload.sub, new Set());
      }
      this.connectedUsers.get(payload.sub)!.add(client.id);

      // Attach user info to socket data
      (client as any).userId = payload.sub;
      (client as any).tenantId = payload.tenantId;

      this.logger.log(
        `Notification client connected: ${client.id} (user: ${payload.sub})`,
      );
    } catch {
      this.logger.warn(`Notification client rejected: ${client.id}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = (client as any).userId;
    if (userId) {
      const clientSet = this.connectedUsers.get(userId);
      if (clientSet) {
        clientSet.delete(client.id);
        if (clientSet.size === 0) {
          this.connectedUsers.delete(userId);
        }
      }
    }
    this.logger.log(`Notification client disconnected: ${client.id}`);
  }

  @SubscribeMessage('mark-read')
  handleMarkRead(@ConnectedSocket() client: Socket) {
    const userId = (client as any).userId;
    if (!userId) return;
    // Acknowledge receipt; actual mark-read is done via REST API
    return { event: 'mark-read-ack', data: { acknowledged: true } };
  }

  /**
   * Send a notification to a specific user via WebSocket.
   */
  sendToUser(userId: string, notification: {
    id: string;
    type: string;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
    createdAt: Date | string;
  }) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  /**
   * Broadcast a notification to all users in a tenant.
   */
  broadcastToTenant(tenantId: string, event: string, data: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Send updated unread count to a specific user.
   */
  sendUnreadCount(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('unread-count', { count });
  }

  /**
   * Check if a user has any connected WebSocket clients.
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }
}
