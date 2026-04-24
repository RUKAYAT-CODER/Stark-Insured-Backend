import { plainToInstance } from 'class-transformer';

import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
  Max,
  validateSync,
  Matches,
} from 'class-validator';


enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(0)
  @Max(65535)
  @IsOptional()
  PORT: number = 4000;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'Stellar Insured Backend';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '1.0.0';

  // Database Configuration
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  DATABASE_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DATABASE_USERNAME: string;

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD: string;

  @IsString()
  @IsOptional()
  DATABASE_NAME: string;

  @IsString()
  @IsOptional()
  DATABASE_LOGGING: string = 'error,warn';

  @IsNumber()
  @IsOptional()
  DATABASE_MAX_QUERY_EXECUTION_TIME: number = 1000;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_ENABLED: boolean = false;

  @IsBoolean()
  @IsOptional()
  DATABASE_SSL_REJECT_UNAUTHORIZED: boolean = false;

  // Redis Configuration
  @IsUrl({ protocols: ['redis', 'rediss'] })
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  // Stellar Configuration
  @IsString()
  @IsOptional()
  STELLAR_NETWORK: string = 'testnet';

  @IsUrl()
  @IsOptional()
  STELLAR_HORIZON_URL: string = 'https://horizon-testnet.stellar.org';

  @IsUrl()
  @IsOptional()
  STELLAR_RPC_URL: string = 'https://soroban-testnet.stellar.org';

  @IsOptional()
  @IsNumber()
  REFRESH_TOKEN_TTL_DAYS: number = 7;

  @IsString()
  @IsOptional()
  STELLAR_PASSPHRASE: string = 'Test SDF Network ; September 2015';

  // Security Configuration
  @IsString()
  @Matches(/^.{32,}$/, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  @Matches(/^.{32,}$/, { message: 'JWT_REFRESH_SECRET must be at least 32 characters long' })
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '15m';

  @IsNumber()
  @IsOptional()
  JWT_EXPIRATION: number = 900;

  @IsNumber()
  @IsOptional()
  BCRYPT_SALT_ROUNDS: number = 12;

  // Encryption
  @IsString()
  @IsOptional()
  @Matches(/^v\d+:[a-zA-Z0-9+/=]+$/, { message: 'ENCRYPTION_KEYS must follow the format v1:base64_key' })
  ENCRYPTION_KEYS: string;

  // Indexer (from stellar.config.ts needs)
  @IsNumber()
  @IsOptional()
  INDEXER_POLL_INTERVAL_MS: number = 5000;

  @IsNumber()
  @IsOptional()
  INDEXER_REORG_DEPTH_THRESHOLD: number = 5;

  // Notification Configuration
  @IsString()
  @IsOptional()
  SENDGRID_API_KEY: string;

  @IsString()
  @IsOptional()
  SENDGRID_FROM_EMAIL: string = 'noreply@novafund.xyz';

  @IsString()
  @IsOptional()
  VAPID_PUBLIC_KEY: string;

  @IsString()
  @IsOptional()
  VAPID_PRIVATE_KEY: string;

  @IsString()
  @IsOptional()
  VAPID_SUBJECT_EMAIL: string = 'admin@novafund.xyz';

  // Rate Limiting - Global Throttler Configuration
  @IsNumber()
  @IsOptional()
  THROTTLE_DEFAULT_TTL: number = 900000;

  @IsNumber()
  @IsOptional()
  THROTTLE_DEFAULT_LIMIT: number = 100;

  // Authentication endpoints
  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_TTL: number = 900000;

  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_LIMIT: number = 5;

  @IsBoolean()
  @IsOptional()
  RATE_LIMIT_REDIS_ENABLED: boolean = false;

  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'info';
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        return Object.values(error.constraints || {}).join(', ');
      })
      .join('; ');
    throw new Error(`Environment validation failed: ${errorMessages}`);
  }

  return validatedConfig;
}
