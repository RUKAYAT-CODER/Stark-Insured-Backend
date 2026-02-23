import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { ErrorTrackingService } from '../services/error-tracking.service';
import { ErrorContext } from '../types/error-severity';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interceptor for capturing error context and reporting errors
 */
@Injectable()
export class ErrorTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('ErrorTrackingInterceptor');

  constructor(private errorTrackingService: ErrorTrackingService) {}

  intercept(context: ExecutionContext, next: any): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Generate or get request ID
    const requestId =
      (request.headers['x-request-id'] as string) || uuidv4();
    request.id = requestId;

    // Extract context information
    const errorContext: Partial<ErrorContext> = {
      requestId,
      userId: this.extractUserId(request),
      method: request.method,
      url: request.originalUrl,
      ip:
        (request.headers['x-forwarded-for'] as string) ||
        request.socket.remoteAddress,
      userAgent: request.headers['user-agent'],
      timestamp: new Date().toISOString(),
    };

    // Capture request context
    this.errorTrackingService.captureRequestContext(errorContext);

    // Add breadcrumb for request start
    this.errorTrackingService.addBreadcrumb(
      `${request.method} ${request.originalUrl}`,
      'http',
      {
        requestId,
        method: request.method,
        url: request.originalUrl,
      },
      'info',
    );

    return next.handle().pipe(
      tap(() => {
        // Capture response status code for successful requests
        errorContext.statusCode = response.statusCode;
        this.errorTrackingService.addBreadcrumb(
          `Response: ${response.statusCode}`,
          'http',
          { statusCode: response.statusCode, requestId },
          'info',
        );
      }),
      catchError((error) => {
        // Capture error context
        errorContext.statusCode = response.statusCode || 500;

        // Add breadcrumb for error
        this.errorTrackingService.addBreadcrumb(
          `Error: ${error.message || 'Unknown error'}`,
          'error',
          {
            errorType: error.constructor.name,
            statusCode: errorContext.statusCode,
            requestId,
          },
          'error',
        );

        // Report error
        this.errorTrackingService.reportError(error, errorContext);

        // Re-throw to allow normal error handling
        return throwError(() => error);
      }),
    );
  }

  /**
   * Extract user ID from request
   */
  private extractUserId(request: Request): string | undefined {
    try {
      // Check JWT payload
      const user = (request as any).user;
      if (user && typeof user === 'object') {
        return user.id || user.sub || user.userId;
      }

      // Check custom user header
      const userId = request.headers['x-user-id'];
      if (userId && typeof userId === 'string') {
        return userId;
      }

      return undefined;
    } catch (error) {
      this.logger.debug('Failed to extract user ID', error);
      return undefined;
    }
  }
}
