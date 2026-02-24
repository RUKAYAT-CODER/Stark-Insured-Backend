import {
  Injectable,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
} from '@nestjs/common';
import {
  ThrottlerGuard,
  ThrottlerLimitDetail,
  ThrottlerRequest,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MonitoringService } from '../services/monitoring.service';
import { CircuitBreakerService, CircuitBreakerOptions } from '../services/circuit-breaker.service';
import { RateLimitConfigService } from '../config/rate-limit-config.service';
import { RATE_LIMIT_TIER_KEY } from '../decorators/rate-limit.decorator';

/**
 * Enhanced tiered rate limiting guard that uses the unified RateLimitConfig
 * 
 * Features:
 * - Tiered rate limiting (public, authenticated, payment, admin, auth, sensitive)
 * - Environment-specific overrides
 * - Circuit breaker integration
 * - Comprehensive monitoring and metrics
 * - Custom rate limit headers
 * - IP and user-based tracking
 */
@Injectable()
export class TieredRateLimitGuard extends ThrottlerGuard {
  private readonly logger = new Logger(TieredRateLimitGuard.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly monitoringService: MonitoringService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly rateLimitConfigService: RateLimitConfigService,
    private readonly reflector: Reflector,
    ...args: ConstructorParameters<typeof ThrottlerGuard>
  ) {
    super(...args);
  }

  /**
   * Determines the tracker key for rate limiting.
   * Priority: User ID > Wallet Address > IP Address
   */
  protected async getTracker(req: Request): Promise<string> {
    // Check for authenticated user (from JWT)
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // Check for wallet address in request body (for auth endpoints)
    const walletAddress = req.body?.walletAddress;
    if (walletAddress) {
      return `wallet:${walletAddress}`;
    }

    // Fall back to IP address
    return this.getClientIp(req);
  }

  /**
   * Extracts client IP address from request headers or socket.
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return `ip:${forwarded.split(',')[0].trim()}`;
    }
    return `ip:${req.ip || req.socket?.remoteAddress || 'unknown'}`;
  }

  /**
   * Enhanced handleRequest with tiered rate limiting and circuit breaker
   */
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    const {
      context,
      limit,
      ttl,
      throttler,
      blockDuration,
      getTracker,
      generateKey,
    } = requestProps;

    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    // Get the rate limit tier from metadata or use default
    const tierName = this.reflector.get<string>(RATE_LIMIT_TIER_KEY, context.getHandler());
    const customRateLimit = this.reflector.get<{ limit: number; ttl: number }>('custom_rate_limit', context.getHandler());
    const skipRateLimit = this.reflector.get<boolean>('skip_rate_limit', context.getHandler());

    // Skip rate limiting if explicitly disabled
    if (skipRateLimit) {
      this.logger.debug(`Rate limiting skipped for ${request.path}`, 'TieredRateLimitGuard');
      return true;
    }

    // Use custom rate limit if specified
    let effectiveLimit = limit;
    let effectiveTtl = ttl;
    let tierDescription = 'custom';

    if (customRateLimit) {
      effectiveLimit = customRateLimit.limit;
      effectiveTtl = customRateLimit.ttl;
      tierDescription = 'custom';
    } else if (tierName) {
      const tier = this.rateLimitConfigService.getTier(tierName as any);
      effectiveLimit = tier.limit;
      effectiveTtl = tier.ttl;
      tierDescription = tier.description;
    }

    // Get tracker for this request
    const tracker = await getTracker(request, context);
    const key = generateKey(context, tracker, throttler.name ?? 'default');

    // Get storage record
    const { totalHits, timeToExpire } = await this.storageService.increment(
      key,
      effectiveTtl,
      effectiveLimit,
      blockDuration,
      throttler.name ?? 'default',
    );

    // Calculate rate limit values
    const resetTime = Math.ceil(Date.now() / 1000 + timeToExpire / 1000);
    const remaining = Math.max(0, effectiveLimit - totalHits);

    // Set comprehensive rate limit headers
    response.setHeader('X-RateLimit-Limit', effectiveLimit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetTime);
    response.setHeader('X-RateLimit-Policy', this.rateLimitConfigService.getRateLimitHeaders({
      limit: effectiveLimit,
      ttl: effectiveTtl,
      name: tierName || 'default',
      description: tierDescription
    }));
    
