import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Logs a security-related action to the database and system logger.
   * @param action The action being performed (e.g., 'login', 'logout', 'policy_change')
   * @param actorId The ID of the user performing the action
   * @param ip The IP address of the actor
   * @param metadata Additional context for the action
   */
  async log(action: string, actorId?: string, ip?: string, metadata?: Record<string, any>) {
    const timestamp = new Date();
    
    try {
      // Log to system logger for immediate monitoring
      this.logger.log(`[AUDIT] Action: ${action} | Actor: ${actorId || 'system'} | IP: ${ip || 'unknown'} | Metadata: ${JSON.stringify(metadata || {})}`);

      // Save to database for long-term audit trail and compliance
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
      // We don't want audit logging failures to crash the application,
      // but they are critical so we must log the failure itself.
      this.logger.error(`Critical: Audit logging failed for action ${action}: ${error.message}`, error.stack);
    }
  }

  /**
   * Specifically logs login attempts
   */
  async logLogin(userId: string, ip: string, success: boolean, failureReason?: string) {
    await this.log('login', userId, ip, { success, failureReason });
  }

  /**
   * Specifically logs logout actions
   */
  async logLogout(userId: string, ip: string) {
    await this.log('logout', userId, ip);
  }

  /**
   * Logs policy-related changes
   */
  async logPolicyChange(userId: string, ip: string, policyId: string, changeDetails: Record<string, any>) {
    await this.log('policy_change', userId, ip, { policyId, ...changeDetails });
  }

  /**
   * Logs token refresh operations
   */
  async logTokenRefresh(userId: string, ip: string) {
    await this.log('token_refresh', userId, ip);
  }
}
