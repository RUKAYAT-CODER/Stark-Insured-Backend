import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { MigrationInterface } from 'typeorm';
import { QueryRunner } from 'typeorm';

export interface MigrationStatus {
  name: string;
  timestamp: number;
  executedAt: Date | null;
  status: 'pending' | 'executed' | 'failed';
}

export interface MigrationResult {
  success: boolean;
  message: string;
  executedMigrations: string[];
  failedMigrations: string[];
  duration: number;
}

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  private dataSource: DataSource;

  constructor(private configService: ConfigService) {}

  /**
   * Initialize the data source for migration operations
   */
  async initializeDataSource(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      return;
    }

    const dataSourceOptions: DataSourceOptions = {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get<string>('DATABASE_USERNAME', 'user'),
      password: this.configService.get<string>('DATABASE_PASSWORD', 'password'),
      database: this.configService.get<string>('DATABASE_NAME', 'stellar_insured'),
      ssl: this.configService.get<boolean>('DATABASE_SSL_ENABLED', false)
        ? {
            rejectUnauthorized: this.configService.get<boolean>('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
            ca: this.configService.get<string>('DATABASE_SSL_CA'),
            cert: this.configService.get<string>('DATABASE_SSL_CERT'),
            key: this.configService.get<string>('DATABASE_SSL_KEY'),
          }
        : false,
      entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../migrations/*{.ts,.js}'],
      logging: this.configService.get<boolean>('DATABASE_LOGGING', false),
    };

    this.dataSource = new DataSource(dataSourceOptions);
    await this.dataSource.initialize();
    this.logger.log('Migration data source initialized successfully');
  }

  /**
   * Run all pending migrations
   */
  async runMigrations(): Promise<MigrationResult> {
    const startTime = Date.now();
    const executedMigrations: string[] = [];
    const failedMigrations: string[] = [];

    try {
      await this.initializeDataSource();
      
      this.logger.log('Starting database migrations...');
      
      // Check if we can connect to the database
      await this.preFlightCheck();
      
      const migrations = await this.dataSource.runMigrations({
        transaction: 'all',
      });

      executedMigrations.push(...migrations.map(m => m.name));
      
      this.logger.log(`Successfully executed ${migrations.length} migrations`, {
        migrations: executedMigrations,
      });

      return {
        success: true,
        message: `Successfully executed ${migrations.length} migrations`,
        executedMigrations,
        failedMigrations: [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Migration failed', error);
      failedMigrations.push(error.message);
      
      return {
        success: false,
        message: `Migration failed: ${error.message}`,
        executedMigrations,
        failedMigrations,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Revert the last migration
   */
  async revertLastMigration(): Promise<MigrationResult> {
    const startTime = Date.now();
    
    try {
      await this.initializeDataSource();
      
      this.logger.log('Reverting last migration...');
      
      const migration = await this.dataSource.undoLastMigration({
        transaction: 'all',
      });

      this.logger.log('Successfully reverted migration', {
        migration: migration.name,
      });

      return {
        success: true,
        message: `Successfully reverted migration: ${migration.name}`,
        executedMigrations: [],
        failedMigrations: [],
        duration: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Migration revert failed', error);
      
      return {
        success: false,
        message: `Migration revert failed: ${error.message}`,
        executedMigrations: [],
        failedMigrations: [error.message],
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    try {
      await this.initializeDataSource();
      
      const queryRunner = this.dataSource.createQueryRunner();
      const executedMigrations = await queryRunner.query(
        'SELECT * FROM migrations ORDER BY timestamp ASC'
      );
      
      await queryRunner.release();
      
      // Get all available migrations
      const allMigrations = this.dataSource.migrations;
      
      return allMigrations.map(migration => {
        const executed = executedMigrations.find(
          (exec: any) => exec.name === migration.name
        );
        
        return {
          name: migration.name,
          timestamp: migration.timestamp,
          executedAt: executed ? new Date(executed.timestamp) : null,
          status: executed ? 'executed' : 'pending',
        };
      });
    } catch (error) {
      this.logger.error('Failed to get migration status', error);
      throw error;
    }
  }

  /**
   * Pre-flight check before running migrations
   */
  async preFlightCheck(): Promise<boolean> {
    try {
      this.logger.log('Running pre-flight migration checks...');
      
      // Check database connection
      await this.dataSource.query('SELECT 1');
      this.logger.log('✓ Database connection successful');
      
      // Check if migrations table exists
      const queryRunner = this.dataSource.createQueryRunner();
      const hasMigrationsTable = await queryRunner.hasTable('migrations');
      await queryRunner.release();
      
      if (!hasMigrationsTable) {
        this.logger.warn('Migrations table does not exist, will be created automatically');
      } else {
        this.logger.log('✓ Migrations table exists');
      }
      
      // Check for pending migrations
      const pendingMigrations = await this.dataSource.showMigrations();
      if (pendingMigrations) {
        this.logger.log('✓ Pending migrations detected');
      } else {
        this.logger.log('✓ No pending migrations');
      }
      
      this.logger.log('Pre-flight checks completed successfully');
      return true;
    } catch (error) {
      this.logger.error('Pre-flight check failed', error);
      throw new Error(`Pre-flight check failed: ${error.message}`);
    }
  }

  /**
   * Generate migration from current entity changes
   */
  async generateMigration(name: string): Promise<string> {
    try {
      await this.initializeDataSource();
      
      this.logger.log(`Generating migration: ${name}`);
      
      // This would typically be done via CLI, but we can simulate it
      const migrationPath = `src/common/database/migrations/${Date.now()}-${name}.ts`;
      
      // In a real implementation, this would use TypeORM's migration generation
      // For now, we'll return the path where it would be created
      this.logger.log(`Migration would be generated at: ${migrationPath}`);
      
      return migrationPath;
    } catch (error) {
      this.logger.error('Failed to generate migration', error);
      throw error;
    }
  }

  /**
   * Close the data source connection
   */
  async close(): Promise<void> {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Migration data source closed');
    }
  }
}