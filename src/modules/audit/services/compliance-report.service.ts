import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { AuditLog } from '../entities/audit.entity';
import { AuditActionType } from '../enums/audit-action-type.enum';
import { DataClassification } from '../enums/data-classification.enum';

export interface GDPRDataAccessReport {
  userId: string;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  dataAccessSummary: {
    totalAccesses: number;
    uniqueDataTypes: string[];
    dataClassifications: Record<DataClassification, number>;
  };
  accessDetails: Array<{
    timestamp: Date;
    action: AuditActionType;
    entityType: string;
    entityReference?: string;
    dataAccessed: string[];
    dataClassification: DataClassification;
    ipAddress?: string;
    purpose?: string;
  }>;
  thirdPartyDisclosures: Array<{
    recipient: string;
    dataTypes: string[];
    purpose: string;
    legalBasis: string;
    timestamp: Date;
  }>;
  consentHistory: Array<{
    consentId?: string;
    action: 'GIVEN' | 'REVOKED';
    timestamp: Date;
    purpose: string;
  }>;
}

export interface ComplianceSummaryReport {
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  summary: {
    totalAuditLogs: number;
    uniqueUsers: number;
    sensitiveOperations: number;
    dataAccessEvents: number;
    dataModificationEvents: number;
    consentEvents: number;
    failedOperations: number;
  };
  dataClassificationBreakdown: Record<DataClassification, number>;
  topActions: Array<{
    action: AuditActionType;
    count: number;
  }>;
  riskIndicators: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    count: number;
  }>;
}

export interface AuditTrailReport {
  entityType: string;
  entityReference: string;
  trail: Array<{
    timestamp: Date;
    action: AuditActionType;
    actor: string;
    actorType?: string;
    changes?: Record<string, { old: any; new: any }>;
    metadata?: Record<string, any>;
    ipAddress?: string;
    sessionId?: string;
    hash: string;
    integrityValid: boolean;
  }>;
  integrityStatus: 'valid' | 'compromised' | 'partial';
}

/**
 * Service for generating compliance reports required for GDPR,
 * regulatory audits, and data access investigations.
 */
