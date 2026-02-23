import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { AppValidationPipe } from './common/pipes/validation.pipe';
import { QueueService } from './modules/queue/queue.service';
import { VersioningType } from '@nestjs/common';
import helmet from 'helmet';
import { DeprecationInterceptor } from './common/interceptors/deprecation.interceptor';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';
import * as fs from 'fs';
import { rabbitConfig } from './queue/rabbitmq.config';
import * as cookieParser from 'cookie-parser';
import csurf from 'csurf';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { LoggerConfigService } from './common/logging/logger.config';

async function bootstrap(): Promise<void> {
  // Create app instance to get config service
  const app = await NestFactory.create(AppModule, { logger: false });
  const configService = app.get(ConfigService);

  // Initialize centralized logger
  const loggerConfigService = new LoggerConfigService(configService);
  const logger = loggerConfigService.child('Bootstrap');

  try {
    logger.log('--- INICIANDO LEVANTAMIENTO DEL SERVIDOR ---');
    // Recreate app with proper logger configuration
    const app = await NestFactory.create(AppModule, {
      logger: loggerConfigService,
    });

    // Get services
    const appConfigService = app.get(ConfigService);
    const queueService = app.get(QueueService);

    // HTTPS configuration
    const httpsKeyPath = appConfigService.get<string>('HTTPS_KEY_PATH');
    const httpsCertPath = appConfigService.get<string>('HTTPS_CERT_PATH');

    if (httpsKeyPath && httpsCertPath && fs.existsSync(httpsKeyPath)) {
      logger.log('HTTPS configuration detected (Skipped for dev stability)');
    }

  // Global prefix (base path for all APIs)
  app.setGlobalPrefix('api');

  // Enable API versioning (URL-based, e.g. /v1/, /v2/)
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // CORS configuration
  const corsOrigin = appConfigService.get<string>('CORS_ORIGIN');
  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',') : '*',
    credentials: appConfigService.get<boolean>('CORS_CREDENTIALS', true),
  });

  // Security middleware
  app.use(helmet());
  app.setGlobalPrefix('api/v1');

  // Global pipes and filters
  app.useGlobalPipes(AppValidationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());

  app.useGlobalInterceptors(new DeprecationInterceptor());

  // Enable shutdown hooks (for services like QueueService)
  app.enableShutdownHooks();
    // Enable shutdown hooks for graceful shutdown
    app.enableShutdownHooks();
    
    // Make class-validator use NestJS container
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Swagger setup
    if (appConfigService.get<boolean>('SWAGGER_ENABLED', true)) {
      const config = new DocumentBuilder()
        .setTitle('Stellar Insured API')
        .setDescription('API documentation for Stellar Insured backend')
        .setVersion(appConfigService.get<string>('APP_VERSION', '1.0'))
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup(
        appConfigService.get<string>('SWAGGER_PATH', '/api/docs'),
        app,
        document,
      );
    }

    // Get port from config
    const port = appConfigService.get<number>('PORT', 4000);
    
    logger.log(`---  INTENTANDO ABRIR PUERTO ${port} ---`);
    
    // Connect RabbitMQ microservice
    app.connectMicroservice(rabbitConfig);
    await app.startAllMicroservices();
    
    await app.listen(port);

    // Log startup information
    logger.log(`Application is running on: http://localhost:${port}/api/v1`);
    logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
    logger.log(`Health Check: http://localhost:${port}/health`);
    logger.log(`Liveness Probe: http://localhost:${port}/health/live`);
    logger.log(`Readiness Probe: http://localhost:${port}/health/ready`);

  // Log startup information
  logger.log(`\n🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🌍 Environment: ${configService.get('NODE_ENV', 'development')}`);
  logger.log(`📋 Swagger UI: http://localhost:${port}/api/docs`);
  } catch (error) {
    logger.error('---  ERROR FATAL DURANTE EL BOOTSTRAP ---', error);
    process.exit(1);
  }
}

void bootstrap();
