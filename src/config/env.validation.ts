import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsString, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  PORT: number;

  @IsString()
  API_PREFIX: string;

  @IsString()
  DATABASE_HOST: string;

  @IsNumber()
  DATABASE_PORT: number;

  @IsString()
  DATABASE_USER: string;

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
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
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsString()
  JWT_SECRET: string;

  @IsNumber()
  JWT_EXPIRATION: number;

  @IsString()
  STELLAR_NETWORK: string;

  @IsString()
  STELLAR_RPC_URL: string;

  @IsString()
  STELLAR_NETWORK_PASSPHRASE: string;

  @IsString()
  PROJECT_LAUNCH_CONTRACT_ID: string;

  @IsString()
  ESCROW_CONTRACT_ID: string;

  @IsNumber()
  INDEXER_POLL_INTERVAL_MS: number;

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
    throw new Error(errors.toString());
  }

  return validatedConfig;
}
