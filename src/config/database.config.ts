// src/config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : false,

  // ✅ Optimized Pool Settings
  poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  extra: {
    // Pool size range: min 10, max 100
    min: parseInt(process.env.DB_POOL_MIN, 10) || 10,
    max: parseInt(process.env.DB_POOL_MAX, 10) || 100,

    // How long a client can sit idle before being released
    idleTimeoutMillis: 30000,

    // How long to wait for a connection before throwing (prevents starvation)
    connectionTimeoutMillis: 5000,

    // Statement timeout prevents long-running queries from holding connections
    statement_timeout: 10000,

    // Keepalive prevents TCP idle disconnects on cloud DBs
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  },

  maxQueryExecutionTime: 3000, // Log slow queries
  connectTimeoutMS: 5000,
}));