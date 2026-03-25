import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, TokenResponseDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../prisma.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with wallet signature and receive tokens' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async login(@Body() dto: LoginDto, @Req() req: Request): Promise<TokenResponseDto> {
    // Resolve or create user by wallet address
    let user = await this.prisma.user.findUnique({
      where: { walletAddress: dto.walletAddress },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: { walletAddress: dto.walletAddress },
      });
    }

    return this.authService.issueTokens(user.id, user.walletAddress, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and receive new token pair' })
  @ApiResponse({ status: 200, type: TokenResponseDto })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<TokenResponseDto> {
    return this.authService.rotateRefreshToken(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('revoke')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a specific refresh token' })
  @ApiResponse({ status: 204 })
  async revoke(@Body() dto: RefreshTokenDto, @Req() req: Request): Promise<void> {
    return this.authService.revokeToken(dto.refreshToken, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke all refresh tokens for the current user' })
  @ApiResponse({ status: 204 })
  async logout(@Req() req: Request & { user: { id: string } }): Promise<void> {
    return this.authService.revokeAllUserTokens(req.user.id, {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}
