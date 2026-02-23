import { Injectable, Logger } from '@nestjs/common';
import { SecurityPolicy, IpReputation } from '../interfaces/security.interface';

@Injectable()
export class ThreatIntelligenceService {
  private readonly logger = new Logger(ThreatIntelligenceService.name);
  
  // Mock database of bad IPs/Countries
  private mockIpDb = new Map<string, IpReputation>();

  constructor() {
    // Seed some mock data for testing
    this.mockIpDb.set('1.2.3.4', { score: 85, tags: ['botnet'], country: 'XX' });
  }

  async checkIp(ip: string, policy: SecurityPolicy): Promise<{ allowed: boolean; reason?: string }> {
    // 1. Geo Blocking
    const geo = await this.getIpGeo(ip);
    if (policy.geoBlocking.enabled && policy.geoBlocking.blockedCountries.includes(geo)) {
      this.logger.warn(`Blocked IP ${ip} from restricted country ${geo}`);
      return { allowed: false, reason: 'Geographic restriction' };
    }

    // 2. IP Reputation
    if (policy.ipReputation.enabled) {
      const reputation = await this.getIpReputation(ip);
      if (reputation.score >= policy.ipReputation.blockThreshold) {
        this.logger.warn(`Blocked IP ${ip} due to poor reputation (Score: ${reputation.score})`);
        return { allowed: false, reason: 'High threat score' };
      }
    }

    return { allowed: true };
  }

  private async getIpGeo(ip: string): Promise<string> {
    // Mock implementation - in production, use MaxMind or similar
    const data = this.mockIpDb.get(ip);
    return data?.country || 'US';
  }

  private async getIpReputation(ip: string): Promise<IpReputation> {
    // Mock implementation - in production, call AbuseIPDB or similar
    return this.mockIpDb.get(ip) || { score: 0, tags: [], country: 'US' };
  }
}