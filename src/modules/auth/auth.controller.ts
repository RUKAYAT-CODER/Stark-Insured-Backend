import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthService as AuthServices } from './services/auth.service';
import { LoginChallengeDto } from './dtos/login-challenge.dto';
import { LoginDto } from './dtos/login.dto';
import { RefreshTokenDto } from './dtos/refresh-token.dto';
import { LogoutDto } from './dtos/session.dto';
import { RevokeTokenDto } from './dtos/revoke-token.dto';
import { RefreshResponseDto } from './dtos/refresh-response.dto';
import { MfaSetupVerifyDto, MfaVerifyDto } from './dtos/mfa.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginPasswordDto } from './dtos/login-password.dto';
import { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authServices: AuthServices,
    private readonly mfaService: MfaService,
    private readonly sessionService: SessionService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user with email and password' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many registration attempts.',
  })
  @HttpCode(HttpStatus.CREATED)
  @RateLimit('auth')
  async register(@Body() dto: RegisterDto) {
    return this.authServices.register(dto);
  }

  @Public()
  @Post('login/password')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT issued' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many login attempts.',
  })
  @HttpCode(HttpStatus.OK)
  @RateLimit('auth')
  async loginWithPassword(@Body() dto: LoginPasswordDto) {
    return this.authServices.loginWithPassword(dto);
  }

  @Public()
  @Post('login/challenge')
  @ApiOperation({ summary: 'Request a login challenge' })
  @ApiResponse({ status: 200, description: 'Challenge generated' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many challenge requests.',
  })
  @HttpCode(HttpStatus.OK)
  @RateLimit('auth')
  async getLoginChallenge(@Body() dto: LoginChallengeDto) {
    return this.authService.generateChallenge(dto.walletAddress);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Submit login signature' })
  @ApiResponse({ status: 200, description: 'Login successful, JWT issued' })
  @ApiTooManyRequestsResponse({
    description: 'Rate limit exceeded. Too many login attempts.',
  })
  @HttpCode(HttpStatus.OK)
  @RateLimit('auth')
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];

    return this.authService.login(
      dto.walletAddress,
      dto.signature,
      ipAddress,
      userAgent,
    );
  }

  @Public()
  @Post('token/refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Access token refreshed successfully',
    type: RefreshResponseDto,
  })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900000 } }) // 5 requests per 15 minutes
  async refreshToken(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.getClientIp(req);
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshAccessToken(
      dto.refreshToken,
      dto.sessionToken,
      ipAddress,
      userAgent as string,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: LogoutDto, @Req() req: any) {
    const userId = req.user.sub;
    const authHeader = req.headers['authorization'];
    let accessToken: string | undefined;
    if (authHeader && typeof authHeader === 'string') {
      const parts = authHeader.split(' ');
      if (parts[0] === 'Bearer' && parts[1]) {
        accessToken = parts[1];
      }
    }

    await this.authService.logout(
      userId,
      dto.refreshToken,
      dto.sessionToken,
      dto.logoutAll,
      accessToken,
    );

    return {
      message: 'Logout successful',
    };
  }

  @Public()
  @Post('revoke')
  @ApiOperation({ summary: 'Revoke an access or refresh token' })
  @ApiResponse({ status: 200, description: 'Token revoked successfully' })
  @HttpCode(HttpStatus.OK)
  async revoke(@Body() dto: RevokeTokenDto, @Req() req: Request) {
    const ipAddress = this.getClientIp(req);
    await this.authService.revokeToken(dto.token, ipAddress);
    return { message: 'Token revoked successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/setup/totp')
  @ApiOperation({ summary: 'Initiate TOTP setup' })
  @ApiResponse({
    status: 200,
    description: 'TOTP setup initialized',
  })
  @HttpCode(HttpStatus.OK)
  async initiateTotpSetup(@Req() req: any) {
    const user = req.user;

    const setupData = await this.mfaService.generateTotpSetup({
      id: user.sub,
      walletAddress: user.walletAddress,
      email: user.email,
    } as any);

    return {
      qrCode: setupData.qrCode,
      secret: setupData.secret,
      manualEntry: setupData.manualEntry,
      backupCodes: setupData.backupCodes,
      message:
        'Scan the QR code with your authenticator app or enter the secret manually',
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/setup/verify')
  @ApiOperation({ summary: 'Verify and enable TOTP' })
  @ApiResponse({
    status: 200,
    description: 'TOTP enabled successfully',
  })
  @HttpCode(HttpStatus.OK)
  async verifyTotpSetup(@Body() dto: MfaSetupVerifyDto, @Req() req: any) {
    const user = req.user;

    const mfaSecret = await this.mfaService.enableTotp(
      {
        id: user.sub,
        walletAddress: user.walletAddress,
        email: user.email,
      } as any,
      dto.secret,
      dto.totpCode,
      [], // Will be regenerated
    );

    return {
      message: 'TOTP enabled successfully',
      backupCodesRemaining: mfaSecret.getRemainingBackupCodesCount(),
    };
  }

  @Public()
  @Post('mfa/verify')
  @ApiOperation({ summary: 'Verify MFA code during login' })
  @ApiResponse({
    status: 200,
    description: 'MFA verified successfully',
  })
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() dto: MfaVerifyDto, @Req() req: any) {
    return {
      message: 'MFA verification endpoint - implement based on your flow',
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('mfa/status')
  @ApiOperation({ summary: 'Get MFA status' })
  @ApiResponse({ status: 200, description: 'MFA status retrieved' })
  async getMfaStatus(@Req() req: any) {
    const userId = req.user.sub;
    const mfaStatus = await this.mfaService.getMfaStatus(userId);
    return mfaStatus;
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('mfa/backup-codes/regenerate')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({
    status: 200,
    description: 'Backup codes regenerated',
  })
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(@Req() req: any) {
    const userId = req.user.sub;
    const backupCodes = await this.mfaService.regenerateBackupCodes(userId);
    return {
      message: 'Backup codes regenerated',
      backupCodes,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('sessions')
  @ApiOperation({ summary: 'Get active sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getSessions(
    @Req() req: any,
    @Query('details') includeDetails?: boolean,
  ) {
    const userId = req.user.sub;
    let sessions = await this.sessionService.getUserSessionsForDisplay(userId);
    return {
      sessions,
      count: sessions.length,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Revoke a session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @HttpCode(HttpStatus.OK)
  async revokeSession(@Req() req: any, @Body('sessionId') sessionId: string) {
    await this.sessionService.revokeSession(
      sessionId,
      'User revoked session',
    );
    return {
      message: 'Session revoked successfully',
    };
  }

  private getClientIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    if (typeof xForwardedFor === 'string') {
      return xForwardedFor.split(',')[0].trim();
    }
    return request.ip || 'unknown';
  }
}
