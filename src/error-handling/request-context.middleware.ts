// src/common/middleware/request-context.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContextService } from '../context/request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const context = RequestContextService.create({
      correlationId:
        (req.headers['x-correlation-id'] as string) ?? undefined,
      requestId: (req.headers['x-request-id'] as string) ?? undefined,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      path: req.path,
      method: req.method,
    });

    // Expose IDs back to the caller
    res.setHeader('x-request-id', context.requestId);
    res.setHeader('x-correlation-id', context.correlationId);

    RequestContextService.getNamespace().run(() => {
      RequestContextService.set(context);
      next();
    });
  }
}
