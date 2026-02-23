import { SetMetadata } from '@nestjs/common';
import { CacheOptions } from './query-cache.service';

export const CACHE_KEY_PREFIX = 'cache_';
export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_TAGS_KEY = 'cache_tags';

/**
 * Decorator to cache method results
 * @param options Cache configuration options
 */
export const CacheQuery = (options: CacheOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`${CACHE_KEY_PREFIX}${propertyKey}`, options);
    return descriptor;
  };
};

/**
 * Decorator to invalidate cache when method is called
 * @param keys Cache keys to invalidate
 */
export const CacheInvalidate = (...keys: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`invalidate_${propertyKey}`, keys);
    return descriptor;
  };
};

/**
 * Decorator to invalidate cache by tags
 * @param tags Cache tags to invalidate
 */
export const CacheInvalidateByTag = (...tags: string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`invalidate_by_tag_${propertyKey}`, tags);
    return descriptor;
  };
};
