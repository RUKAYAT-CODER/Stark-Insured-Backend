// src/database/database.module.ts
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DatabaseHealthService } from './database-health.service';
import { ConnectionPoolMetricsService } from './connection-pool-metrics.service';
import { CircuitBreakerService } from './circuit-breaker.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
        autoLoadEntities: true,
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [
    DatabaseHealthService,
    ConnectionPoolMetricsService,
    CircuitBreakerService,
  ],
  exports: [
    DatabaseHealthService,
    ConnectionPoolMetricsService,
    CircuitBreakerService,
  ],
})
export class DatabaseModule {}