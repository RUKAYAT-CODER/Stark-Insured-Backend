import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {
    super();
  }

  async isHealthy(key: string = 'database'): Promise<HealthIndicatorResult> {
    try {
      // Test database connectivity
      await this.dataSource.query('SELECT 1');
      
      // Get connection pool information
      const poolInfo = await this.getConnectionPoolInfo();
      
      return this.getStatus(key, true, {
        status: 'up',
        message: 'Database is healthy',
        connectionPool: poolInfo,
      });
    } catch (error) {
      return this.getStatus(key, false, {
        status: 'down',
        message: `Database health check failed: ${error.message}`,
      });
    }
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
      // Return default values if query fails
      return { total: 0, active: 0, idle: 0, waiting: 0 };
    }
  }
}