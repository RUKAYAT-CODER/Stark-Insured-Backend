import { Test, TestingModule } from '@nestjs/testing';
import { BusinessMetricsService } from './business-metrics.service';

describe('BusinessMetricsService', () => {
  let service: BusinessMetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BusinessMetricsService],
    }).compile();

    service = module.get<BusinessMetricsService>(BusinessMetricsService);
    service.onModuleInit();
  });

  // ─── Registry ─────────────────────────────────────────────────────────────

  describe('getRegistry', () => {
    it('should return a prom-client Registry', () => {
      const registry = service.getRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('getMetrics', () => {
    it('should return a non-empty string of metrics', async () => {
      const metrics = await service.getMetrics();
      expect(typeof metrics).toBe('string');
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await service.getMetrics();
      expect(metrics).toMatch(/process_cpu_seconds_total/);
    });
  });

  // ─── Snapshot ─────────────────────────────────────────────────────────────

  describe('getSnapshot', () => {
    it('should return zeroed snapshot on init', () => {
      const snap = service.getSnapshot();
      expect(snap.claims.total).toBe(0);
      expect(snap.payments.total).toBe(0);
      expect(snap.auth.total).toBe(0);
      expect(snap.fraud.total).toBe(0);
    });
  });

  // ─── Claims ───────────────────────────────────────────────────────────────

  describe('Claims metrics', () => {
    it('recordClaimSubmitted increments total claims', () => {
      service.recordClaimSubmitted({ policy_type: 'life', channel: 'web' });
      service.recordClaimSubmitted({ policy_type: 'auto' });
      expect(service.getSnapshot().claims.total).toBe(2);
    });

    it('recordClaimApproved increments approved claims', () => {
      service.recordClaimSubmitted({ policy_type: 'life' });
      service.recordClaimApproved({ policy_type: 'life' });
      const snap = service.getSnapshot();
      expect(snap.claims.approved).toBe(1);
    });

    it('recordClaimRejected does not affect approved count', () => {
      service.recordClaimSubmitted();
      service.recordClaimRejected({ reason: 'duplicate' });
      expect(service.getSnapshot().claims.approved).toBe(0);
    });

    it('approval rate is calculated correctly', () => {
      service.recordClaimSubmitted();
      service.recordClaimSubmitted();
      service.recordClaimApproved();
      const snap = service.getSnapshot();
      expect(snap.claims.approvalRate).toBeCloseTo(0.5);
    });

    it('approval rate is 0 when no claims submitted', () => {
      expect(service.getSnapshot().claims.approvalRate).toBe(0);
    });

    it('recordClaimProcessingTime does not throw', () => {
      expect(() =>
        service.recordClaimProcessingTime(2.5, { policy_type: 'auto', outcome: 'approved' }),
      ).not.toThrow();
    });

    it('startClaimTimer returns a function', () => {
      const stop = service.startClaimTimer({ policy_type: 'life' });
      expect(typeof stop).toBe('function');
      expect(() => stop()).not.toThrow();
    });
  });

  // ─── Fraud ────────────────────────────────────────────────────────────────

  describe('Fraud metrics', () => {
    it('recordFraudDetected increments fraud total', () => {
      service.recordFraudDetected({ detection_method: 'ml', severity: 'high' });
      expect(service.getSnapshot().fraud.total).toBe(1);
    });

    it('recordFraudFalsePositive increments false positives', () => {
      service.recordFraudDetected();
      service.recordFraudFalsePositive();
      const snap = service.getSnapshot();
      expect(snap.fraud.falsePositives).toBe(1);
      expect(snap.fraud.falsePositiveRate).toBeCloseTo(1.0);
    });

    it('false positive rate is 0 when no fraud detected', () => {
      expect(service.getSnapshot().fraud.falsePositiveRate).toBe(0);
    });

    it('recordFraudInvestigationTime does not throw', () => {
      expect(() => service.recordFraudInvestigationTime(300, 'confirmed')).not.toThrow();
    });

    it('startFraudInvestigationTimer returns a stopper function', () => {
      const stop = service.startFraudInvestigationTimer('pending');
      expect(typeof stop).toBe('function');
      expect(() => stop()).not.toThrow();
    });
  });

  // ─── Payments ─────────────────────────────────────────────────────────────

  describe('Payments metrics', () => {
    it('recordPaymentProcessed increments successful count', () => {
      service.recordPaymentProcessed({ payment_method: 'stellar', currency: 'XLM' });
      const snap = service.getSnapshot();
      expect(snap.payments.total).toBe(1);
      expect(snap.payments.successful).toBe(1);
    });

    it('recordPaymentFailed increments total but not successful', () => {
      service.recordPaymentFailed({ payment_method: 'stellar', error_code: 'TIMEOUT' });
      const snap = service.getSnapshot();
      expect(snap.payments.total).toBe(1);
      expect(snap.payments.successful).toBe(0);
    });

    it('success rate is calculated correctly', () => {
      service.recordPaymentProcessed();
      service.recordPaymentProcessed();
      service.recordPaymentFailed();
      const snap = service.getSnapshot();
      expect(snap.payments.successRate).toBeCloseTo(2 / 3);
    });

    it('success rate is 0 with no payments', () => {
      expect(service.getSnapshot().payments.successRate).toBe(0);
    });

    it('recordPaymentProcessingTime does not throw', () => {
      expect(() => service.recordPaymentProcessingTime(0.35, 'stellar')).not.toThrow();
    });

    it('startPaymentTimer returns a stopper', () => {
      const stop = service.startPaymentTimer('card');
      expect(typeof stop).toBe('function');
      expect(() => stop()).not.toThrow();
    });
  });

  // ─── Auth ─────────────────────────────────────────────────────────────────

  describe('Auth metrics', () => {
    it('recordLoginAttempt increments total logins', () => {
      service.recordLoginAttempt('jwt');
      service.recordLoginAttempt('stellar');
      expect(service.getSnapshot().auth.total).toBe(2);
    });

    it('recordLoginFailure increments failed logins', () => {
      service.recordLoginAttempt('jwt');
      service.recordLoginFailure({ method: 'jwt', reason: 'bad_password' });
      const snap = service.getSnapshot();
      expect(snap.auth.failed).toBe(1);
    });

    it('failure rate is calculated correctly', () => {
      service.recordLoginAttempt();
      service.recordLoginAttempt();
      service.recordLoginFailure();
      const snap = service.getSnapshot();
      expect(snap.auth.failureRate).toBeCloseTo(0.5);
    });

    it('failure rate is 0 when no logins', () => {
      expect(service.getSnapshot().auth.failureRate).toBe(0);
    });
  });

  // ─── Prometheus output format ─────────────────────────────────────────────

  describe('Prometheus metric names', () => {
    beforeEach(() => {
      service.recordClaimSubmitted({ policy_type: 'life' });
      service.recordClaimApproved({ policy_type: 'life' });
      service.recordFraudDetected({ detection_method: 'ml' });
      service.recordPaymentProcessed({ payment_method: 'stellar' });
      service.recordLoginAttempt('jwt');
      service.recordLoginFailure({ method: 'jwt' });
    });

    const expectedMetrics = [
      'claims_submitted_total',
      'claims_approved_total',
      'claims_rejected_total',
      'claims_processing_time_seconds',
      'claims_approval_rate',
      'fraud_detected_total',
      'fraud_false_positive_rate',
      'fraud_investigation_time_seconds',
      'payments_processed_total',
      'payments_failed_total',
      'payments_processing_time_seconds',
      'payments_success_rate',
      'auth_login_attempts_total',
      'auth_login_failures_total',
      'auth_failed_login_rate',
    ];

    it.each(expectedMetrics)('exposes %s', async (metricName) => {
      const output = await service.getMetrics();
      expect(output).toContain(metricName);
    });
  });
});
