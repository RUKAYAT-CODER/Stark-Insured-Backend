import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from '../database/database.module';
import { CachingModule } from '../caching/caching.module';
import { DatabaseHealthIndicator } from './health-indicators/database.health';
import { CacheHealthIndicator } from '../caching/cache.health';
import { QueueHealthIndicator } from './health-indicators/queue.health';
import { DiskHealthIndicator } from './health-indicators/disk.health';
import { TerminusHealthController } from './health.controller';

@Module({
  imports: [
    TerminusModule,
    HttpModule,
    DatabaseModule,
    CachingModule,
  ],
  controllers: [TerminusHealthController],
  providers: [
    DatabaseHealthIndicator,
    CacheHealthIndicator,
    QueueHealthIndicator,
    DiskHealthIndicator,
  ],
  exports: [
    DatabaseHealthIndicator,
    CacheHealthIndicator,
    QueueHealthIndicator,
    DiskHealthIndicator,
  ],
})
export class HealthModule {}