import { SetMetadata } from '@nestjs/common';
import { RateLimitConfig } from '../config/rate-limit-config.service';

export const RATE_LIMIT_TIER_KEY = 'rate_limit_tier';

/**
 * Decorator to apply tiered rate limiting to endpoints
 * 
 * Usage:
 * @RateLimit('public') - For public endpoints
 * @RateLimit('authenticated') - For authenticated endpoints  
 * @RateLimit('payment') - For payment endpoints
 * @RateLimit('admin') - For admin endpoints
 * @RateLimit('auth') - For authentication endpoints
 * @RateLimit('sensitive') - For sensitive operations
 */
export const RateLimit = (tierName: keyof RateLimitConfig) => 
  SetMetadata(RATE_LIMIT_TIER_KEY, tierName);

/**
 * Custom rate limit decorator for specific limits
 * 
 * Usage:
 * @CustomRateLimit({ limit: 5, ttl: 300000 }) // 5 requests per 5 minutes
 */
export const CustomRateLimit = (options: { limit: number; ttl: number }) => 
  SetMetadata('custom_rate_limit', options);

/**
 * Skip rate limiting decorator (use with caution)
 * 
 * Usage:
 * @SkipRateLimit()
 */
export const SkipRateLimit = () => 
  SetMetadata('skip_rate_limit', true);
