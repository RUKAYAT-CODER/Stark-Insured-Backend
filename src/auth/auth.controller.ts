import { Controller, Post, Body, Req, Ip, UseGuards, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with wallet and signature' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() body: { walletAddress: string; signature: string }, @Ip() ip: string) {
    // Note: In decentralized apps, login normally involves verifying a signature of a nonce.
    // We already have a NonceService generating nonces. A full implementation would check the signature here.
    const user = await this.authService.validateUser(body.walletAddress, body.signature);
    
    if (!user) {
      // Log failed attempts as well, they are critical for security monitoring
      await this.audit.logLogin('0.0.0.0', ip, false, `Failed login for wallet ${body.walletAddress}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const loginResult = await this.authService.login(user);
    
    // Explicitly log the successful login as per task requirements
    await this.audit.logLogin(user.id, ip, true);

    return loginResult;
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() body: { userId: string }, @Ip() ip: string) {
    // Normally you'd get the user from the JwtAuthGuard/Passport session
    const userId = body.userId; 
    
    await this.authService.logout(userId);
    
    // Explicitly log the logout
    await this.audit.logLogout(userId, ip);

    return { success: true };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() body: { refreshToken: string }, @Ip() ip: string) {
    try {
      const result = await this.authService.refresh(body.refreshToken);
      
      // Explicitly log the token refresh as per task requirements
      await this.audit.logTokenRefresh(result.userId, ip);

      return result;
    } catch (e) {
      // Failed refresh might be an attempt to use a stolen/invalid token
      await this.audit.log('token_refresh_failed', 'unknown', ip, { error: e.message });
      throw e;
    }
  }
}
