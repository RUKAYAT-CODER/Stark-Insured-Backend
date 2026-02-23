import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from './config/config.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { CommonModule } from './common/common.module'; 
import { AppConfigService } from './config/app-config.service';
import { DatabaseModule } from './common/database/database.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { IdempotencyInterceptor } from './common/idempotency/interceptors/idempotency.interceptor';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { HealthModule } from './modules/health/health.module';
import { HealthModule as CommonHealthModule } from './common/health/health.module';
import { GracefulShutdownService } from './common/health/graceful-shutdown.service';
import { CachingModule } from './common/caching/caching.module';
import { ClaimsModule } from './modules/claims/claims.module';
import { PolicyModule } from './modules/policy/policy.module';
import { DaoModule } from './modules/dao/dao.module';
import { NotificationModule } from './modules/notification/notification.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { FileModule } from './modules/file/file.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AuditLogModule } from './common/audit-log/audit-log.module';
import { AuditModule } from './modules/audit/audit.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'; 
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'; 
import { FilesController } from './modules/files/files.controller';
import { CustomThrottlerGuard } from './common/guards/custom-throttler.guard';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { OracleModule } from './modules/oracle/oracle.module';
import { RateLimitingModule } from './common/rate-limiting.module';
import { QueueModule } from './queue/queue.module';
import { FraudDetectionModule } from './fraud-detection/fraud-detection.module';
import { SecurityModule } from './security/security.module';
import { LoggingModule } from './common/logging/logging.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    CommonModule, 
    HealthModule,
    CommonHealthModule,
    EncryptionModule,
    CachingModule,
    SecurityModule,
    CommonModule,
    DatabaseModule,
    IdempotencyModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: AppConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: configService.throttleDefaultTtl,
            limit: configService.throttleDefaultLimit,
          },
          {
            name: 'auth',
            ttl: configService.throttleAuthTtl,
            limit: configService.throttleAuthLimit,
          },
          {
            name: 'public',
            ttl: configService.throttlePublicTtl,
            limit: configService.throttlePublicLimit,
          },
          {
            name: 'admin',
            ttl: configService.throttleAdminTtl,
            limit: configService.throttleAdminLimit,
          },
          {
            name: 'claims',
            ttl: configService.rateLimitCreateClaimTtl,
            limit: configService.rateLimitCreateClaimLimit,
          },
          {
            name: 'policies',
            ttl: configService.rateLimitCreatePolicyTtl,
            limit: configService.rateLimitCreatePolicyLimit,
          },
        ],
      }),
      inject: [AppConfigService],
    }),
    HealthModule,
    ClaimsModule,
    PolicyModule,
    DaoModule,
    NotificationModule,
    UsersModule,
    AuthModule,
    AnalyticsModule,
    FileModule,
    PaymentsModule,
    QueueModule,
    AuditLogModule,
    AuditModule,
    DashboardModule,
    OracleModule,
    RateLimitingModule,
    FraudDetectionModule,
    LoggingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    GracefulShutdownService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR, 
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}