import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { BusinessMetricsService } from './business-metrics.service';

@ApiTags('Observability')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: BusinessMetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiExcludeEndpoint()
  async getPrometheusMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  @Get('snapshot')
  getSnapshot() {
    return this.metricsService.getSnapshot();
  }
}