    if (tierName) {
      response.setHeader('X-RateLimit-Tier', tierName);
    }

    // Record the request in monitoring
    await this.monitoringService.recordRateLimitRequest(tracker, request.path, totalHits <= effectiveLimit, {
      tier: tierName || 'default',
      limit: effectiveLimit,
      remaining,
      path: request.path,
      method: request.method,
      userAgent: request.headers['user-agent'],
    });

    // Check if circuit breaker is open for this tracker
    const circuitOptions: CircuitBreakerOptions = {
      failureThreshold: this.rateLimitConfigService.getTier('payment').limit, // Dynamic threshold
      timeoutMs: 300000, // 5 minutes
      successThreshold: 2,
      name: `rate_limit_${tracker}`,
    };

    const canExecute = await this.circuitBreakerService.canExecute(tracker, circuitOptions);
    if (!canExecute) {
      // Circuit breaker is open, reject request
      response.setHeader('X-Circuit-Breaker', 'open');
      
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          error: 'Service Unavailable',
          message: 'Service temporarily unavailable due to high load',
          path: request.path,
          timestamp: new Date().toISOString(),
          tracker,
          retryAfter: Math.ceil(circuitOptions.timeoutMs / 1000),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Check if limit exceeded
    if (totalHits > effectiveLimit) {
      // Increment violation counter
      await this.recordRateLimitViolation(tracker, request.path, tierName);
      
      const retryAfter = Math.ceil(timeToExpire / 1000);
      response.setHeader('Retry-After', retryAfter);

      // Record failure to circuit breaker
      await this.circuitBreakerService.onFailure(tracker, circuitOptions);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded for ${tierDescription}. Please try again in ${retryAfter} seconds.`,
          retryAfter,
          path: request.path,
          timestamp: new Date().toISOString(),
          tracker,
          tier: tierName,
          limit: effectiveLimit,
          window: Math.ceil(effectiveTtl / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      // Request is allowed, record success to circuit breaker
      await this.circuitBreakerService.onSuccess(tracker, circuitOptions);
    }

    return true;
  }

  /**
   * Records rate limit violations for monitoring and analytics
   */
  private async recordRateLimitViolation(
    tracker: string, 
    path: string, 
    tierName?: string
  ): Promise<void> {
    const violationData = {
      tracker,
      path,
      tier: tierName || 'unknown',
      timestamp: new Date().toISOString(),
    };

    // Use monitoring service to record violation
    await this.monitoringService.recordRateLimitViolation(tracker, path, violationData);

    // Maintain daily violation count for analytics
    const today = new Date().toISOString().split('T')[0];
    const violationKey = `rate_limit_violation:${tracker}:${today}`;
    const currentCount = (await this.cacheManager.get<number>(violationKey)) || 0;
    await this.cacheManager.set(violationKey, currentCount + 1, 86400); // 24 hours

    this.logger.warn(`Rate limit violation recorded: ${tracker} on ${path} (tier: ${tierName})`, 'TieredRateLimitGuard');
  }

  /**
   * Get violation statistics for a tracker
   */
  async getViolationStats(tracker: string, days: number = 7): Promise<{
    total: number;
    daily: Record<string, number>;
  }> {
    const stats = { total: 0, daily: {} as Record<string, number> };
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const violationKey = `rate_limit_violation:${tracker}:${dateStr}`;
      const count = (await this.cacheManager.get<number>(violationKey)) || 0;
      stats.daily[dateStr] = count;
      stats.total += count;
    }
    
    return stats;
  }

  /**
   * Validate rate limit configuration on startup
   */
  async onModuleInit() {
    const validation = this.rateLimitConfigService.validateConfig();
    if (!validation.isValid) {
      this.logger.error('Rate limit configuration validation failed:', 'TieredRateLimitGuard');
      validation.errors.forEach(error => this.logger.error(`- ${error}`, 'TieredRateLimitGuard'));
      throw new Error('Invalid rate limit configuration');
    }
    
    this.logger.log('Rate limit configuration validated successfully', 'TieredRateLimitGuard');
  }
}
