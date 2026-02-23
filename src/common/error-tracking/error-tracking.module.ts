import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ErrorTrackingService } from './services/error-tracking.service';
import { ErrorTrackingInterceptor } from './interceptors/error-tracking.interceptor';
import { ErrorTrackingController } from './controllers/error-tracking.controller';

/**
 * Global Error Tracking Module
 * Provides error tracking and Sentry integration for the entire application
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    ErrorTrackingService,
    {
      provide: 'ERROR_TRACKING_INTERCEPTOR',
      useClass: ErrorTrackingInterceptor,
    },
  ],
  controllers: [ErrorTrackingController],
  exports: [ErrorTrackingService],
})
export class ErrorTrackingModule {}
