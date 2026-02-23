import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessRule } from '../entities/business-rule.entity';
import { RuleVersion } from '../entities/rule-version.entity';
import { RuleExecution } from '../entities/rule-execution.entity';

export interface RuleAuditLog {
  id: string;
  ruleId: string;
  ruleName: string;
  action: 'CREATED' | 'UPDATED' | 'DELETED' | 'VERSION_CREATED' | 'VERSION_ACTIVATED' | 'DEACTIVATED' | 'EXECUTED';
  timestamp: Date;
  userId: string;
  details: Record<string, any>;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
}

export interface RuleChangeSummary {
  ruleId: string;
  ruleName: string;
  changeCount: number;
  lastChanged: Date;
  lastChangedBy: string;
  changeTypes: string[];
}

@Injectable()
export class RuleAuditService {
  private readonly logger = new Logger(RuleAuditService.name);

  constructor(
    @InjectRepository(BusinessRule)
    private ruleRepository: Repository<BusinessRule>,
    @InjectRepository(RuleVersion)
    private versionRepository: Repository<RuleVersion>,
    @InjectRepository(RuleExecution)
    private executionRepository: Repository<RuleExecution>,
  ) {}

  /**
   * Log rule creation
   */
  async logRuleCreation(rule: BusinessRule, userId: string): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'CREATED',
      timestamp: new Date(),
      userId,
      details: {
        type: rule.type,
        priority: rule.priority,
        category: rule.category,
        tags: rule.tags,
        conditions: rule.conditions,
        actions: rule.actions,
      },
      newState: this.extractRuleState(rule),
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule created: ${rule.name} by ${userId}`);
  }

  /**
   * Log rule update
   */
  async logRuleUpdate(
    rule: BusinessRule,
    previousState: BusinessRule,
    userId: string,
  ): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'UPDATED',
      timestamp: new Date(),
      userId,
      details: {
        changedFields: this.getChangedFields(rule, previousState),
      },
      previousState: this.extractRuleState(previousState),
      newState: this.extractRuleState(rule),
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule updated: ${rule.name} by ${userId}`);
  }

  /**
   * Log rule deletion
   */
  async logRuleDeletion(rule: BusinessRule, userId: string): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'DELETED',
      timestamp: new Date(),
      userId,
      details: {
        type: rule.type,
        status: rule.status,
      },
      previousState: this.extractRuleState(rule),
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule deleted: ${rule.name} by ${userId}`);
  }

  /**
   * Log rule version creation
   */
  async logRuleVersionCreation(
    version: RuleVersion,
    rule: BusinessRule,
    userId: string,
  ): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'VERSION_CREATED',
      timestamp: new Date(),
      userId,
      details: {
        version: version.version,
        changeDescription: version.changeDescription,
        isBackwardCompatible: version.isBackwardCompatible,
        testCasesCount: version.testCases?.length || 0,
      },
      newState: {
        version: version.version,
        conditions: version.conditions,
        actions: version.actions,
      },
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule version created: ${rule.name} v${version.version} by ${userId}`);
  }

  /**
   * Log rule version activation
   */
  async logRuleVersionActivation(
    rule: BusinessRule,
    version: number,
    userId: string,
  ): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'VERSION_ACTIVATED',
      timestamp: new Date(),
      userId,
      details: {
        activatedVersion: version,
        previousVersion: rule.currentVersion,
      },
      newState: {
        currentVersion: version,
        status: rule.status,
      },
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule version activated: ${rule.name} v${version} by ${userId}`);
  }

  /**
   * Log rule deactivation
   */
  async logRuleDeactivation(rule: BusinessRule, userId: string): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: rule.id,
      ruleName: rule.name,
      action: 'DEACTIVATED',
      timestamp: new Date(),
      userId,
      details: {
        previousStatus: rule.status,
      },
      previousState: {
        status: rule.status,
        isEnabled: rule.isEnabled,
      },
      newState: {
        status: 'INACTIVE',
        isEnabled: false,
      },
    };

    await this.saveAuditLog(auditLog);
    this.logger.log(`Rule deactivated: ${rule.name} by ${userId}`);
  }

  /**
   * Log rule execution
   */
  async logRuleExecution(execution: RuleExecution): Promise<void> {
    const auditLog: Partial<RuleAuditLog> = {
      ruleId: execution.rule.id,
      ruleName: execution.rule.name,
      action: 'EXECUTED',
      timestamp: execution.executedAt,
      userId: execution.triggeredBy,
      details: {
        executionId: execution.id,
        status: execution.status,
        executionTime: execution.executionTime,
        entityType: execution.entityType,
        entityId: execution.entityId,
        errorMessage: execution.errorMessage,
      },
      newState: {
        executionResult: execution.result,
      },
    };

    await this.saveAuditLog(auditLog);
    
    if (execution.status === 'ERROR') {
      this.logger.error(`Rule execution failed: ${execution.rule.name} - ${execution.errorMessage}`);
    }
  }

  /**
   * Get audit logs for a specific rule
   */
  async getRuleAuditLogs(ruleId: string, options?: {
    limit?: number;
    offset?: number;
    actions?: string[];
    fromDate?: Date;
    toDate?: Date;
  }): Promise<RuleAuditLog[]> {
    // This would typically query an audit log table
    // For now, return a mock implementation
    return [];
  }

  /**
   * Get audit logs for all rules
   */
  async getAllAuditLogs(options?: {
    limit?: number;
    offset?: number;
    actions?: string[];
    userId?: string;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<RuleAuditLog[]> {
    // This would typically query an audit log table
    // For now, return a mock implementation
    return [];
  }

  /**
   * Get change summary for rules
   */
  async getRuleChangeSummaries(ruleIds?: string[]): Promise<RuleChangeSummary[]> {
    // This would aggregate audit logs to provide summaries
    // For now, return a mock implementation
    return [];
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(userId: string, timeRange?: { from: Date; to: Date }): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    rulesModified: string[];
    recentActivity: RuleAuditLog[];
  }> {
    // This would aggregate audit logs for a specific user
    // For now, return a mock implementation
    return {
      totalActions: 0,
      actionsByType: {},
      rulesModified: [],
      recentActivity: [],
    };
  }

  /**
   * Get compliance report
   */
  async getComplianceReport(timeRange?: { from: Date; to: Date }): Promise<{
    totalChanges: number;
    criticalChanges: number;
    changesByType: Record<string, number>;
    changesByUser: Record<string, number>;
    complianceScore: number;
    recommendations: string[];
  }> {
    // This would generate a compliance report based on audit logs
    // For now, return a mock implementation
    return {
      totalChanges: 0,
      criticalChanges: 0,
      changesByType: {},
      changesByUser: {},
      complianceScore: 100,
      recommendations: [],
    };
  }

  /**
   * Save audit log (placeholder implementation)
   */
  private async saveAuditLog(auditLog: Partial<RuleAuditLog>): Promise<void> {
    // In a real implementation, this would save to an audit log table
    // For now, we'll just log it
    this.logger.debug(`Audit log: ${JSON.stringify(auditLog)}`);
  }

  /**
   * Extract rule state for audit
   */
  private extractRuleState(rule: BusinessRule): Record<string, any> {
    return {
      name: rule.name,
      description: rule.description,
      type: rule.type,
      status: rule.status,
      priority: rule.priority,
      isEnabled: rule.isEnabled,
      category: rule.category,
      tags: rule.tags,
      currentVersion: rule.currentVersion,
      updatedAt: rule.updatedAt,
    };
  }

  /**
   * Get changed fields between two rule states
   */
  private getChangedFields(current: BusinessRule, previous: BusinessRule): string[] {
    const changedFields: string[] = [];
    
    const fields = ['name', 'description', 'status', 'priority', 'isEnabled', 'category', 'tags'];
    
    for (const field of fields) {
      if (JSON.stringify(current[field]) !== JSON.stringify(previous[field])) {
        changedFields.push(field);
      }
    }
    
    return changedFields;
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(options?: {
    format?: 'json' | 'csv';
    filters?: {
      ruleIds?: string[];
      actions?: string[];
      userId?: string;
      fromDate?: Date;
      toDate?: Date;
    };
  }): Promise<string> {
    const logs = await this.getAllAuditLogs(options?.filters);
    
    if (options?.format === 'csv') {
      return this.convertToCSV(logs);
    }
    
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertToCSV(logs: RuleAuditLog[]): string {
    const headers = ['ID', 'Rule ID', 'Rule Name', 'Action', 'Timestamp', 'User ID', 'Details'];
    const rows = logs.map(log => [
      log.id,
      log.ruleId,
      log.ruleName,
      log.action,
      log.timestamp.toISOString(),
      log.userId,
      JSON.stringify(log.details),
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }
}
