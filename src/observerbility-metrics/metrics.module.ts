import { Module, Global } from '@nestjs/common';
import { BusinessMetricsService } from './business-metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
  providers: [BusinessMetricsService],
  controllers: [MetricsController],
  exports: [BusinessMetricsService],
})
export class MetricsModule {}
