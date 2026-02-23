import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Health checks should always be available
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-22T00:00:00.000Z',
        uptime: 1234.567,
      },
    },
  })
  checkHealth() {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve requests',
  })
  checkReadiness() {
    return this.healthService.checkReadiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  checkLiveness() {
    return this.healthService.checkLiveness();
  }

  @Get('queues')
  @ApiOperation({ summary: 'Queue health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-01-22T00:00:00.000Z',
        queues: {
          'audit-logs': {
            active: 0,
            waiting: 5,
            delayed: 0,
            failed: 0,
            completed: 100,
          },
        },
      },
    },
  })
  async checkQueues() {
    return this.healthService.checkQueues();
  }

  @Get('database')
  @ApiOperation({ summary: 'Database health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Database health and performance metrics',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2026-01-22T00:00:00.000Z',
        connectionPool: {
          total: 10,
          active: 3,
          idle: 7,
          waiting: 0,
        },
        responseTime: {
          average: 45,
          p95: 120,
          p99: 200,
        },
        errorRate: 0.1,
      },
    },
  })
  async checkDatabase() {
    return this.healthService.checkDatabase();
  }
}
