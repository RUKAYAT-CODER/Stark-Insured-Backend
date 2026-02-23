import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request } from 'express';
import { AuditService } from '../services/audit.service';
import { AuditActionType } from '../enums/audit-action-type.enum';
import { DataClassification } from '../enums/data-classification.enum';
import {
  getAuditLogMetadata,
  AuditLogOptions,
} from '../decorators/audit-log.decorator';
import { AuditLog } from '../entities/audit.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';

interface RequestWithUser extends Request {
  user?: {
    id?: string;
    walletAddress?: string;
    role?: string;
  };
}

/**
 * Interceptor that automatically captures audit logs for methods
 * decorated with @AuditLog(). Provides comprehensive context for
 * compliance and investigation purposes.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly auditService: AuditService,
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const handler = context.getHandler();
    const auditMetadata = getAuditLogMetadata(handler);

    // If no audit metadata, proceed without logging
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const startTime = Date.now();

    // Extract request context
    const auditContext = await this.buildAuditContext(request, auditMetadata);

    return next.handle().pipe(
      tap(async (response) => {
        const duration = Date.now() - startTime;
        await this.logSuccess(auditContext, auditMetadata, response, duration);
      }),
      catchError(async (error) => {
        const duration = Date.now() - startTime;
        await this.logFailure(auditContext, auditMetadata, error, duration);
        throw error;
      }),
    );
  }

  /**
   * Build the audit context from the request
   */
  private async buildAuditContext(
    request: RequestWithUser,
    metadata: AuditLogOptions,
  ): Promise<Partial<AuditLog>> {
    const user = request.user;
    const actor = user?.id || user?.walletAddress || 'anonymous';
    const actorType = user?.id ? 'USER' : user?.walletAddress ? 'WALLET' : 'ANONYMOUS';

    // Extract entity ID using custom extractor or default logic
    const reqParams = (request as any).params || {};
    let entityReference: string | undefined;
    if (metadata.entityIdExtractor) {
      entityReference = metadata.entityIdExtractor(Object.values(reqParams));
    } else {
      entityReference = reqParams.id || reqParams.claimId || reqParams.policyId;
    }

    // Get the previous hash for chain integrity
    const previousHash = await this.getPreviousHash();

    return {
      actionType: metadata.action as AuditActionType,
      entityType: metadata.entity,
      actor,
      actorType,
      entityReference,
      ipAddress: this.extractIpAddress(request as any),
      userAgent: (request as any).headers?.['user-agent'],
      sessionId: this.extractSessionId(request as any),
      requestPath: (request as any).path,
      requestMethod: (request as any).method,
      dataClassification: metadata.dataClassification || DataClassification.INTERNAL,
      requiresConsent: metadata.requiresConsent || false,
      description: metadata.description,
      correlationId: (request as any).headers?.['x-correlation-id'] as string,
      isSensitive: this.isSensitiveAction(metadata.action),
      severity: this.determineSeverity(metadata),
      previousHash,
      metadata: {
        ...metadata.metadata,
        params: (request as any).params,
        query: this.sanitizeQueryParams((request as any).query),
      },
    };
  }

  /**
   * Log successful operation
   */
  private async logSuccess(
    context: Partial<AuditLog>,
    metadata: AuditLogOptions,
    response: any,
    duration: number,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...context,
        metadata: {
          ...context.metadata,
          success: true,
          duration,
          responseSize: JSON.stringify(response).length,
        },
      });

      // Calculate hash for immutability
      auditLog.hash = auditLog.calculateHash();
      auditLog.isImmutable = true;

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(
        `Audit log created: ${context.actionType} by ${context.actor}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break operations
    }
  }

  /**
   * Log failed operation
   */
  private async logFailure(
    context: Partial<AuditLog>,
    metadata: AuditLogOptions,
    error: any,
    duration: number,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        ...context,
        severity: 'high',
        metadata: {
          ...context.metadata,
          success: false,
          duration,
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.status,
          },
        },
      });

      // Calculate hash for immutability
      auditLog.hash = auditLog.calculateHash();
      auditLog.isImmutable = true;

      await this.auditLogRepository.save(auditLog);

      this.logger.debug(
        `Audit log created (failure): ${context.actionType} by ${context.actor}`,
      );
    } catch (logError) {
      this.logger.error('Failed to create audit log for error', logError);
      // Don't throw - audit logging should not break operations
    }
  }

  /**
   * Get the hash of the most recent audit log for chain integrity
   */
  private async getPreviousHash(): Promise<string | undefined> {
    try {
      const lastLog = await this.auditLogRepository.findOne({
        where: {},
        order: { timestamp: 'DESC' },
        select: ['hash'],
      });
      return lastLog?.hash;
    } catch (error) {
      this.logger.warn('Failed to get previous audit log hash', error);
      return undefined;
    }
  }

  /**
   * Extract IP address from request
   */
  private extractIpAddress(request: Request): string | undefined {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim();
    }
    return request.ip || request.socket?.remoteAddress;
  }

  /**
   * Extract session ID from request
   */
  private extractSessionId(request: Request): string | undefined {
    return request.headers['x-session-id'] as string ||
           (request.cookies?.sessionId) ||
           undefined;
  }

  /**
   * Sanitize query parameters to remove sensitive data
   */
  private sanitizeQueryParams(query: any): any {
    if (!query) return query;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...query };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Determine if an action is sensitive
   */
  private isSensitiveAction(action: string): boolean {
    const sensitivePatterns = [
      'DELETE',
      'EXPORT',
      'ADMIN',
      'PASSWORD',
      'PAYMENT',
      'FRAUD',
      'CONSENT',
      'PERMISSION',
    ];
    return sensitivePatterns.some(pattern => action.includes(pattern));
  }

  /**
   * Determine severity level based on action type and metadata
   */
  private determineSeverity(metadata: AuditLogOptions): 'low' | 'medium' | 'high' | 'critical' {
    if (metadata.dataClassification === 'restricted') {
      return 'high';
    }
    if (metadata.dataClassification === 'confidential') {
      return 'medium';
    }
    if (this.isSensitiveAction(metadata.action)) {
      return 'high';
    }
    return 'low';
  }

  /**
   * Mask sensitive fields in data
   */
  private maskSensitiveFields(data: any, fieldsToMask: string[]): any {
    if (!data || typeof data !== 'object') return data;
    
    const masked = { ...data };
    for (const field of fieldsToMask) {
      if (masked[field] !== undefined) {
        const value = String(masked[field]);
        masked[field] = value.length > 4 
          ? '*'.repeat(value.length - 4) + value.slice(-4)
          : '****';
      }
    }
    return masked;
  }
}
