import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // API prefix - version is now handled by NestJS versioning
  const apiPrefix = configService.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Enable URI-based API versioning (e.g. /api/v1/users, /api/v2/users)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'v',
  });

  // CORS
  app.enableCors();

  // Enable NestJS shutdown hooks so lifecycle events (onModuleDestroy, etc.) fire on SIGTERM/SIGINT
  app.enableShutdownHooks();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);

  // Graceful shutdown handling
  const shutdownTimeout = configService.get<number>('SHUTDOWN_TIMEOUT', 30000);
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.log(`${signal} received. Starting graceful shutdown...`);

    const forceExitTimer = setTimeout(() => {
      logger.error('Forced shutdown after timeout — could not complete gracefully');
      process.exit(1);
    }, shutdownTimeout);

    try {
      // Stop accepting new connections
      const server = app.getHttpServer();
      server.close(() => {
        logger.log('HTTP server closed — no longer accepting requests');
      });

      // Close the NestJS app (triggers onModuleDestroy, onApplicationShutdown hooks)
      await app.close();

      clearTimeout(forceExitTimer);
      logger.log('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error(`Error during graceful shutdown: ${error.message}`);
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap();
