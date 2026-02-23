import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '../../config/config.module';
import { AppConfigService } from '../../config/app-config.service';
import { CachingService } from './caching.service';
import { CacheHealthIndicator } from './cache.health';
import { CacheMonitoringService } from './cache-monitoring.service';
import { CacheController } from './cache.controller';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: AppConfigService) => {
        // Use Redis in production, in-memory for development/testing
        if (configService.isProductionEnvironment) {
          const redisStore = require('cache-manager-redis-yet').redisStore;
          return {
            isGlobal: true,
            store: redisStore,
            url: configService.redisUrl,
            ttl: configService.cacheDefaultTtl,
            max: configService.cacheMaxItems,
            // Redis-specific options
            keyPrefix: configService.cacheKeyPrefix,
            db: configService.redisDb,
            password: configService.redisPassword || undefined,
          };
        } else {
          // For development and testing environments
          return {
            isGlobal: true,
            ttl: configService.cacheDefaultTtl,
            max: configService.cacheMaxItems,
          };
        }
      },
      inject: [AppConfigService],
    }),
  ],
  controllers: [CacheController],
  providers: [CachingService, CacheHealthIndicator, CacheMonitoringService],
  exports: [CachingService, CacheHealthIndicator, CacheMonitoringService, CacheModule],
})
export class CachingModule {}