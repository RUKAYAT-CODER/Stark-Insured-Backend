import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppConfigService } from '../../config/app-config.service';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  tags?: string[]; // Cache tags for invalidation
  bypass?: boolean; // Bypass cache if true
}

export interface CachedResult<T> {
  data: T;
  cachedAt: Date;
  ttl: number;
  hitCount?: number;
}

export interface CacheStats {
  totalKeys: number;
  hitRate: number;
  memoryUsage: number;
  hits: number;
  misses: number;
  evictions: number;
}

@Injectable()
export class CachingService {
  private readonly logger = new Logger(CachingService.name);
  private readonly cachePrefix = 'app_cache:';
  private readonly statsKey = 'cache_stats';
  private hitCount = 0;
  private missCount = 0;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: any,
    private readonly configService: AppConfigService,
  ) {
    // Initialize cache statistics
    this.initializeStats();
  }

  /**
   * Get cached data by key
   * @param key Cache key
   * @returns Cached data or null if not found/expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.cachePrefix + key;
      const cached: CachedResult<T> | undefined = await this.cacheManager.get(fullKey);
      
      if (!cached) {
        this.missCount++;
        this.updateStats();
        return null;
      }

      // Check if cache is expired
      const now = new Date();
      const age = (now.getTime() - cached.cachedAt.getTime()) / 1000;
      
      if (age > cached.ttl) {
        await this.cacheManager.del(fullKey);
        this.missCount++;
        this.updateStats();
        return null;
      }

      // Update hit count
      cached.hitCount = (cached.hitCount || 0) + 1;
      await this.cacheManager.set(fullKey, cached, cached.ttl - age);
      
      this.hitCount++;
      this.updateStats();
      this.logger.debug(`Cache HIT for key: ${key}`);
      return cached.data;
    } catch (error) {
      this.logger.error(`Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set data in cache
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    try {
      if (options.bypass) {
        this.logger.debug(`Cache bypassed for key: ${key}`);
        return;
      }

      const fullKey = this.cachePrefix + key;
      const ttl = options.ttl || this.configService.cacheDefaultTtl;
      
      const cachedResult: CachedResult<T> = {
        data,
        cachedAt: new Date(),
        ttl,
        hitCount: 0,
      };

      await this.cacheManager.set(fullKey, cachedResult, ttl);
      
      // Store cache metadata for tag-based invalidation
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToCache(fullKey, options.tags);
      }

      this.logger.debug(`Cache SET for key: ${key}, TTL: ${ttl}s`);
    } catch (error) {
      this.logger.error(`Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * Delete cache entry by key
   * @param key Cache key
   */
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

  /**
   * Invalidate cache by tag
   * @param tag Cache tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = this.cachePrefix + 'tag:' + tag;
      const keys: string[] | undefined = await this.cacheManager.get(tagKey) || [];
      
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

  /**
   * Invalidate cache by pattern (supports wildcards)
   * @param pattern Cache key pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
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

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      await this.invalidatePattern(this.cachePrefix + '*');
      await this.cacheManager.store.reset();
      this.resetStats();
      this.logger.debug('All cache cleared');
    } catch (error) {
      this.logger.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const keys = await this.getKeysByPattern(this.cachePrefix + '*');
      const totalRequests = this.hitCount + this.missCount;
      const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
      
      // Get Redis info if using Redis
      let memoryUsage = 0;
      if (this.configService.isProductionEnvironment) {
        try {
          // This would require Redis-specific commands
          // For now, we'll return 0 and implement proper Redis info later
        } catch (error) {
          this.logger.debug('Could not get Redis memory usage');
        }
      }

      return {
        totalKeys: keys.length,
        hitRate: parseFloat(hitRate.toFixed(2)),
        memoryUsage,
        hits: this.hitCount,
        misses: this.missCount,
        evictions: 0, // TODO: Implement eviction tracking
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalKeys: 0,
        hitRate: 0,
        memoryUsage: 0,
        hits: 0,
        misses: 0,
        evictions: 0,
      };
    }
  }

  /**
   * Warm cache with initial data
   * @param entries Cache entries to warm
   */
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

  /**
   * Evict expired cache entries
   */
  async evictExpired(): Promise<void> {
    try {
      const keys = await this.getKeysByPattern(this.cachePrefix + '*');
      const now = new Date();
      
      for (const key of keys) {
        const cached: CachedResult<any> | undefined = await this.cacheManager.get(key);
        
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

  // Helper methods for cache key generation
  generateEntityKey(entity: string, id: string | number): string {
    return `${entity}:${id}`;
  }

  generateQueryKey(
    entity: string,
    operation: string,
    parameters: Record<string, any> = {},
  ): string {
    const paramHash = this.hashObject(parameters);
    return `${entity}:${operation}:${paramHash}`;
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

  // Private helper methods
  private async initializeStats(): Promise<void> {
    const stats: CacheStats | undefined = await this.cacheManager.get(this.statsKey);
    if (stats) {
      this.hitCount = stats.hits || 0;
      this.missCount = stats.misses || 0;
    }
  }

  private async updateStats(): Promise<void> {
    const stats: CacheStats = {
      totalKeys: 0, // Will be calculated when requested
      hitRate: 0,
      memoryUsage: 0,
      hits: this.hitCount,
      misses: this.missCount,
      evictions: 0,
    };
    await this.cacheManager.set(this.statsKey, stats, 86400); // 24 hours
  }

  private resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
    this.updateStats();
  }

  private async addTagsToCache(key: string, tags: string[]): Promise<void> {
    for (const tag of tags) {
      const tagKey = this.cachePrefix + 'tag:' + tag;
      const keys: string[] | undefined = await this.cacheManager.get(tagKey) || [];
      
      if (!keys.includes(key)) {
        keys.push(key);
        await this.cacheManager.set(tagKey, keys, 86400); // 24 hours
      }
    }
  }

  private async removeTagsFromCache(key: string): Promise<void> {
    const tagKeys = await this.getKeysByPattern(this.cachePrefix + 'tag:*');
    
    for (const tagKey of tagKeys) {
      const keys: string[] | undefined = await this.cacheManager.get(tagKey) || [];
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