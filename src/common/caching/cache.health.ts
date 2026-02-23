import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { CachingService } from './caching.service';

@Injectable()
export class CacheHealthIndicator extends HealthIndicator {
  constructor(private readonly cachingService: CachingService) {
    super();
  }

  async isHealthy(key: string = 'cache'): Promise<HealthIndicatorResult> {
    try {
      // Test cache connectivity by setting and getting a test value
      const testKey = `health_check_${Date.now()}`;
      const testValue = 'test';
      
      await this.cachingService.set(testKey, testValue, { ttl: 10 });
      const result = await this.cachingService.get<string>(testKey);
      
      if (result === testValue) {
        // Clean up test key
        await this.cachingService.invalidate(testKey);
        
        return this.getStatus(key, true, {
          status: 'up',
          message: 'Cache is healthy',
        });
      } else {
        return this.getStatus(key, false, {
          status: 'down',
          message: 'Cache test failed - could not retrieve test value',
        });
      }
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'down',
        message: `Cache health check failed: ${error.message}`,
      });
    }
  }
}