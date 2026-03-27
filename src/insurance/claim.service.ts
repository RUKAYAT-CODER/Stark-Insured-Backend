import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { Claim } from './entities/claim.entity';
import { ClaimHistory } from './entities/claim-history.entity';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository, DataSource } from 'typeorm';
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

  async updateStatus(claimId: string, status: ClaimStatus, reason?: string, actorId?: string) {
    return this.dataSource.transaction(async (manager) => {
      const claim = await manager.findOne(Claim, { where: { id: claimId } });
      if (!claim) throw new Error('Claim not found');

      const oldStatus = claim.status;
      claim.status = status;
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
    if (!claim) {
      throw new NotFoundException('Claim not found');
    }

    const policy = await this.policyRepo.findOne({ where: { id: claim.policyId } });
    if (!policy) {
      throw new NotFoundException('Associated policy not found');
    }

    if (policy.status !== PolicyStatus.ACTIVE) {
      throw new BadRequestException('Claims can only be assessed against active policies');
    }

    if (policy.expiresAt && policy.expiresAt < new Date()) {
      throw new BadRequestException('Policy has expired');
    }

    if (Number(claim.claimAmount) > Number(policy.coverageAmount)) {
      throw new BadRequestException('Claim amount exceeds policy coverage amount');
    }

    return this.updateStatus(claimId, ClaimStatus.APPROVED, 'Automated assessment approved', 'system');
  }

  async payClaim(claimId: string): Promise<Claim> {
    return this.updateStatus(claimId, ClaimStatus.PAID, 'Payout processed', 'system');
  }
}
