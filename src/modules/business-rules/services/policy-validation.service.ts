import { Injectable, Logger } from '@nestjs/common';
import { BusinessRulesEngine } from './business-rules-engine.service';
import { RuleType } from '../entities/business-rule.entity';
import { RuleContext } from '../interfaces/rule.interfaces';

export interface PolicyValidationInput {
  policyId: string;
  userId: string;
  claimType?: string;
  incidentDate?: Date;
  claimAmount?: number;
  policyData?: Record<string, any>;
}

export interface PolicyValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  executedRules: string[];
  validationData?: Record<string, any>;
  executionTime: number;
}

@Injectable()
export class PolicyValidationService {
  private readonly logger = new Logger(PolicyValidationService.name);

  constructor(private readonly rulesEngine: BusinessRulesEngine) {}

  /**
   * Validate policy for claim submission
   */
  async validatePolicyForClaim(input: PolicyValidationInput): Promise<PolicyValidationResult> {
    const context: RuleContext = {
      entityType: 'policy',
      entityId: input.policyId,
      userId: input.userId,
      data: {
        policyId: input.policyId,
        userId: input.userId,
        claimType: input.claimType,
        incidentDate: input.incidentDate,
        claimAmount: input.claimAmount,
        ...input.policyData,
      },
      metadata: {
        validationType: 'claim_submission',
        timestamp: new Date(),
      },
    };

    this.logger.debug(`Validating policy ${input.policyId} for claim submission`);

    const result = await this.rulesEngine.executeRules(RuleType.POLICY_VALIDATION, context);

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      executedRules: result.executedRules,
      validationData: result.metadata,
      executionTime: result.executionTime,
    };
  }

  /**
   * Validate policy eligibility
   */
  async validatePolicyEligibility(input: PolicyValidationInput): Promise<PolicyValidationResult> {
    const context: RuleContext = {
      entityType: 'policy',
      entityId: input.policyId,
      userId: input.userId,
      data: {
        policyId: input.policyId,
        userId: input.userId,
        ...input.policyData,
      },
      metadata: {
        validationType: 'eligibility_check',
        timestamp: new Date(),
      },
    };

    this.logger.debug(`Validating eligibility for policy ${input.policyId}`);

    const result = await this.rulesEngine.executeRules(RuleType.ELIGIBILITY, context);

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      executedRules: result.executedRules,
      validationData: result.metadata,
      executionTime: result.executionTime,
    };
  }

  /**
   * Validate policy coverage
   */
  async validatePolicyCoverage(input: PolicyValidationInput): Promise<PolicyValidationResult> {
    const context: RuleContext = {
      entityType: 'policy',
      entityId: input.policyId,
      userId: input.userId,
      data: {
        policyId: input.policyId,
        userId: input.userId,
        claimType: input.claimType,
        claimAmount: input.claimAmount,
        ...input.policyData,
      },
      metadata: {
        validationType: 'coverage_check',
        timestamp: new Date(),
      },
    };

    this.logger.debug(`Validating coverage for policy ${input.policyId}`);

    const result = await this.rulesEngine.executeRules(RuleType.COVERAGE, context);

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      executedRules: result.executedRules,
      validationData: result.metadata,
      executionTime: result.executionTime,
    };
  }

  /**
   * Validate policy underwriting criteria
   */
  async validatePolicyUnderwriting(input: PolicyValidationInput): Promise<PolicyValidationResult> {
    const context: RuleContext = {
      entityType: 'policy',
      entityId: input.policyId,
      userId: input.userId,
      data: {
        policyId: input.policyId,
        userId: input.userId,
        ...input.policyData,
      },
      metadata: {
        validationType: 'underwriting_check',
        timestamp: new Date(),
      },
    };

    this.logger.debug(`Validating underwriting for policy ${input.policyId}`);

    const result = await this.rulesEngine.executeRules(RuleType.UNDERWRITING, context);

    return {
      isValid: result.isValid,
      errors: result.errors,
      warnings: result.warnings,
      executedRules: result.executedRules,
      validationData: result.metadata,
      executionTime: result.executionTime,
    };
  }

  /**
   * Calculate policy pricing based on rules
   */
  async calculatePolicyPricing(input: PolicyValidationInput): Promise<{
    success: boolean;
    price?: number;
    pricingData?: Record<string, any>;
    errors?: string[];
    warnings?: string[];
  }> {
    const context: RuleContext = {
      entityType: 'policy',
      entityId: input.policyId,
      userId: input.userId,
      data: {
        policyId: input.policyId,
        userId: input.userId,
        ...input.policyData,
      },
      metadata: {
        validationType: 'pricing_calculation',
        timestamp: new Date(),
      },
    };

    this.logger.debug(`Calculating pricing for policy ${input.policyId}`);

    try {
      const result = await this.rulesEngine.executeRules(RuleType.PRICING, context);

      return {
        success: result.isValid,
        price: result.metadata?.calculatedPrice,
        pricingData: result.metadata,
        errors: result.errors,
        warnings: result.warnings,
      };
    } catch (error) {
      this.logger.error(`Error calculating pricing for policy ${input.policyId}:`, error);
      return {
        success: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Comprehensive policy validation (all rule types)
   */
  async validatePolicyComprehensive(input: PolicyValidationInput): Promise<{
    overall: PolicyValidationResult;
    eligibility: PolicyValidationResult;
    coverage: PolicyValidationResult;
    pricing?: {
      success: boolean;
      price?: number;
      errors?: string[];
    };
  }> {
    this.logger.debug(`Running comprehensive validation for policy ${input.policyId}`);

    const [eligibility, coverage, pricing] = await Promise.all([
      this.validatePolicyEligibility(input),
      this.validatePolicyCoverage(input),
      this.calculatePolicyPricing(input),
    ]);

    // Combine results for overall validation
    const overall: PolicyValidationResult = {
      isValid: eligibility.isValid && coverage.isValid && pricing.success,
      errors: [...eligibility.errors, ...coverage.errors, ...(pricing.errors || [])],
      warnings: [...eligibility.warnings, ...coverage.warnings, ...(pricing.warnings || [])],
      executedRules: [...eligibility.executedRules, ...coverage.executedRules],
      validationData: {
        eligibility: eligibility.validationData,
        coverage: coverage.validationData,
        pricing: pricing.pricingData,
      },
      executionTime: eligibility.executionTime + coverage.executionTime,
    };

    return {
      overall,
      eligibility,
      coverage,
      pricing: {
        success: pricing.success,
        price: pricing.price,
        errors: pricing.errors,
      },
    };
  }
}
