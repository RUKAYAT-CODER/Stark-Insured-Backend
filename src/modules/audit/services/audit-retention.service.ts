import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { AuditLog } from '../entities/audit.entity';
import { DataClassification } from '../enums/data-classification.enum';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface RetentionPolicy {
  name: string;
  dataClassification: DataClassification;
  retentionPeriodDays: number;
  archiveEnabled: boolean;
  archiveLocation?: string;
  deleteAfterArchive: boolean;
}

export interface ArchiveResult {
  archivedCount: number;
  archivePath: string;
  archiveHash: string;
  archivedAt: Date;
}

export interface CleanupResult {
  deletedCount: number;
  archivedCount: number;
  policyName: string;
}

/**
 * Service for managing audit log retention policies and archiving.
 * Ensures compliance with data retention regulations while maintaining
 * audit trail integrity.
 */
@Injectable()
export class AuditRetentionService {
  private readonly logger = new Logger(AuditRetentionService.name);
  private readonly retentionPolicies: RetentionPolicy[];
  private readonly defaultArchivePath: string;

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    // Default retention policies based on data classification
    this.retentionPolicies = [
      {
        name: 'public-retention',
        dataClassification: DataClassification.PUBLIC,
        retentionPeriodDays: 365, // 1 year
        archiveEnabled: true,
        deleteAfterArchive: true,
      },
      {
        name: 'internal-retention',
        dataClassification: DataClassification.INTERNAL,
        retentionPeriodDays: 2555, // 7 years (standard business record retention)
        archiveEnabled: true,
        deleteAfterArchive: false,
      },
      {
        name: 'confidential-retention',
        dataClassification: DataClassification.CONFIDENTIAL,
        retentionPeriodDays: 2555, // 7 years
        archiveEnabled: true,
        deleteAfterArchive: false,
      },
      {
        name: 'restricted-retention',
        dataClassification: DataClassification.RESTRICTED,
        retentionPeriodDays: 3650, // 10 years (financial/health data)
        archiveEnabled: true,
        deleteAfterArchive: false,
      },
    ];

