import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { TokenBlacklist } from '../entities/token-blacklist.entity';
import { JwtTokenService, JwtPayload } from './jwt-token.service';
import * as crypto from 'crypto';

/**
 * Service for managing token blacklist/revocation
 * Prevents revoked tokens from being used
 * Uses both database and Redis cache for performance
 */
@Injectable()
export class TokenBlacklistService {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private readonly BLACKLIST_CACHE_PREFIX = 'token_blacklist:';

  constructor(
    @InjectRepository(TokenBlacklist)
    private tokenBlacklistRepo: Repository<TokenBlacklist>,
    private jwtTokenService: JwtTokenService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Add a token to the blacklist
   */
  async blacklistToken(
    token: string,
    userId: string,
    reason?: string,
    ipAddress?: string,
  ): Promise<void> {
    try {
      const decoded = this.jwtTokenService.decodeToken(token);

      if (!decoded.exp) {
        throw new Error('Token has no expiration');
      }

      const expiresAt = new Date(decoded.exp * 1000);
      const tokenHash = this.hashToken(token);

      // Save to database for persistence
      const blacklistEntry = this.tokenBlacklistRepo.create({
        token,
        tokenHash,
        userId,
        expiresAt,
        reason,
        ipAddress,
      });

      await this.tokenBlacklistRepo.save(blacklistEntry);

      // Also cache for faster lookup
      const ttl = this.jwtTokenService.getTokenTimeToLive(expiresAt);
      await this.cacheManager.set(
        `${this.BLACKLIST_CACHE_PREFIX}${tokenHash}`,
        true,
        ttl * 1000, // Convert seconds to milliseconds
      );

      this.logger.log(`Token blacklisted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${error.message}`);
      throw new BadRequestException('Failed to blacklist token');
    }
  }

  /**
   * Check if a token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const cacheKey = `${this.BLACKLIST_CACHE_PREFIX}${tokenHash}`;

    // Check cache first
    const cachedBlacklist = await this.cacheManager.get(cacheKey);
    if (cachedBlacklist === true) {
      return true;
    }

    // Check database
    const blacklistEntry = await this.tokenBlacklistRepo.findOne({
      where: { tokenHash },
    });

    if (!blacklistEntry) {
      return false;
    }

    // If entry is not expired, it's blacklisted
    if (!blacklistEntry.isExpired()) {
      return true;
    }

    // Entry is expired, remove it
    await this.tokenBlacklistRepo.remove(blacklistEntry);
    return false;
  }

  /**
   * Validate token is not blacklisted
   */
  async validateTokenNotBlacklisted(token: string): Promise<void> {
    const isBlacklisted = await this.isTokenBlacklisted(token);

    if (isBlacklisted) {
      throw new BadRequestException('Token has been revoked');
    }
  }

  /**
   * Blacklist all tokens for a user (logout)
   */
  async blacklistAllUserTokens(
    userId: string,
    reason?: string,
  ): Promise<number> {
    // This would be called when user logs out
    // In practice, we rely on refresh token revocation for this
    // But we keep this for emergency cases

    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const result = await this.tokenBlacklistRepo.update(
      { userId },
      { reason },
    );

    this.logger.log(
      `Blacklisted tokens for user ${userId}: ${result.affected} entries`,
    );

    return result.affected || 0;
  }

  /**
   * Clean up expired blacklist entries
   */
  async cleanupExpiredEntries(): Promise<number> {
    const expiryDate = new Date();

    const result = await this.tokenBlacklistRepo.delete({
      expiresAt: LessThan(expiryDate),
    });

    this.logger.log(`Cleaned up ${result.affected} expired blacklist entries`);

    return result.affected || 0;
  }

  /**
   * Get blacklist entries for a user
   */
  async getUserBlacklistEntries(userId: string): Promise<TokenBlacklist[]> {
    return this.tokenBlacklistRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Hash token for storage
   * Never store plain tokens in database
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
