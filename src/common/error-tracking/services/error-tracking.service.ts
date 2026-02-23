import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import {
  ErrorSeverity,
  ErrorCategory,
  ErrorContext,
  ErrorLog,
  ErrorMetrics,
} from '../types/error-severity';
import { ErrorClassifier } from '../utils/error-classifier';

/**
 * Service for error tracking, monitoring, and reporting
 * Integrates with Sentry for error tracking and provides additional classification
 */
@Injectable()
export class ErrorTrackingService {
  private readonly logger = new Logger('ErrorTrackingService');
  private isInitialized = false;
  private errorLogs: ErrorLog[] = [];
  private readonly maxErrorLogs = 1000; // Keep last 1000 errors in memory

  constructor(private configService: ConfigService) {
    this.initializeSentry();
  }

  /**
   * Initialize Sentry SDK
   */
  private initializeSentry(): void {
    const sentryDsn = this.configService.get<string>('SENTRY_DSN');
    const environment = this.configService.get<string>(
      'NODE_ENV',
      'development',
    );
    const release = this.configService.get<string>('APP_VERSION', '1.0.0');

    if (!sentryDsn) {
      this.logger.warn(
        'Sentry DSN not configured. Error tracking disabled. Set SENTRY_DSN environment variable.',
      );
      return;
    }

    try {
      Sentry.init({
        dsn: sentryDsn,
        environment,
        release,
        tracesSampleRate: parseFloat(
          this.configService.get<string>('SENTRY_TRACES_SAMPLE_RATE', '0.1'),
        ),
        profilesSampleRate: parseFloat(
          this.configService.get<string>('SENTRY_PROFILES_SAMPLE_RATE', '0.1'),
        ),
        maxBreadcrumbs: 50,
        maxValueLength: 1024,
        integrations: [
          new Sentry.Integrations.Http({ tracing: true }),
          new Sentry.Integrations.Db(),
          new Sentry.Integrations.FunctionToString(),
          new Sentry.Integrations.LinkedErrors(),
          new Sentry.Integrations.RequestData({
            include: {
              cookie: true,
              headers: true,
              query_string: true,
            },
            exclude: ['password', 'token', 'secret', 'api_key'],
          }),
        ],
        beforeSend: (event, hint) => this.beforeSend(event, hint),
      });

      this.isInitialized = true;
      this.logger.log('Sentry error tracking initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Sentry', error);
    }
  }

  /**
   * Sentry beforeSend hook for additional processing
   */
  private beforeSend(
    event: Sentry.ErrorEvent | Sentry.TransactionEvent,
    hint: Sentry.EventHint,
  ): Sentry.ErrorEvent | Sentry.TransactionEvent | null {
    // Filter out certain errors
    if (this.shouldFilterError(event, hint)) {
      return null;
    }

    // Clean sensitive data
    return this.cleanSensitiveData(event);
  }

  /**
   * Check if error should be filtered out
   */
  private shouldFilterError(
    event: Sentry.ErrorEvent | Sentry.TransactionEvent,
    hint: Sentry.EventHint,
  ): boolean {
    const message = (event as Sentry.ErrorEvent).exception?.[0].value ?? '';
    const statusCode = (event as Sentry.ErrorEvent).level;

    // Filter out 404s if configured
    if (this.configService.get<boolean>('SENTRY_FILTER_404S', false)) {
      if (message.includes('404') || statusCode === 'warning') {
        return true;
      }
    }

    // Don't filter development events
    if (this.configService.get<string>('NODE_ENV') === 'development') {
      return false;
    }

    return false;
  }

  /**
   * Clean sensitive data from Sentry events
   */
  private cleanSensitiveData(
    event: Sentry.ErrorEvent | Sentry.TransactionEvent,
  ): Sentry.ErrorEvent | Sentry.TransactionEvent {
    const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'creditCard'];

