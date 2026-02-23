import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index, BeforeInsert, BeforeUpdate } from 'typeorm';
import * as crypto from 'crypto';
import { AuditActionType } from '../enums/audit-action-type.enum';
import { DataClassification } from '../enums/data-classification.enum';

@Entity('audit_logs')
@Index(['actor', 'timestamp'])
@Index(['entityReference', 'timestamp'])
@Index(['actionType', 'timestamp'])
@Index(['ipAddress', 'timestamp'])
@Index(['sessionId', 'timestamp'])
@Index(['dataClassification', 'timestamp'])
@Index(['entityType', 'entityReference'])
@Index(['hash'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: AuditActionType,
  })
  actionType: AuditActionType;

  @Column({ type: 'varchar', length: 50 })
  entityType: string; // e.g., 'CLAIM', 'POLICY', 'USER', 'DAO'

  @Column({ type: 'varchar', length: 255 })
  actor: string; // user ID or wallet address

  @Column({ type: 'varchar', length: 255, nullable: true })
  actorType?: string; // 'USER', 'SYSTEM', 'API_KEY', 'ORACLE'

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityReference?: string; // policy ID, claim ID, etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  // GDPR Compliance Fields
  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string; // IPv4 or IPv6 address

  @Column({ type: 'text', nullable: true })
  userAgent?: string; // Browser/device user agent

  @Column({ type: 'varchar', length: 255, nullable: true })
  sessionId?: string; // Session identifier

  @Column({ type: 'varchar', length: 500, nullable: true })
  requestPath?: string; // API endpoint path

  @Column({ type: 'varchar', length: 10, nullable: true })
  requestMethod?: string; // HTTP method

  @Column({
    type: 'enum',
    enum: DataClassification,
    default: DataClassification.INTERNAL,
  })
  dataClassification: DataClassification;

  @Column({ type: 'boolean', default: false })
  requiresConsent: boolean; // Whether this action requires GDPR consent

  @Column({ type: 'boolean', default: false })
  consentObtained?: boolean; // Whether consent was obtained

  @Column({ type: 'varchar', length: 255, nullable: true })
  consentId?: string; // Reference to consent record

  // Data Access Tracking
  @Column({ type: 'jsonb', nullable: true })
  dataAccessed?: string[]; // List of data fields accessed

  @Column({ type: 'jsonb', nullable: true })
  dataModified?: Record<string, { old: any; new: any }>; // Before/after values

  @Column({ type: 'jsonb', nullable: true })
  maskedFields?: string[]; // Fields that were masked in the log

  // Immutability & Integrity
  @Column({ type: 'varchar', length: 64, nullable: true })
  previousHash?: string; // Hash of previous audit log entry (for chain)

  @Column({ type: 'varchar', length: 64 })
  hash: string; // SHA-256 hash of this entry

  @Column({ type: 'boolean', default: false })
  isImmutable: boolean; // Once set, cannot be modified

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date; // When this log was archived

  @Column({ type: 'varchar', length: 50, nullable: true })
  retentionPolicy?: string; // Retention policy applied

  // Additional Context
  @Column({ type: 'text', nullable: true })
  description?: string; // Human-readable description

  @Column({ type: 'varchar', length: 100, nullable: true })
  correlationId?: string; // For tracing across services

  @Column({ type: 'jsonb', nullable: true })
  geoLocation?: {
    country?: string;
    region?: string;
    city?: string;
  };

  @Column({ type: 'boolean', default: false })
  isSensitive: boolean; // Flag for sensitive operations

  @Column({ type: 'varchar', length: 50, nullable: true })
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @BeforeInsert()
  @BeforeUpdate()
  preventModification(): void {
    if (this.isImmutable) {
      throw new Error('Audit logs are immutable and cannot be modified');
    }
  }

  /**
   * Calculate hash for this audit log entry
   */
  calculateHash(): string {
    const data = JSON.stringify({
      id: this.id,
      actionType: this.actionType,
      entityType: this.entityType,
      actor: this.actor,
      timestamp: this.timestamp,
      entityReference: this.entityReference,
      metadata: this.metadata,
      ipAddress: this.ipAddress,
      sessionId: this.sessionId,
      dataClassification: this.dataClassification,
      previousHash: this.previousHash,
    });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify the integrity of this audit log entry
   */
  verifyIntegrity(): boolean {
    return this.hash === this.calculateHash();
  }
}