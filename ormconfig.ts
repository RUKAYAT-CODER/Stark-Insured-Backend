import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

// TypeORM DataSource configuration for CLI operations
export default new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USERNAME || 'user',
  password: process.env.DATABASE_PASSWORD || 'password',
  database: process.env.DATABASE_NAME || 'stellar_insured',
  ssl: process.env.DATABASE_SSL_ENABLED === 'true' ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true',
    ca: process.env.DATABASE_SSL_CA,
    cert: process.env.DATABASE_SSL_CERT,
    key: process.env.DATABASE_SSL_KEY,
  } : false,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/common/database/migrations/*{.ts,.js}'],
  subscribers: ['src/**/*.subscriber{.ts,.js}'],
  logging: process.env.DATABASE_LOGGING === 'true' || process.env.NODE_ENV === 'development',
});