import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator } from '@nestjs/terminus';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DatabaseHealthIndicator } from './health-indicators/database.health';
import { CacheHealthIndicator } from '../caching/cache.health';
import { QueueHealthIndicator } from './health-indicators/queue.health';
import { DiskHealthIndicator } from './health-indicators/disk.health';

@ApiTags('health')
@Controller('health')
@SkipThrottle() // Health checks should always be available
export class TerminusHealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private readonly db: DatabaseHealthIndicator,
    private readonly cacheHealth: CacheHealthIndicator,
    private readonly queueHealth: QueueHealthIndicator,
    private readonly diskHealth: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is healthy',
    schema: {
      example: {
        status: 'ok',
        info: {
          database: { status: 'up' },
          cache: { status: 'up' },
          queue: { status: 'up' },
          disk: { status: 'up' }
        },
        error: {},
        details: {
          database: { status: 'up' },
          cache: { status: 'up' },
          queue: { status: 'up' },
          disk: { status: 'up' }
        }
      }
    }
  })
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.cacheHealth.isHealthy('cache'),
      () => this.queueHealth.isHealthy('queue'),
      () => this.diskHealth.isHealthy('disk'),
    ]);
  }

  @Get('live')
  @HealthCheck()
  @ApiOperation({ summary: 'Liveness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is alive',
  })
  liveness() {
    // Basic liveness check - if the application can respond, it's alive
    return this.health.check([
      () => Promise.resolve({ status: 'up' } as any),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe endpoint' })
  @ApiResponse({
    status: 200,
    description: 'Application is ready to serve requests',
  })
  @ApiResponse({
    status: 503,
    description: 'Application is not ready to serve requests',
  })
  readiness() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.cacheHealth.isHealthy('cache'),
      () => this.queueHealth.isHealthy('queue'),
    ]);
  }

  @Get('database')
  @HealthCheck()
  @ApiOperation({ summary: 'Database health check' })
  database() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }

  @Get('cache')
  @HealthCheck()
  @ApiOperation({ summary: 'Cache health check' })
  cache() {
    return this.health.check([
      () => this.cacheHealth.isHealthy('cache'),
    ]);
  }

  @Get('queue')
  @HealthCheck()
  @ApiOperation({ summary: 'Queue health check' })
  queue() {
    return this.health.check([
      () => this.queueHealth.isHealthy('queue'),
    ]);
  }

  @Get('disk')
  @HealthCheck()
  @ApiOperation({ summary: 'Disk space health check' })
  disk() {
    return this.health.check([
      () => this.diskHealth.isHealthy('disk'),
    ]);
  }
}