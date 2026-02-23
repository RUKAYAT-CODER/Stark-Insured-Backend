import { SetMetadata } from '@nestjs/common';
import { CacheOptions } from './caching.service';

export const CACHE_KEY_PREFIX = 'cache_';
export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_TAGS_KEY = 'cache_tags';

/**
 * Decorator to cache method results
 * @param options Cache configuration options
 */
export const Cacheable = (options: CacheOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`${CACHE_KEY_PREFIX}${propertyKey}`, options);
    return descriptor;
  };
};

/**
 * Decorator to cache method results with custom key generation
 * @param keyGenerator Function to generate cache key
 * @param options Cache configuration options
 */
export const CacheableWithKey = (
  keyGenerator: (...args: any[]) => string,
  options: CacheOptions = {}
) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`${CACHE_KEY_PREFIX}${propertyKey}`, {
      ...options,
      keyGenerator,
    });
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

/**
 * Decorator to invalidate cache based on method parameters
 * @param keyGenerator Function to generate cache keys from parameters
 */
export const CacheInvalidateByKey = (keyGenerator: (...args: any[]) => string[]) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`invalidate_by_key_${propertyKey}`, keyGenerator);
    return descriptor;
  };
};

/**
 * Decorator to bypass cache for specific method calls
 * @param condition Function that returns true to bypass cache
 */
export const CacheBypass = (condition?: (...args: any[]) => boolean) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(`bypass_${propertyKey}`, condition || (() => true));
    return descriptor;
  };
};