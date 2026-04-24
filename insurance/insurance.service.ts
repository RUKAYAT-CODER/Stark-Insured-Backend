import { Injectable } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RiskType } from './enums/risk-type.enum';
import { EncryptionService } from '../src/encryption/encryption.service';
import { AuditService } from './services/audit.service';

@Injectable()
export class InsuranceService {
  constructor(
    private readonly pricing: PricingService,
    private readonly pools: PoolService,
    @InjectRepository(InsurancePolicy) private readonly repo: Repository<InsurancePolicy>,
    private readonly encryption: EncryptionService,
    private readonly auditService: AuditService,
  ) {}

  async purchasePolicy(userId: string, poolId: string, riskType: RiskType, coverageAmount: number) {
    const premium = this.pricing.calculatePremium(riskType, coverageAmount);
    await this.pools.lockCapital(poolId, coverageAmount);

    // Encrypt sensitive financial data before saving
    const policy = this.repo.create({
      userId,
      poolId,
      riskType,
      coverageAmount: parseFloat(this.encryption.encrypt(coverageAmount.toString())),
      premium: parseFloat(this.encryption.encrypt(premium.toString())),
    });
    const savedPolicy = await this.repo.save(policy);
    await this.auditService.logPurchase('InsurancePolicy', savedPolicy.id, savedPolicy);
    return savedPolicy;
  }
}
