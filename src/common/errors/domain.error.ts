import { HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../constants/error-codes';

export abstract class DomainError extends Error {
  /**
   * httpStatus is used by the global exception filter to determine
   * which HTTP status code should be returned to the client.
   * Defaults to 400 (Bad Request) if not provided.
   */
  constructor(
    public readonly message: string,
    public readonly code: ErrorCode,
    public readonly details?: any,
    public readonly httpStatus: number = HttpStatus.BAD_REQUEST,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EntityNotFoundError extends DomainError {
  constructor(entity: string, identifier: string) {
    super(
      `${entity} con ID ${identifier} no fue encontrado`,
      ErrorCode.RESOURCE_NOT_FOUND,
      undefined,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, details?: any) {
    super(message, ErrorCode.VALIDATION_ERROR, details, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message: string = 'No autorizado para realizar esta acción') {
    super(message, ErrorCode.UNAUTHORIZED, undefined, HttpStatus.UNAUTHORIZED);
  }
}

export class RateLimitError extends DomainError {
  constructor(public readonly remainingSeconds?: number) {
    super(
      `Demasiadas solicitudes. Por favor, intente de nuevo en ${remainingSeconds || 60} segundos.`,
      ErrorCode.TOO_MANY_REQUESTS,
      { retryAfter: remainingSeconds },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

// External service errors are considered transient and normally map to 503
export class ExternalServiceError extends DomainError {
  constructor(message: string = 'External service failure', details?: any) {
    super(
      message,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      details,
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}
