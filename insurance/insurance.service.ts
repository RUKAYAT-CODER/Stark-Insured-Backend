import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PoolService } from './pool.service';
import { InsurancePolicy } from './entities/insurance-policy.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RiskType } from './enums/risk-type.enum';
import { EncryptionService } from '../src/encryption/encryption.service';

@Injectable()
export class InsuranceService {
  private readonly logger = new Logger(InsuranceService.name);

  constructor(
    private readonly pricing: PricingService,
    private readonly pools: PoolService,
    @InjectRepository(InsurancePolicy) private readonly repo: Repository<InsurancePolicy>,
    private readonly encryption: EncryptionService,
  ) {}

  async purchasePolicy(userId: string, poolId: string, riskType: RiskType, coverageAmount: number) {
    if (!userId || !poolId) {
      throw new BadRequestException('userId and poolId are required');
    }
    if (coverageAmount <= 0) {
      throw new BadRequestException('Coverage amount must be positive');
    }

    const premium = this.pricing.calculatePremium(riskType, coverageAmount);

    try {
      await this.pools.lockCapital(poolId, coverageAmount);
    } catch (error) {
      this.logger.error(`Failed to lock capital for pool ${poolId}: ${error.message}`);
      throw error;
    }

    // Encrypt sensitive financial data before saving
    const policy = this.repo.create({
      userId,
      poolId,
      riskType,
      coverageAmount: parseFloat(this.encryption.encrypt(coverageAmount.toString())),
      premium: parseFloat(this.encryption.encrypt(premium.toString())),
    });

    try {
      return await this.repo.save(policy);
    } catch (error) {
      this.logger.error(`Failed to save policy for user ${userId}: ${error.message}`);
      throw error;
    }
  }
}
