import { Injectable, Logger } from '@nestjs/common';
import { CachingService } from './caching.service';

export interface CacheMetrics {
  timestamp: Date;
  totalKeys: number;
  hitRate: number;
  memoryUsage: number;
  hits: number;
  misses: number;
  evictions: number;
}

@Injectable()
export class CacheMonitoringService {
  private readonly logger = new Logger(CacheMonitoringService.name);
  private readonly metricsHistory: CacheMetrics[] = [];
  private readonly maxHistorySize = 1000; // Keep last 1000 metrics

  constructor(private readonly cachingService: CachingService) {
    // Start periodic monitoring
    this.startMonitoring();
  }

  /**
   * Get current cache statistics
   */
  async getCacheStats() {
    return this.cachingService.getCacheStats();
  }

  /**
   * Get cache metrics history
   */
  getMetricsHistory(limit: number = 100): CacheMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Get cache performance report
   */
  async getPerformanceReport(hours: number = 24): Promise<{
    current: any;
    trend: {
      hitRate: number;
      growth: number;
    };
    recommendations: string[];
  }> {
    const currentStats = await this.getCacheStats();
    const history = this.getMetricsHistory();
    
    // Filter history for the specified time period
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentHistory = history.filter(metric => metric.timestamp >= cutoffTime);
    
    // Calculate trends
    const trend = this.calculateTrends(recentHistory);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(currentStats, trend);
    
    return {
      current: currentStats,
      trend,
      recommendations,
    };
  }

  /**
   * Clear cache metrics history
   */
  clearMetricsHistory(): void {
    this.metricsHistory.length = 0;
    this.logger.debug('Cache metrics history cleared');
  }

  /**
   * Start periodic monitoring
   */
  private startMonitoring(): void {
    // Collect metrics every 5 minutes
    setInterval(async () => {
      try {
        const stats = await this.getCacheStats();
        const metrics: CacheMetrics = {
          timestamp: new Date(),
          totalKeys: stats.totalKeys,
          hitRate: stats.hitRate,
          memoryUsage: stats.memoryUsage,
          hits: stats.hits,
          misses: stats.misses,
          evictions: stats.evictions,
        };
        
        this.metricsHistory.push(metrics);
        
        // Maintain history size
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory.shift();
        }
        
        this.logger.debug(`Cache metrics collected: ${stats.hitRate}% hit rate`);
      } catch (error) {
        this.logger.error('Error collecting cache metrics:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  /**
   * Calculate performance trends from metrics history
   */
  private calculateTrends(history: CacheMetrics[]): {
    hitRate: number;
    growth: number;
  } {
    if (history.length < 2) {
      return { hitRate: 0, growth: 0 };
    }

    const first = history[0];
    const last = history[history.length - 1];
    
    // Hit rate trend (percentage change)
    const hitRateChange = last.hitRate - first.hitRate;
    const hitRateTrend = history.length > 1 ? 
      (hitRateChange / (history.length - 1)) : 0;
    
    // Growth trend (key count change)
    const keyChange = last.totalKeys - first.totalKeys;
    const growthTrend = history.length > 1 ? 
      (keyChange / (history.length - 1)) : 0;

    return {
      hitRate: parseFloat(hitRateTrend.toFixed(2)),
      growth: parseFloat(growthTrend.toFixed(2)),
    };
  }

  /**
   * Generate cache optimization recommendations
   */
  private generateRecommendations(
    stats: any,
    trend: { hitRate: number; growth: number }
  ): string[] {
    const recommendations: string[] = [];

    // Hit rate recommendations
    if (stats.hitRate < 50) {
      recommendations.push('Cache hit rate is low (< 50%). Consider increasing TTL values or caching more frequently accessed data.');
    } else if (stats.hitRate > 90) {
      recommendations.push('Excellent cache hit rate (> 90%). Cache is performing well.');
    }

    // Memory usage recommendations
    if (stats.memoryUsage > 80) {
      recommendations.push('High memory usage detected. Consider reducing cache size or implementing cache eviction policies.');
    }

    // Trend recommendations
    if (trend.hitRate < 0) {
      recommendations.push('Cache hit rate is declining. Review cache invalidation patterns and TTL settings.');
    }

    if (trend.growth > 100) {
      recommendations.push('Rapid cache growth detected. Monitor for potential memory issues.');
    }

    // General recommendations
    if (stats.totalKeys === 0) {
      recommendations.push('No cache entries found. Verify that caching is properly configured and being used.');
    }

    if (recommendations.length === 0) {
      recommendations.push('Cache is performing normally with no immediate issues detected.');
    }

    return recommendations;
  }
}