import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const THROTTLE_KEY = 'throttle';

export interface ThrottleOptions {
  limit: number;
  ttlSeconds: number;
}

export const Throttle = (limit: number, ttlSeconds: number) =>
  Reflect.metadata(THROTTLE_KEY, { limit, ttlSeconds });

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly defaultLimit = 100;
  private readonly defaultTtlSeconds = 60;

  constructor(private reflector: Reflector) {
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const options = this.reflector.getAllAndOverride<ThrottleOptions | undefined>(THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const limit = options?.limit ?? this.defaultLimit;
    const ttlSeconds = options?.ttlSeconds ?? this.defaultTtlSeconds;

    const request = context.switchToHttp().getRequest<Request>();
    const key = this.generateKey(request);
    const now = Date.now();

    const entry = this.store.get(key);

    if (!entry || now >= entry.resetTime) {
      this.store.set(key, { count: 1, resetTime: now + ttlSeconds * 1000 });
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      throw new HttpException(
        {
          success: false,
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'TOO_MANY_REQUESTS',
          message: [`Rate limit exceeded. Retry after ${retryAfter} seconds.`],
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }

  private generateKey(request: Request): string {
    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    const user = (request as any).user;
    if (user?.sub) {
      return `rate:${user.sub}:${request.method}:${request.route?.path || request.url}`;
    }
    return `rate:${ip}:${request.method}:${request.route?.path || request.url}`;
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}
