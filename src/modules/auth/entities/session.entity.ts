import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { User } from '../../users/entities/user.entity';

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

/**
 * Tracks active user sessions
 * Used for device management and session-based logout
 */
@Entity('sessions')
export class Session extends BaseEntity {
  @Column()
  @Index()
  userId: string;

  @Column({ unique: true })
  @Index()
  sessionToken: string;

  @Column('text')
  sessionTokenHash: string;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  browser?: string;

  @Column({ nullable: true })
  operatingSystem?: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  revokedReason?: string;

  @Column({ nullable: true })
  lastActivityAt?: Date;

  @Column({ default: true })
  isMfaVerified: boolean;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Check if session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if session is valid
   */
  isValid(): boolean {
    return this.status === SessionStatus.ACTIVE && !this.isExpired();
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    this.lastActivityAt = new Date();
  }

  /**
   * Revoke the session
   */
  revoke(reason?: string): void {
    this.status = SessionStatus.REVOKED;
    this.revokedAt = new Date();
    this.revokedReason = reason;
  }
}
