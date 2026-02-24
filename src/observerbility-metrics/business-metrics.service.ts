import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class BusinessMetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // Claims
  private readonly claimsSubmitted: Counter<string>;
  private readonly claimsApproved: Counter<string>;
  private readonly claimsRejected: Counter<string>;
  private readonly claimsProcessingTime: Histogram<string>;
  private readonly claimsApprovalRate: Gauge<string>;

  // Fraud
  private readonly fraudDetected: Counter<string>;
  private readonly fraudFalsePositiveRate: Gauge<string>;
  private readonly fraudInvestigationTime: Histogram<string>;

  // Payments
  private readonly paymentsProcessed: Counter<string>;
  private readonly paymentsFailed: Counter<string>;
  private readonly paymentsProcessingTime: Histogram<string>;
  private readonly paymentsSuccessRate: Gauge<string>;

  // Auth
  private readonly authLoginAttempts: Counter<string>;
  private readonly authLoginFailures: Counter<string>;
  private readonly authFailedLoginRate: Gauge<string>;

  // Internal accumulators for rate calculations
  private totalClaims = 0;
  private approvedClaims = 0;
  private totalPayments = 0;
  private successfulPayments = 0;
  private totalLogins = 0;
  private failedLogins = 0;
  private fraudAlerts = 0;
  private fraudFalsePositives = 0;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    // ─── Claims ───────────────────────────────────────────────────────────────
    this.claimsSubmitted = new Counter({
      name: 'claims_submitted_total',
      help: 'Total number of claims submitted',
      labelNames: ['policy_type', 'channel'],
      registers: [this.registry],
    });

    this.claimsApproved = new Counter({
      name: 'claims_approved_total',
      help: 'Total number of claims approved',
      labelNames: ['policy_type'],
      registers: [this.registry],
    });

    this.claimsRejected = new Counter({
      name: 'claims_rejected_total',
      help: 'Total number of claims rejected',
      labelNames: ['policy_type', 'reason'],
      registers: [this.registry],
    });

    this.claimsProcessingTime = new Histogram({
      name: 'claims_processing_time_seconds',
      help: 'Time taken to process a claim (seconds)',
      labelNames: ['policy_type', 'outcome'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.claimsApprovalRate = new Gauge({
      name: 'claims_approval_rate',
      help: 'Ratio of approved claims to total processed claims (KPI)',
      labelNames: ['policy_type'],
      registers: [this.registry],
    });

    // ─── Fraud ────────────────────────────────────────────────────────────────
    this.fraudDetected = new Counter({
      name: 'fraud_detected_total',
      help: 'Total number of fraud cases detected',
      labelNames: ['detection_method', 'severity'],
      registers: [this.registry],
    });

    this.fraudFalsePositiveRate = new Gauge({
      name: 'fraud_false_positive_rate',
      help: 'Rate of false positive fraud detections',
      registers: [this.registry],
    });

    this.fraudInvestigationTime = new Histogram({
      name: 'fraud_investigation_time_seconds',
      help: 'Time taken to investigate a fraud case (seconds)',
      labelNames: ['outcome'],
      buckets: [60, 300, 600, 1800, 3600, 7200, 86400],
      registers: [this.registry],
    });

    // ─── Payments ─────────────────────────────────────────────────────────────
    this.paymentsProcessed = new Counter({
      name: 'payments_processed_total',
      help: 'Total number of payments processed successfully',
      labelNames: ['payment_method', 'currency'],
      registers: [this.registry],
    });

    this.paymentsFailed = new Counter({
      name: 'payments_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['payment_method', 'error_code'],
      registers: [this.registry],
    });

    this.paymentsProcessingTime = new Histogram({
      name: 'payments_processing_time_seconds',
      help: 'Time taken to process a payment (seconds)',
      labelNames: ['payment_method'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [this.registry],
    });

    this.paymentsSuccessRate = new Gauge({
      name: 'payments_success_rate',
      help: 'Ratio of successful payments to total payment attempts',
      labelNames: ['payment_method'],
      registers: [this.registry],
    });

    // ─── Auth ─────────────────────────────────────────────────────────────────
    this.authLoginAttempts = new Counter({
      name: 'auth_login_attempts_total',
      help: 'Total login attempts',
      labelNames: ['method'],
      registers: [this.registry],
    });

    this.authLoginFailures = new Counter({
      name: 'auth_login_failures_total',
      help: 'Total failed login attempts',
      labelNames: ['method', 'reason'],
      registers: [this.registry],
    });

    this.authFailedLoginRate = new Gauge({
      name: 'auth_failed_login_rate',
      help: 'Ratio of failed logins to total login attempts',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Gauges are computed on-the-fly; seed them at 0
    this.claimsApprovalRate.labels('all').set(0);
    this.paymentsSuccessRate.labels('all').set(0);
    this.authFailedLoginRate.set(0);
    this.fraudFalsePositiveRate.set(0);
  }

  // ─── Registry ───────────────────────────────────────────────────────────────

  getRegistry(): Registry {
    return this.registry;
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  // ─── Claims ─────────────────────────────────────────────────────────────────

  recordClaimSubmitted(labels: { policy_type?: string; channel?: string } = {}) {
    this.claimsSubmitted.labels(labels.policy_type ?? 'unknown', labels.channel ?? 'api').inc();
    this.totalClaims++;
    this.updateClaimsApprovalRate(labels.policy_type);
  }

  recordClaimApproved(labels: { policy_type?: string } = {}) {
    this.claimsApproved.labels(labels.policy_type ?? 'unknown').inc();
    this.approvedClaims++;
    this.updateClaimsApprovalRate(labels.policy_type);
  }

  recordClaimRejected(labels: { policy_type?: string; reason?: string } = {}) {
    this.claimsRejected
      .labels(labels.policy_type ?? 'unknown', labels.reason ?? 'unspecified')
      .inc();
    this.updateClaimsApprovalRate(labels.policy_type);
  }

  recordClaimProcessingTime(
    durationSeconds: number,
    labels: { policy_type?: string; outcome?: string } = {},
  ) {
    this.claimsProcessingTime
      .labels(labels.policy_type ?? 'unknown', labels.outcome ?? 'unknown')
      .observe(durationSeconds);
  }

  /** Returns a stopper function – call it when processing finishes */
  startClaimTimer(labels: { policy_type?: string; outcome?: string } = {}): () => void {
    const end = this.claimsProcessingTime
      .labels(labels.policy_type ?? 'unknown', labels.outcome ?? 'pending')
      .startTimer();
    return end;
  }

  private updateClaimsApprovalRate(policyType?: string) {
    if (this.totalClaims > 0) {
      const rate = this.approvedClaims / this.totalClaims;
      this.claimsApprovalRate.labels(policyType ?? 'all').set(rate);
      this.claimsApprovalRate.labels('all').set(rate);
    }
  }

  // ─── Fraud ──────────────────────────────────────────────────────────────────

  recordFraudDetected(labels: { detection_method?: string; severity?: string } = {}) {
    this.fraudDetected
      .labels(labels.detection_method ?? 'automated', labels.severity ?? 'medium')
      .inc();
    this.fraudAlerts++;
    this.updateFraudFalsePositiveRate();
  }

  recordFraudFalsePositive() {
    this.fraudFalsePositives++;
    this.updateFraudFalsePositiveRate();
  }

  recordFraudInvestigationTime(durationSeconds: number, outcome: string = 'resolved') {
    this.fraudInvestigationTime.labels(outcome).observe(durationSeconds);
  }

  startFraudInvestigationTimer(outcome: string = 'pending'): () => void {
    return this.fraudInvestigationTime.labels(outcome).startTimer();
  }

  private updateFraudFalsePositiveRate() {
    if (this.fraudAlerts > 0) {
      this.fraudFalsePositiveRate.set(this.fraudFalsePositives / this.fraudAlerts);
    }
  }

  // ─── Payments ───────────────────────────────────────────────────────────────

  recordPaymentProcessed(labels: { payment_method?: string; currency?: string } = {}) {
    this.paymentsProcessed
      .labels(labels.payment_method ?? 'stellar', labels.currency ?? 'XLM')
      .inc();
    this.totalPayments++;
    this.successfulPayments++;
    this.updatePaymentsSuccessRate(labels.payment_method);
  }

  recordPaymentFailed(labels: { payment_method?: string; error_code?: string } = {}) {
    this.paymentsFailed
      .labels(labels.payment_method ?? 'stellar', labels.error_code ?? 'UNKNOWN')
      .inc();
    this.totalPayments++;
    this.updatePaymentsSuccessRate(labels.payment_method);
  }

  recordPaymentProcessingTime(durationSeconds: number, payment_method?: string) {
    this.paymentsProcessingTime.labels(payment_method ?? 'stellar').observe(durationSeconds);
  }

  startPaymentTimer(payment_method?: string): () => void {
    return this.paymentsProcessingTime.labels(payment_method ?? 'stellar').startTimer();
  }

  private updatePaymentsSuccessRate(paymentMethod?: string) {
    if (this.totalPayments > 0) {
      const rate = this.successfulPayments / this.totalPayments;
      this.paymentsSuccessRate.labels(paymentMethod ?? 'all').set(rate);
      this.paymentsSuccessRate.labels('all').set(rate);
    }
  }

  // ─── Auth ───────────────────────────────────────────────────────────────────

  recordLoginAttempt(method: string = 'jwt') {
    this.authLoginAttempts.labels(method).inc();
    this.totalLogins++;
    this.updateFailedLoginRate();
  }

  recordLoginFailure(labels: { method?: string; reason?: string } = {}) {
    this.authLoginFailures
      .labels(labels.method ?? 'jwt', labels.reason ?? 'invalid_credentials')
      .inc();
    this.failedLogins++;
    this.updateFailedLoginRate();
  }

  private updateFailedLoginRate() {
    if (this.totalLogins > 0) {
      this.authFailedLoginRate.set(this.failedLogins / this.totalLogins);
    }
  }

  // ─── Snapshot ────────────────────────────────────────────────────────────────

  getSnapshot() {
    return {
      claims: {
        total: this.totalClaims,
        approved: this.approvedClaims,
        approvalRate: this.totalClaims > 0 ? this.approvedClaims / this.totalClaims : 0,
      },
      payments: {
        total: this.totalPayments,
        successful: this.successfulPayments,
        successRate: this.totalPayments > 0 ? this.successfulPayments / this.totalPayments : 0,
      },
      auth: {
        total: this.totalLogins,
        failed: this.failedLogins,
        failureRate: this.totalLogins > 0 ? this.failedLogins / this.totalLogins : 0,
      },
      fraud: {
        total: this.fraudAlerts,
        falsePositives: this.fraudFalsePositives,
        falsePositiveRate: this.fraudAlerts > 0 ? this.fraudFalsePositives / this.fraudAlerts : 0,
      },
    };
  }
}
