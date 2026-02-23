import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResponse } from './health.interface';
import { QueueService } from '../queue/queue.service';
import { DatabaseMonitoringService } from '../../common/database/monitoring/database-monitoring.service';

@Injectable()
export class HealthService {
  constructor(
    private configService: ConfigService,
    private queueService: QueueService,
    private databaseMonitoringService: DatabaseMonitoringService,
  ) {}

  checkHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.configService.get<string>('APP_VERSION'),
      environment: this.configService.get<string>('NODE_ENV'),
    };
  }

  async checkReadiness(): Promise<HealthCheckResponse> {
    try {
      // Check database connectivity and performance
      const dbHealth = await this.databaseMonitoringService.getDatabaseHealth();
      
      // Check queue health
      const queueStats = await this.queueService.getQueueStats();
      
      // Determine overall readiness
      const isReady = dbHealth.status !== 'unhealthy' && 
                     (queueStats.active + queueStats.waiting) < 100; // Reasonable queue threshold

      return {
        status: isReady ? 'ok' : 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: {
            status: dbHealth.status,
            responseTime: dbHealth.responseTime,
            connectionPool: dbHealth.connectionPool,
          },
          queues: {
            status: queueStats.failed === 0 ? 'ok' : 'error',
            active: queueStats.active,
            waiting: queueStats.waiting,
            failed: queueStats.failed,
          },
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        error: error.message,
      };
    }
  }

  checkLiveness(): HealthCheckResponse {
    // Basic liveness check - if the application is responding, it's alive
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async checkQueues(): Promise<any> {
    try {
      const stats = await this.queueService.getQueueStats();
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        queues: {
          'audit-logs': stats,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  async checkDatabase(): Promise<any> {
    try {
      const dbHealth = await this.databaseMonitoringService.getDatabaseHealth();
      return {
        status: dbHealth.status,
        timestamp: dbHealth.lastCheck,
        connectionPool: dbHealth.connectionPool,
        responseTime: dbHealth.responseTime,
        errorRate: dbHealth.errorRate,
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}
