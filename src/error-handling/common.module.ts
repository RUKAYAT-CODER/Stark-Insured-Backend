// src/common/common.module.ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { RequestContextMiddleware } from './middleware/request-context.middleware';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AppLoggerService } from './logging/app-logger.service';
import { RequestContextService } from './context/request-context.service';

@Module({
  providers: [
    AppLoggerService,
    RequestContextService,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [AppLoggerService, RequestContextService],
})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
