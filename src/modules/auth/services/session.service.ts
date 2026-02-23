import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session, SessionStatus } from '../entities/session.entity';
import { JwtTokenService } from './jwt-token.service';
import { UAParser } from 'ua-parser-js';
import * as crypto from 'crypto';

export interface CreateSessionOptions {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
  deviceName?: string;
  mfaVerified?: boolean;
}

/**
 * Service for managing user sessions
 * Tracks active sessions, device information, and MFA verification status
 */
@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);

  constructor(
    @InjectRepository(Session)
    private sessionRepo: Repository<Session>,
    private jwtTokenService: JwtTokenService,
  ) {}

  /**
   * Create a new session
   */
  async createSession(options: CreateSessionOptions): Promise<{
    session: Session;
    sessionToken: string;
  }> {
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = this.hashToken(sessionToken);

    // Parse user agent for device info
    const uaParser = new UAParser(options.userAgent || '');
    const result = uaParser.getResult();

    const session = this.sessionRepo.create({
      userId: options.userId,
      sessionToken: sessionToken,
      sessionTokenHash,
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      deviceName: options.deviceName || result.device.name || 'Unknown Device',
      browser: result.browser.name || 'Unknown Browser',
      operatingSystem: result.os.name || 'Unknown OS',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      isMfaVerified: options.mfaVerified || false,
    });

    await this.sessionRepo.save(session);
    this.logger.log(`Session created for user ${options.userId}`);

    return {
      session,
      sessionToken,
    };
  }

  /**
   * Get a session by token
   */
  async getSessionByToken(sessionToken: string): Promise<Session> {
    const sessionTokenHash = this.hashToken(sessionToken);

    const session = await this.sessionRepo.findOne({
      where: { sessionTokenHash },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Check if session is still valid
    if (!session.isValid()) {
      throw new NotFoundException('Session is no longer valid');
    }

    return session;
  }

  /**
   * Validate a session
   */
  async validateSession(sessionToken: string): Promise<boolean> {
    try {
      const session = await this.getSessionByToken(sessionToken);
      return session.isValid();
    } catch {
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getUserActiveSessions(userId: string): Promise<Session[]> {
    return this.sessionRepo.find({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Get session details (for user dashboard)
   */
  async getUserSessionsForDisplay(userId: string): Promise<Array<{
    id: string;
    deviceName: string;
    browser: string;
    operatingSystem: string;
    ipAddress?: string;
    createdAt: Date;
    lastActivityAt?: Date;
    isCurrent?: boolean;
    status: SessionStatus;
  }>> {
    const sessions = await this.getUserActiveSessions(userId);

    return sessions.map(session => ({
      id: session.id,
      deviceName: session.deviceName || 'Unknown Device',
      browser: session.browser || 'Unknown Browser',
      operatingSystem: session.operatingSystem || 'Unknown OS',
      ipAddress: session.ipAddress,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      status: session.status,
    }));
  }

  /**
   * Revoke a session
   */
  async revokeSession(
    sessionId: string,
    reason?: string,
  ): Promise<void> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.revoke(reason);
    await this.sessionRepo.save(session);
    this.logger.log(`Session revoked: ${sessionId}`);
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(
    userId: string,
    reason?: string,
  ): Promise<number> {
    const sessions = await this.sessionRepo.find({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
    });

    let revokedCount = 0;

    for (const session of sessions) {
      session.revoke(reason);
      await this.sessionRepo.save(session);
      revokedCount++;
    }

    this.logger.log(
      `Revoked ${revokedCount} sessions for user ${userId}`,
    );

    return revokedCount;
  }

  /**
   * Update session activity
   */
  async updateSessionActivity(sessionToken: string): Promise<void> {
    const sessionTokenHash = this.hashToken(sessionToken);

    const session = await this.sessionRepo.findOne({
      where: { sessionTokenHash },
    });

    if (session && session.isValid()) {
      session.updateLastActivity();
      await this.sessionRepo.save(session);
    }
  }

  /**
   * Mark session as MFA verified
   */
  async markMfaVerified(sessionToken: string): Promise<void> {
    const sessionTokenHash = this.hashToken(sessionToken);

    const session = await this.sessionRepo.findOne({
      where: { sessionTokenHash },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    session.isMfaVerified = true;
    session.updateLastActivity();
    await this.sessionRepo.save(session);
    this.logger.log(`MFA verified for session: ${session.id}`);
  }

  /**
   * Check if session requires MFA
   */
  async requiresMfa(sessionToken: string): Promise<boolean> {
    const session = await this.getSessionByToken(sessionToken);
    return !session.isMfaVerified;
  }

  /**
   * Hash token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const expiryDate = new Date();

    const result = await this.sessionRepo.delete({
      expiresAt: expiryDate,
    });

    this.logger.log(`Cleaned up ${result.affected} expired sessions`);

    return result.affected || 0;
  }
}
