import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { InsurancePolicy } from './entities/insurance-policy.entity';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Claim } from './entities/claim.entity';
import { ReinsuranceContract } from './entities/reinsurance-contract.entity';
import { ClaimHistory } from './entities/claim-history.entity';
import { PolicyHistory } from './entities/policy-history.entity';

import { InsuranceController } from './insurance.controller';

import { InsuranceService } from './insurance.service';
import { PoolService } from './pool.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { PricingService } from './pricing.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<number>('JWT_EXPIRATION') },
      }),
    }),
    TypeOrmModule.forFeature([
      InsurancePolicy,
      InsurancePool,
      Claim,
      ReinsuranceContract,
      ClaimHistory,
      PolicyHistory,
    ]),
  ],
  controllers: [InsuranceController],
  providers: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [
    InsuranceService,
    PoolService,
    ClaimService,
    ReinsuranceService,
    PricingService,
  ],
})
export class InsuranceModule {}
