import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from './metrics.controller';
import { BusinessMetricsService } from './business-metrics.service';

const mockMetricsService = {
  getMetrics: jest.fn().mockResolvedValue('# HELP claims_submitted_total\nclaims_submitted_total 0'),
  getSnapshot: jest.fn().mockReturnValue({
    claims: { total: 5, approved: 3, approvalRate: 0.6 },
    payments: { total: 10, successful: 9, successRate: 0.9 },
    auth: { total: 20, failed: 2, failureRate: 0.1 },
    fraud: { total: 1, falsePositives: 0, falsePositiveRate: 0 },
  }),
};

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [{ provide: BusinessMetricsService, useValue: mockMetricsService }],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /metrics', () => {
    it('should return prometheus metrics string', async () => {
      const result = await controller.getPrometheusMetrics();
      expect(typeof result).toBe('string');
      expect(result).toContain('claims_submitted_total');
      expect(mockMetricsService.getMetrics).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /metrics/snapshot', () => {
    it('should return KPI snapshot', () => {
      const snapshot = controller.getSnapshot();
      expect(snapshot).toHaveProperty('claims');
      expect(snapshot).toHaveProperty('payments');
      expect(snapshot).toHaveProperty('auth');
      expect(snapshot).toHaveProperty('fraud');
      expect(snapshot.claims.approvalRate).toBe(0.6);
      expect(snapshot.payments.successRate).toBe(0.9);
      expect(mockMetricsService.getSnapshot).toHaveBeenCalledTimes(1);
    });
  });
});