    const clean = (obj: any): any => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(clean);
      }

      const cleaned: any = { ...obj };
      for (const key in cleaned) {
        if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
          cleaned[key] = '[REDACTED]';
        } else if (typeof cleaned[key] === 'object') {
          cleaned[key] = clean(cleaned[key]);
        }
      }
      return cleaned;
    };

    return clean(event);
  }

  /**
   * Capture and report an error
   */
  reportError(
    error: Error | string,
    context: Partial<ErrorContext> = {},
  ): void {
    try {
      const errorType = error instanceof Error ? error.constructor.name : 'UnknownError';
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const stackTrace =
        error instanceof Error ? error.stack : undefined;

      // Classify error
      const severity = ErrorClassifier.determineSeverity(
        context.statusCode,
        errorType,
      );
      const category = ErrorClassifier.determineCategory(
        context.statusCode,
        errorType,
        errorMessage,
      );

      // Check if error should be reported
      if (!ErrorClassifier.shouldReportError(context.statusCode, severity)) {
        return;
      }

      // Sanitize context
      const sanitizedContext = ErrorClassifier.sanitizeContext({
        ...context,
        severity,
        category,
        timestamp: new Date().toISOString(),
        environment: this.configService.get<string>('NODE_ENV'),
        version: this.configService.get<string>('APP_VERSION'),
      });

      // Create error log entry
      const errorLog: ErrorLog = {
        id: this.generateErrorId(),
        timestamp: new Date(),
        errorType,
        message: ErrorClassifier.sanitizeMessage(errorMessage),
        severity,
        category,
        context: sanitizedContext,
        stackTrace,
        resolved: false,
      };

      // Store in memory
      this.storeErrorLog(errorLog);

      // Report to Sentry if initialized
      if (this.isInitialized) {
        this.reportToSentry(errorMessage, errorType, severity, sanitizedContext, stackTrace);
      }

      // Trigger alert if necessary
      if (ErrorClassifier.shouldAlert(severity)) {
        this.triggerAlert(errorLog);
      }

      this.logger.debug(
        `Error tracked: ${errorType} - ${severity} - ${category}`,
      );
    } catch (trackingError) {
      this.logger.error('Error tracking service failed', trackingError);
    }
  }

  /**
   * Report error to Sentry
   */
  private reportToSentry(
    message: string,
    errorType: string,
    severity: ErrorSeverity,
    context: Partial<ErrorContext>,
    stackTrace?: string,
  ): void {
    try {
      Sentry.captureException(new Error(message), {
        level: this.mapSeverityToSentryLevel(severity),
        tags: {
          errorType,
          category: context.category,
          severity,
          requestId: context.requestId,
          userId: context.userId,
        },
        extra: {
          ...context.extra,
          url: context.url,
          method: context.method,
          ip: context.ip,
          userAgent: context.userAgent,
          category: context.category,
        },
        contexts: {
          request: {
            url: context.url,
            method: context.method,
            headers: {
              'User-Agent': context.userAgent,
            },
          },
          trace: {
            trace_id: context.requestId,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to report error to Sentry', error);
    }
  }

  /**
   * Map ErrorSeverity to Sentry level
   */
  private mapSeverityToSentryLevel(
    severity: ErrorSeverity,
  ): Sentry.SeverityLevel {
    const severityMap: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      [ErrorSeverity.INFO]: 'info',
      [ErrorSeverity.WARNING]: 'warning',
      [ErrorSeverity.ERROR]: 'error',
      [ErrorSeverity.CRITICAL]: 'error',
      [ErrorSeverity.FATAL]: 'fatal',
    };
    return severityMap[severity] || 'error';
  }

  /**
   * Capture request context for error tracking
   */
  captureRequestContext(context: Partial<ErrorContext>): void {
    try {
      Sentry.setContext('request', {
        url: context.url,
        method: context.method,
        ip: context.ip,
      });

      if (context.userId) {
        Sentry.setUser({ id: context.userId });
      }

      if (context.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          Sentry.setTag(key, value);
        });
      }

      if (context.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          Sentry.setContext(key, value);
        });
      }
    } catch (error) {
      this.logger.debug('Failed to capture request context', error);
    }
  }

  /**
   * Add breadcrumb for error tracking
   */
  addBreadcrumb(
    message: string,
    category = 'default',
    data?: Record<string, any>,
    level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  ): void {
    try {
      Sentry.addBreadcrumb({
        message,
        category,
        data,
        level,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      this.logger.debug('Failed to add breadcrumb', error);
    }
  }

  /**
   * Trigger alert for critical errors
   */
  private triggerAlert(errorLog: ErrorLog): void {
    // This would integrate with alerting service (email, Slack, PagerDuty, etc.)
    this.logger.error(
      `ALERT: Critical error - ${errorLog.errorType}: ${errorLog.message}`,
    );
    // TODO: Implement alert integration
  }

  /**
   * Store error log in memory
   */
  private storeErrorLog(errorLog: ErrorLog): void {
    this.errorLogs.push(errorLog);
    if (this.errorLogs.length > this.maxErrorLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxErrorLogs);
    }
  }

  /**
   * Get error metrics
   */
  getErrorMetrics(timeWindowMs = 3600000): ErrorMetrics {
    const now = Date.now();
    const recentErrors = this.errorLogs.filter(
      (log) => now - log.timestamp.getTime() < timeWindowMs,
    );

    const errorsByCategory: Record<ErrorCategory, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    const topErrors = new Map<string, { count: number; log: ErrorLog }>();

    Object.values(ErrorCategory).forEach((cat) => {
      errorsByCategory[cat] = 0;
    });
    Object.values(ErrorSeverity).forEach((sev) => {
      errorsBySeverity[sev] = 0;
    });

    recentErrors.forEach((log) => {
      errorsByCategory[log.category]++;
      errorsBySeverity[log.severity]++;

      const key = `${log.errorType}:${log.message}`;
      const existing = topErrors.get(key);
      if (existing) {
        existing.count++;
      } else {
        topErrors.set(key, { count: 1, log });
      }
    });

    const topErrorsArray = Array.from(topErrors.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((item) => ({
        errorType: item.log.errorType,
        count: item.count,
        lastOccurrence: item.log.timestamp,
        severity: item.log.severity,
        category: item.log.category,
      }));

    return {
      errorCount: recentErrors.length,
      errorRate: recentErrors.length / (timeWindowMs / 1000),
      topErrors: topErrorsArray,
      errorsByCategory,
      errorsBySeverity,
      recentErrors: recentErrors.slice(-20),
    };
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all error logs (analytics)
   */
  getAllErrorLogs(): ErrorLog[] {
    return [...this.errorLogs];
  }

  /**
   * Clear error logs (for testing)
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }

  /**
   * Flush any pending error reports
   */
  async flush(timeoutMs = 2000): Promise<void> {
    if (this.isInitialized) {
      await Sentry.flush(timeoutMs);
    }
  }

  /**
   * Check if Sentry is initialized
   */
  isInitializedState(): boolean {
    return this.isInitialized;
  }
}
