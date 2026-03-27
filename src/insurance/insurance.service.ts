import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { InsurancePool } from './entities/insurance-pool.entity';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';
import { PolicyHistory } from './entities/policy-history.entity';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { RiskType } from './enums/risk-type.enum';
import { PolicyStatus } from './enums/policy-status.enum';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly pools: PoolService,
    @InjectRepository(InsurancePolicy) private readonly repo: Repository<InsurancePolicy>,
    @InjectRepository(InsurancePool) private readonly poolRepo: Repository<InsurancePool>,
    @InjectRepository(ReinsuranceContract) private readonly reinsuranceRepo: Repository<ReinsuranceContract>,
    @InjectRepository(PolicyHistory) private readonly historyRepo: Repository<PolicyHistory>,
    private readonly eventEmitter: EventEmitter2,
    @InjectDataSource() private dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async createHistory(policyId: string, status: PolicyStatus, reason?: string, actorId?: string) {
    const history = this.historyRepo.create({
      policyId,
      status,
      reason,
      actorId,
    });
    return this.historyRepo.save(history);
  }

  async updateStatus(policyId: string, status: PolicyStatus, reason?: string, actorId?: string, ip?: string) {
    return this.dataSource.transaction(async (manager) => {
      const policy = await manager.findOne(InsurancePolicy, { where: { id: policyId } });
      if (!policy) throw new Error('Policy not found');

      const oldStatus = policy.status;
      policy.status = status;
      const updatedPolicy = await manager.save(policy);

      const history = manager.create(PolicyHistory, {
        policyId,
        status,
        reason,
        actorId,
      });
      await manager.save(history);

      // Log to global audit trail
      await this.audit.logPolicyChange(actorId || 'system', ip || '0.0.0.0', policyId, {
        oldStatus,
        newStatus: status,
        reason,
      });

      this.eventEmitter.emit('policy.status_changed', {
        policyId,
        oldStatus,
        newStatus: status,
        reason,
        actorId,
      });

      return updatedPolicy;
    });
  }

  async purchasePolicy(userId: string, poolId: string, riskType: RiskType, coverageAmount: number) {
    if (coverageAmount <= 0) {
      throw new BadRequestException('Coverage amount must be greater than zero');
    }

    const pool = await this.poolRepo.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException('Insurance pool not found');
    }

    const availableCapital = Number(pool.capital) - Number(pool.lockedCapital);
    if (coverageAmount > availableCapital) {
      throw new BadRequestException('Coverage amount exceeds pool available capital');
    }

    const reinsuranceContract = await this.reinsuranceRepo.findOne({ where: { poolId } });
    if (reinsuranceContract && coverageAmount > Number(reinsuranceContract.coverageLimit)) {
      throw new BadRequestException('Coverage amount exceeds reinsurance contract limit');
    }

    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    const premium = this.pricing.calculatePremium(riskType, coverageAmount);
    await this.pools.lockCapital(poolId, coverageAmount);

    const policy = this.repo.create({
      userId,
      poolId,
      riskType,
      coverageAmount,
      premium,
      status: PolicyStatus.PENDING,
      expiresAt,
    });
    
    const savedPolicy = await this.repo.save(policy);
    
    // Create initial history
    await this.createHistory(savedPolicy.id, PolicyStatus.PENDING, 'Policy created via purchase', userId);
    
    // Log to global audit trail for security tracking
    await this.audit.logPolicyChange(userId, '0.0.0.0', savedPolicy.id, {
      action: 'purchase',
      poolId,
      coverageAmount,
    });

    this.eventEmitter.emit('policy.created', { policyId: savedPolicy.id, userId });

    return savedPolicy;
  }
}
