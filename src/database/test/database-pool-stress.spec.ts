// test/database-pool-stress.spec.ts
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConnectionPoolMetricsService } from '../src/database/connection-pool-metrics.service';

describe('Database Connection Pool Stress Tests', () => {
  let dataSource: DataSource;
  let metricsService: ConnectionPoolMetricsService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: 5432,
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          extra: { min: 10, max: 50 },
        }),
      ],
      providers: [ConnectionPoolMetricsService],
    }).compile();

    dataSource = moduleRef.get(DataSource);
    metricsService = moduleRef.get(ConnectionPoolMetricsService);
  });

  it('should handle 100 concurrent queries without exhausting pool', async () => {
    const concurrentQueries = 100;

    const queries = Array.from({ length: concurrentQueries }, () =>
      dataSource.query('SELECT pg_sleep(0.01), NOW()'),
    );

    const results = await Promise.allSettled(queries);
    const metrics = await metricsService.collectMetrics();

    const failed = results.filter((r) => r.status === 'rejected');
    console.log(`Pool metrics:`, metrics);
    console.log(`Failed queries: ${failed.length}/${concurrentQueries}`);

    // Less than 5% failure rate acceptable
    expect(failed.length / concurrentQueries).toBeLessThan(0.05);
    expect(metrics.poolUtilizationPercent).toBeLessThan(100);
  }, 30_000);

  it('should recover gracefully after pool saturation', async () => {
    // Saturate pool
    const saturationQueries = Array.from({ length: 200 }, () =>
      dataSource.query('SELECT pg_sleep(0.1)').catch(() => null),
    );
    await Promise.allSettled(saturationQueries);

    // Wait for recovery
    await new Promise((r) => setTimeout(r, 3000));

    // Should be able to execute normally now
    const result = await dataSource.query('SELECT 1 as alive');
    expect(result[0].alive).toBe(1);
  }, 60_000);

  afterAll(async () => {
    await dataSource?.destroy();
  });
});