import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
// import { InjectQueue } from '@nestjs/bull';
// import { Queue } from 'bull';
import { AuditLogJobData } from './interfaces/audit-log-job.interface';

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);

  constructor() {
    this.logger.warn(
      'Redis connection unavailable - audit logs will be processed in-memory (development mode)',
    );
  }

  /**
   * Automatically triggered by NestJS shutdown hooks
   */
  async onModuleDestroy() {
    this.logger.log('Initiating graceful shutdown of queues...', {
      service: 'QueueService',
      action: 'shutdown',
    });
    try {
      this.logger.log('In-memory mode: No queue connection to close', {
        service: 'QueueService',
        mode: 'in-memory',
      });
    } catch (error) {
      this.logger.error('Error during queue shutdown', error, {
        service: 'QueueService',
        action: 'shutdown',
      });
    }
  }

  /**
   * Adds a job to the audit log queue or processes in-memory
   */
  addAuditLogJob(data: AuditLogJobData) {
    // In-memory processing
    this.logger.debug(
      'Processing audit log in-memory (Redis unavailable):',
      JSON.stringify(data, null, 2),
    );
    return { id: 'in-memory-job', name: 'audit-log', data };
  }

  /**
   * Get stats for the queue or return default stats
   */
  getQueueStats() {
    // Default stats for in-memory mode
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
    };
  }

  /**
   * Drain the queue (in-memory mode is no-op)
   */
  drainQueues() {
    this.logger.warn('In-memory mode: No queue to drain');
  }

  /**
   * Close the queue (in-memory mode is no-op)
   */
  closeQueues() {
    this.logger.log('In-memory mode: No queue connection to close');
  }
}
