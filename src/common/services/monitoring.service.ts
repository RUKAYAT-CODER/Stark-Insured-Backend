import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  violationCount: number;
  timestamp: Date;
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Record a rate limit violation
   */
  async recordRateLimitViolation(identifier: string, endpoint: string, details?: any): Promise<void> {
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    
    // Increment global violation counter
    const globalViolationKey = `monitoring:rate_limit_violations:${dateStr}`;
    const globalCount = (await this.cacheManager.get<number>(globalViolationKey)) || 0;
    await this.cacheManager.set(globalViolationKey, globalCount + 1, 86400); // 24 hours

    // Increment violation counter for specific identifier
    const identifierViolationKey = `monitoring:violations:${identifier}:${dateStr}`;
    const identifierCount = (await this.cacheManager.get<number>(identifierViolationKey)) || 0;
    await this.cacheManager.set(identifierViolationKey, identifierCount + 1, 86400);

    // Increment violation counter for specific endpoint
    const endpointViolationKey = `monitoring:violations:endpoint:${endpoint}:${dateStr}`;
    const endpointCount = (await this.cacheManager.get<number>(endpointViolationKey)) || 0;
    await this.cacheManager.set(endpointViolationKey, endpointCount + 1, 86400);

    // Store violation details
    const violationDetailsKey = `monitoring:violation_details:${identifier}:${Date.now()}`;
    await this.cacheManager.set(violationDetailsKey, {
      identifier,
      endpoint,
      timestamp: timestamp.toISOString(),
      details,
    }, 3600); // Keep details for 1 hour

    this.logger.warn({
      message: 'Rate limit violation recorded',
      identifier,
      endpoint,
      timestamp: timestamp.toISOString(),
      details,
    });

    // Check if this constitutes a potential attack pattern
    await this.checkAttackPattern(identifier, endpoint);
  }

  /**
   * Record a rate limit request (allowed or blocked)
   */
  async recordRateLimitRequest(
    identifier: string, 
    endpoint: string, 
    allowed: boolean
  ): Promise<void> {
    const timestamp = new Date();
    const dateStr = timestamp.toISOString().split('T')[0];
    const hourStr = `${dateStr}T${String(timestamp.getHours()).padStart(2, '0')}`;

    // Increment counters
    const totalKey = `monitoring:requests:${identifier}:${hourStr}`;
    const totalRequests = (await this.cacheManager.get<number>(totalKey)) || 0;
    await this.cacheManager.set(totalKey, totalRequests + 1, 3600);

    if (allowed) {
      const allowedKey = `monitoring:requests:allowed:${identifier}:${hourStr}`;
      const allowedRequests = (await this.cacheManager.get<number>(allowedKey)) || 0;
      await this.cacheManager.set(allowedKey, allowedRequests + 1, 3600);
    } else {
      const blockedKey = `monitoring:requests:blocked:${identifier}:${hourStr}`;
      const blockedRequests = (await this.cacheManager.get<number>(blockedKey)) || 0;
      await this.cacheManager.set(blockedKey, blockedRequests + 1, 3600);
    }
  }

  /**
   * Get rate limit metrics for an identifier
   */
  async getRateLimitMetrics(identifier: string): Promise<RateLimitMetrics> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const hourStr = `${dateStr}T${String(now.getHours()).padStart(2, '0')}`;

    const totalRequests = (await this.cacheManager.get<number>(`monitoring:requests:${identifier}:${hourStr}`)) || 0;
    const allowedRequests = (await this.cacheManager.get<number>(`monitoring:requests:allowed:${identifier}:${hourStr}`)) || 0;
    const blockedRequests = (await this.cacheManager.get<number>(`monitoring:requests:blocked:${identifier}:${hourStr}`)) || 0;
    const violationCount = (await this.cacheManager.get<number>(`monitoring:violations:${identifier}:${dateStr}`)) || 0;

    return {
      totalRequests,
      allowedRequests,
      blockedRequests,
      violationCount,
      timestamp: now,
    };
  }

  /**
   * Get overall rate limit statistics
   */
  async getOverallStatistics(): Promise<{
    totalViolations: number;
    totalRequests: number;
    topViolatingEndpoints: Array<{ endpoint: string; count: number }>;
    topViolatingIdentifiers: Array<{ identifier: string; count: number }>;
  }> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const totalViolations = (await this.cacheManager.get<number>(`monitoring:rate_limit_violations:${dateStr}`)) || 0;
    
    // We'll calculate total requests from all identifiers
    // For simplicity, we'll return placeholder values since exact calculation requires scanning all keys
    const topEndpoints = await this.getTopViolatingEndpoints(5);
    const topIdentifiers = await this.getTopViolatingIdentifiers(5);

    return {
      totalViolations,
      totalRequests: totalViolations * 5, // Placeholder - actual implementation would aggregate all requests
      topViolatingEndpoints: topEndpoints,
      topViolatingIdentifiers: topIdentifiers,
    };
  }

  /**
   * Get top violating endpoints
   */
  async getTopViolatingEndpoints(limit: number = 10): Promise<Array<{ endpoint: string; count: number }>> {
    // This would typically scan keys in Redis, but for now returning empty array
    // In a real implementation, this would scan keys like monitoring:violations:endpoint:*
    return [];
  }

  /**
   * Get top violating identifiers
   */
  async getTopViolatingIdentifiers(limit: number = 10): Promise<Array<{ identifier: string; count: number }>> {
    // This would typically scan keys in Redis, but for now returning empty array
    // In a real implementation, this would scan keys like monitoring:violations:*
    return [];
  }

  /**
   * Check for potential attack patterns
   */
  private async checkAttackPattern(identifier: string, endpoint: string): Promise<void> {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const minuteStr = `${dateStr}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Check if there are too many violations in a short time period
    const violationKey = `monitoring:attack_check:${identifier}:${minuteStr}`;
    const violationCount = (await this.cacheManager.get<number>(violationKey)) || 0;
    const newCount = violationCount + 1;
    
    await this.cacheManager.set(violationKey, newCount, 60); // 1 minute window

    if (newCount > 10) { // More than 10 violations in a minute
      this.logger.error({
        message: 'Potential attack pattern detected',
        identifier,
        endpoint,
        violationsInMinute: newCount,
        timestamp: now.toISOString(),
      });

      // Could trigger alerts or additional security measures here
    }
  }

  /**
   * Get recent violations
   */
  async getRecentViolations(hours: number = 24): Promise<any[]> {
    // In a real implementation, this would scan and return recent violation details
    // For now returning empty array
    return [];
  }

  /**
   * Reset metrics for an identifier
   */
  async resetMetrics(identifier: string): Promise<void> {
    // In a real implementation, this would delete all metrics keys for the identifier
    this.logger.log(`Metrics reset for identifier: ${identifier}`);
  }
}