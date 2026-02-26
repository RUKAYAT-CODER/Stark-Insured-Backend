// import { Injectable } from '@nestjs/common';
// // import { AppConfigService } from '../config/app-config.service';

// export interface RateLimitTier {
//   name: string;
//   limit: number;
//   ttl: number; // in milliseconds
//   description: string;
// }

// export interface RateLimitConfig {
//   public: RateLimitTier;
//   authenticated: RateLimitTier;
//   payment: RateLimitTier;
//   admin: RateLimitTier;
//   auth: RateLimitTier;
//   sensitive: RateLimitTier;
// }

// @Injectable()
// export class RateLimitConfigService {
//   constructor(private readonly configService: AppConfigService) {}

//   /**
//    * Get standardized rate limit tiers with environment-specific overrides
//    */
//   getRateLimitConfig(): RateLimitConfig {
//     const isProduction = this.configService.isProduction;
//     const isDevelopment = this.configService.isDevelopment;

//     // Base configuration
//     const baseConfig: RateLimitConfig = {
//       public: {
//         name: 'public',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_PUBLIC_LIMIT', 30, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_PUBLIC_TTL', 60000, isProduction), // 1 minute
//         description: 'Public endpoints - accessible without authentication'
//       },
//       authenticated: {
//         name: 'authenticated',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_AUTHENTICATED_LIMIT', 200, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_AUTHENTICATED_TTL', 60000, isProduction), // 1 minute
//         description: 'Authenticated endpoints - require valid JWT token'
//       },
//       payment: {
//         name: 'payment',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_PAYMENT_LIMIT', 20, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_PAYMENT_TTL', 60000, isProduction), // 1 minute
//         description: 'Payment and financial endpoints - high security'
//       },
//       admin: {
//         name: 'admin',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_ADMIN_LIMIT', 500, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_ADMIN_TTL', 60000, isProduction), // 1 minute
//         description: 'Admin operations - elevated access required'
//       },
//       auth: {
//         name: 'auth',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_AUTH_ENDPOINTS_LIMIT', 10, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_AUTH_ENDPOINTS_TTL', 60000, isProduction), // 1 minute
//         description: 'Authentication endpoints - login, register, refresh'
//       },
//       sensitive: {
//         name: 'sensitive',
//         limit: this.getEnvironmentOverride('RATE_LIMIT_SENSITIVE_LIMIT', 15, isProduction),
//         ttl: this.getEnvironmentOverride('RATE_LIMIT_SENSITIVE_TTL', 60000, isProduction), // 1 minute
//         description: 'Sensitive operations - claims creation, policy changes'
//       }
//     };

//     // Development environment overrides (more lenient for testing)
//     if (isDevelopment) {
//       return {
//         ...baseConfig,
//         public: { ...baseConfig.public, limit: baseConfig.public.limit * 2 },
//         authenticated: { ...baseConfig.authenticated, limit: baseConfig.authenticated.limit * 2 },
//         payment: { ...baseConfig.payment, limit: baseConfig.payment.limit * 2 },
//         admin: { ...baseConfig.admin, limit: baseConfig.admin.limit * 2 },
//         auth: { ...baseConfig.auth, limit: baseConfig.auth.limit * 2 },
//         sensitive: { ...baseConfig.sensitive, limit: baseConfig.sensitive.limit * 2 }
//       };
//     }

//     return baseConfig;
//   }

//   /**
//    * Get a specific rate limit tier by name
//    */
//   getTier(tierName: keyof RateLimitConfig): RateLimitTier {
//     const config = this.getRateLimitConfig();
//     return config[tierName];
//   }

//   /**
//    * Get rate limit configuration for NestJS ThrottlerModule
//    */
//   getThrottlerConfig() {
//     const config = this.getRateLimitConfig();
    
//     return [
//       {
//         name: 'public',
//         ttl: config.public.ttl,
//         limit: config.public.limit,
//       },
//       {
//         name: 'authenticated',
//         ttl: config.authenticated.ttl,
//         limit: config.authenticated.limit,
//       },
//       {
//         name: 'payment',
//         ttl: config.payment.ttl,
//         limit: config.payment.limit,
//       },
//       {
//         name: 'admin',
//         ttl: config.admin.ttl,
//         limit: config.admin.limit,
//       },
//       {
//         name: 'auth',
//         ttl: config.auth.ttl,
//         limit: config.auth.limit,
//       },
//       {
//         name: 'sensitive',
//         ttl: config.sensitive.ttl,
//         limit: config.sensitive.limit,
//       },
//     ];
//   }

//   /**
//    * Get environment-specific override with fallback
//    */
//   private getEnvironmentOverride(
//     envKey: string, 
//     defaultValue: number, 
//     isProduction: boolean
//   ): number {
//     const envValue = this.configService.get(envKey);
//     if (envValue !== undefined) {
//       return parseInt(envValue, 10);
//     }

//     // Production-specific defaults (more restrictive)
//     if (isProduction) {
//       const productionDefaults: Record<string, number> = {
//         'RATE_LIMIT_PUBLIC_LIMIT': 25,
//         'RATE_LIMIT_AUTHENTICATED_LIMIT': 150,
//         'RATE_LIMIT_PAYMENT_LIMIT': 15,
//         'RATE_LIMIT_ADMIN_LIMIT': 400,
//         'RATE_LIMIT_AUTH_ENDPOINTS_LIMIT': 8,
//         'RATE_LIMIT_SENSITIVE_LIMIT': 12,
//       };
//       return productionDefaults[envKey] || defaultValue;
//     }

//     return defaultValue;
//   }

//   /**
//    * Validate rate limit configuration
//    */
//   validateConfig(): { isValid: boolean; errors: string[] } {
//     const config = this.getRateLimitConfig();
//     const errors: string[] = [];

//     Object.entries(config).forEach(([key, tier]) => {
//       if (tier.limit <= 0) {
//         errors.push(`${key} tier limit must be positive`);
//       }
//       if (tier.ttl <= 0) {
//         errors.push(`${key} tier TTL must be positive`);
//       }
//       if (tier.limit > 10000) {
//         errors.push(`${key} tier limit seems too high (${tier.limit})`);
//       }
//       if (tier.ttl > 3600000) {
//         errors.push(`${key} tier TTL seems too high (${tier.ttl}ms)`);
//       }
//     });

//     return {
//       isValid: errors.length === 0,
//       errors
//     };
//   }

//   /**
//    * Get rate limit headers format string
//    */
//   getRateLimitHeaders(tier: RateLimitTier): string {
//     return `${tier.limit};w=${Math.ceil(tier.ttl / 1000)}`;
//   }
// }
