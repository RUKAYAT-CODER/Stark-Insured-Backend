import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class AccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) return false;
    // Example: only allow if JWT principal matches requested resource
    const targetId = request.params.id;
    return !targetId || targetId === user.id || user.role === 'admin';
  }
}
