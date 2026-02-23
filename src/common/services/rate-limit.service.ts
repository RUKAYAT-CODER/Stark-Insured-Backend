import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitOptions {
  windowMs: number; // Window in milliseconds
  maxRequests: number; // Max requests allowed in the window
  keyPrefix?: string; // Prefix for the cache key
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number; // Time to wait before retrying in seconds
}

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  async checkRateLimit(identifier: string, options: RateLimitOptions): Promise<RateLimitResult> {
    const key = `${options.keyPrefix || 'rate_limit'}:${identifier}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Get the current window data
    let requestData = await this.cacheManager.get<{ hits: number; start: number }>(key);
    
    if (!requestData || requestData.start < windowStart) {
      // Start a new window
      requestData = { hits: 1, start: now };
      await this.cacheManager.set(key, requestData, Math.ceil(options.windowMs / 1000));
      
      return {
        allowed: true,
        remaining: options.maxRequests - 1,
        resetTime: now + options.windowMs,
      };
    }

    // Increment hit count
    requestData.hits++;
    await this.cacheManager.set(key, requestData, Math.ceil((requestData.start + options.windowMs - now) / 1000));

    const remaining = options.maxRequests - requestData.hits;
    const resetTime = requestData.start + options.windowMs;
    
    const result: RateLimitResult = {
      allowed: remaining >= 0,
      remaining: Math.max(0, remaining),
      resetTime,
    };

    if (!result.allowed) {
      // Calculate retry after time
      result.retryAfter = Math.ceil((resetTime - now) / 1000);
    }

    return result;
  }

  /**
   * Apply sliding window rate limiting algorithm
   * This method maintains a sliding window of requests
   */
  async checkSlidingWindowRateLimit(
    identifier: string,
    options: RateLimitOptions
  ): Promise<RateLimitResult> {
    const key = `${options.keyPrefix || 'sliding_window_rate_limit'}:${identifier}`;
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // Get the request history
    let requestHistory = await this.cacheManager.get<number[]>(key) || [];

    // Filter out requests that are outside the current window
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
    
    // Add the current request
    validRequests.push(now);

    // Update the cache with the new history
    await this.cacheManager.set(
      key, 
      validRequests, 
      Math.ceil(options.windowMs / 1000) + 1 // Adding 1 second buffer
    );

    const remaining = options.maxRequests - validRequests.length;
    const resetTime = now + options.windowMs;
    
    const result: RateLimitResult = {
      allowed: remaining >= 0,
      remaining: Math.max(0, remaining),
      resetTime,
    };

    if (!result.allowed) {
      // Calculate retry after time (until oldest request expires)
      const oldestValidRequest = validRequests.length > 0 ? validRequests[0] : now;
      const nextReset = oldestValidRequest + options.windowMs;
      result.retryAfter = Math.ceil((nextReset - now) / 1000);
    }

    return result;
  }

  /**
   * Check if circuit breaker is active for an identifier
   */
  async isCircuitBreakerActive(identifier: string): Promise<boolean> {
    const circuitKey = `circuit_breaker:${identifier}`;
    const isActive = await this.cacheManager.get<boolean>(circuitKey);
    return !!isActive;
  }

  /**
   * Activate circuit breaker for an identifier
   */
  async activateCircuitBreaker(identifier: string, duration: number = 300): Promise<void> {
    const circuitKey = `circuit_breaker:${identifier}`;
    await this.cacheManager.set(circuitKey, true, duration);
    
    this.logger.warn(`Circuit breaker activated for ${identifier}`);
  }

  /**
   * Reset circuit breaker for an identifier
   */
  async resetCircuitBreaker(identifier: string): Promise<void> {
    const circuitKey = `circuit_breaker:${identifier}`;
    await this.cacheManager.del(circuitKey);
    
    this.logger.log(`Circuit breaker reset for ${identifier}`);
  }

  /**
   * Get rate limit statistics
   */
  async getRateLimitStats(identifier: string, keyPrefix?: string): Promise<{
    currentRequests: number;
    windowStart: number;
    windowEnd: number;
  } | null> {
    const key = `${keyPrefix || 'rate_limit'}:${identifier}`;
    const requestData = await this.cacheManager.get<{ hits: number; start: number }>(key);
    
    if (!requestData) {
      return null;
    }

    const now = Date.now();
    const windowEnd = requestData.start + (requestData as any).windowMs || 60000; // Default to 1 min
    
    return {
      currentRequests: requestData.hits,
      windowStart: requestData.start,
      windowEnd,
    };
  }

  /**
   * Get violation count for monitoring
   */
  async getViolationCount(identifier: string): Promise<number> {
    const violationKey = `rate_limit_violation:${identifier}:${new Date().toISOString().split('T')[0]}`;
    const count = await this.cacheManager.get<number>(violationKey);
    return count || 0;
  }

  /**
   * Increment violation count
   */
  async incrementViolationCount(identifier: string, path?: string): Promise<number> {
    const violationKey = `rate_limit_violation:${identifier}:${new Date().toISOString().split('T')[0]}`;
    const currentCount = (await this.cacheManager.get<number>(violationKey)) || 0;
    const newCount = currentCount + 1;
    await this.cacheManager.set(violationKey, newCount, 86400); // 24 hours

    // Track by path as well if provided
    if (path) {
      const pathViolationKey = `rate_limit_violation_path:${path}:${new Date().toISOString().split('T')[0]}`;
      const pathCurrentCount = (await this.cacheManager.get<number>(pathViolationKey)) || 0;
      await this.cacheManager.set(pathViolationKey, pathCurrentCount + 1, 86400);
    }

    return newCount;
  }
}