@Injectable()
export class ComplianceReportService {
  private readonly logger = new Logger(ComplianceReportService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  /**
   * Generate a GDPR-compliant data access report for a specific user.
   * This report shows all data accessed about the user, fulfilling
   * the "right to access" requirement under GDPR Article 15.
   */
  async generateGDPRDataAccessReport(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GDPRDataAccessReport> {
    this.logger.log(`Generating GDPR data access report for user ${userId}`);

    // Query all audit logs related to this user
    const auditLogs = await this.auditLogRepository.find({
      where: [
        { actor: userId, timestamp: Between(startDate, endDate) },
        { entityReference: userId, timestamp: Between(startDate, endDate) },
      ],
      order: { timestamp: 'ASC' },
    });

    // Build access details
    const accessDetails = auditLogs.map(log => ({
      timestamp: log.timestamp,
      action: log.actionType,
      entityType: log.entityType,
      entityReference: log.entityReference,
      dataAccessed: log.dataAccessed || [],
      dataClassification: log.dataClassification,
      ipAddress: log.ipAddress,
      purpose: log.metadata?.purpose || log.description,
    }));

    // Calculate data classification breakdown
    const dataClassifications: Record<DataClassification, number> = {
      [DataClassification.PUBLIC]: 0,
      [DataClassification.INTERNAL]: 0,
      [DataClassification.CONFIDENTIAL]: 0,
      [DataClassification.RESTRICTED]: 0,
    };

    auditLogs.forEach(log => {
      dataClassifications[log.dataClassification]++;
    });

    // Extract unique data types accessed
    const uniqueDataTypes = [...new Set(
      auditLogs.flatMap(log => log.dataAccessed || [])
    )] as string[];

    // Find consent history
    const consentLogs = auditLogs.filter(log =>
      log.actionType === AuditActionType.CONSENT_GIVEN ||
      log.actionType === AuditActionType.CONSENT_REVOKED
    );

    const consentHistory = consentLogs.map(log => ({
      consentId: log.consentId,
      action: log.actionType === AuditActionType.CONSENT_GIVEN ? 'GIVEN' as const : 'REVOKED' as const,
      timestamp: log.timestamp,
      purpose: log.metadata?.purpose || 'Not specified',
    }));

    // Identify third-party disclosures (data shared with external entities)
    const thirdPartyLogs = auditLogs.filter(log =>
      log.metadata?.sharedWith || log.metadata?.recipient
    );

    const thirdPartyDisclosures = thirdPartyLogs.map(log => ({
      recipient: log.metadata?.sharedWith || log.metadata?.recipient || 'Unknown',
      dataTypes: log.dataAccessed || [],
      purpose: log.metadata?.purpose || 'Not specified',
      legalBasis: log.metadata?.legalBasis || 'Not specified',
      timestamp: log.timestamp,
    }));

    return {
      userId,
      reportPeriod: { startDate, endDate },
      dataAccessSummary: {
        totalAccesses: auditLogs.length,
        uniqueDataTypes,
        dataClassifications,
      },
      accessDetails,
      thirdPartyDisclosures,
      consentHistory,
    };
  }

  /**
   * Generate a comprehensive compliance summary report.
   * Useful for internal audits and regulatory reporting.
   */
  async generateComplianceSummaryReport(
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceSummaryReport> {
    this.logger.log(`Generating compliance summary report for period ${startDate} to ${endDate}`);

    // Get all audit logs in the period
    const auditLogs = await this.auditLogRepository.find({
      where: { timestamp: Between(startDate, endDate) },
    });

    // Calculate summary statistics
    const uniqueUsers = new Set(auditLogs.map(log => log.actor)).size;
    const sensitiveOperations = auditLogs.filter(log => log.isSensitive).length;
    const dataAccessEvents = auditLogs.filter(log =>
      log.dataAccessed && log.dataAccessed.length > 0
    ).length;
    const dataModificationEvents = auditLogs.filter(log =>
      log.dataModified && Object.keys(log.dataModified).length > 0
    ).length;
    const consentEvents = auditLogs.filter(log =>
      log.actionType === AuditActionType.CONSENT_GIVEN ||
      log.actionType === AuditActionType.CONSENT_REVOKED
    ).length;
    const failedOperations = auditLogs.filter(log =>
      log.metadata?.success === false
    ).length;

    // Data classification breakdown
    const dataClassificationBreakdown: Record<DataClassification, number> = {
      [DataClassification.PUBLIC]: 0,
      [DataClassification.INTERNAL]: 0,
      [DataClassification.CONFIDENTIAL]: 0,
      [DataClassification.RESTRICTED]: 0,
    };
    auditLogs.forEach(log => {
      dataClassificationBreakdown[log.dataClassification]++;
    });

    // Top actions
    const actionCounts: Record<string, number> = {};
    auditLogs.forEach(log => {
      actionCounts[log.actionType] = (actionCounts[log.actionType] || 0) + 1;
    });
    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action: action as AuditActionType, count }));

    // Risk indicators
    const riskIndicators = this.identifyRiskIndicators(auditLogs);

    return {
      reportPeriod: { startDate, endDate },
      summary: {
        totalAuditLogs: auditLogs.length,
        uniqueUsers,
        sensitiveOperations,
        dataAccessEvents,
        dataModificationEvents,
        consentEvents,
        failedOperations,
      },
      dataClassificationBreakdown,
      topActions,
      riskIndicators,
    };
  }

  /**
   * Generate a complete audit trail for a specific entity.
   * Shows all actions performed on an entity with integrity verification.
   */
  async generateAuditTrailReport(
    entityType: string,
    entityReference: string,
  ): Promise<AuditTrailReport> {
    this.logger.log(`Generating audit trail for ${entityType}:${entityReference}`);

    const auditLogs = await this.auditLogRepository.find({
      where: { entityType, entityReference },
      order: { timestamp: 'ASC' },
    });

    let compromisedCount = 0;
    const trail = auditLogs.map(log => {
      const integrityValid = log.verifyIntegrity();
      if (!integrityValid) compromisedCount++;

      return {
        timestamp: log.timestamp,
        action: log.actionType,
        actor: log.actor,
        actorType: log.actorType,
        changes: log.dataModified,
        metadata: log.metadata,
        ipAddress: log.ipAddress,
        sessionId: log.sessionId,
        hash: log.hash,
        integrityValid,
      };
    });

    const integrityStatus = compromisedCount === 0
      ? 'valid'
      : compromisedCount === auditLogs.length
        ? 'compromised'
        : 'partial';

    return {
      entityType,
      entityReference,
      trail,
      integrityStatus,
    };
  }

