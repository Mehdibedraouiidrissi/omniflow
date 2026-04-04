import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AsyncLocalStorage } from 'async_hooks';
import { Request } from 'express';
import { JwtPayload } from '../decorators/current-user.decorator';

interface TenantStore {
  tenantId: string;
  userId?: string;
}

const tenantStorage = new AsyncLocalStorage<TenantStore>();

export class TenantContext {
  static getTenantId(): string | undefined {
    return tenantStorage.getStore()?.tenantId;
  }

  static getUserId(): string | undefined {
    return tenantStorage.getStore()?.userId;
  }

  static getStore(): TenantStore | undefined {
    return tenantStorage.getStore();
  }

  static run<T>(store: TenantStore, fn: () => T): T {
    return tenantStorage.run(store, fn);
  }
}

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as JwtPayload | undefined;
    const tenantId = user?.tenantId || (request.headers['x-tenant-id'] as string);

    if (!tenantId) {
      return next.handle();
    }

    return new Observable((subscriber) => {
      tenantStorage.run({ tenantId, userId: user?.sub }, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
