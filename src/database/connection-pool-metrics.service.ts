// src/database/connection-pool-metrics.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface PoolMetrics {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  poolUtilizationPercent: number;
  timestamp: Date;
}

@Injectable()
export class ConnectionPoolMetricsService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionPoolMetricsService.name);
  private metricsHistory: PoolMetrics[] = [];
  private readonly MAX_HISTORY = 100;
  private monitoringInterval: NodeJS.Timeout;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  onModuleInit() {
    // Start monitoring every 10 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics().catch((err) =>
        this.logger.error('Metrics collection failed', err),
      );
    }, 10_000);
  }

  async collectMetrics(): Promise<PoolMetrics> {
    const driver = this.dataSource.driver as any;
    const pool = driver?.master || driver?.pool;

    let metrics: PoolMetrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      poolUtilizationPercent: 0,
      timestamp: new Date(),
    };

    if (pool) {
      metrics = {
        totalConnections: pool.totalCount ?? pool._allConnections?.length ?? 0,
        activeConnections: pool.activeCount ?? pool._acquiredConnections?.length ?? 0,
        idleConnections: pool.idleCount ?? pool._freeConnections?.length ?? 0,
        waitingRequests: pool.waitingCount ?? pool._waitingClients?.length ?? 0,
        poolUtilizationPercent: 0,
        timestamp: new Date(),
      };

      const maxPool = pool.options?.max || 100;
      metrics.poolUtilizationPercent = Math.round(
        (metrics.activeConnections / maxPool) * 100,
      );
    }

    // ⚠️ Alert if pool is over 80% utilized
    if (metrics.poolUtilizationPercent >= 80) {
      this.logger.warn(
        `HIGH POOL UTILIZATION: ${metrics.poolUtilizationPercent}% ` +
          `(${metrics.activeConnections} active, ${metrics.waitingRequests} waiting)`,
      );
    }

    // Store history
    this.metricsHistory.push(metrics);
    if (this.metricsHistory.length > this.MAX_HISTORY) {
      this.metricsHistory.shift();
    }

    return metrics;
  }

  getCurrentMetrics(): PoolMetrics | null {
    return this.metricsHistory[this.metricsHistory.length - 1] ?? null;
  }

  getMetricsHistory(): PoolMetrics[] {
    return [...this.metricsHistory];
  }

  getAverageUtilization(): number {
    if (!this.metricsHistory.length) return 0;
    const sum = this.metricsHistory.reduce(
      (acc, m) => acc + m.poolUtilizationPercent,
      0,
    );
    return Math.round(sum / this.metricsHistory.length);
  }

  onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }
}