  /**
   * Export audit logs in a format suitable for external auditors.
   */
  async exportAuditLogsForAuditor(
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' = 'json',
  ): Promise<string> {
    this.logger.log(`Exporting audit logs for external auditor`);

    const auditLogs = await this.auditLogRepository.find({
      where: { timestamp: Between(startDate, endDate) },
      order: { timestamp: 'ASC' },
    });

    if (format === 'csv') {
      return this.convertToCSV(auditLogs);
    }

    return JSON.stringify({
      exportMetadata: {
        generatedAt: new Date(),
        period: { startDate, endDate },
        totalRecords: auditLogs.length,
        hashAlgorithm: 'SHA-256',
      },
      logs: auditLogs.map(log => ({
        ...log,
        integrityValid: log.verifyIntegrity(),
      })),
    }, null, 2);
  }

  /**
   * Identify potential risk indicators from audit logs.
   */
  private identifyRiskIndicators(auditLogs: AuditLog[]): ComplianceSummaryReport['riskIndicators'] {
    const indicators: ComplianceSummaryReport['riskIndicators'] = [];

    // Check for failed login attempts
    const failedLogins = auditLogs.filter(log =>
      log.actionType === AuditActionType.LOGIN_FAILED
    );
    if (failedLogins.length > 10) {
      indicators.push({
        type: 'BRUTE_FORCE_ATTEMPT',
        severity: 'high',
        description: 'Multiple failed login attempts detected',
        count: failedLogins.length,
      });
    }

    // Check for after-hours access
    const afterHoursAccess = auditLogs.filter(log => {
      const hour = log.timestamp.getHours();
      return hour < 6 || hour > 22;
    });
    if (afterHoursAccess.length > 20) {
      indicators.push({
        type: 'AFTER_HOURS_ACCESS',
        severity: 'medium',
        description: 'Significant after-hours system access',
        count: afterHoursAccess.length,
      });
    }

    // Check for restricted data access
    const restrictedAccess = auditLogs.filter(log =>
      log.dataClassification === DataClassification.RESTRICTED
    );
    if (restrictedAccess.length > 50) {
      indicators.push({
        type: 'RESTRICTED_DATA_ACCESS',
        severity: 'medium',
        description: 'High volume of restricted data access',
        count: restrictedAccess.length,
      });
    }

    // Check for data export activities
    const dataExports = auditLogs.filter(log =>
      log.actionType === AuditActionType.DATA_EXPORT_COMPLETED ||
      log.actionType === AuditActionType.POLICY_EXPORTED ||
      log.actionType === AuditActionType.CLAIM_EXPORTED ||
      log.actionType === AuditActionType.USER_EXPORTED
    );
    if (dataExports.length > 10) {
      indicators.push({
        type: 'DATA_EXPORT_ACTIVITY',
        severity: 'medium',
        description: 'Multiple data export operations',
        count: dataExports.length,
      });
    }

    // Check for permission changes
    const permissionChanges = auditLogs.filter(log =>
      log.actionType === AuditActionType.USER_ROLE_CHANGED ||
      log.actionType === AuditActionType.USER_PERMISSION_GRANTED ||
      log.actionType === AuditActionType.USER_PERMISSION_REVOKED
    );
    if (permissionChanges.length > 5) {
      indicators.push({
        type: 'PERMISSION_CHANGES',
        severity: 'low',
        description: 'Multiple permission modifications',
        count: permissionChanges.length,
      });
    }

    return indicators;
  }

  /**
   * Convert audit logs to CSV format.
   */
  private convertToCSV(auditLogs: AuditLog[]): string {
    const headers = [
      'timestamp',
      'actionType',
      'entityType',
      'actor',
      'entityReference',
      'dataClassification',
      'ipAddress',
      'hash',
      'integrityValid',
    ];

    const rows = auditLogs.map(log => [
      log.timestamp.toISOString(),
      log.actionType,
      log.entityType,
      log.actor,
      log.entityReference || '',
      log.dataClassification,
      log.ipAddress || '',
      log.hash,
      log.verifyIntegrity().toString(),
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
