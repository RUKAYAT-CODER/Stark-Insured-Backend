import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CachingService, CacheOptions } from './caching.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cachingService: CachingService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheOptions = this.reflector.get<CacheOptions>(
      `cache_${context.getHandler().name}`,
      context.getHandler(),
    );
    
    if (!cacheOptions) {
      // No caching configured for this method
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.generateCacheKey(request, cacheOptions);

    // Try to get from cache first
    return new Observable(subscriber => {
      this.cachingService.get(cacheKey).then(cached => {
        if (cached !== null) {
          this.logger.debug(`Cache HIT for key: ${cacheKey}`);
          subscriber.next(cached);
          subscriber.complete();
        } else {
          this.logger.debug(`Cache MISS for key: ${cacheKey}`);
          subscriber.next(null);
          subscriber.complete();
        }
      }).catch(error => {
        subscriber.error(error);
      });
    }).pipe(
      switchMap(cachedResponse => {
        if (cachedResponse !== null) {
          // Return cached response
          return of(cachedResponse);
        }
        
        // Execute the request and cache the response
        return next.handle().pipe(
          tap(async response => {
            await this.cacheResponse(cacheKey, response, cacheOptions);
          }),
          catchError(error => {
            // Don't cache error responses
            throw error;
          })
        );
      })
    );
  }

  private async cacheResponse(
    key: string, 
    response: any, 
    options: CacheOptions
  ): Promise<void> {
    try {
      // Don't cache error responses
      if (response && response.statusCode >= 400) {
        return;
      }

      // Don't cache streaming responses
      if (response && typeof response.pipe === 'function') {
        return;
      }

      await this.cachingService.set(key, response, options);
    } catch (error) {
      this.logger.error(`Failed to cache response for key ${key}:`, error);
    }
  }

  private generateCacheKey(request: any, options: CacheOptions): string {
    if (options.key) {
      return options.key;
    }

    // Check for custom key generator
    const keyGenerator = (options as any).keyGenerator;
    if (keyGenerator && typeof keyGenerator === 'function') {
      // For HTTP requests, we need to extract parameters
      const params = request.params || {};
      const query = request.query || {};
      const body = request.body || {};
      return keyGenerator(params, query, body);
    }

    // Generate key from request method, URL, and parameters
    const method = request.method;
    const url = request.url || request.route?.path || '';
    const params = request.params || {};
    const query = request.query || {};

    const keyData = {
      method,
      url,
      params,
      query,
    };

    return this.hashObject(keyData);
  }

  private hashObject(obj: Record<string, any>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  }
}