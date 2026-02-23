// src/database/database-health.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DatabaseHealthService } from './database-health.service';
import { ConnectionPoolMetricsService } from './connection-pool-metrics.service';
import { CircuitBreakerService } from './circuit-breaker.service';

@ApiTags('Database Health')
@Controller('health/database')
export class DatabaseHealthController {
  constructor(
    private readonly healthService: DatabaseHealthService,
    private readonly metricsService: ConnectionPoolMetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current database health status' })
  async getHealth() {
    return this.healthService.checkHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get connection pool metrics history' })
  getMetrics() {
    return {
      current: this.metricsService.getCurrentMetrics(),
      history: this.metricsService.getMetricsHistory(),
      averageUtilization: `${this.metricsService.getAverageUtilization()}%`,
    };
  }

  @Get('circuit-breaker')
  @ApiOperation({ summary: 'Get circuit breaker status' })
  getCircuitBreaker() {
    return {
      state: this.circuitBreaker.getState(),
      ...this.circuitBreaker.getStatus(),
    };
  }
}