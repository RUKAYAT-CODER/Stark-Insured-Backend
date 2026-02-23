import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { User } from '../../users/entities/user.entity';

export enum MfaMethod {
  TOTP = 'TOTP',
  SMS = 'SMS',
}

/**
 * Stores MFA secrets for users
 * Supports TOTP (Time-based One-Time Password) and SMS
 */
@Entity('mfa_secrets')
export class MfaSecret extends BaseEntity {
  @Column()
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: MfaMethod,
  })
  method: MfaMethod;

  @Column('text')
  secret: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  verifiedAt?: Date;

  @Column({ type: 'simple-array', default: () => 'ARRAY[]::text[]' })
  backupCodes: string[];

  @Column({ type: 'simple-array', default: () => 'ARRAY[]::integer[]' })
  usedBackupCodes: number[];

  @Column({ nullable: true })
  phoneNumber?: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastVerifiedAt?: Date;

  @OneToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Check if backup code has been used
   */
  isBackupCodeUsed(index: number): boolean {
    return this.usedBackupCodes.includes(index);
  }

  /**
   * Mark backup code as used
   */
  markBackupCodeAsUsed(index: number): void {
    if (!this.usedBackupCodes.includes(index)) {
      this.usedBackupCodes.push(index);
    }
  }

  /**
   * Get remaining backup codes count
   */
  getRemainingBackupCodesCount(): number {
    return this.backupCodes.length - this.usedBackupCodes.length;
  }
}
