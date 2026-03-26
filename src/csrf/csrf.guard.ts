import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    const method = request.method;
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return true;
    }

    // Check if CSRF token exists in headers or body
    const tokenFromHeader = request.headers['x-csrf-token'] as string;
    const tokenFromBody = request.body?._csrf;
    const csrfToken = tokenFromHeader || tokenFromBody;

    if (!csrfToken) {
      throw new ForbiddenException('CSRF token missing');
    }

    // The actual validation is done by the csurf middleware
    // This guard is mainly for documentation and additional checks
    return true;
  }
}
