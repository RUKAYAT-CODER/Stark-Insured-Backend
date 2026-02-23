import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AppConfigService } from '../../config/app-config.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtStrategy } from './strategies/jwt.strategy';
import { WalletService } from './services/wallet.service';
import { PermissionService } from 'src/permissions/permission.service';
import { PermissionGuard } from 'src/permissions/permission.guard';

// Import new service and entity modules
import { RefreshToken } from './entities/refresh-token.entity';
import { TokenBlacklist } from './entities/token-blacklist.entity';
import { MfaSecret } from './entities/mfa-secret.entity';
import { Session } from './entities/session.entity';

import { JwtTokenService } from './services/jwt-token.service';
import { RefreshTokenService } from './services/refresh-token.service';
import { TokenBlacklistService } from './services/token-blacklist.service';
import { MfaService } from './services/mfa.service';
import { SessionService } from './services/session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshToken,
      TokenBlacklist,
      MfaSecret,
      Session,
    ]),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    NestConfigModule,
    CacheModule.register(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    JwtModule.registerAsync({
      imports: [NestConfigModule],
      useFactory: (configService: AppConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: { expiresIn: configService.jwtExpiresIn as any },
      }),
      inject: [AppConfigService],
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    WalletService,

    // New token and session services
    JwtTokenService,
    RefreshTokenService,
    TokenBlacklistService,
    MfaService,
    SessionService,

    // Permission services
    PermissionService,
    PermissionGuard,
  ],
  controllers: [AuthController],
  exports: [
    AuthService,
    JwtStrategy,
    PassportModule,

    // Export services for use in other modules
    JwtTokenService,
    RefreshTokenService,
    TokenBlacklistService,
    MfaService,
    SessionService,
    PermissionService,
  ],
})
export class AuthModule {}
