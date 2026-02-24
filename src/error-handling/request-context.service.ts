// src/common/context/request-context.service.ts
import { Injectable } from '@nestjs/common';
import { createNamespace, getNamespace, Namespace } from 'cls-hooked';
import { v4 as uuidv4 } from 'uuid';

export interface RequestContext {
  requestId: string;
  correlationId: string;
  userId?: string;
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  startTime: number;
}

const NAMESPACE = 'stellar-insured-context';

@Injectable()
export class RequestContextService {
  private static namespace: Namespace;

  static getNamespace(): Namespace {
    if (!RequestContextService.namespace) {
      RequestContextService.namespace =
        getNamespace(NAMESPACE) ?? createNamespace(NAMESPACE);
    }
    return RequestContextService.namespace;
  }

  static create(partial?: Partial<RequestContext>): RequestContext {
    return {
      requestId: uuidv4(),
      correlationId: partial?.correlationId ?? uuidv4(),
      startTime: Date.now(),
      ...partial,
    };
  }

  static set(context: RequestContext): void {
    const ns = RequestContextService.getNamespace();
    ns.set('context', context);
  }

  static get(): RequestContext | undefined {
    try {
      return RequestContextService.getNamespace().get('context');
    } catch {
      return undefined;
    }
  }

  static setUserId(userId: string): void {
    const ctx = RequestContextService.get();
    if (ctx) {
      ctx.userId = userId;
      RequestContextService.set(ctx);
    }
  }

  /** Run a callback inside a new CLS context (for async/queue jobs) */
  static run<T>(context: RequestContext, fn: () => T): T {
    return RequestContextService.getNamespace().runAndReturn(() => {
      RequestContextService.set(context);
      return fn();
    });
  }

  /** Serialize context for cross-boundary propagation (queue jobs, events) */
  static serialize(): Record<string, string> | undefined {
    const ctx = RequestContextService.get();
    if (!ctx) return undefined;
    return {
      'x-request-id': ctx.requestId,
      'x-correlation-id': ctx.correlationId,
      ...(ctx.userId ? { 'x-user-id': ctx.userId } : {}),
    };
  }

  /** Restore context from serialized headers */
  static deserialize(headers: Record<string, string>): RequestContext {
    return RequestContextService.create({
      requestId: headers['x-request-id'] ?? uuidv4(),
      correlationId: headers['x-correlation-id'] ?? uuidv4(),
      userId: headers['x-user-id'],
    });
  }
}
