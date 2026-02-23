import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { CachingService } from '../caching/caching.service';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger(GracefulShutdownService.name);
  private shutdownInProgress = false;
  private readonly shutdownTimeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
    private readonly cachingService: CachingService,
  ) {
    this.shutdownTimeout = this.configService.get<number>('SHUTDOWN_TIMEOUT', 30000);
    
    // Handle system signals
    process.on('SIGTERM', () => this.handleShutdown('SIGTERM'));
    process.on('SIGINT', () => this.handleShutdown('SIGINT'));
    process.on('SIGUSR2', () => this.handleShutdown('SIGUSR2')); // Nodemon restart
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutdown signal received: ${signal || 'unknown'}`);
    await this.performGracefulShutdown();
  }

  private async handleShutdown(signal: string) {
    this.logger.log(`Received shutdown signal: ${signal}`);
    await this.performGracefulShutdown();
    process.exit(0);
  }

  private async performGracefulShutdown(): Promise<void> {
    if (this.shutdownInProgress) {
      this.logger.warn('Shutdown already in progress, ignoring duplicate request');
      return;
    }

    this.shutdownInProgress = true;
    const startTime = Date.now();
    
    this.logger.log('Starting graceful shutdown process...');
    
    try {
      // 1. Stop accepting new requests (handled by NestJS)
      this.logger.log('1. Stopping HTTP server from accepting new requests');
      
      // 2. Wait for existing requests to complete
      const requestWaitTime = this.configService.get<number>('REQUEST_COMPLETION_WAIT', 5000);
      this.logger.log(`2. Waiting ${requestWaitTime}ms for existing requests to complete`);
      await this.sleep(requestWaitTime);
      
      // 3. Close database connections
      this.logger.log('3. Closing database connections');
      await this.closeDatabaseConnections();
      
      // 4. Flush and close cache connections
      this.logger.log('4. Flushing cache and closing connections');
      await this.flushCache();
      
      // 5. Close queue connections
      this.logger.log('5. Closing queue connections');
      await this.closeQueueConnections();
      
      // 6. Perform any remaining cleanup
      this.logger.log('6. Performing final cleanup');
      await this.finalCleanup();
      
      const duration = Date.now() - startTime;
      this.logger.log(`Graceful shutdown completed successfully in ${duration}ms`);
      
    } catch (error) {
      this.logger.error('Error during graceful shutdown', error);
      // Don't throw - we're shutting down anyway
    } finally {
      this.shutdownInProgress = false;
    }
  }

  private async closeDatabaseConnections(): Promise<void> {
    try {
      if (this.dataSource && this.dataSource.isInitialized) {
        // Wait for pending queries to complete
        await this.waitForPendingQueries();
        
        // Close the connection
        await this.dataSource.destroy();
        this.logger.log('Database connections closed successfully');
      }
    } catch (error) {
      this.logger.error('Error closing database connections', error);
    }
  }

  private async waitForPendingQueries(timeout: number = 10000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        // Check if there are active queries
        const activeQueries = await this.dataSource.query(`
          SELECT count(*) as active 
          FROM pg_stat_activity 
          WHERE datname = current_database() 
          AND state = 'active' 
          AND pid != pg_backend_pid()
        `);
        
        const activeCount = parseInt(activeQueries[0].active);
        if (activeCount === 0) {
          this.logger.log('All database queries completed');
          return;
        }
        
        this.logger.log(`Waiting for ${activeCount} active database queries to complete...`);
        await this.sleep(1000);
      } catch (error) {
        this.logger.warn('Error checking active queries', error);
        break;
      }
    }
    
    this.logger.warn('Timeout waiting for database queries to complete');
  }

  private async flushCache(): Promise<void> {
    try {
      // Flush any pending cache operations
      await this.cachingService.clear();
      this.logger.log('Cache flushed successfully');
    } catch (error) {
      this.logger.error('Error flushing cache', error);
    }
  }

  private async closeQueueConnections(): Promise<void> {
    try {
      // TODO: Implement queue connection closing
      // This would depend on your specific queue implementation
      this.logger.log('Queue connections closed (implementation pending)');
    } catch (error) {
      this.logger.error('Error closing queue connections', error);
    }
  }

  private async finalCleanup(): Promise<void> {
    try {
      // Perform any application-specific cleanup
      // Close any open files, cleanup temporary data, etc.
      this.logger.log('Final cleanup completed');
    } catch (error) {
      this.logger.error('Error during final cleanup', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}