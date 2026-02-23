import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MfaSecret, MfaMethod } from '../entities/mfa-secret.entity';
import { User } from '../../users/entities/user.entity';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

/**
 * Service for managing Multi-Factor Authentication
 * Supports TOTP (Time-based One-Time Password) and SMS
 */
@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);
  private readonly TOTP_WINDOW = 1; // Check ±1 time window
  private readonly BACKUP_CODES_COUNT = 10;
  private readonly BACKUP_CODE_LENGTH = 8;

  constructor(
    @InjectRepository(MfaSecret)
    private mfaSecretRepo: Repository<MfaSecret>,
  ) {}

  /**
   * Generate TOTP setup data (secret + QR code)
   */
  async generateTotpSetup(user: User): Promise<{
    secret: string;
    qrCode: string;
    manualEntry: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `Stellar Insured (${user.walletAddress})`,
      issuer: 'Stellar Insured',
      length: 32,
    });

    if (!secret.base32) {
      throw new Error('Failed to generate TOTP secret');
    }

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

    return {
      secret: secret.base32,
      qrCode,
      manualEntry: secret.base32,
      backupCodes,
    };
  }

  /**
   * Enable TOTP for a user
   */
  async enableTotp(
    user: User,
    secret: string,
    totpCode: string,
    backupCodes: string[],
  ): Promise<MfaSecret> {
    // Verify the TOTP code first
    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: totpCode,
      window: this.TOTP_WINDOW,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid TOTP code');
    }

    // Check if MFA already exists
    let mfaSecret = await this.mfaSecretRepo.findOne({
      where: {
        userId: user.id,
        method: MfaMethod.TOTP,
      },
    });

    if (mfaSecret) {
      // Update existing
      mfaSecret.secret = secret;
      mfaSecret.isVerified = true;
      mfaSecret.verifiedAt = new Date();
      mfaSecret.backupCodes = backupCodes.map(code =>
        this.hashBackupCode(code),
      );
      mfaSecret.usedBackupCodes = [];
      mfaSecret.isActive = true;
    } else {
      // Create new
      mfaSecret = this.mfaSecretRepo.create({
        userId: user.id,
        method: MfaMethod.TOTP,
        secret,
        isVerified: true,
        verifiedAt: new Date(),
        backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        usedBackupCodes: [],
        isActive: true,
      });
    }

    await this.mfaSecretRepo.save(mfaSecret);
    this.logger.log(`TOTP enabled for user ${user.id}`);

    return mfaSecret;
  }

  /**
   * Verify TOTP code
   */
  async verifyTotp(userId: string, totpCode: string): Promise<boolean> {
    const mfaSecret = await this.mfaSecretRepo.findOne({
      where: {
        userId,
        method: MfaMethod.TOTP,
        isActive: true,
      },
    });

    if (!mfaSecret) {
      throw new NotFoundException('TOTP not configured for this user');
    }

    const isValid = speakeasy.totp.verify({
      secret: mfaSecret.secret,
      encoding: 'base32',
      token: totpCode,
      window: this.TOTP_WINDOW,
    });

    if (isValid) {
      mfaSecret.lastVerifiedAt = new Date();
      await this.mfaSecretRepo.save(mfaSecret);
      return true;
    }

    return false;
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.mfaSecretRepo.findOne({
      where: {
        userId,
        isActive: true,
      },
    });

    if (!mfaSecret) {
      throw new NotFoundException('MFA not configured for this user');
    }

    // Find matching backup code
    let usedIndex = -1;
    const codeHash = this.hashBackupCode(code);

    for (let i = 0; i < mfaSecret.backupCodes.length; i++) {
      if (mfaSecret.backupCodes[i] === codeHash) {
        usedIndex = i;
        break;
      }
    }

    if (usedIndex === -1) {
      this.logger.warn(`Invalid backup code used for user ${userId}`);
      return false;
    }

    // Check if already used
    if (mfaSecret.isBackupCodeUsed(usedIndex)) {
      this.logger.warn(
        `Backup code already used for user ${userId} at index ${usedIndex}`,
      );
      return false;
    }

    // Mark as used
    mfaSecret.markBackupCodeAsUsed(usedIndex);
    await this.mfaSecretRepo.save(mfaSecret);
    this.logger.log(
      `Backup code verified for user ${userId}, ${mfaSecret.getRemainingBackupCodesCount()} remaining`,
    );

    return true;
  }

  /**
   * Disable MFA for a user
   */
  async disableMfa(userId: string, method: MfaMethod): Promise<void> {
    const mfaSecret = await this.mfaSecretRepo.findOne({
      where: {
        userId,
        method,
      },
    });

    if (!mfaSecret) {
      throw new NotFoundException('MFA method not found');
    }

    mfaSecret.isActive = false;
    await this.mfaSecretRepo.save(mfaSecret);
    this.logger.log(`MFA (${method}) disabled for user ${userId}`);
  }

  /**
   * Get MFA status for a user
   */
  async getMfaStatus(userId: string): Promise<{
    totpEnabled: boolean;
    smsEnabled: boolean;
    backupCodesRemaining: number;
  }> {
    const mfaSecrets = await this.mfaSecretRepo.find({
      where: { userId },
    });

    const totp = mfaSecrets.find(m => m.method === MfaMethod.TOTP);
    const sms = mfaSecrets.find(m => m.method === MfaMethod.SMS);

    return {
      totpEnabled: totp?.isActive && totp?.isVerified ? true : false,
      smsEnabled: sms?.isActive && sms?.isVerified ? true : false,
      backupCodesRemaining: totp?.getRemainingBackupCodesCount() || 0,
    };
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(userId: string): Promise<string[]> {
    const mfaSecret = await this.mfaSecretRepo.findOne({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new NotFoundException('MFA not configured');
    }

    const newBackupCodes = this.generateBackupCodes();
    mfaSecret.backupCodes = newBackupCodes.map(code => this.hashBackupCode(code));
    mfaSecret.usedBackupCodes = [];

    await this.mfaSecretRepo.save(mfaSecret);
    this.logger.log(`Backup codes regenerated for user ${userId}`);

    return newBackupCodes;
  }

  /**
   * Check if MFA is required for user
   */
  async isMfaRequired(userId: string): Promise<boolean> {
    const mfaSecret = await this.mfaSecretRepo.findOne({
      where: {
        userId,
        isActive: true,
        isVerified: true,
      },
    });

    return !!mfaSecret;
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];

    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto
        .randomBytes(this.BACKUP_CODE_LENGTH / 2)
        .toString('hex')
        .toUpperCase()
        .slice(0, this.BACKUP_CODE_LENGTH);

      codes.push(code);
    }

    return codes;
  }

  /**
   * Hash backup code for storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code).digest('hex');
  }
}
