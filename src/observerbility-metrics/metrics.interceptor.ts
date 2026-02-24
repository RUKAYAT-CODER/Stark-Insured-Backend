import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { BusinessMetricsService } from './business-metrics.service';
import { Histogram, Registry } from 'prom-client';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly httpDuration: Histogram<string>;

  constructor(private readonly metricsService: BusinessMetricsService) {
    const registry = this.metricsService.getRegistry();

    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [registry],
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method } = req;
    const route: string = req.route?.path ?? req.url;
    const end = this.httpDuration.labels(method, route, '200').startTimer();

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          end();
          // Re-observe with actual status code
          const status: number = res.statusCode ?? 200;
          this.httpDuration.labels(method, route, String(status)).observe(0);
        },
        error: () => {
          this.httpDuration.labels(method, route, '500').observe(0);
        },
      }),
    );
  }
}
