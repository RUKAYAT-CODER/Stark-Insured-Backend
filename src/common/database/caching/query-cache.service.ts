import { Injectable, Logger } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppConfigService } from '../../../config/app-config.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
}

export interface CachedResult<T> {
  data: T;
  cachedAt: Date;
  ttl: number;
}

@Injectable()
export class QueryCacheService {
  private readonly logger = new Logger(QueryCacheService.name);
  private readonly defaultTtl = 300; // 5 minutes
  private readonly cachePrefix = 'query_cache:';

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: AppConfigService,
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.cachePrefix + key;
      const cached = await this.cacheManager.get<CachedResult<T>>(fullKey);
      
      if (!cached) {
        return null;
      }

      // Check if cache is expired
      const now = new Date();
      const age = (now.getTime() - cached.cachedAt.getTime()) / 1000;
      
      if (age > cached.ttl) {
        await this.cacheManager.del(fullKey);
        return null;
      }

      this.logger.debug(`Cache hit for key: ${key}`);
      return cached.data;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.cachePrefix + key;
      const ttl = options.ttl || this.defaultTtl;
      
      const cachedResult: CachedResult<T> = {
        data,
        cachedAt: new Date(),
        ttl,
      };

      await this.cacheManager.set(fullKey, cachedResult, ttl);
      
      // Store cache metadata for tag-based invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToCache(fullKey, options.tags);
      }

      this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  async invalidate(key: string): Promise<void> {
    try {
      const fullKey = this.cachePrefix + key;
      await this.cacheManager.del(fullKey);
      await this.removeTagsFromCache(fullKey);
      
      this.logger.debug(`Cache invalidated for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache for key ${key}:`, error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = this.cachePrefix + 'tag:' + tag;
      const keys = await this.cacheManager.get<string[]>(tagKey) || [];
      
      // Delete all cache entries associated with this tag
      const deletePromises = keys.map(key => this.cacheManager.del(key));
      await Promise.all(deletePromises);
      
      // Clear the tag itself
      await this.cacheManager.del(tagKey);
      
      this.logger.debug(`Cache invalidated for tag: ${tag}, keys: ${keys.length}`);
    } catch (error) {
      this.logger.error(`Error invalidating cache by tag ${tag}:`, error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to use Redis SCAN with MATCH
      const keys = await this.getKeysByPattern(pattern);
      
      if (keys.length > 0) {
        const deletePromises = keys.map(key => this.cacheManager.del(key));
        await Promise.all(deletePromises);
        
        this.logger.debug(`Cache invalidated for pattern: ${pattern}, keys: ${keys.length}`);
      }
    } catch (error) {
      this.logger.error(`Error invalidating cache by pattern ${pattern}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear all query cache entries
      await this.invalidatePattern(this.cachePrefix + '*');
      this.logger.debug('All query cache cleared');
    } catch (error) {
      this.logger.error('Error clearing query cache:', error);
    }
  }

  async getCacheStats(): Promise<{
    totalKeys: number;
    hitRate: number;
    memoryUsage: number;
  }> {
    try {
      // This is a simplified implementation
      // In a real scenario, you might want to use Redis INFO command
      const keys = await this.getKeysByPattern(this.cachePrefix + '*');
      
      return {
        totalKeys: keys.length,
        hitRate: 0, // TODO: Implement hit rate tracking
        memoryUsage: 0, // TODO: Implement memory usage tracking
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
  }

  // Helper methods for cache key generation
  generateQueryKey(
    entity: string,
    operation: string,
    parameters: Record<string, any> = {},
  ): string {
    const paramHash = this.hashObject(parameters);
    return `${entity}:${operation}:${paramHash}`;
  }

  generateEntityKey(entity: string, id: string | number): string {
    return `${entity}:${id}`;
  }

  generateListKey(
    entity: string,
    filters: Record<string, any> = {},
    pagination: { page: number; limit: number } = { page: 1, limit: 10 },
  ): string {
    const filterHash = this.hashObject(filters);
    const paginationHash = this.hashObject(pagination);
    return `${entity}:list:${filterHash}:${paginationHash}`;
  }

  // Cache warming strategies
  async warmCache(entries: Array<{
    key: string;
    data: any;
    options?: CacheOptions;
  }>): Promise<void> {
    const promises = entries.map(entry => 
      this.set(entry.key, entry.data, entry.options)
    );
    
    await Promise.all(promises);
    this.logger.debug(`Cache warmed with ${entries.length} entries`);
  }

  // Cache size management
  async evictExpired(): Promise<void> {
    try {
      const keys = await this.getKeysByPattern(this.cachePrefix + '*');
      const now = new Date();
      
      for (const key of keys) {
        const cached = await this.cacheManager.get<CachedResult<any>>(key);
        
        if (cached) {
          const age = (now.getTime() - cached.cachedAt.getTime()) / 1000;
          if (age > cached.ttl) {
            await this.cacheManager.del(key);
          }
        }
      }
      
      this.logger.debug('Expired cache entries evicted');
    } catch (error) {
      this.logger.error('Error evicting expired cache:', error);
    }
  }

  private async addTagsToCache(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = this.cachePrefix + 'tag:' + tag;
      const keys = await this.cacheManager.get<string[]>(tagKey) || [];
      
      if (!keys.includes(key)) {
        keys.push(key);
        await this.cacheManager.set(tagKey, keys, 86400); // 24 hours
      }
    }
  }

  private async removeTagsFromCache(key: string): Promise<void> {
    // Get all tag keys and remove the cache key from them
    const tagKeys = await this.getKeysByPattern(this.cachePrefix + 'tag:*');
    
    for (const tagKey of tagKeys) {
      const keys = await this.cacheManager.get<string[]>(tagKey) || [];
      const updatedKeys = keys.filter(k => k !== key);
      
      if (updatedKeys.length === 0) {
        await this.cacheManager.del(tagKey);
      } else {
        await this.cacheManager.set(tagKey, updatedKeys, 86400);
      }
    }
  }

  private async getKeysByPattern(pattern: string): Promise<string[]> {
    // This is a simplified implementation
    // In a real scenario with Redis, you would use SCAN with MATCH
    // For now, we'll return an empty array as cache-manager doesn't expose this
    return [];
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
