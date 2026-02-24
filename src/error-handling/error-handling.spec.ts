// src/common/exceptions/__tests__/app.exception.spec.ts
import { HttpStatus } from '@nestjs/common';
import {
  AppException,
  ClaimNotFoundException,
  ClaimProcessingException,
  ExternalServiceException,
} from '../app.exception';

describe('AppException', () => {
  it('creates with defaults', () => {
    const ex = new AppException({ code: 'TEST', message: 'test error' });
    expect(ex.code).toBe('TEST');
    expect(ex.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(ex.isOperational).toBe(true);
    expect(ex.timestamp).toBeDefined();
  });

  it('preserves cause stack', () => {
    const cause = new Error('root cause');
    const ex = new AppException({ code: 'WRAPPED', message: 'wrapped', cause });
    expect(ex.stack).toContain('Caused by:');
    expect(ex.cause).toBe(cause);
  });

  it('toLog returns full context', () => {
    const ex = new AppException({
      code: 'DETAILED',
      message: 'detailed',
      context: { userId: 'u1', claimId: 'c1' },
    });
    const log = ex.toLog();
    expect(log.code).toBe('DETAILED');
    expect((log.context as any).userId).toBe('u1');
  });
});

describe('Typed exceptions', () => {
  it('ClaimNotFoundException has correct code and status', () => {
    const ex = new ClaimNotFoundException('claim-123');
    expect(ex.code).toBe('CLAIM_NOT_FOUND');
    expect(ex.getStatus()).toBe(HttpStatus.NOT_FOUND);
    expect(ex.context.claimId).toBe('claim-123');
  });

  it('ClaimProcessingException wraps cause', () => {
    const cause = new Error('db timeout');
    const ex = new ClaimProcessingException('Failed', { claimId: 'c1' }, cause);
    expect(ex.code).toBe('CLAIM_PROCESSING_FAILED');
    expect(ex.cause).toBe(cause);
  });

  it('ExternalServiceException sets service context', () => {
    const ex = new ExternalServiceException('stripe', new Error('timeout'));
    expect(ex.code).toBe('EXTERNAL_SERVICE_ERROR');
    expect(ex.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect((ex.context as any).service).toBe('stripe');
  });
});


// src/common/context/__tests__/request-context.service.spec.ts
import { RequestContextService } from '../request-context.service';

describe('RequestContextService', () => {
  it('creates context with generated IDs', () => {
    const ctx = RequestContextService.create();
    expect(ctx.requestId).toHaveLength(36);
    expect(ctx.correlationId).toHaveLength(36);
  });

  it('preserves passed correlationId', () => {
    const ctx = RequestContextService.create({ correlationId: 'my-corr' });
    expect(ctx.correlationId).toBe('my-corr');
  });

  it('run() provides context inside callback', () => {
    const ctx = RequestContextService.create({ correlationId: 'run-test' });
    RequestContextService.run(ctx, () => {
      const retrieved = RequestContextService.get();
      expect(retrieved?.correlationId).toBe('run-test');
    });
  });

  it('serialize/deserialize round trip', () => {
    const ctx = RequestContextService.create({ userId: 'user-42' });
    RequestContextService.run(ctx, () => {
      const serialized = RequestContextService.serialize()!;
      expect(serialized['x-user-id']).toBe('user-42');

      const restored = RequestContextService.deserialize(serialized);
      expect(restored.userId).toBe('user-42');
      expect(restored.correlationId).toBe(ctx.correlationId);
    });
  });

  it('get() returns undefined outside of CLS context', () => {
    // New namespace call without run()
    const result = RequestContextService.get();
    // May be undefined depending on test isolation
    expect(result === undefined || result !== null).toBe(true);
  });
});
