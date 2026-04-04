import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((responseData) => {
        // If already formatted (has success property), pass through
        if (responseData && typeof responseData === 'object' && 'success' in responseData) {
          return responseData;
        }

        // Handle paginated responses
        if (responseData && typeof responseData === 'object' && 'data' in responseData && 'meta' in responseData) {
          return {
            success: true,
            data: responseData.data,
            meta: responseData.meta,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true,
          data: responseData,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
