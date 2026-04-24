import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsuranceController } from './insurance.controller';
import { InsuranceService } from './insurance.service';
import { Policy } from './entities/policy.entity';
import { Claim } from './entities/claim.entity';
import { ReinsuranceContract } from './entities/reinsurance.entity';
import { Pool } from './entities/pool.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Policy, Claim, ReinsuranceContract, Pool])],
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
