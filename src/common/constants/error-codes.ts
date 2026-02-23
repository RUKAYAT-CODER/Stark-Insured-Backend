/**
 * Standardized Error Codes
 * Maps HTTP status codes and error types to consistent error codes
 */
export enum ErrorCode {
  // 400 Bad Request
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',

  // 401 Unauthorized
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  // 403 Forbidden
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // 404 Not Found
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // 409 Conflict
  CONFLICT = 'CONFLICT',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',

  // 422 Unprocessable Entity
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',

  // 429 Too Many Requests
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',

  // 500 Internal Server Error
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // 503 Service Unavailable
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

/**
 * Maps HTTP status codes to error codes
 */
export const statusCodeToErrorCodeMap: Record<number, ErrorCode> = {
  400: ErrorCode.BAD_REQUEST,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  422: ErrorCode.UNPROCESSABLE_ENTITY,
  429: ErrorCode.TOO_MANY_REQUESTS,
  500: ErrorCode.INTERNAL_SERVER_ERROR,
  503: ErrorCode.SERVICE_UNAVAILABLE,
};

/**
 * Get error code from status code
 */
export function getErrorCode(statusCode: number): ErrorCode {
  return statusCodeToErrorCodeMap[statusCode] || ErrorCode.INTERNAL_SERVER_ERROR;
}
