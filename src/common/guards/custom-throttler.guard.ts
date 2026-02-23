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
import { Request, Response } from 'express';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { MonitoringService } from '../services/monitoring.service';
import { CircuitBreakerService, CircuitBreakerOptions } from '../services/circuit-breaker.service';

/**
 * Custom throttler guard that extends the default ThrottlerGuard
 * to add rate limit headers and custom error responses.
 *
 * Features:
 * - Adds X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset headers
 * - Custom 429 Too Many Requests response format
 * - Tracks by user ID for authenticated requests, IP for unauthenticated
 */
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  /**
   * Determines the tracker key for rate limiting.
   * Uses user ID for authenticated requests, falls back to IP address.
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

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly monitoringService: MonitoringService,
    private readonly circuitBreakerService: CircuitBreakerService,
    ...args: ConstructorParameters<typeof ThrottlerGuard>
  ) {
    super(...args);
  }

  /**
   * Enhanced handleRequest with sliding window algorithm and circuit breaker
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

    // Get tracker for this request
    const tracker = await getTracker(request, context);
    const key = generateKey(context, tracker, throttler.name ?? 'default');

    // Get storage record
    const { totalHits, timeToExpire } = await this.storageService.increment(
      key,
      ttl,
      limit,
      blockDuration,
      throttler.name ?? 'default',
    );

    // Calculate rate limit values
    const resetTime = Math.ceil(Date.now() / 1000 + timeToExpire / 1000);
    const remaining = Math.max(0, limit - totalHits);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Limit', limit);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', resetTime);
    response.setHeader(
      'X-RateLimit-Policy',
      `${limit};w=${Math.ceil(ttl / 1000)}`,
    );

    // Record the request in monitoring
    await this.monitoringService.recordRateLimitRequest(tracker, request.path, totalHits <= limit);

    // Check if circuit breaker is open for this tracker
    const circuitOptions: CircuitBreakerOptions = {
      failureThreshold: 10, // This could be made configurable
      timeoutMs: 300000, // 5 minutes - could be made configurable
      successThreshold: 2, // This could be made configurable
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
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Check if limit exceeded
    if (totalHits > limit) {
      // Increment violation counter
      await this.recordRateLimitViolation(tracker, request.path);
      
      const retryAfter = Math.ceil(timeToExpire / 1000);
      response.setHeader('Retry-After', retryAfter);

      // Record failure to circuit breaker
      await this.circuitBreakerService.onFailure(tracker, circuitOptions);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
          retryAfter,
          path: request.path,
          timestamp: new Date().toISOString(),
          tracker,
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
   * Records rate limit violations for monitoring
   */
  private async recordRateLimitViolation(tracker: string, path: string): Promise<void> {
    // Use monitoring service to record violation
    await this.monitoringService.recordRateLimitViolation(tracker, path, {
      tracker,
      path,
      timestamp: new Date().toISOString(),
    });

    // Also maintain legacy tracking for circuit breaker
    const violationKey = `rate_limit_violation:${tracker}:${new Date().toISOString().split('T')[0]}`;
    const currentCount = (await this.cacheManager.get<number>(violationKey)) || 0;
    await this.cacheManager.set(violationKey, currentCount + 1, 86400); // 24 hours
  }

  /**
   * Gets violation count for a tracker
   */
  private async getViolationCount(tracker: string): Promise<number> {
    const violationKey = `rate_limit_violation:${tracker}:${new Date().toISOString().split('T')[0]}`;
    return (await this.cacheManager.get<number>(violationKey)) || 0;
  }

  /**
   * Activates circuit breaker for a tracker
   */
  private async activateCircuitBreaker(tracker: string, path: string): Promise<void> {
    const circuitKey = `circuit_breaker:${tracker}`;
    const expiration = 300; // 5 minutes
    await this.cacheManager.set(circuitKey, true, expiration);
    
    Logger.warn(`Circuit breaker activated for ${tracker} on path ${path}`, 'CustomThrottlerGuard');
  }

  /**
   * Checks if circuit breaker is active for a tracker
   */
  private async isCircuitBreakerActive(tracker: string): Promise<boolean> {
    const circuitKey = `circuit_breaker:${tracker}`;
    return !!(await this.cacheManager.get(circuitKey));
  }
}
