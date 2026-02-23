import { Injectable } from '@nestjs/common';
import { SecurityPolicy } from '../interfaces/security.interface';

@Injectable()
export class SecurityPolicyService {
  private policy: SecurityPolicy = {
    rateLimit: {
      points: 100, // 100 requests
      duration: 60, // per 60 seconds
      blockDuration: 300, // block for 5 minutes if exceeded
    },
    geoBlocking: {
      enabled: true,
      blockedCountries: ['XX', 'YY'], // Example blocked countries
    },
    ipReputation: {
      enabled: true,
      blockThreshold: 80, // Block IPs with reputation score >= 80
    },
    waf: {
      enabled: true,
      rules: {
        sqli: true,
        xss: true,
      },
    },
  };

  getPolicy(): SecurityPolicy {
    return this.policy;
  }

  updatePolicy(newPolicy: Partial<SecurityPolicy>) {
    this.policy = { ...this.policy, ...newPolicy };
  }
}