    this.defaultArchivePath = process.env.AUDIT_ARCHIVE_PATH || './archives/audit-logs';
  }

  /**
   * Apply retention policies to audit logs.
   * Archives and/or deletes logs based on their data classification and age.
   */
  async applyRetentionPolicies(): Promise<CleanupResult[]> {
    this.logger.log('Applying audit log retention policies');
    const results: CleanupResult[] = [];

    for (const policy of this.retentionPolicies) {
      const result = await this.applyPolicy(policy);
      results.push(result);
    }

    return results;
  }

  /**
   * Apply a single retention policy.
   */
  private async applyPolicy(policy: RetentionPolicy): Promise<CleanupResult> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriodDays);

    this.logger.log(
      `Applying policy '${policy.name}': Processing logs older than ${cutoffDate.toISOString()}`
    );

    // Find logs that need to be processed
    const logsToProcess = await this.auditLogRepository.find({
      where: {
        dataClassification: policy.dataClassification,
        timestamp: LessThan(cutoffDate),
        archivedAt: null, // Only process non-archived logs
      },
      order: { timestamp: 'ASC' },
    });

    if (logsToProcess.length === 0) {
      this.logger.log(`No logs to process for policy '${policy.name}'`);
      return {
        deletedCount: 0,
        archivedCount: 0,
        policyName: policy.name,
      };
    }

    this.logger.log(`Found ${logsToProcess.length} logs to process for policy '${policy.name}'`);

    let archivedCount = 0;
    let deletedCount = 0;

    // Archive logs if enabled
    if (policy.archiveEnabled) {
      const archiveResult = await this.archiveLogs(logsToProcess, policy);
      archivedCount = archiveResult.archivedCount;

      // Update logs as archived
      for (const log of logsToProcess) {
        log.archivedAt = archiveResult.archivedAt;
        log.retentionPolicy = policy.name;
        await this.auditLogRepository.save(log);
      }
    }

    // Delete logs if configured
    if (policy.deleteAfterArchive && policy.archiveEnabled) {
      const idsToDelete = logsToProcess.map(log => log.id);
      const deleteResult = await this.auditLogRepository.delete(idsToDelete);
      deletedCount = deleteResult.affected || 0;
      this.logger.log(`Deleted ${deletedCount} logs for policy '${policy.name}'`);
    }

    return {
      deletedCount,
      archivedCount,
      policyName: policy.name,
    };
  }

  /**
   * Archive audit logs to file storage.
   */
  async archiveLogs(
    logs: AuditLog[],
    policy: RetentionPolicy,
  ): Promise<ArchiveResult> {
    const archiveDir = policy.archiveLocation || this.defaultArchivePath;
    
    // Ensure archive directory exists
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archiveFileName = `audit-archive-${policy.name}-${timestamp}.json`;
    const archivePath = path.join(archiveDir, archiveFileName);

    // Prepare archive data with integrity information
    const archiveData = {
      metadata: {
        createdAt: new Date(),
        policy: policy.name,
        dataClassification: policy.dataClassification,
        recordCount: logs.length,
        dateRange: {
          oldest: logs[0]?.timestamp,
          newest: logs[logs.length - 1]?.timestamp,
        },
      },
      logs: logs.map(log => ({
        ...log,
        integrityValid: log.verifyIntegrity(),
      })),
    };

    // Write archive file
    const jsonData = JSON.stringify(archiveData, null, 2);
    fs.writeFileSync(archivePath, jsonData);

    // Calculate archive hash for verification
    const archiveHash = crypto
      .createHash('sha256')
      .update(jsonData)
      .digest('hex');

    // Write hash file
    const hashFileName = `${archiveFileName}.sha256`;
    fs.writeFileSync(path.join(archiveDir, hashFileName), archiveHash);

    this.logger.log(
      `Archived ${logs.length} logs to ${archivePath} with hash ${archiveHash}`
    );

    return {
      archivedCount: logs.length,
      archivePath,
      archiveHash,
      archivedAt: new Date(),
    };
  }

  /**
   * Verify the integrity of an archived file.
   */
  async verifyArchiveIntegrity(archivePath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(archivePath)) {
        this.logger.error(`Archive file not found: ${archivePath}`);
        return false;
      }

      const hashFilePath = `${archivePath}.sha256`;
      if (!fs.existsSync(hashFilePath)) {
        this.logger.error(`Hash file not found: ${hashFilePath}`);
        return false;
      }

      const storedHash = fs.readFileSync(hashFilePath, 'utf-8');
      const fileContent = fs.readFileSync(archivePath, 'utf-8');
      const calculatedHash = crypto
        .createHash('sha256')
        .update(fileContent)
        .digest('hex');

      const isValid = storedHash === calculatedHash;
      
      if (isValid) {
        this.logger.log(`Archive integrity verified: ${archivePath}`);
      } else {
        this.logger.error(`Archive integrity check failed: ${archivePath}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error(`Error verifying archive integrity: ${error.message}`);
      return false;
    }
  }

  /**
   * Restore archived logs to the database.
   * Useful for investigations or compliance queries.
   */
  async restoreFromArchive(archivePath: string): Promise<number> {
    try {
      this.logger.log(`Restoring logs from archive: ${archivePath}`);

      // Verify integrity first
      const isValid = await this.verifyArchiveIntegrity(archivePath);
      if (!isValid) {
        throw new Error('Archive integrity check failed');
      }

      const fileContent = fs.readFileSync(archivePath, 'utf-8');
      const archiveData = JSON.parse(fileContent);

      let restoredCount = 0;
      for (const logData of archiveData.logs) {
        // Check if log already exists
        const existing = await this.auditLogRepository.findOne({
          where: { id: logData.id },
        });

        if (!existing) {
          const log = this.auditLogRepository.create({
            ...logData,
            archivedAt: null, // Mark as not archived since we're restoring
          });
          await this.auditLogRepository.save(log);
          restoredCount++;
        }
      }

      this.logger.log(`Restored ${restoredCount} logs from archive`);
      return restoredCount;
    } catch (error) {
      this.logger.error(`Failed to restore from archive: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get retention statistics.
   */
  async getRetentionStatistics(): Promise<{
    totalLogs: number;
    archivedLogs: number;
    byClassification: Record<DataClassification, number>;
    byPolicy: Record<string, number>;
  }> {
    const totalLogs = await this.auditLogRepository.count();
    const archivedLogs = await this.auditLogRepository.count({
      where: { archivedAt: null },
    });

    const byClassification: Record<DataClassification, number> = {
      [DataClassification.PUBLIC]: 0,
      [DataClassification.INTERNAL]: 0,
      [DataClassification.CONFIDENTIAL]: 0,
      [DataClassification.RESTRICTED]: 0,
    };

    for (const classification of Object.values(DataClassification)) {
      byClassification[classification] = await this.auditLogRepository.count({
        where: { dataClassification: classification },
      });
    }

    const byPolicy: Record<string, number> = {};
    for (const policy of this.retentionPolicies) {
      byPolicy[policy.name] = await this.auditLogRepository.count({
        where: { retentionPolicy: policy.name },
      });
    }

    return {
      totalLogs,
      archivedLogs: totalLogs - archivedLogs,
      byClassification,
      byPolicy,
    };
  }

  /**
   * Add a custom retention policy.
   */
  addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.push(policy);
    this.logger.log(`Added retention policy: ${policy.name}`);
  }

  /**
   * Get all retention policies.
   */
  getRetentionPolicies(): RetentionPolicy[] {
    return [...this.retentionPolicies];
  }

  /**
   * Purge old archived logs that have exceeded their retention period.
   * This permanently deletes archived files.
   */
  async purgeOldArchives(maxAgeDays: number = 3650): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    let purgedCount = 0;

    if (fs.existsSync(this.defaultArchivePath)) {
      const files = fs.readdirSync(this.defaultArchivePath);
      
      for (const file of files) {
        const filePath = path.join(this.defaultArchivePath, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate && file.endsWith('.json')) {
          fs.unlinkSync(filePath);
          
          // Also delete hash file if exists
          const hashFile = `${filePath}.sha256`;
          if (fs.existsSync(hashFile)) {
            fs.unlinkSync(hashFile);
          }
          
          purgedCount++;
          this.logger.log(`Purged old archive: ${filePath}`);
        }
      }
    }

    this.logger.log(`Purged ${purgedCount} old archive files`);
    return purgedCount;
  }
}
