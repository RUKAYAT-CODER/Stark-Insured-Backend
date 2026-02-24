// src/common/exceptions/app.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorContext {
  userId?: string;
  claimId?: string;
  correlationId?: string;
  requestId?: string;
  operation?: string;
  module?: string;
  [key: string]: unknown;
}

export interface AppExceptionOptions {
  code: string;
  message: string;
  statusCode?: HttpStatus;
  context?: ErrorContext;
  cause?: Error;
  isOperational?: boolean; // false = programming error, crash worthy
}

export class AppException extends HttpException {
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly cause?: Error;
  public readonly isOperational: boolean;
  public readonly timestamp: string;

  constructor(options: AppExceptionOptions) {
    const statusCode = options.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
    super(
      {
        code: options.code,
        message: options.message,
        statusCode,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );

    this.code = options.code;
    this.context = options.context ?? {};
    this.cause = options.cause;
    this.isOperational = options.isOperational ?? true;
    this.timestamp = new Date().toISOString();

    // Preserve original stack trace
    if (options.cause) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  toLog(): Record<string, unknown> {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.getStatus(),
      context: this.context,
      isOperational: this.isOperational,
      timestamp: this.timestamp,
      stack: this.stack,
      cause: this.cause
        ? { message: this.cause.message, stack: this.cause.stack }
        : undefined,
    };
  }
}

// ── Typed subclasses ──────────────────────────────────────────────────────────

export class ClaimNotFoundException extends AppException {
  constructor(claimId: string, context?: ErrorContext) {
    super({
      code: 'CLAIM_NOT_FOUND',
      message: `Claim ${claimId} not found`,
      statusCode: HttpStatus.NOT_FOUND,
      context: { ...context, claimId },
    });
  }
}

export class ClaimProcessingException extends AppException {
  constructor(message: string, context?: ErrorContext, cause?: Error) {
    super({
      code: 'CLAIM_PROCESSING_FAILED',
      message,
      statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      context,
      cause,
    });
  }
}

export class InsufficientFundsException extends AppException {
  constructor(context?: ErrorContext) {
    super({
      code: 'INSUFFICIENT_FUNDS',
      message: 'Account has insufficient funds for this operation',
      statusCode: HttpStatus.PAYMENT_REQUIRED,
      context,
    });
  }
}

export class UnauthorizedOperationException extends AppException {
  constructor(operation: string, context?: ErrorContext) {
    super({
      code: 'UNAUTHORIZED_OPERATION',
      message: `Not authorized to perform operation: ${operation}`,
      statusCode: HttpStatus.FORBIDDEN,
      context: { ...context, operation },
    });
  }
}

export class ExternalServiceException extends AppException {
  constructor(service: string, cause?: Error, context?: ErrorContext) {
    super({
      code: 'EXTERNAL_SERVICE_ERROR',
      message: `External service '${service}' failed`,
      statusCode: HttpStatus.BAD_GATEWAY,
      context: { ...context, service },
      cause,
    });
  }
}
