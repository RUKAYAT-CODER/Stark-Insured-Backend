import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { InsuranceService } from './insurance.service';
import { ClaimService } from './claim.service';
import { ReinsuranceService } from './reinsurance.service';
import { RiskType } from './enums/risk-type.enum';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from './enums/role.enum';
import { CsrfGuard } from '../csrf/csrf.guard';

@Controller('api/insurance')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InsuranceController {
  constructor(
    private readonly insurance: InsuranceService,
    private readonly claims: ClaimService,
    private readonly reinsurance: ReinsuranceService,
  ) {}

  // Any authenticated user can purchase a policy
  @Post('purchase')
  @UseGuards(CsrfGuard)
  @Roles(Role.USER, Role.UNDERWRITER, Role.ADMIN)
  async purchase(@Body() body: { userId: string; poolId: string; riskType: RiskType; coverageAmount: number }) {
    return this.insurance.purchasePolicy(body.userId, body.poolId, body.riskType, body.coverageAmount);
  }

  // Users can file claims against their policies
  @Post('claims')
  @UseGuards(CsrfGuard)
  @Roles(Role.USER, Role.UNDERWRITER, Role.ADMIN)
  async fileClaim(@Body() body: { policyId: string; claimAmount: number; userId: string }) {
    return this.claims.createClaim(body.policyId, body.claimAmount, body.userId);
  }

  // Only underwriters and admins can assess claims
  @Post('claims/:claimId/assess')
  @UseGuards(CsrfGuard)
  @Roles(Role.UNDERWRITER, Role.ADMIN)
  async assessClaim(@Param('claimId') claimId: string) {
    return this.claims.assessClaim(claimId);
  }

  // Only admins can trigger claim payouts
  @Post('claims/:claimId/pay')
  @UseGuards(CsrfGuard)
  @Roles(Role.ADMIN)
  async payClaim(@Param('claimId') claimId: string) {
    return this.claims.payClaim(claimId);
  }

  // Only admins can create reinsurance contracts
  @Post('reinsurance')
  @UseGuards(CsrfGuard)
  @Roles(Role.ADMIN)
  async createReinsurance(@Body() body: { poolId: string; coverageLimit: number; premiumRate: number }) {
    return this.reinsurance.createContract(body.poolId, body.coverageLimit, body.premiumRate);
  }
}
