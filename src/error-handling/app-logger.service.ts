// src/common/logging/app-logger.service.ts
import { Injectable, LoggerService, Scope } from '@nestjs/common';
import * as winston from 'winston';
import { RequestContextService } from '../context/request-context.service';

const { combine, timestamp, json, errors, colorize, printf } = winston.format;

function buildFormat(isProd: boolean) {
  if (isProd) {
    return combine(errors({ stack: true }), timestamp(), json());
  }
  return combine(
    errors({ stack: true }),
    timestamp(),
    colorize(),
    printf(({ level, message, timestamp: ts, ...meta }) => {
      const metaStr = Object.keys(meta).length
        ? `\n${JSON.stringify(meta, null, 2)}`
        : '';
      return `${ts} [${level}] ${message}${metaStr}`;
    }),
  );
}

@Injectable({ scope: Scope.TRANSIENT })
export class AppLoggerService implements LoggerService {
  private logger: winston.Logger;
  private context?: string;

  constructor() {
    const isProd = process.env.NODE_ENV === 'production';

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: buildFormat(isProd),
      transports: [
        new winston.transports.Console(),
        ...(isProd
          ? [
              new winston.transports.File({
                filename: 'logs/error.log',
                level: 'error',
              }),
              new winston.transports.File({ filename: 'logs/combined.log' }),
            ]
          : []),
      ],
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  private buildMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    const ctx = RequestContextService.get();
    return {
      ...(this.context ? { module: this.context } : {}),
      ...(ctx
        ? {
            requestId: ctx.requestId,
            correlationId: ctx.correlationId,
            userId: ctx.userId,
          }
        : {}),
      ...meta,
    };
  }

  log(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(message, this.buildMeta(meta));
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(message, this.buildMeta(meta));
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(message, this.buildMeta(meta));
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(message, this.buildMeta(meta));
  }

  verbose(message: string, meta?: Record<string, unknown>): void {
    this.logger.verbose(message, this.buildMeta(meta));
  }
}
