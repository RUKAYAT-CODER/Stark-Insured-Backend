import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppConfigService } from '../../../config/app-config.service';

export interface QueryPerformanceMetrics {
  query: string;
  executionTime: number;
  timestamp: Date;
  parameters?: any[];
  rowsAffected?: number;
}

export interface DatabaseHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connectionPool: {
    total: number;
    active: number;
    idle: number;
    waiting: number;
  };
  responseTime: {
    average: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  lastCheck: Date;
}

@Injectable()
export class DatabaseMonitoringService {
  private readonly logger = new Logger(DatabaseMonitoringService.name);
  private queryMetrics: QueryPerformanceMetrics[] = [];
  private readonly maxMetricsRetention = 1000; // Keep last 1000 queries
  private slowQueryThreshold = 1000; // 1 second

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly configService: AppConfigService,
  ) {}

  async recordQuery(
    query: string,
    executionTime: number,
    parameters?: any[],
    rowsAffected?: number,
  ): Promise<void> {
    const metric: QueryPerformanceMetrics = {
      query: this.sanitizeQuery(query),
      executionTime,
      timestamp: new Date(),
      parameters: parameters ? this.sanitizeParameters(parameters) : undefined,
      rowsAffected,
    };

    // Add to metrics array
    this.queryMetrics.push(metric);

    // Maintain array size
    if (this.queryMetrics.length > this.maxMetricsRetention) {
      this.queryMetrics.shift();
    }

    // Log slow queries
    if (executionTime > this.slowQueryThreshold) {
      this.logger.warn(`Slow query detected: ${executionTime}ms - ${metric.query}`, {
        executionTime,
        parameters: metric.parameters,
        rowsAffected,
      });
    }

    // Log to external monitoring system if configured
    if (this.configService.get('DATABASE_QUERY_LOGGING_ENABLED', false)) {
      await this.logToExternalSystem(metric);
    }
  }

  async getDatabaseHealth(): Promise<DatabaseHealthStatus> {
    try {
      const startTime = Date.now();
      
      // Test database connectivity
      await this.dataSource.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      // Get connection pool information
      const poolInfo = await this.getConnectionPoolInfo();
      
      // Calculate performance metrics
      const recentMetrics = this.getRecentMetrics(60000); // Last 1 minute
      const performanceMetrics = this.calculatePerformanceMetrics(recentMetrics);
      
      // Calculate error rate
      const errorRate = this.calculateErrorRate(recentMetrics);

      // Determine overall health status
      const status = this.determineHealthStatus(responseTime, errorRate, poolInfo);

      return {
        status,
        connectionPool: poolInfo,
        responseTime: performanceMetrics,
        errorRate,
        lastCheck: new Date(),
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
        connectionPool: { total: 0, active: 0, idle: 0, waiting: 0 },
        responseTime: { average: 0, p95: 0, p99: 0 },
        errorRate: 100,
        lastCheck: new Date(),
      };
    }
  }

  async getSlowQueries(limit: number = 10, minExecutionTime: number = 1000): Promise<QueryPerformanceMetrics[]> {
    return this.queryMetrics
      .filter(metric => metric.executionTime >= minExecutionTime)
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, limit);
  }

  getQueryStatistics(timeWindowMs: number = 300000): {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: number;
    errorQueries: number;
    mostFrequentQueries: Array<{ query: string; count: number }>;
  } {
    const recentMetrics = this.getRecentMetrics(timeWindowMs);
    
    const totalQueries = recentMetrics.length;
    const averageExecutionTime = totalQueries > 0 
      ? recentMetrics.reduce((sum, m) => sum + m.executionTime, 0) / totalQueries 
      : 0;
    
    const slowQueries = recentMetrics.filter(m => m.executionTime > this.slowQueryThreshold).length;
    
    // Group queries by pattern
    const queryGroups = this.groupQueriesByPattern(recentMetrics);
    const mostFrequentQueries = Object.entries(queryGroups)
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalQueries,
      averageExecutionTime,
      slowQueries,
      errorQueries: 0, // TODO: Implement error tracking
      mostFrequentQueries,
    };
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive data and limit length
    return query
      .replace(/\b\d+\b/g, '?') // Replace numbers with ?
      .replace(/['"][^'"]*['"]/g, '?') // Replace string literals
      .substring(0, 200); // Limit length
  }

  private sanitizeParameters(parameters: any[]): any[] {
    if (!parameters) return [];
    
    return parameters.map(param => {
      if (typeof param === 'string' && param.length > 50) {
        return '[REDACTED_LONG_STRING]';
      }
      if (typeof param === 'object' && param !== null) {
        return '[REDACTED_OBJECT]';
      }
      return param;
    });
  }

  private async logToExternalSystem(metric: QueryPerformanceMetrics): Promise<void> {
    // TODO: Implement integration with external monitoring systems
    // like DataDog, New Relic, or custom logging service
  }

  private async getConnectionPoolInfo(): Promise<{
    total: number;
    active: number;
    idle: number;
    waiting: number;
  }> {
    try {
      // PostgreSQL-specific query to get connection pool info
      const result = await this.dataSource.query(`
        SELECT 
          count(*) as total,
          count(*) FILTER (WHERE state = 'active') as active,
          count(*) FILTER (WHERE state = 'idle') as idle,
          count(*) FILTER (WHERE state = 'waiting') as waiting
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      const row = result[0];
      return {
        total: parseInt(row.total) || 0,
        active: parseInt(row.active) || 0,
        idle: parseInt(row.idle) || 0,
        waiting: parseInt(row.waiting) || 0,
      };
    } catch (error) {
      this.logger.warn('Failed to get connection pool info', error);
      return { total: 0, active: 0, idle: 0, waiting: 0 };
    }
  }

  private getRecentMetrics(timeWindowMs: number): QueryPerformanceMetrics[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.queryMetrics.filter(metric => metric.timestamp >= cutoff);
  }

  private calculatePerformanceMetrics(metrics: QueryPerformanceMetrics[]): {
    average: number;
    p95: number;
    p99: number;
  } {
    if (metrics.length === 0) {
      return { average: 0, p95: 0, p99: 0 };
    }

    const executionTimes = metrics.map(m => m.executionTime).sort((a, b) => a - b);
    const average = executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
    
    const p95Index = Math.floor(executionTimes.length * 0.95);
    const p99Index = Math.floor(executionTimes.length * 0.99);
    
    return {
      average: Math.round(average),
      p95: executionTimes[p95Index] || 0,
      p99: executionTimes[p99Index] || 0,
    };
  }

  private calculateErrorRate(metrics: QueryPerformanceMetrics[]): number {
    // TODO: Implement error tracking when queries fail
    return 0;
  }

  private determineHealthStatus(
    responseTime: number,
    errorRate: number,
    poolInfo: { total: number; active: number; idle: number; waiting: number },
  ): 'healthy' | 'degraded' | 'unhealthy' {
    if (errorRate > 5 || responseTime > 5000 || poolInfo.waiting > 10) {
      return 'unhealthy';
    }
    
    if (errorRate > 1 || responseTime > 2000 || poolInfo.waiting > 5) {
      return 'degraded';
    }
    
    return 'healthy';
  }

  private groupQueriesByPattern(metrics: QueryPerformanceMetrics[]): Record<string, number> {
    return metrics.reduce((groups, metric) => {
      const pattern = metric.query.split(' ')[0].toUpperCase(); // Get first word
      groups[pattern] = (groups[pattern] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
  }
}
