import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResilienceService } from './services/resilience.service';
import { ResilienceInterceptor } from './interceptors/resilience.interceptor';

@Global()
@Module({
  providers: [
    ResilienceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResilienceInterceptor,
    },
  ],
  exports: [ResilienceService],
})
export class ResilienceModule {}