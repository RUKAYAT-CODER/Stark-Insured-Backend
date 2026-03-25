import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { createHash, randomBytes } from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { JwtPayload } from './strategies/jwt.strategy';
import { TokenResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Token Generation ────────────────────────────────────────────────────────

  async issueTokens(
    userId: string,
    walletAddress: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenResponseDto> {
    const family = uuidv4();
    const { accessToken, refreshToken } = await this.createTokenPair(
      userId,
      walletAddress,
      family,
      meta,
    );

    await this.audit(userId, 'ISSUED', family, meta);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.config.get<number>('JWT_EXPIRATION'),
    };
  }

  // ─── Refresh with Rotation ───────────────────────────────────────────────────

  async rotateRefreshToken(
    rawToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<TokenResponseDto> {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, walletAddress: true } } },
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection: token already used → revoke entire family
    if (stored.replacedBy !== null) {
      await this.revokeFamilyAndAudit(stored.family, stored.userId, meta);
      throw new ForbiddenException(
        'Refresh token reuse detected. All sessions revoked.',
      );
    }

    if (stored.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Issue new token pair in same family
    const { accessToken, refreshToken: newRawToken } =
      await this.createTokenPair(
        stored.userId,
        stored.user.walletAddress,
        stored.family,
        meta,
      );

    // Mark old token as replaced (not revoked, but used)
    const newHash = this.hashToken(newRawToken);
    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { replacedBy: newHash },
    });

    await this.audit(stored.userId, 'ROTATED', stored.family, meta);

    return {
      accessToken,
      refreshToken: newRawToken,
      expiresIn: this.config.get<number>('JWT_EXPIRATION'),
    };
  }

  // ─── Revocation / Logout ─────────────────────────────────────────────────────

  async revokeToken(
    rawToken: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) return; // idempotent

    await this.prisma.refreshToken.update({
      where: { tokenHash },
      data: { isRevoked: true },
    });

    await this.audit(stored.userId, 'REVOKED', stored.family, meta);
  }

  async revokeAllUserTokens(
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit(userId, 'LOGOUT', undefined, meta);
  }

  // ─── Cleanup ─────────────────────────────────────────────────────────────────

  async purgeExpiredTokens(): Promise<void> {
    const deleted = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    this.logger.log(`Purged ${deleted.count} expired refresh tokens`);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async createTokenPair(
    userId: string,
    walletAddress: string,
    family: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload: JwtPayload = { sub: userId, walletAddress };
    const accessToken = this.jwtService.sign(payload);

    const rawRefreshToken = randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const refreshTtlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshTtlDays);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        family,
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  private async revokeFamilyAndAudit(
    family: string,
    userId: string,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit(userId, 'REUSE_DETECTED', family, meta);
    this.logger.warn(
      `Token reuse detected for user ${userId}, family ${family}. All tokens revoked.`,
    );
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async audit(
    userId: string,
    action: string,
    tokenFamily?: string,
    meta?: { ipAddress?: string; userAgent?: string },
  ): Promise<void> {
    await this.prisma.tokenAuditLog.create({
      data: {
        userId,
        action,
        tokenFamily: tokenFamily ?? null,
        ipAddress: meta?.ipAddress ?? null,
        userAgent: meta?.userAgent ?? null,
      },
    });
  }
}
