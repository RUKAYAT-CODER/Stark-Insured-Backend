import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';

/**
 * Token blacklist for revoked JWT tokens
 * Tokens are stored here when they are explicitly revoked (e.g., on logout)
 */
@Entity('token_blacklist')
export class TokenBlacklist extends BaseEntity {
  @Column({ unique: true })
  @Index()
  token: string;

  @Column('text')
  tokenHash: string;

  @Column()
  @Index()
  userId: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  reason?: string;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  /**
   * Check if entry is still valid (not expired)
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }
}
