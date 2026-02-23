import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { MfaService } from '../services/mfa.service';
import { SessionService } from '../services/session.service';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

/**
 * Guard for MFA verification
 * Checks if user has completed MFA verification for the current session
 */
@Injectable()
export class MfaGuard implements CanActivate {
  private readonly logger = new Logger(MfaGuard.name);

  constructor(
    private mfaService: MfaService,
    private sessionService: SessionService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Skip MFA check for public endpoints
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const sessionToken = this.extractSessionToken(request);

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check if user has MFA enabled
    const isMfaRequired = await this.mfaService.isMfaRequired(user.sub);

    if (!isMfaRequired) {
      return true;
    }

    // If MFA is required, check session
    if (!sessionToken) {
      throw new UnauthorizedException(
        'Session token required for MFA-enabled account',
      );
    }

    const requiresMfa = await this.sessionService.requiresMfa(sessionToken);

    if (requiresMfa) {
      throw new UnauthorizedException('MFA verification required');
    }

    // Update session activity
    await this.sessionService.updateSessionActivity(sessionToken);

    return true;
  }

  private extractSessionToken(request: any): string | null {
    // Check headers
    const authHeader = request.headers['x-session-token'];
    if (authHeader) {
      return authHeader;
    }

    // Check cookies
    if (request.cookies?.sessionToken) {
      return request.cookies.sessionToken;
    }

    return null;
  }
}
