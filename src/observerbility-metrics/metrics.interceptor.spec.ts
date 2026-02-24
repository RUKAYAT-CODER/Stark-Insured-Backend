import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { MetricsInterceptor } from './metrics.interceptor';
import { BusinessMetricsService } from './business-metrics.service';
import { Registry } from 'prom-client';

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let registry: Registry;

  const mockRegistry = new Registry();
  const mockMetricsService = {
    getRegistry: jest.fn().mockReturnValue(mockRegistry),
  };

  function buildContext(method = 'GET', url = '/claims', statusCode = 200): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, url, route: { path: url } }),
        getResponse: () => ({ statusCode }),
      }),
    } as unknown as ExecutionContext;
  }

  function buildHandler(value: any = {}): CallHandler {
    return { handle: () => of(value) };
  }

  function buildErrorHandler(err = new Error('fail')): CallHandler {
    return { handle: () => throwError(() => err) };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        { provide: BusinessMetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    interceptor = module.get<MetricsInterceptor>(MetricsInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('should pass through the response unchanged on success', (done) => {
    const ctx = buildContext();
    const handler = buildHandler({ id: 1 });

    interceptor.intercept(ctx, handler).subscribe({
      next: (val) => {
        expect(val).toEqual({ id: 1 });
        done();
      },
    });
  });

  it('should propagate errors', (done) => {
    const ctx = buildContext('POST', '/payments');
    const handler = buildErrorHandler(new Error('payment failed'));

    interceptor.intercept(ctx, handler).subscribe({
      error: (err) => {
        expect(err.message).toBe('payment failed');
        done();
      },
    });
  });

  it('should not throw for requests without a route object', (done) => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', url: '/health' }),
        getResponse: () => ({ statusCode: 200 }),
      }),
    } as unknown as ExecutionContext;

    interceptor.intercept(ctx, buildHandler()).subscribe({ complete: done });
  });
});
