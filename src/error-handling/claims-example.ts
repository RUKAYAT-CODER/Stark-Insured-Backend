// src/claims/claims.processor.ts  — EXAMPLE USAGE
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import {
  ContextAwareProcessor,
  ContextualJobData,
} from '../common/queue/context-aware-queue';
import { ClaimProcessingException } from '../common/exceptions/app.exception';

interface ClaimJobPayload {
  claimId: string;
  userId: string;
  amount: number;
}

@Processor('claims')
export class ClaimsProcessor extends ContextAwareProcessor {
  constructor() {
    super(ClaimsProcessor.name);
  }

  @Process('process-claim')
  async handleProcessClaim(job: Job<ContextualJobData<ClaimJobPayload>>) {
    await this.runWithContext(job, async (payload) => {
      // Context (correlationId, userId, requestId) is now available
      // in all logs inside this block automatically.
      this.logger.log('Starting claim processing', {
        claimId: payload.claimId,
        amount: payload.amount,
      });

      try {
        // ... business logic ...
      } catch (error) {
        throw new ClaimProcessingException(
          'Failed to process claim due to underwriting rule violation',
          { claimId: payload.claimId, userId: payload.userId, operation: 'process-claim' },
          error instanceof Error ? error : undefined,
        );
      }
    });
  }
}


// src/claims/claims.service.ts  — EXAMPLE USAGE
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { addJobWithContext } from '../common/queue/context-aware-queue';
import { AppLoggerService } from '../common/logging/app-logger.service';
import {
  ClaimNotFoundException,
  UnauthorizedOperationException,
} from '../common/exceptions/app.exception';
import { RequestContextService } from '../common/context/request-context.service';

@Injectable()
export class ClaimsService {
  constructor(
    @InjectQueue('claims') private readonly claimsQueue: Queue,
    private readonly logger: AppLoggerService,
  ) {
    this.logger.setContext(ClaimsService.name);
  }

  async submitClaim(claimId: string, userId: string, amount: number) {
    const claim = await this.findClaim(claimId); // throws ClaimNotFoundException if missing

    const ctx = RequestContextService.get();
    if (claim.ownerId !== userId) {
      throw new UnauthorizedOperationException('submit-claim', {
        claimId,
        userId,
        correlationId: ctx?.correlationId,
      });
    }

    // Context is automatically propagated to the queue job ✅
    await addJobWithContext(this.claimsQueue, 'process-claim', {
      claimId,
      userId,
      amount,
    }, { delay: 5000, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    this.logger.log('Claim queued for processing', { claimId, userId });
  }

  private async findClaim(claimId: string) {
    // Simulate DB lookup
    const claim = null as any; // replace with actual repo call
    if (!claim) throw new ClaimNotFoundException(claimId);
    return claim;
  }
}
