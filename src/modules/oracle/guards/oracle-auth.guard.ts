import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from '../../../config/app-config.service';

@Injectable()
export class OracleAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: AppConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header is required');
    }

    // Expecting format: "Bearer <token>" or "Oracle <api-key>"
    const [scheme, token] = authHeader.split(' ');

    if (!scheme || !token) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    switch (scheme.toLowerCase()) {
      case 'bearer':
        return this.validateJwtToken(token);
      case 'oracle':
        return this.validateApiKey(token);
      default:
        throw new UnauthorizedException('Unsupported authorization scheme');
    }
  }

  private validateJwtToken(token: string): boolean {
    try {
      // In production, this would validate JWT token
      // For now, we'll implement a basic validation using environment variables
      const validTokens = this.configService.get('ORACLE_VALID_TOKENS', '').split(',').filter(t => t.trim());
      return validTokens.includes(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private validateApiKey(apiKey: string): boolean {
    try {
      // In production, this would validate against stored API keys
      const validApiKeys = this.configService.get('ORACLE_API_KEYS', '').split(',').filter(k => k.trim());
      return validApiKeys.includes(apiKey);
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
