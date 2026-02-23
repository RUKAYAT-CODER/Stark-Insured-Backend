import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ApiResponseMeta } from '../interfaces/api-response.interface';

/**
 * Global Response Interceptor
 * Wraps all successful responses in a standardized API response format
 * Ensures consistent response structure across all endpoints
 */
@Injectable()
export class ResponseInterceptor<T = any> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already in the correct format, return as is
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'message' in data &&
          'data' in data
        ) {
          return data as ApiResponse<T>;
        }

        // Check if data has pagination info (typically in data.items and data.meta structure)
        let responseData = data;
        let meta: ApiResponseMeta | undefined;

        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'meta' in data
        ) {
          responseData = (data as any).items;
          meta = (data as any).meta;
        }

        // Wrap response in standard format
        const response: ApiResponse<T> = {
          success: true,
          message: 'Request successful',
          data: responseData as T,
          ...(meta && { meta }),
        };

        return response;
      }),
    );
  }
}
