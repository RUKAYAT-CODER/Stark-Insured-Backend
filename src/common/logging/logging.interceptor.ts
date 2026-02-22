import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    
    // Generate or get correlation ID
    const correlationId = this.getOrCreateCorrelationId(request);
    request['correlationId'] = correlationId;

    const method = request.method;
    const url = request.url;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    // Log incoming request
    this.logger.log('Incoming Request', {
      correlationId,
      method,
      url,
      ip,
      userAgent,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap({
        next: data => {
          const duration = Date.now() - startTime;
          const statusCode = response.statusCode;
          
          // Log successful response
          this.logger.log('Outgoing Response', {
            correlationId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
            responseSize: JSON.stringify(data).length,
          });
        },
        error: error => {
          const duration = Date.now() - startTime;
          const statusCode = error.status || 500;
          
          // Log error response
          this.logger.error('Request Failed', {
            correlationId,
            method,
            url,
            statusCode,
            duration: `${duration}ms`,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          });
        },
      }),
    );
  }

  private getOrCreateCorrelationId(request: Request): string {
    // Check for existing correlation ID in headers
    const correlationId = request.headers['x-correlation-id'];
    if (correlationId && typeof correlationId === 'string') {
      return correlationId;
    }
    
    // Generate new correlation ID
    return uuidv4();
  }
}