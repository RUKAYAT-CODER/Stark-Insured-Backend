import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrismaService } from '../src/prisma.service';

import { InsurancePolicy } from './entities/insurance-policy.entity';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Claim } from './entities/claim.entity';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';

import { InsuranceController } from './insurance.controller';

import { InsuranceService } from './insurance.service';
import { PoolService } from './pool.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { PricingService } from './pricing.service';
import { IdempotencyInterceptor } from '../src/interceptors/idempotency.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InsurancePolicy,
      InsurancePool,
      Claim,
      ReinsuranceContract,
    ]),
  ],
  controllers: [InsuranceController],
  providers: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
    PrismaService,
    IdempotencyInterceptor,
  ],
  exports: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
    PrismaService,
  ],
})
export class InsuranceModule {}
