import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['insurance/entities/*.entity.ts'],
  migrations: ['insurance/migrations/*.ts'],
  synchronize: false, // Disable auto-sync in production - use migrations instead
  logging: ['error', 'warn', 'migration'],
});
