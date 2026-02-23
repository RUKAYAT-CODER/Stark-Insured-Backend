import {
  Controller,
  Get,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { CachingService } from './caching.service';
import { CacheMonitoringService } from './cache-monitoring.service';
import { CacheHealthIndicator } from './cache.health';

@ApiTags('cache')
@Controller('cache')
@SkipThrottle() // Cache endpoints should not be rate limited
export class CacheController {
  constructor(
    private readonly cachingService: CachingService,
    private readonly monitoringService: CacheMonitoringService,
    private readonly cacheHealthIndicator: CacheHealthIndicator,
  ) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get cache statistics' })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      example: {
        totalKeys: 150,
        hitRate: 85.5,
        memoryUsage: 25.3,
        hits: 1200,
        misses: 200,
        evictions: 5,
      },
    },
  })
  async getStats() {
    return this.cachingService.getCacheStats();
  }

  @Get('health')
  @ApiOperation({ summary: 'Check cache health' })
  @ApiResponse({
    status: 200,
    description: 'Cache health check completed',
    schema: {
      example: {
        status: 'healthy',
        message: 'Cache is healthy',
      },
    },
  })
  async checkHealth() {
    return this.cacheHealthIndicator.isHealthy();
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get cache performance report' })
  @ApiQuery({
    name: 'hours',
    required: false,
    description: 'Time period in hours for trend analysis (default: 24)',
    schema: { type: 'number', default: 24 },
  })
  @ApiResponse({
    status: 200,
    description: 'Performance report generated successfully',
    schema: {
      example: {
        current: {
          totalKeys: 150,
          hitRate: 85.5,
          memoryUsage: 25.3,
        },
        trend: {
          hitRate: 2.5,
          growth: 15,
        },
        recommendations: [
          'Cache is performing normally with no immediate issues detected.',
        ],
      },
    },
  })
  async getPerformanceReport(@Query('hours') hours?: number) {
    return this.monitoringService.getPerformanceReport(hours || 24);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get cache metrics history' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of metrics to return (default: 100)',
    schema: { type: 'number', default: 100 },
  })
  @ApiResponse({
    status: 200,
    description: 'Metrics history retrieved successfully',
  })
  getMetricsHistory(@Query('limit') limit?: number) {
    return this.monitoringService.getMetricsHistory(limit || 100);
  }

  @Delete('clear')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear all cache entries' })
  @ApiResponse({
    status: 204,
    description: 'All cache entries cleared successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to clear cache',
  })
  async clearCache() {
    await this.cachingService.clear();
    return;
  }

  @Delete('evict-expired')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Evict expired cache entries' })
  @ApiResponse({
    status: 204,
    description: 'Expired cache entries evicted successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to evict expired entries',
  })
  async evictExpired() {
    await this.cachingService.evictExpired();
    return;
  }

  @Delete('metrics')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear cache metrics history' })
  @ApiResponse({
    status: 204,
    description: 'Cache metrics history cleared successfully',
  })
  clearMetrics() {
    this.monitoringService.clearMetricsHistory();
    return;
  }
}