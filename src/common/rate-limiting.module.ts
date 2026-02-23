import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { CachingModule } from './caching/caching.module';
import { RateLimitService } from './services/rate-limit.service';
import { MonitoringService } from './services/monitoring.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';

@Global()
@Module({
  // bring the cache module into this context so that services
  // which inject CACHE_MANAGER can be resolved.  the app module
  // already registers CacheModule (with isGlobal:true), but
  // importing here avoids timing/order issues and makes unit tests
  // easier to author.
  imports: [ConfigModule, CachingModule],
  providers: [
    RateLimitService,
    MonitoringService,
    CircuitBreakerService,
  ],
  exports: [
    RateLimitService,
    MonitoringService,
    CircuitBreakerService,
  ],
})
export class RateLimitingModule {}