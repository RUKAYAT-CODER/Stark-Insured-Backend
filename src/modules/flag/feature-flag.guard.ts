import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';

import { FeatureFlagService } from './feature-flag.service';
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private flagService: FeatureFlagService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const featureKey = this.reflectFeature(context);

    return this.flagService.isEnabled(featureKey, {
      userId: request.user?.id,
      roles: request.user?.roles,
    });
  }

  private reflectFeature(context: ExecutionContext): string {
    return Reflect.getMetadata(
      'feature',
      context.getHandler(),
    );
  }
}