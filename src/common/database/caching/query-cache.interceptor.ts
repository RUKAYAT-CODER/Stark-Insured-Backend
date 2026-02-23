import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, of, switchMap } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { QueryCacheService, CacheOptions } from './query-cache.service';

@Injectable()
export class QueryCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(QueryCacheInterceptor.name);

  constructor(
    private readonly cacheService: QueryCacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get cache configuration from method metadata
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
      this.cacheService.get(cacheKey).then(cached => {
        if (cached !== null) {
          this.logger.debug(`Cache hit for key: ${cacheKey}`);
          subscriber.next(cached);
          subscriber.complete();
        } else {
          this.logger.debug(`Cache miss for key: ${cacheKey}`);
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
          tap(response => {
            this.cacheResponse(cacheKey, response, cacheOptions);
          }),
          catchError(error => {
            // Don't cache error responses
            throw error;
          })
        );
      })
    );
  }

  private getCachedResponse(cacheKey: string): Observable<any> {
    return new Observable(subscriber => {
      this.cacheService.get(cacheKey).then(cached => {
        if (cached !== null) {
          subscriber.next(cached);
          subscriber.complete();
        } else {
          subscriber.next(null);
          subscriber.complete();
        }
      }).catch(error => {
        subscriber.error(error);
      });
    });
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

      await this.cacheService.set(key, response, options);
    } catch (error) {
      this.logger.error(`Failed to cache response for key ${key}:`, error);
    }
  }

  private generateCacheKey(request: any, options: CacheOptions): string {
    if (options.key) {
      return options.key;
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
