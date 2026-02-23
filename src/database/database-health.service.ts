// src/database/database-health.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConnectionPoolMetricsService } from './connection-pool-metrics.service';
import { CircuitBreakerService, CircuitState } from './circuit-breaker.service';

@Injectable()
export class DatabaseHealthService {
  private readonly logger = new Logger(DatabaseHealthService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly metricsService: ConnectionPoolMetricsService,
    private readonly circuitBreaker: CircuitBreakerService,
  ) {}

  async checkHealth(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const metrics = await this.metricsService.collectMetrics();
    const circuitStatus = this.circuitBreaker.getStatus();
    const isConnected = this.dataSource.isInitialized;

    let latencyMs = 0;
    let queryOk = false;

    try {
      const start = Date.now();
      await this.dataSource.query('SELECT 1');
      latencyMs = Date.now() - start;
      queryOk = true;
    } catch {
      queryOk = false;
    }

    const status =
      !isConnected || !queryOk
        ? 'unhealthy'
        : circuitStatus.state === CircuitState.OPEN || metrics.poolUtilizationPercent >= 90
          ? 'degraded'
          : 'healthy';

    return {
      status,
      details: {
        connected: isConnected,
        queryLatencyMs: latencyMs,
        pool: metrics,
        circuitBreaker: circuitStatus,
        averagePoolUtilization: `${this.metricsService.getAverageUtilization()}%`,
      },
    };
  }
}