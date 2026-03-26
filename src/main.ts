import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as csurf from 'csurf';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Cookie parser for CSRF
  app.use(cookieParser());

  // CSRF protection
  app.use(csurf({
    cookie: {
      httpOnly: true,
      secure: configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'strict',
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  }));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  // Strict CORS Configuration
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  const corsCredentials = configService.get<boolean>('CORS_CREDENTIALS', false);
  
  // Parse allowed origins - support comma-separated list for multiple origins
  const allowedOrigins = corsOrigin ? corsOrigin.split(',').map(origin => origin.trim()) : [];
  
  // In production, require explicit origins. In development, allow localhost with fallback.
  const origins = isProduction 
    ? (allowedOrigins.length > 0 ? allowedOrigins : [])
    : (allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:3000', 'http://localhost:3001']);

  app.enableCors({
    origin: origins,
    credentials: corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token'],
    exposedHeaders: ['X-Total-Count', 'X-CSRF-Token'],
    maxAge: 86400, // 24 hours
  });

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
