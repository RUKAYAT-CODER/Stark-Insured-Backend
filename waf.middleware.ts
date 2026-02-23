import { Injectable, NestMiddleware, BadRequestException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SecurityPolicyService } from '../services/security-policy.service';

@Injectable()
export class WafMiddleware implements NestMiddleware {
  private readonly logger = new Logger(WafMiddleware.name);

  constructor(private policyService: SecurityPolicyService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const policy = this.policyService.getPolicy();
    if (!policy.waf.enabled) {
      return next();
    }

    const payload = JSON.stringify(req.body || '') + JSON.stringify(req.query || '') + JSON.stringify(req.params || '');

    if (policy.waf.rules.sqli && this.detectSqlInjection(payload)) {
      this.logger.warn(`SQL Injection attempt detected from ${req.ip}`);
      throw new BadRequestException('Malicious request detected (SQLi)');
    }

    if (policy.waf.rules.xss && this.detectXss(payload)) {
      this.logger.warn(`XSS attempt detected from ${req.ip}`);
      throw new BadRequestException('Malicious request detected (XSS)');
    }

    next();
  }

  private detectSqlInjection(payload: string): boolean {
    const patterns = [
      /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
      /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
      /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))union/i,
      /exec(\s|\+)+(s|x)p\w+/i,
    ];
    return patterns.some(pattern => pattern.test(payload));
  }

  private detectXss(payload: string): boolean {
    const patterns = [
      /<script\b[^>]*>([\s\S]*?)<\/script>/igm,
      /javascript:/igm,
      /on\w+=/igm,
    ];
    return patterns.some(pattern => pattern.test(payload));
  }
}