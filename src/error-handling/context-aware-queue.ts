// src/common/queue/context-aware-queue.ts
import { Queue, JobOptions } from 'bull';
import { RequestContextService } from '../context/request-context.service';

export interface ContextualJobData<T = unknown> {
  payload: T;
  _context?: Record<string, string>;
}

/**
 * Wraps Bull's queue.add() to automatically propagate the current
 * request context as job metadata.
 */
export function addJobWithContext<T>(
  queue: Queue,
  jobName: string,
  data: T,
  options?: JobOptions,
) {
  const contextHeaders = RequestContextService.serialize();

  const jobData: ContextualJobData<T> = {
    payload: data,
    _context: contextHeaders,
  };

  return queue.add(jobName, jobData, options);
}


// src/common/queue/context-aware.processor.ts
// (Place this in a separate file: context-aware.processor.ts)
import { Job } from 'bull';
import { AppLoggerService } from '../logging/app-logger.service';
import { RequestContextService } from '../context/request-context.service';

/**
 * Base class for Bull processors that restores request context from job data.
 * Extend this and use `this.logger` for structured, context-aware logging.
 */
export abstract class ContextAwareProcessor {
  protected readonly logger: AppLoggerService;

  constructor(moduleName: string) {
    this.logger = new AppLoggerService().setContext(moduleName);
  }

  /**
   * Wraps your job handler to restore CLS context before execution.
   * Call inside your @Process() method.
   */
  protected async runWithContext<T>(
    job: Job<ContextualJobData<T>>,
    handler: (payload: T) => Promise<void>,
  ): Promise<void> {
    const context = job.data._context
      ? RequestContextService.deserialize(job.data._context)
      : RequestContextService.create({ correlationId: `job-${job.id}` });

    await new Promise<void>((resolve, reject) => {
      RequestContextService.run(context, async () => {
        try {
          this.logger.log(`Processing job ${job.name}`, {
            jobId: job.id,
            attemptsMade: job.attemptsMade,
          });
          await handler(job.data.payload);
          resolve();
        } catch (error) {
          this.logger.error(`Job ${job.name} failed`, {
            jobId: job.id,
            error:
              error instanceof Error
                ? { message: error.message, stack: error.stack }
                : error,
          });
          reject(error);
        }
      });
    });
  }
}
