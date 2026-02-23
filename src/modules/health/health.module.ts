import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { QueueModule } from '../queue/queue.module';
import { DatabaseMonitoringService } from '../../common/database/monitoring/database-monitoring.service';

@Module({
  imports: [QueueModule],
  controllers: [HealthController],
  providers: [HealthService, DatabaseMonitoringService],
  exports: [HealthService],
})
export class HealthModule {}
