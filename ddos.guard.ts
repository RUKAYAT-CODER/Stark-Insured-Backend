import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { SecurityPolicyService } from '../services/security-policy.service';
import { ThreatIntelligenceService } from '../services/threat-intelligence.service';
import { SecurityStorageService } from '../services/security-storage.service';

@Injectable()
export class DdosGuard implements CanActivate {
  private readonly logger = new Logger(DdosGuard.name);

  constructor(
    private policyService: SecurityPolicyService,
    private threatService: ThreatIntelligenceService,
    private storage: SecurityStorageService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection.remoteAddress;
    const policy = this.policyService.getPolicy();

    // 1. Threat Intelligence Check
    const threatCheck = await this.threatService.checkIp(ip, policy);
    if (!threatCheck.allowed) {
      throw new HttpException(`Access Denied: ${threatCheck.reason}`, HttpStatus.FORBIDDEN);
    }

    // 2. Rate Limiting
    const key = `ratelimit:${ip}`;
    const blockedKey = `blocked:${ip}`;

    // Check if already blocked
    const isBlocked = await this.storage.get(blockedKey);
    if (isBlocked) {
      throw new HttpException('Too Many Requests - IP Temporarily Blocked', HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment counter
    const currentPoints = await this.storage.increment(key, policy.rateLimit.duration);

    if (currentPoints > policy.rateLimit.points) {
      // Block IP
      await this.storage.set(blockedKey, true, policy.rateLimit.blockDuration);
      this.logger.warn(`IP ${ip} rate limited and blocked for ${policy.rateLimit.blockDuration}s`);
      throw new HttpException('Too Many Requests', HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}