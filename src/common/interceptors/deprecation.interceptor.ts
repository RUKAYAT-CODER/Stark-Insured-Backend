import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class DeprecationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    // Example: mark v1 routes as deprecated
    if (request.url.startsWith('/v1/')) {
      const response = context.switchToHttp().getResponse();
      response.setHeader('X-API-Deprecation', 'v1 deprecated');
      console.warn('⚠️ API v1 is deprecated and will be removed in future releases.');
    }

    return next.handle().pipe(
      tap(() => {
        // You could also inject logging or metrics here
      }),
    );
  }
}
