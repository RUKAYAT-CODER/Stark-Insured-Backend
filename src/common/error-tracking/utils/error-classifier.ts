import {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorBreadcrumb,
} from '../types/error-severity';
import { HttpStatus } from '@nestjs/common';

/**
 * Utility class for classifying and analyzing errors
 */
export class ErrorClassifier {
  /**
   * Determine error severity based on status code or error type
   */
  static determineSeverity(
    statusCode?: number,
    errorType?: string,
    isCritical?: boolean,
  ): ErrorSeverity {
    if (isCritical) {
      return ErrorSeverity.CRITICAL;
    }

    if (statusCode) {
      // Determine severity based on HTTP status code
      if (statusCode >= 500) {
        return ErrorSeverity.ERROR;
      }
      if (statusCode >= 429) {
        return ErrorSeverity.WARNING;
      }
      if (statusCode >= 400) {
        return ErrorSeverity.INFO;
      }
    }

    // Determine severity based on error type
    if (errorType) {
      const errorTypeLower = errorType.toLowerCase();

      if (
        errorTypeLower.includes('critical') ||
        errorTypeLower.includes('fatal')
      ) {
        return ErrorSeverity.CRITICAL;
      }

      if (
        errorTypeLower.includes('timeout') ||
        errorTypeLower.includes('connection')
      ) {
        return ErrorSeverity.ERROR;
      }

      if (
        errorTypeLower.includes('validation') ||
        errorTypeLower.includes('badrequest')
      ) {
        return ErrorSeverity.INFO;
      }
    }

    return ErrorSeverity.ERROR;
  }

  /**
   * Determine error category based on status code and error details
   */
  static determineCategory(
    statusCode?: number,
    errorType?: string,
    message?: string,
  ): ErrorCategory {
    const combinedText = `${errorType || ''} ${message || ''}`.toLowerCase();

    // Check by status code
    if (statusCode) {
      switch (true) {
        case statusCode === HttpStatus.BAD_REQUEST:
          if (combinedText.includes('validation')) {
            return ErrorCategory.VALIDATION;
          }
          return ErrorCategory.VALIDATION;

        case statusCode === HttpStatus.UNAUTHORIZED:
          return ErrorCategory.AUTHENTICATION;

        case statusCode === HttpStatus.FORBIDDEN:
          return ErrorCategory.AUTHORIZATION;

        case statusCode === HttpStatus.NOT_FOUND:
          return ErrorCategory.NOT_FOUND;

        case statusCode === HttpStatus.CONFLICT:
          return ErrorCategory.CONFLICT;

        case statusCode === HttpStatus.UNPROCESSABLE_ENTITY:
          return ErrorCategory.BUSINESS_LOGIC;

        case statusCode === HttpStatus.TOO_MANY_REQUESTS:
          return ErrorCategory.RATE_LIMITING;

        case statusCode === HttpStatus.REQUEST_TIMEOUT:
          return ErrorCategory.TIMEOUT;

        case statusCode === HttpStatus.INTERNAL_SERVER_ERROR:
          return ErrorCategory.SYSTEM;

        case statusCode === HttpStatus.BAD_GATEWAY:
        case statusCode === HttpStatus.SERVICE_UNAVAILABLE:
          return ErrorCategory.EXTERNAL_SERVICE;

        case statusCode === HttpStatus.GATEWAY_TIMEOUT:
          return ErrorCategory.TIMEOUT;

        case statusCode >= 500:
          return ErrorCategory.SYSTEM;
      }
    }

    // Check by text patterns
    if (combinedText.includes('payment') || combinedText.includes('transaction')) {
      return ErrorCategory.PAYMENT;
    }

    if (combinedText.includes('claim')) {
      return ErrorCategory.CLAIM_PROCESSING;
    }

    if (combinedText.includes('policy')) {
      return ErrorCategory.POLICY;
    }

    if (combinedText.includes('database') || combinedText.includes('query')) {
      return ErrorCategory.DATABASE;
    }

    if (combinedText.includes('cache')) {
      return ErrorCategory.CACHE;
    }

    if (combinedText.includes('timeout')) {
      return ErrorCategory.TIMEOUT;
    }

    if (
      combinedText.includes('rate limit') ||
      combinedText.includes('too many')
    ) {
      return ErrorCategory.RATE_LIMITING;
    }

    if (
      combinedText.includes('external') ||
      combinedText.includes('service')
    ) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    if (combinedText.includes('config') || combinedText.includes('env')) {
      return ErrorCategory.CONFIGURATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Check if error should be reported to error tracking service
   */
  static shouldReportError(statusCode?: number, severity?: ErrorSeverity): boolean {
    // Don't report client errors (4xx) unless critical
    if (statusCode && statusCode >= 400 && statusCode < 500) {
      if (statusCode === HttpStatus.CONFLICT || statusCode === HttpStatus.UNPROCESSABLE_ENTITY) {
        return true; // Business logic errors should be reported
      }
      return severity === ErrorSeverity.CRITICAL || severity === ErrorSeverity.FATAL;
    }

    return true; // Always report server errors (5xx) and unknown errors
  }

  /**
   * Determine if error should trigger an immediate alert
   */
  static shouldAlert(severity?: ErrorSeverity): boolean {
    if (!severity) {
      return false;
    }

    return (
      severity === ErrorSeverity.CRITICAL ||
      severity === ErrorSeverity.FATAL
    );
  }

  /**
   * Sanitize error message to remove sensitive information
   */
  static sanitizeMessage(message: string): string {
    if (!message) {
      return '';
    }

    let sanitized = message;

    // Remove common sensitive patterns
    const sensitivePatterns = [
      /password[=:]\S+/gi,
      /token[=:]\S+/gi,
      /api[_-]?key[=:]\S+/gi,
      /secret[=:]\S+/gi,
      /authorization[=:]\S+/gi,
      /credit[_-]?card[=:]\S+/gi,
      /ssn[=:]\S+/gi,
    ];

    sensitivePatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    });

    return sanitized;
  }

