import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Claim } from './entities/claim.entity';
import { ClaimHistory } from './entities/claim-history.entity';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository, DataSource, Not } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { ClaimStatus } from './enums/claim-status.enum';
import { PolicyStatus } from './enums/policy-status.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ClaimService {
  private readonly logger = new Logger(ClaimService.name);

  constructor(
    @InjectRepository(Claim) private readonly repo: Repository<Claim>,
    @InjectRepository(ClaimHistory) private readonly historyRepo: Repository<ClaimHistory>,
    @InjectRepository(InsurancePolicy) private readonly policyRepo: Repository<InsurancePolicy>,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource() private dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async createHistory(claimId: string, status: ClaimStatus, reason?: string, actorId?: string) {
    const history = this.historyRepo.create({
      claimId,
      status,
      reason,
      actorId,
    });
    return this.historyRepo.save(history);
  }

  async updateStatus(claimId: string, status: ClaimStatus, reason?: string, actorId?: string, updates?: Partial<Claim>) {
    return this.dataSource.transaction(async (manager) => {
      const claim = await manager.findOne(Claim, { where: { id: claimId } });
      if (!claim) throw new NotFoundException('Claim not found');

      const oldStatus = claim.status;
      claim.status = status;
      
      if (updates) {
        Object.assign(claim, updates);
      }
      
      const updatedClaim = await manager.save(claim);

      const history = manager.create(ClaimHistory, {
        claimId,
        status,
        reason,
        actorId,
      });
      await manager.save(history);

      // Log to global audit trail for security tracking
      await this.audit.log('claim_status_changed', actorId || 'system', '0.0.0.0', {
        claimId,
        oldStatus,
        newStatus: status,
        reason,
      });

      this.eventEmitter.emit('claim.status_changed', {
        claimId,
        oldStatus,
        newStatus: status,
        reason,
        actorId,
      });

      return updatedClaim;
    });
  }

  async assessClaim(claimId: string): Promise<Claim> {
    const claim = await this.repo.findOne({ where: { id: claimId } });
    if (!claim) throw new NotFoundException('Claim not found');

    const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
    if (!policy) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, 'Policy not found', 'system');
      throw new NotFoundException(`Policy ${claim.policyId} not found`);
    }

    // 1. Verify policy is active
    if (policy.status !== PolicyStatus.ACTIVE) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, `Policy is not active: ${policy.status}`, 'system');
      throw new BadRequestException('Cannot approve claim for inactive policy');
    }

    // 2. Check coverage limits
    if (Number(claim.claimAmount) > Number(policy.coverageAmount)) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, 'Claim amount exceeds coverage', 'system');
      throw new BadRequestException('Claim amount exceeds policy coverage amount');
    }

    // 3. Fraud Detection Placeholder
    const isFraudulent = await this.runFraudDetection(claim);
    if (isFraudulent) {
      // In a real system, we might flag for review instead of auto-rejecting
      this.logger.warn(`Fraud detection triggered for claim ${claimId}`);
    }

    // 4. Oracle Verification Placeholder
    const oracleVerified = await this.verifyOracle(claimId);
    if (!oracleVerified) {
      await this.updateStatus(claimId, ClaimStatus.REJECTED, 'Oracle verification failed', 'system');
      throw new BadRequestException('Oracle verification failed');
    }

    // 5. Calculate Payout (Applying assessment logic)
    const payoutAmount = claim.claimAmount; // Could be adjusted for depreciation/deductibles

    return this.updateStatus(
      claimId, 
      ClaimStatus.APPROVED, 
      'Automated assessment approved', 
      'system',
      { payoutAmount }
    );
  }

  private async runFraudDetection(claim: Claim): Promise<boolean> {
    // Basic check: No other active claims for same policy with exact same amount (duplicate prevention)
    const duplicateCount = await this.repo.count({
      where: {
        policyId: claim.policyId,
        claimAmount: claim.claimAmount,
        status: Not(ClaimStatus.REJECTED),
        id: Not(claim.id)
      }
    });
    return duplicateCount > 0;
  }

  private async verifyOracle(claimId: string): Promise<boolean> {
    // Placeholder for external data verification
    this.logger.log(`Oracle verifying claim ${claimId}...`);
    return true;
  }

  async payClaim(claimId: string): Promise<Claim> {
    return this.updateStatus(claimId, ClaimStatus.PAID, 'Payout processed', 'system');
  }
}
