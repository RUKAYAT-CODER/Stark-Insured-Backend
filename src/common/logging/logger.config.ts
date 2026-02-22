import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createLogger, format, transports, Logger } from 'winston';
import 'winston-daily-rotate-file';
import { AppConfigService } from '../../config/app-config.service';

export interface LoggerOptions {
  level?: string;
  format?: string;
  silent?: boolean;
  correlationId?: string;
}

@Injectable()
export class LoggerConfigService implements LoggerService {
  private logger: Logger;
  private readonly configService: AppConfigService;

  constructor(configService: ConfigService) {
    this.configService = new AppConfigService(configService);
    this.initializeLogger();
  }

  private initializeLogger(): void {
    const logLevel = this.configService.logLevel;
    const logFormat = this.configService.logFormat;
    const nodeEnv = this.configService.nodeEnv;

    // Define log formats
    const formats = [
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      format.errors({ stack: true }),
      format.metadata({
        fillExcept: ['message', 'level', 'timestamp', 'context'],
      }),
    ];

    // Format based on configuration
    if (logFormat === 'json') {
      formats.push(format.json());
    } else {
      formats.push(
        format.printf(info => {
          const timestamp = info.timestamp;
          const level = info.level;
          const message = info.message;
          const context = info.context;
          const correlationId = info.correlationId;
          const metadata = info.metadata;
          const stack = info.stack;

          const contextStr = context ? `[${context}]` : '';
          const correlationStr = correlationId ? `[${correlationId}]` : '';
          const metaStr = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : '';
          const stackStr = stack ? `\n${stack}` : '';

          return `${timestamp} ${level.toUpperCase()}${contextStr}${correlationStr} ${message} ${metaStr}${stackStr}`.trim();
        }),
      );
    }

    // Define transports
    const loggerTransports: transports.StreamTransportInstance[] = [
      // Console transport
      new transports.Console({
        level: logLevel,
        format: format.combine(...formats),
      }),
    ];

    // Add file transports for production
    if (nodeEnv === 'production') {
      loggerTransports.push(
        // All logs file
        new transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d',
          level: logLevel,
          format: format.combine(...formats),
        }) as unknown as transports.StreamTransportInstance,
        // Error logs file
        new transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d',
          level: 'error',
          format: format.combine(...formats),
        }) as unknown as transports.StreamTransportInstance,
      );
    }

    // Create logger instance
    this.logger = createLogger({
      level: logLevel,
      format: format.combine(...formats),
      transports: loggerTransports,
      exitOnError: false,
    });
  }

  /**
   * Update log level dynamically at runtime
   */
  updateLogLevel(level: string): void {
    this.logger.level = level;
    // Update all transports
    this.logger.transports.forEach(transport => {
      if ('level' in transport) {
        transport.level = level;
      }
    });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string, options?: LoggerOptions): LoggerConfigService {
    const childLogger = this.logger.child({ context, ...options });
    const childService = new LoggerConfigService(
      this.configService['configService'],
    );
    childService.logger = childLogger as unknown as Logger;
    return childService;
  }

  // NestJS LoggerService interface implementation
  log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context, stack: trace });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  /**
   * Log with custom metadata
   */
  logWithMeta(
    level: string,
    message: string,
    meta: Record<string, unknown>,
    context?: string,
  ): void {
    this.logger.log(level, message, { context, ...meta });
  }

  /**
   * Get the underlying Winston logger instance
   */
  getWinstonLogger(): Logger {
    return this.logger;
  }

  /**
   * Get current log level
   */
  getLogLevel(): string {
    return this.logger.level;
  }
}
