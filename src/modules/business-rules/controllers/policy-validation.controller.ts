import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PolicyValidationService, PolicyValidationInput } from '../services/policy-validation.service';

@ApiTags('policy-validation')
@Controller('policy-validation')
export class PolicyValidationController {
  constructor(private readonly policyValidationService: PolicyValidationService) {}

  @Post('validate-for-claim')
  @ApiOperation({ summary: 'Validate policy for claim submission' })
  @ApiResponse({ status: 200, description: 'Validation completed successfully' })
  async validateForClaim(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.validatePolicyForClaim(input);
  }

  @Post('validate-eligibility')
  @ApiOperation({ summary: 'Validate policy eligibility' })
  @ApiResponse({ status: 200, description: 'Eligibility validation completed' })
  async validateEligibility(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.validatePolicyEligibility(input);
  }

  @Post('validate-coverage')
  @ApiOperation({ summary: 'Validate policy coverage' })
  @ApiResponse({ status: 200, description: 'Coverage validation completed' })
  async validateCoverage(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.validatePolicyCoverage(input);
  }

  @Post('validate-underwriting')
  @ApiOperation({ summary: 'Validate policy underwriting criteria' })
  @ApiResponse({ status: 200, description: 'Underwriting validation completed' })
  async validateUnderwriting(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.validatePolicyUnderwriting(input);
  }

  @Post('calculate-pricing')
  @ApiOperation({ summary: 'Calculate policy pricing based on rules' })
  @ApiResponse({ status: 200, description: 'Pricing calculation completed' })
  async calculatePricing(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.calculatePolicyPricing(input);
  }

  @Post('validate-comprehensive')
  @ApiOperation({ summary: 'Comprehensive policy validation (all rule types)' })
  @ApiResponse({ status: 200, description: 'Comprehensive validation completed' })
  async validateComprehensive(@Body() input: PolicyValidationInput) {
    return this.policyValidationService.validatePolicyComprehensive(input);
  }
}
