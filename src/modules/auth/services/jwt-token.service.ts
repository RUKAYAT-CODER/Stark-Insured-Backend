import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AppConfigService } from '../../../config/app-config.service';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string; // user id
  walletAddress: string;
  email?: string;
  roles: string[];
  sessionId?: string;
  type: 'access' | 'refresh'; // Token type
  iat?: number; // Issued at
  exp?: number; // Expiration
  jti?: string; // JWT ID for tracking
}

/**
 * Service for handling JWT token operations
 * Manages token generation, validation, and extraction
 */
@Injectable()
export class JwtTokenService {
  private readonly logger = new Logger(JwtTokenService.name);

  constructor(
    private jwtService: JwtService,
    private configService: AppConfigService,
  ) {}

  /**
   * Generate an access token
   * Access tokens are short-lived tokens for API access
   */
  generateAccessToken(
    user: User,
    sessionId?: string,
    jti?: string,
  ): {
    token: string;
    expiresIn: number;
    expiresAt: Date;
  } {
    const accessTokenTtl = this.configService.jwtAccessTokenTtl;
    const expiresInSeconds = this.parseExpireTime(accessTokenTtl);

    const payload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      roles: user.roles,
      type: 'access',
      ...(sessionId && { sessionId }),
      ...(jti && { jti }),
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: accessTokenTtl,
      secret: this.configService.jwtSecret,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      token,
      expiresIn: expiresInSeconds,
      expiresAt,
    };
  }

  /**
   * Generate a refresh token
   * Refresh tokens are long-lived tokens used to obtain new access tokens
   */
  generateRefreshToken(
    userId: string,
    sessionId?: string,
    jti?: string,
  ): {
    token: string;
    expiresIn: number;
    expiresAt: Date;
  } {
    const refreshTokenTtl = this.configService.jwtRefreshTokenTtl;
    const expiresInSeconds = this.parseExpireTime(refreshTokenTtl);

    const payload: JwtPayload = {
      sub: userId,
      type: 'refresh',
      ...(sessionId && { sessionId }),
      ...(jti && { jti }),
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: refreshTokenTtl,
      secret: this.configService.jwtRefreshSecret,
    });

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    return {
      token,
      expiresIn: expiresInSeconds,
      expiresAt,
    };
  }

  /**
   * Verify and decode an access token
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.jwtSecret,
      });

      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }

      return decoded as JwtPayload;
    } catch (error) {
      this.logger.error(`Access token verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify and decode a refresh token
   */
  verifyRefreshToken(token: string): JwtPayload {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: this.configService.jwtRefreshSecret,
      });

      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }

      return decoded as JwtPayload;
    } catch (error) {
      this.logger.error(`Refresh token verification failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Decode token without verification
   * Use only for extracting claims without validation
   */
  decodeToken(token: string): JwtPayload {
    return this.jwtService.decode(token) as JwtPayload;
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer') {
      return null;
    }

    return token || null;
  }

  /**
   * Parse expiration time string to seconds
   * Supports formats like: '1h', '30m', '60s', '7d'
   */
  private parseExpireTime(expireTime: string): number {
    const matches = expireTime.match(/^(\d+)([smhd])$/);

    if (!matches) {
      throw new Error(`Invalid expiration time format: ${expireTime}`);
    }

    const value = parseInt(matches[1], 10);
    const unit = matches[2];

    const unitToSeconds: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    return value * (unitToSeconds[unit] || 1);
  }

  /**
   * Generate a unique JWT ID (jti) for token tracking
   */
  generateJti(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Get remaining time until token expiration in seconds
   */
  getTokenTimeToLive(expiresAt: Date): number {
    return Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
  }
}
