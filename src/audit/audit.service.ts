import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generic audit logger for security and compliance events.
   * Logs to system logger and persists to DB.
   */
  async log(
    action: string,
    actorId?: string,
    ip?: string,
    metadata?: Record<string, any>,
  ) {
    const timestamp = new Date();

    try {
      // Immediate system log
      this.logger.log(
        `[AUDIT] Action=${action} | Actor=${actorId || 'system'} | IP=${ip || 'unknown'} | Metadata=${JSON.stringify(
          metadata || {},
        )}`,
      );

      // Persist to DB
      await this.prisma.auditLog.create({
        data: {
          action,
          actorId,
          ip,
          metadata: metadata || {},
          timestamp,
        },
      });
    } catch (error) {
      this.logger.error(
        `Critical: Audit logging failed for action ${action}: ${error.message}`,
        error.stack,
      );
    }
  }

  /** Logs login attempts */
  async logLogin(userId: string, ip: string, success: boolean, failureReason?: string) {
    await this.log('login', userId, ip, { success, failureReason });
  }

  /** Logs logout actions */
  async logLogout(userId: string, ip: string) {
    await this.log('logout', userId, ip);
  }

  /** Logs policy changes */
  async logPolicyChange(userId: string, ip: string, policyId: string, changeDetails: Record<string, any>) {
    await this.log('policy_change', userId, ip, { policyId, ...changeDetails });
  }

  /** Logs token refresh */
  async logTokenRefresh(userId: string, ip: string) {
    await this.log('token_refresh', userId, ip);
  }

  /** Logs unauthorized access attempts */
  async logUnauthorizedAccess(actorId: string, targetId: string, ip?: string) {
    await this.log('unauthorized_access', actorId, ip, { targetId });
  }

  /** Logs data access events (read/write) */
  async logDataAccess(actorId: string, resource: string, operation: string, ip?: string) {
    await this.log('data_access', actorId, ip, { resource, operation });
  }
}
