import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../decorators/current-user.decorator';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    // Only log mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const user = request.user as JwtPayload | undefined;
    const tenantId = user?.tenantId || (request.headers['x-tenant-id'] as string);
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          if (!tenantId) return;

          const duration = Date.now() - startTime;
          const action = this.buildAction(method, request.path);
          const entityType = this.extractEntityType(request.path);
          const entityId = this.extractEntityId(request.path);

          this.prisma.auditLog
            .create({
              data: {
                tenantId,
                userId: user?.sub ?? null,
                action,
                entityType,
                entityId,
                metadata: {
                  method,
                  path: request.path,
                  statusCode: context.switchToHttp().getResponse().statusCode,
                  duration,
                  body: this.sanitizeBody(request.body),
                  responseId:
                    responseData && typeof responseData === 'object' && 'id' in responseData
                      ? responseData.id
                      : undefined,
                },
                ipAddress: request.ip ?? null,
                userAgent: request.headers['user-agent'] ?? null,
              },
            })
            .catch((err) => {
              this.logger.error(`Failed to create audit log: ${err.message}`);
            });
        },
        error: (_err: Error) => {
          // We don't log failed requests to audit log
        },
      }),
    );
  }

  private buildAction(method: string, path: string): string {
    const actionMap: Record<string, string> = {
      POST: 'CREATE',
      PUT: 'UPDATE',
      PATCH: 'UPDATE',
      DELETE: 'DELETE',
    };
    const segments = path.split('/').filter(Boolean);
    const resource = segments[segments.length - 1] || 'unknown';
    return `${actionMap[method] || method}:${resource}`;
  }

  private extractEntityType(path: string): string {
    const segments = path.replace(/^\/api\//, '').split('/').filter(Boolean);
    return segments[0] || 'unknown';
  }

  private extractEntityId(path: string): string | null {
    const segments = path.split('/').filter(Boolean);
    // Look for a cuid or uuid-like segment
    const idSegment = segments.find((s) => /^[a-z0-9]{20,}$/i.test(s) || /^[0-9a-f-]{36}$/i.test(s));
    return idSegment || null;
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body || typeof body !== 'object') return {};

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'passwordHash', 'token', 'secret', 'creditCard', 'ssn'];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
