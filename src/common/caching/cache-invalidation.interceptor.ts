import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { CachingService } from './caching.service';

@Injectable()
export class CacheInvalidationInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInvalidationInterceptor.name);

  constructor(
    private readonly cachingService: CachingService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async () => {
        await this.handleCacheInvalidation(context);
      })
    );
  }

  private async handleCacheInvalidation(context: ExecutionContext): Promise<void> {
    const handler = context.getHandler();
    
    // Handle invalidation by specific keys
    const invalidateKeys = this.reflector.get<string[]>(
      `invalidate_${handler.name}`,
      handler,
    );
    
    if (invalidateKeys && invalidateKeys.length > 0) {
      for (const key of invalidateKeys) {
        await this.cachingService.invalidate(key);
        this.logger.debug(`Invalidated cache key: ${key}`);
      }
    }

    // Handle invalidation by tags
    const invalidateTags = this.reflector.get<string[]>(
      `invalidate_by_tag_${handler.name}`,
      handler,
    );
    
    if (invalidateTags && invalidateTags.length > 0) {
      for (const tag of invalidateTags) {
        await this.cachingService.invalidateByTag(tag);
        this.logger.debug(`Invalidated cache by tag: ${tag}`);
      }
    }

    // Handle invalidation by key generator
    const invalidateKeyGenerator = this.reflector.get<(...args: any[]) => string[]>(
      `invalidate_by_key_${handler.name}`,
      handler,
    );
    
    if (invalidateKeyGenerator) {
      const args = this.extractMethodArguments(context);
      const keys = invalidateKeyGenerator(...args);
      
      for (const key of keys) {
        await this.cachingService.invalidate(key);
        this.logger.debug(`Invalidated cache key from generator: ${key}`);
      }
    }
  }

  private extractMethodArguments(context: ExecutionContext): any[] {
    // For HTTP context
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      return [
        request.params || {},
        request.query || {},
        request.body || {},
      ];
    }
    
    // For other contexts (RPC, GraphQL), get the arguments differently
    // This is a simplified implementation
    return [];
  }
}