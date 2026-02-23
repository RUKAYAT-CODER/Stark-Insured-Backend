import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';
import { User } from '../../users/entities/user.entity';

/**
 * Stores refresh tokens for users
 * Each refresh token can be used to obtain a new access token
 */
@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Column()
  @Index()
  userId: string;

  @Column({ unique: true })
  @Index()
  token: string;

  @Column('text')
  tokenHash: string;

  @Column({ type: 'boolean', default: false })
  isRevoked: boolean;

  @Column({ nullable: true })
  revokedAt?: Date;

  @Column({ nullable: true })
  revokedReason?: string;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  lastUsedAt?: Date;

  @Column({ type: 'inet', nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token is valid (not revoked and not expired)
   */
  isValid(): boolean {
    return !this.isRevoked && !this.isExpired();
  }
}
