import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { SessionService } from './services/session.service';
import { MfaService } from './services/mfa.service';
import * as crypto from 'crypto';
import { Keypair } from 'stellar-sdk';
import { ChallengeNotFoundException } from './exceptions/challenge-not-found.exception';
import { ChallengeExpiredException } from './exceptions/challenge-expired.exception';
import { InvalidSignatureException } from './exceptions/invalid-signature.exception';
import { UserNotFoundException } from './exceptions/user-not-found.exception';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  sessionToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
  expiresAt: Date;
  user: {
    id: string;
    walletAddress: string;
    email?: string;
    roles: string[];
  };
  mfaRequired?: boolean;
  sessionId?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private jwtTokenService: JwtTokenService,
    private refreshTokenService: RefreshTokenService,
    private tokenBlacklistService: TokenBlacklistService,
    private sessionService: SessionService,
    private mfaService: MfaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async generateChallenge(walletAddress: string) {
    this.logger.log(`Generating login challenge for wallet ${walletAddress}`);
    // 1. Validate wallet address (Basic check handled by DTO, but ensure basic length/format)

    // 2. Generate Nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const timestamp = Math.floor(Date.now() / 1000);

    const message = `Sign this message to login to InsuranceDAO\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

    // 3. Store in Cache
    const key = `auth:challenge:${walletAddress}`;
    const ttl = 10 * 60 * 1000; // 10 minutes in milliseconds

    await this.cacheManager.set(key, { nonce, timestamp, message }, ttl);

    // 4. Return response
    const expiresAt = new Date((timestamp + 600) * 1000).toISOString();

    return {
      challenge: message,
      expiresAt,
    };
  }

  async login(
    walletAddress: string,
    signature: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    this.logger.log(`Login attempt for wallet ${walletAddress}`);

    // Check Lockout
    const lockoutKey = `auth:lockout:${walletAddress}`;
    const failures = (await this.cacheManager.get<number>(lockoutKey)) || 0;
    if (failures >= 5) {
      this.logger.warn(
        `Wallet ${walletAddress} is locked out due to too many failed attempts`,
      );
      throw new BadRequestException(
        'Wallet is temporarily locked due to too many failed attempts. Try again in 15 minutes.',
      );
    }

    const key = `auth:challenge:${walletAddress}`;
    const cached: any = await this.cacheManager.get(key);

    if (!cached) {
      throw new ChallengeNotFoundException(walletAddress);
    }

    const { message, timestamp } = cached;

    // Verify timestamp (5 minute window check)
    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp - timestamp > 300) {
      // 300 seconds = 5 mins
      await this.incrementFailure(walletAddress);
      throw new ChallengeExpiredException();
    }

    // Verify Signature — keep the SDK call in its own try block so SDK
    // errors (e.g. malformed key) are isolated from the validity check.
    let isValid = false;
    try {
      const keypair = Keypair.fromPublicKey(walletAddress);
      const messageBuffer = Buffer.from(message);
      const signatureBuffer = Buffer.from(signature, 'base64');
      isValid = keypair.verify(messageBuffer, signatureBuffer);
    } catch (error: any) {
      await this.incrementFailure(walletAddress);
      this.logger.error(
        `Signature verification error for ${walletAddress}: ${error.message}`,
      );
      throw new InvalidSignatureException(
        `Signature verification error: ${error.message}`,
      );
    }

    if (!isValid) {
      await this.incrementFailure(walletAddress);
      this.logger.warn(`Invalid signature for wallet ${walletAddress}`);
      throw new InvalidSignatureException();
    }

    // Check User
    const user = await this.usersService.findByWalletAddress(walletAddress);
    if (!user) {
      this.logger.warn(`Wallet ${walletAddress} not registered`);
      throw new UserNotFoundException(walletAddress);
    }

    // Invalidate Nonce (Replay Attack Prevention)
    await this.cacheManager.del(key);
    // Clear failures on success
    await this.cacheManager.del(lockoutKey);

    this.logger.log(`Login successful for user ${user.id} (${walletAddress})`);

    // Generate tokens and session
    return this.generateTokens(user, ipAddress, userAgent);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
    expiresAt: Date;
    tokenType: 'Bearer';
  }> {
    this.logger.log('Attempting to refresh access token');

    // Validate refresh token
    const storedRefreshToken =
      await this.refreshTokenService.validateRefreshToken(refreshToken);

    const user = storedRefreshToken.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new access token
    const { token, expiresAt, expiresIn } =
      this.jwtTokenService.generateAccessToken(
        user,
        storedRefreshToken.id,
      );

    // Update last used timestamp
    await this.refreshTokenService.updateLastUsed(
      refreshToken,
    );

    // Optionally rotate refresh token
    // const newRefreshToken = await this.refreshTokenService.rotateRefreshToken(
    //   refreshToken,
    //   user.id,
    // );

    this.logger.log(`Access token refreshed for user ${user.id}`);

    return {
      accessToken: token,
      expiresIn,
      expiresAt,
      tokenType: 'Bearer',
    };
  }

  /**
   * Logout user - revoke tokens and sessions
   */
  async logout(
    userId: string,
    refreshToken?: string,
    sessionToken?: string,
    logoutAll?: boolean,
  ): Promise<void> {
    this.logger.log(`Logout initiated for user ${userId}`);

    if (logoutAll) {
      // Revoke all refresh tokens
      await this.refreshTokenService.revokeAllUserTokens(
        userId,
        'User logged out from all devices',
      );

      // Revoke all sessions
      await this.sessionService.revokeAllUserSessions(
        userId,
        'User logged out from all devices',
      );
    } else {
      // Revoke specific refresh token
      if (refreshToken) {
        try {
          await this.refreshTokenService.revokeToken(
            refreshToken,
            'User logged out',
          );
        } catch (error) {
          this.logger.warn(`Failed to revoke refresh token: ${error.message}`);
        }
      }

      // Revoke specific session
      if (sessionToken) {
        try {
          const session =
            await this.sessionService.getSessionByToken(sessionToken);
          await this.sessionService.revokeSession(
            session.id,
            'User logged out',
          );
        } catch (error) {
          this.logger.warn(`Failed to revoke session: ${error.message}`);
        }
      }
    }

    this.logger.log(`Logout completed for user ${userId}`);
  }

  /**
   * Verify MFA code and update session
   */
  async verifyMfa(
    userId: string,
    code: string,
    sessionToken: string,
    isBackupCode: boolean = false,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`MFA verification attempt for user ${userId}`);

    // Validate session
    const session = await this.sessionService.getSessionByToken(sessionToken);

    if (session.userId !== userId) {
      throw new UnauthorizedException('Session user mismatch');
    }

    let isValid = false;

    if (isBackupCode) {
      isValid = await this.mfaService.verifyBackupCode(userId, code);
    } else {
      isValid = await this.mfaService.verifyTotp(userId, code);
    }

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Mark session as MFA verified
    await this.sessionService.markMfaVerified(sessionToken);

    this.logger.log(`MFA verified for user ${userId}`);

    return {
      success: true,
      message: 'MFA verification successful',
    };
  }

  private async incrementFailure(walletAddress: string) {
    const lockoutKey = `auth:lockout:${walletAddress}`;
    const failures =
      ((await this.cacheManager.get<number>(lockoutKey)) || 0) + 1;
    const ttl = 15 * 60 * 1000; // 15 minutes
    await this.cacheManager.set(lockoutKey, failures, ttl);
  }

  private async generateTokens(
    user: User,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponse> {
    // Create session
    const { session, sessionToken } = await this.sessionService.createSession({
      userId: user.id,
      ipAddress,
      userAgent,
    });

    // Generate access token
    const { token: accessToken, expiresAt: accessTokenExpiresAt, expiresIn: accessTokenExpiresIn } =
      this.jwtTokenService.generateAccessToken(user, session.id);

    // Generate refresh token
    const { token: refreshToken } =
      await this.refreshTokenService.createRefreshToken(user.id, session.id);

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Check if MFA is required
    const mfaRequired = await this.mfaService.isMfaRequired(user.id);

    const response: LoginResponse = {
      accessToken,
      refreshToken,
      sessionToken,
      tokenType: 'Bearer',
      expiresIn: accessTokenExpiresIn,
      expiresAt: accessTokenExpiresAt,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        roles: user.roles,
      },
      mfaRequired,
      sessionId: session.id,
    };

    this.logger.log(`Tokens generated for user ${user.id}`);

    return response;
  }
}