  /**
   * Sanitize error context to remove sensitive information
   */
  static sanitizeContext(context: Partial<ErrorContext>): Partial<ErrorContext> {
    const sanitized: Partial<ErrorContext> = { ...context };

    // Don't expose potentially sensitive details through userAgent
    if (sanitized.userAgent) {
      // Keep userAgent as it's not sensitive
    }

    // Sanitize extra data
    if (sanitized.extra) {
      sanitized.extra = this.sanitizeObject(sanitized.extra);
    }

    // Sanitize tags
    if (sanitized.tags) {
      sanitized.tags = this.sanitizeTags(sanitized.tags);
    }

    return sanitized;
  }

  /**
   * Recursively sanitize object for sensitive data
   */
  private static sanitizeObject(obj: any, depth = 0): any {
    if (depth > 5) {
      return '[MAX_DEPTH]';
    }

    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.sanitizeObject(item, depth + 1));
    }

    const sanitized: any = {};
    for (const key in obj) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key') ||
        lowerKey.includes('auth') ||
        lowerKey.includes('credit') ||
        lowerKey.includes('ssn')
      ) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = this.sanitizeObject(obj[key], depth + 1);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  /**
   * Sanitize tags for sensitive data
   */
  private static sanitizeTags(tags: Record<string, string | number>): Record<string, string | number> {
    const sanitized: Record<string, string | number> = {};
    for (const key in tags) {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('token') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = tags[key];
      }
    }
    return sanitized;
  }

  /**
   * Create error breadcrumb from event information
   */
  static createBreadcrumb(
    message: string,
    category = 'error',
    data?: Record<string, any>,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  ): ErrorBreadcrumb {
    return {
      message,
      timestamp: new Date(),
      category,
      data,
      level,
    };
  }
}
