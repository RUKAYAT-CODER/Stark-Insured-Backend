// src/common/filters/global-exception.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppException } from '../exceptions/app.exception';
import { AppLoggerService } from '../logging/app-logger.service';
import { RequestContextService } from '../context/request-context.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new AppLoggerService().setContext(
    GlobalExceptionFilter.name,
  );

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const reqCtx = RequestContextService.get();

    let status: HttpStatus;
    let body: Record<string, unknown>;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      body = {
        code: exception.code,
        message: exception.message,
        statusCode: status,
        timestamp: exception.timestamp,
        requestId: reqCtx?.requestId,
        correlationId: reqCtx?.correlationId,
      };
      this.logger.error('AppException caught', {
        ...exception.toLog(),
        path: request.url,
      });
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      body = {
        code: 'HTTP_EXCEPTION',
        message: typeof res === 'string' ? res : (res as any).message,
        statusCode: status,
        timestamp: new Date().toISOString(),
        requestId: reqCtx?.requestId,
        correlationId: reqCtx?.correlationId,
      };
      this.logger.warn('HttpException caught', {
        status,
        message: body.message,
        path: request.url,
      });
    } else {
      // Unknown / programming error
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      body = {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
        statusCode: status,
        timestamp: new Date().toISOString(),
        requestId: reqCtx?.requestId,
        correlationId: reqCtx?.correlationId,
      };
      this.logger.error('Unhandled exception', {
        error:
          exception instanceof Error
            ? { message: exception.message, stack: exception.stack }
            : exception,
        path: request.url,
      });
    }

    response.status(status).json(body);
  }
}
