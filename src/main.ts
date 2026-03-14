import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 4000);
  console.log('Server is running on http://localhost:' + (process.env.PORT || 4000) + '/api/v1');
}
bootstrap();
