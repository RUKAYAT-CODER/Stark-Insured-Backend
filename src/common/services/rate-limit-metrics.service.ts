import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface RateLimitMetrics {
  timestamp: string;
  tracker: string;
  path: string;
  tier: string;
  limit: number;
  remaining: number;
  userAgent?: string;
  method: string;
}

export interface RateLimitViolation {
  timestamp: string;
  tracker: string;
  path: string;
  tier: string;
  reason: string;
  userAgent?: string;
  method: string;
}

export interface RateLimitStats {
  totalRequests: number;
  totalViolations: number;
  violationsByTier: Record<string, number>;
  violationsByPath: Record<string, number>;
  topViolators: Array<{ tracker: string; violations: number }>;
  timeWindow: string;
}

/**
 * Service for tracking and analyzing rate limiting metrics
 * 
 * Features:
 * - Request tracking with tier information
 * - Violation monitoring and analytics
 * - Real-time statistics
 * - Historical data analysis
 * - Performance monitoring
 */
@Injectable()
export class RateLimitMetricsService {
  private readonly logger = new Logger(RateLimitMetricsService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Record a rate limited request
   */
  async recordRequest(metrics: RateLimitMetrics): Promise<void> {
    const key = `rate_limit_request:${this.getTodayKey()}`;
    const existing = (await this.cacheManager.get<RateLimitMetrics[]>(key)) || [];
    
    existing.push(metrics);
    
    // Keep only last 10000 requests per day to prevent memory issues
    if (existing.length > 10000) {
      existing.splice(0, existing.length - 10000);
    }
    
    await this.cacheManager.set(key, existing, 86400); // 24 hours
    
    // Update real-time counters
    await this.updateRealTimeCounters(metrics);
  }

  /**
   * Record a rate limit violation
   */
  async recordViolation(violation: RateLimitViolation): Promise<void> {
    const key = `rate_limit_violation:${this.getTodayKey()}`;
    const existing = (await this.cacheManager.get<RateLimitViolation[]>(key)) || [];
    
    existing.push(violation);
    
    // Keep only last 5000 violations per day
    if (existing.length > 5000) {
      existing.splice(0, existing.length - 5000);
    }
    
    await this.cacheManager.set(key, existing, 86400); // 24 hours
    
    // Update violation counters
    await this.updateViolationCounters(violation);
    
    this.logger.warn(`Rate limit violation: ${violation.tracker} on ${violation.path} (${violation.tier})`, 'RateLimitMetricsService');
  }

  /**
   * Get comprehensive rate limit statistics
   */
  async getStats(days: number = 7): Promise<RateLimitStats> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const requests: RateLimitMetrics[] = [];
    const violations: RateLimitViolation[] = [];

    // Collect data for the specified period
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dateKey = this.formatDateKey(date);
      
      const dayRequests = (await this.cacheManager.get<RateLimitMetrics[]>(`rate_limit_request:${dateKey}`)) || [];
      const dayViolations = (await this.cacheManager.get<RateLimitViolation[]>(`rate_limit_violation:${dateKey}`)) || [];
      
      requests.push(...dayRequests);
      violations.push(...dayViolations);
    }

