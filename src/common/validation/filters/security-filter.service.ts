import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../../config/app-config.service';

export interface SecurityFilterOptions {
  userId?: string;
  userRole?: string;
  ipAddress?: string;
  userAgent?: string;
  operationType?: string;
  content?: string;
}

export interface FilterResult {
  allowed: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class SecurityFilterService {
  private readonly logger = new Logger(SecurityFilterService.name);

  constructor(private readonly configService: AppConfigService) {}

  // IP-based filtering
  async checkIpAddress(ipAddress: string, options: SecurityFilterOptions = {}): Promise<FilterResult> {
    const blacklistedIps = this.configService.get<string>('SECURITY_BLACKLISTED_IPS', '').split(',');
    const whitelistedIps = this.configService.get<string>('SECURITY_WHITELISTED_IPS', '').split(',');

    // Check if IP is blacklisted
    if (blacklistedIps.includes(ipAddress.trim())) {
      return {
        allowed: false,
        reason: 'IP address is blacklisted',
        riskLevel: 'high',
      };
    }

    // Check if IP is whitelisted (if whitelist is configured)
    if (whitelistedIps.length > 0 && !whitelistedIps.includes(ipAddress.trim())) {
      return {
        allowed: false,
        reason: 'IP address is not whitelisted',
        riskLevel: 'medium',
      };
    }

    // Check for suspicious IP patterns
    const suspiciousPatterns = [
      /^10\./, // Private network
      /^172\.16\./, // Private network
      /^192\.168\./, // Private network
      /^127\./, // Localhost
    ];

    const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(ipAddress));
    if (isSuspicious && options.userRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Suspicious IP address detected',
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // User-based filtering
  async checkUserAccess(userId: string, operationType: string, options: SecurityFilterOptions = {}): Promise<FilterResult> {
    const suspendedUsers = this.configService.get<string>('SECURITY_SUSPENDED_USERS', '').split(',');
    const restrictedOperations = this.configService.get<string>('SECURITY_RESTRICTED_OPERATIONS', '').split(',');

    // Check if user is suspended
    if (suspendedUsers.includes(userId)) {
      return {
        allowed: false,
        reason: 'User account is suspended',
        riskLevel: 'high',
      };
    }

    // Check if operation requires special permissions
    const requiresAdmin = restrictedOperations.some(op => operationType.includes(op));
    if (requiresAdmin && options.userRole !== 'admin') {
      return {
        allowed: false,
        reason: 'Operation requires admin privileges',
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // Content-based filtering
  async checkContent(content: string, options: SecurityFilterOptions = {}): Promise<FilterResult> {
    const blacklistedWords = this.configService.get<string>('SECURITY_BLACKLISTED_WORDS', '').split(',');
    const suspiciousPatterns = [
      /<script[^>]*>/gi, // Script tags
      /javascript:/gi, // JavaScript URLs
      /data:text\/html/gi, // HTML data URLs
    ];

    // Check for blacklisted words
    const contentLower = content.toLowerCase();
    const hasBlacklistedWord = blacklistedWords.some(word => 
      word && contentLower.includes(word.toLowerCase().trim())
    );

    if (hasBlacklistedWord) {
      return {
        allowed: false,
        reason: 'Content contains blacklisted words',
        riskLevel: 'high',
      };
    }

    // Check for suspicious patterns
    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(content));
    if (hasSuspiciousPattern) {
      return {
        allowed: false,
        reason: 'Content contains suspicious patterns',
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // Rate limiting check
  async checkRateLimit(identifier: string, windowMinutes: number = 15, maxRequests: number = 100): Promise<FilterResult> {
    // This would typically integrate with Redis or similar caching
    // For now, we'll implement a basic check
    const recentRequests = this.configService.get<string>(`RATE_LIMIT_${identifier}`, '').split(',').filter(Boolean).map(Number);
    
    if (recentRequests.length >= maxRequests) {
      return {
        allowed: false,
        reason: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMinutes} minutes`,
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // Geographic filtering
  async checkGeographicAccess(ipAddress: string, allowedCountries: string[] = ['US', 'CA', 'GB']): Promise<FilterResult> {
    // This would typically integrate with a GeoIP service
    // For now, we'll implement a basic check
    const blockedCountries = this.configService.get<string>('SECURITY_BLOCKED_COUNTRIES', '').split(',');
    
    // Mock geographic check (would use real GeoIP service in production)
    const isFromAllowedCountry = true; // Placeholder - would check actual GeoIP
    
    if (!isFromAllowedCountry) {
      return {
        allowed: false,
        reason: 'Access from restricted geographic region',
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // Time-based filtering
  async checkTimeWindow(operationType: string, allowedHours: { start: string; end: string } = { start: '09:00', end: '17:00' }): Promise<FilterResult> {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    const [startHour, startMinute] = allowedHours.start.split(':').map(Number);
    const [endHour, endMinute] = allowedHours.end.split(':').map(Number);
    
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    
    let isWithinWindow = false;
    
    if (startTotalMinutes <= endTotalMinutes) {
      isWithinWindow = currentTotalMinutes >= startTotalMinutes && currentTotalMinutes <= endTotalMinutes;
    } else {
      // Handle overnight window (e.g., 22:00 to 06:00)
      isWithinWindow = currentTotalMinutes >= startTotalMinutes || currentTotalMinutes <= endTotalMinutes;
    }

    if (!isWithinWindow && operationType !== 'health_check') {
      return {
        allowed: false,
        reason: `Operation not allowed outside business hours (${allowedHours.start} - ${allowedHours.end})`,
        riskLevel: 'medium',
      };
    }

    return {
      allowed: true,
      riskLevel: 'low',
    };
  }

  // Comprehensive security check
  async performSecurityCheck(options: SecurityFilterOptions): Promise<{
    ipCheck: FilterResult;
    userCheck: FilterResult;
    contentCheck: FilterResult;
    timeCheck: FilterResult;
    overallRisk: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    const results = await Promise.all([
      this.checkIpAddress(options.ipAddress || '', options),
      this.checkUserAccess(options.userId || '', options.operationType || '', options),
      this.checkContent(options.content || '', options),
      this.checkTimeWindow(options.operationType || ''),
    ]);

    const riskLevels = [
      results[0].riskLevel,
      results[1].riskLevel,
      results[2].riskLevel,
      results[3].riskLevel,
    ];

    const overallRisk = riskLevels.includes('critical') ? 'critical' :
                      riskLevels.includes('high') ? 'high' :
                      riskLevels.includes('medium') ? 'medium' : 'low';

    const recommendations: string[] = [];
    
    if (!results[0].allowed) recommendations.push('Review IP access controls');
    if (!results[1].allowed) recommendations.push('Review user permissions and account status');
    if (!results[2].allowed) recommendations.push('Review content filtering policies');
    if (!results[3].allowed) recommendations.push('Review business hours and operational policies');

    return {
      ipCheck: results[0],
      userCheck: results[1],
      contentCheck: results[2],
      timeCheck: results[3],
      overallRisk,
      recommendations,
    };
  }
}
