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

  // CORS
  app.enableCors();

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}/${apiPrefix}`);
}

bootstrap();
