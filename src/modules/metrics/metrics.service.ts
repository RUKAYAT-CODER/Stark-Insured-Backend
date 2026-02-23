import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Gauge, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly requestCounter: Counter<string>;
  private readonly responseTimeHistogram: Histogram<string>;
  private readonly activeUsersGauge: Gauge<string>;

  constructor() {
    collectDefaultMetrics();

    this.requestCounter = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.responseTimeHistogram = new Histogram({
      name: 'http_response_time_seconds',
      help: 'Response time in seconds',
      labelNames: ['method', 'route'],
    });

    this.activeUsersGauge = new Gauge({
      name: 'active_users',
      help: 'Current number of active users',
    });
  }

  incrementRequest(method: string, route: string, status: number) {
    this.requestCounter.inc({ method, route, status });
  }

  observeResponseTime(method: string, route: string, duration: number) {
    this.responseTimeHistogram.observe({ method, route }, duration);
  }

  setActiveUsers(count: number) {
    this.activeUsersGauge.set(count);
  }
}