    // Calculate statistics
    const violationsByTier = violations.reduce((acc, v) => {
      acc[v.tier] = (acc[v.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violationsByPath = violations.reduce((acc, v) => {
      acc[v.path] = (acc[v.path] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const violators = violations.reduce((acc, v) => {
      const existing = acc.find(item => item.tracker === v.tracker);
      if (existing) {
        existing.violations++;
      } else {
        acc.push({ tracker: v.tracker, violations: 1 });
      }
      return acc;
    }, [] as Array<{ tracker: string; violations: number }>);

    const topViolators = violators
      .sort((a, b) => b.violations - a.violations)
      .slice(0, 10);

    return {
      totalRequests: requests.length,
      totalViolations: violations.length,
      violationsByTier,
      violationsByPath,
      topViolators,
      timeWindow: `${days} days`,
    };
  }

  /**
   * Get real-time rate limit status
   */
  async getRealTimeStatus(): Promise<{
    activeTrackers: number;
    currentViolations: number;
    topTiers: Array<{ tier: string; requests: number }>;
  }> {
    const today = this.getTodayKey();
    const requests = (await this.cacheManager.get<RateLimitMetrics[]>(`rate_limit_request:${today}`)) || [];
    const violations = (await this.cacheManager.get<RateLimitViolation[]>(`rate_limit_violation:${today}`)) || [];

    const tierCounts = requests.reduce((acc, r) => {
      acc[r.tier] = (acc[r.tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTiers = Object.entries(tierCounts)
      .map(([tier, requests]) => ({ tier, requests }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    const activeTrackers = new Set(requests.map(r => r.tracker)).size;

    return {
      activeTrackers,
      currentViolations: violations.length,
      topTiers,
    };
  }

  /**
   * Get violation trends over time
   */
  async getViolationTrends(days: number = 30): Promise<Array<{
    date: string;
    violations: number;
    requests: number;
    violationRate: number;
  }>> {
    const trends = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = this.formatDateKey(date);
      
      const requests = (await this.cacheManager.get<RateLimitMetrics[]>(`rate_limit_request:${dateKey}`)) || [];
      const violations = (await this.cacheManager.get<RateLimitViolation[]>(`rate_limit_violation:${dateKey}`)) || [];
      
      trends.push({
        date: dateKey,
        violations: violations.length,
        requests: requests.length,
        violationRate: requests.length > 0 ? (violations.length / requests.length) * 100 : 0,
      });
    }
    
    return trends.reverse(); // Most recent first
  }

  /**
   * Clean up old metrics data
   */
  async cleanup(olderThanDays: number = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    this.logger.log(`Cleaning up rate limit metrics older than ${olderThanDays} days`, 'RateLimitMetricsService');
    
    // This would be implemented based on your cache/storage backend
    // For Redis, you could use SCAN with MATCH patterns
    // For memory cache, old data expires naturally via TTL
  }

  /**
   * Export metrics for external monitoring systems
   */
  async exportMetrics(format: 'json' | 'prometheus' = 'json'): Promise<string> {
    const stats = await this.getStats(7);
    
    if (format === 'prometheus') {
      return this.convertToPrometheusFormat(stats);
    }
    
    return JSON.stringify(stats, null, 2);
  }

  private async updateRealTimeCounters(metrics: RateLimitMetrics): Promise<void> {
    const key = `rate_limit realtime:${metrics.tier}`;
    const current = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, current + 1, 300); // 5 minutes TTL
  }

  private async updateViolationCounters(violation: RateLimitViolation): Promise<void> {
    const key = `rate_limit violations realtime:${violation.tier}`;
    const current = (await this.cacheManager.get<number>(key)) || 0;
    await this.cacheManager.set(key, current + 1, 300); // 5 minutes TTL
  }

  private getTodayKey(): string {
    return this.formatDateKey(new Date());
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private convertToPrometheusFormat(stats: RateLimitStats): string {
    let output = '';
    
    // Total requests
    output += `# HELP rate_limit_requests_total Total number of rate limited requests\n`;
    output += `# TYPE rate_limit_requests_total counter\n`;
    output += `rate_limit_requests_total ${stats.totalRequests}\n\n`;
    
    // Total violations
    output += `# HELP rate_limit_violations_total Total number of rate limit violations\n`;
    output += `# TYPE rate_limit_violations_total counter\n`;
    output += `rate_limit_violations_total ${stats.totalViolations}\n\n`;
    
    // Violations by tier
    Object.entries(stats.violationsByTier).forEach(([tier, count]) => {
      output += `rate_limit_violations_by_tier{tier="${tier}"} ${count}\n`;
    });
    
    return output;
  }
}
