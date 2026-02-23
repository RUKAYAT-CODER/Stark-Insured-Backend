import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtTokenService } from './jwt-token.service';
import * as crypto from 'crypto';

/**
 * Service for managing refresh token lifecycle
 * Handles creation, validation, revocation, and cleanup of refresh tokens
 */
@Injectable()
export class RefreshTokenService {
  private readonly logger = new Logger(RefreshTokenService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Create a new refresh token
   */
  async createRefreshToken(
    userId: string,
    sessionId?: string,
  ): Promise<RefreshToken> {
    const jti = this.jwtTokenService.generateJti();
    const { token, expiresAt } = this.jwtTokenService.generateRefreshToken(
      userId,
      sessionId,
      jti,
    );

    const tokenHash = this.hashToken(token);

    const refreshToken = this.refreshTokenRepo.create({
      userId,
      token,
      tokenHash,
      expiresAt,
    });

    await this.refreshTokenRepo.save(refreshToken);
    this.logger.log(`Refresh token created for user ${userId}`);

    return refreshToken;
  }

  /**
   * Validate and find a refresh token
   */
  async validateRefreshToken(token: string): Promise<RefreshToken> {
    // Verify token signature first
    try {
      this.jwtTokenService.verifyRefreshToken(token);
    } catch (error) {
      this.logger.error(`Invalid refresh token signature: ${error.message}`);
      throw new BadRequestException('Invalid refresh token');
    }

    const tokenHash = this.hashToken(token);

    const refreshToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!refreshToken) {
      throw new NotFoundException('Refresh token not found');
    }

    if (refreshToken.isRevoked) {
      this.logger.warn(`Refresh token has been revoked: ${refreshToken.id}`);
      throw new BadRequestException('Refresh token has been revoked');
    }

    if (refreshToken.isExpired()) {
      this.logger.warn(`Refresh token expired: ${refreshToken.id}`);
      throw new BadRequestException('Refresh token has expired');
    }

    return refreshToken;
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(
    token: string,
    reason?: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    const refreshToken = await this.refreshTokenRepo.findOne({
      where: { tokenHash },
    });

    if (!refreshToken) {
      throw new NotFoundException('Refresh token not found');
    }

    refreshToken.isRevoked = true;
    refreshToken.revokedAt = new Date();
    refreshToken.revokedReason = reason;

    await this.refreshTokenRepo.save(refreshToken);
    this.logger.log(`Refresh token revoked: ${refreshToken.id}`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserTokens(
    userId: string,
    reason?: string,
  ): Promise<number> {
    const result = await this.refreshTokenRepo.update(
      {
        userId,
        isRevoked: false,
      },
      {
        isRevoked: true,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    );

    this.logger.log(
      `Revoked ${result.affected} refresh tokens for user ${userId}`,
    );

    return result.affected || 0;
  }

  /**
   * Update last used timestamp
   */
  async updateLastUsed(token: string, ipAddress?: string): Promise<void> {
    const tokenHash = this.hashToken(token);

    await this.refreshTokenRepo.update(
      { tokenHash },
      {
        lastUsedAt: new Date(),
        ...(ipAddress && { ipAddress }),
      },
    );
  }

  /**
   * Clean up expired tokens (older than token expiration)
   */
  async cleanupExpiredTokens(): Promise<number> {
    const expiryDate = new Date();

    const result = await this.refreshTokenRepo.delete({
      expiresAt: LessThan(expiryDate),
    });

    this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);

    return result.affected || 0;
  }

  /**
   * Get all active refresh tokens for a user
   */
  async getUserActiveTokens(userId: string): Promise<RefreshToken[]> {
    return this.refreshTokenRepo.find({
      where: {
        userId,
        isRevoked: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get refresh token info (for device management)
   */
  async getTokenInfo(tokenId: string): Promise<RefreshToken> {
    const token = await this.refreshTokenRepo.findOne({
      where: { id: tokenId },
    });

    if (!token) {
      throw new NotFoundException('Refresh token not found');
    }

    return token;
  }

  /**
   * Rotate refresh token (revoke old, create new)
   * This is the token rotation mechanism
   */
  async rotateRefreshToken(
    oldToken: string,
    userId: string,
    sessionId?: string,
  ): Promise<RefreshToken> {
    // Validate and revoke old token
    try {
      await this.revokeToken(oldToken, 'Token rotated');
    } catch (error) {
      this.logger.warn(`Could not revoke old token during rotation: ${error.message}`);
    }

    // Create new token
    const newToken = await this.createRefreshToken(userId, sessionId);

    return newToken;
  }

  /**
   * Hash token for storage
   * Never store plain tokens in database
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
