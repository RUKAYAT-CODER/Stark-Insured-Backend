// src/main.ts
import './tracing'; // ← MUST be first import

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppLoggerService } from './common/logging/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true, // buffer logs until custom logger is attached
  });

  const logger = new AppLoggerService().setContext('Bootstrap');
  app.useLogger(logger);

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application running on port ${process.env.PORT ?? 3000}`);
}

bootstrap();
