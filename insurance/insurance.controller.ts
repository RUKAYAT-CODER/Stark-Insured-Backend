import { Controller, Post, Get, Param, Body, UseInterceptors } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { PurchasePolicyDto } from './dto/purchase-policy.dto';
import { CreateReinsuranceDto } from './dto/create-reinsurance.dto';
import { IdempotencyInterceptor } from '../src/interceptors/idempotency.interceptor';

@Controller('api/insurance')
export class InsuranceController {
  constructor(
    private readonly insurance: InsuranceService,
    private readonly claims: ClaimService,
    private readonly reinsurance: ReinsuranceService,
  ) {}

  @Post('purchase')
  @UseInterceptors(IdempotencyInterceptor)
  async purchase(@Body() body: PurchasePolicyDto) {
    return this.insurance.purchasePolicy(body.userId, body.poolId, body.riskType, body.coverageAmount);
  }

  @Post('claims/:claimId/assess')
  @UseInterceptors(IdempotencyInterceptor)
  async assessClaim(@Param('claimId') claimId: string) {
    return this.claims.assessClaim(claimId);
  }

  @Post('claims/:claimId/pay')
  @UseInterceptors(IdempotencyInterceptor)
  async payClaim(@Param('claimId') claimId: string) {
    return this.claims.payClaim(claimId);
  }

  @Post('reinsurance')
  @UseInterceptors(IdempotencyInterceptor)
  async createReinsurance(@Body() body: CreateReinsuranceDto) {
    return this.reinsurance.createContract(body.poolId, body.coverageLimit, body.premiumRate);
  }
}
