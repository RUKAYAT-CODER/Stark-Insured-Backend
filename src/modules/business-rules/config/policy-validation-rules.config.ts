export const POLICY_VALIDATION_RULES = {
  // Rule: Policy must be active for claim submission
  POLICY_ACTIVE_FOR_CLAIM: {
    name: 'Policy Active for Claim',
    description: 'Ensures policy is in ACTIVE status before allowing claim submission',
    type: 'POLICY_VALIDATION' as const,
    priority: 4 as const, // Critical
    conditions: [
      {
        operator: 'equals' as const,
        field: 'policy.status',
        value: 'ACTIVE',
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'policy.status',
          validation: 'required',
          message: 'Policy must be active to submit a claim',
        },
      },
    ],
    category: 'Claim Validation',
    tags: ['policy', 'claim', 'status'],
  },

  // Rule: Policy ownership validation
  POLICY_OWNERSHIP_VALIDATION: {
    name: 'Policy Ownership Validation',
    description: 'Validates that the user owns the policy',
    type: 'POLICY_VALIDATION' as const,
    priority: 4 as const, // Critical
    conditions: [
      {
        operator: 'equals' as const,
        field: 'policy.userId',
        value: 'userId', // Will be compared with context.userId
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'policy.userId',
          validation: 'required',
          message: 'User must own the policy to submit a claim',
        },
      },
    ],
    category: 'Claim Validation',
    tags: ['policy', 'ownership', 'security'],
  },

  // Rule: Coverage period validation
  COVERAGE_PERIOD_VALIDATION: {
    name: 'Coverage Period Validation',
    description: 'Ensures incident date is within policy coverage period',
    type: 'POLICY_VALIDATION' as const,
    priority: 3 as const, // High
    conditions: [
      {
        operator: 'greater_than' as const,
        field: 'incidentDate',
        value: 'policy.startDate',
      },
      {
        operator: 'less_than' as const,
        field: 'incidentDate',
        value: 'policy.endDate',
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'incidentDate',
          validation: 'required',
          message: 'Incident date must be within policy coverage period',
        },
      },
    ],
    category: 'Claim Validation',
    tags: ['policy', 'coverage', 'date'],
  },

  // Rule: Coverage limit validation
  COVERAGE_LIMIT_VALIDATION: {
    name: 'Coverage Limit Validation',
    description: 'Ensures claim amount does not exceed remaining coverage',
    type: 'COVERAGE' as const,
    priority: 3 as const, // High
    conditions: [
      {
        operator: 'less_than' as const,
        field: 'claimAmount',
        value: 'policy.remainingCoverage',
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'claimAmount',
          validation: 'positive',
          message: 'Claim amount cannot exceed remaining coverage',
        },
      },
      {
        type: 'calculate' as const,
        parameters: {
          expression: 'policy.coverageLimit - policy.usedAmount',
          targetField: 'remainingCoverage',
        },
      },
    ],
    category: 'Coverage Validation',
    tags: ['policy', 'coverage', 'limit'],
  },

  // Rule: Claim type coverage validation
  CLAIM_TYPE_COVERAGE_VALIDATION: {
    name: 'Claim Type Coverage Validation',
    description: 'Ensures claim type is covered under the policy',
    type: 'COVERAGE' as const,
    priority: 3 as const, // High
    conditions: [
      {
        operator: 'in' as const,
        field: 'claimType',
        value: 'policy.coveredClaimTypes',
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'claimType',
          validation: 'required',
          message: 'Claim type must be covered under the policy',
        },
      },
    ],
    category: 'Coverage Validation',
    tags: ['policy', 'coverage', 'claim-type'],
  },

  // Rule: Minimum policy value for eligibility
  MINIMUM_POLICY_VALUE_ELIGIBILITY: {
    name: 'Minimum Policy Value Eligibility',
    description: 'Ensures policy meets minimum value requirements',
    type: 'ELIGIBILITY' as const,
    priority: 2 as const, // Medium
    conditions: [
      {
        operator: 'greater_than' as const,
        field: 'policy.coverageAmount',
        value: 10000, // $10,000 minimum
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'policy.coverageAmount',
          validation: 'positive',
          message: 'Policy must have minimum coverage amount of $10,000',
        },
      },
    ],
    category: 'Eligibility',
    tags: ['policy', 'eligibility', 'minimum-value'],
  },

  // Rule: Policy age validation
  POLICY_AGE_VALIDATION: {
    name: 'Policy Age Validation',
    description: 'Validates policy age for certain operations',
    type: 'ELIGIBILITY' as const,
    priority: 2 as const, // Medium
    conditions: [
      {
        operator: 'greater_than' as const,
        field: 'policy.ageInDays',
        value: 30, // Must be at least 30 days old
      },
    ],
    actions: [
      {
        type: 'calculate' as const,
        parameters: {
          expression: 'currentDate - policy.startDate',
          targetField: 'policyAgeInDays',
        },
      },
      {
        type: 'validate' as const,
        parameters: {
          field: 'policyAgeInDays',
          validation: 'positive',
          message: 'Policy must be at least 30 days old for this operation',
        },
      },
    ],
    category: 'Eligibility',
    tags: ['policy', 'eligibility', 'age'],
  },

  // Rule: Base pricing calculation
  BASE_PRICING_CALCULATION: {
    name: 'Base Pricing Calculation',
    description: 'Calculates base policy premium based on coverage amount',
    type: 'PRICING' as const,
    priority: 2 as const, // Medium
    conditions: [
      {
        operator: 'greater_than' as const,
        field: 'policy.coverageAmount',
        value: 0,
      },
    ],
    actions: [
      {
        type: 'calculate' as const,
        parameters: {
          expression: 'policy.coverageAmount * 0.02', // 2% of coverage amount
          targetField: 'basePremium',
        },
      },
      {
        type: 'calculate' as const,
        parameters: {
          expression: 'basePremium * 1.1', // 10% loading
          targetField: 'finalPremium',
        },
      },
    ],
    category: 'Pricing',
    tags: ['policy', 'pricing', 'premium'],
  },

  // Rule: Risk-based pricing adjustment
  RISK_BASED_PRICING: {
    name: 'Risk-Based Pricing Adjustment',
    description: 'Adjusts premium based on risk factors',
    type: 'PRICING' as const,
    priority: 2 as const, // Medium
    conditions: [
      {
        operator: 'equals' as const,
        field: 'policy.riskCategory',
        value: 'HIGH',
      },
    ],
    actions: [
      {
        type: 'calculate' as const,
        parameters: {
          expression: 'finalPremium * 1.5', // 50% increase for high risk
          targetField: 'adjustedPremium',
        },
      },
    ],
    category: 'Pricing',
    tags: ['policy', 'pricing', 'risk'],
  },

  // Rule: Underwriting approval requirement
  UNDERWRITING_APPROVAL_REQUIRED: {
    name: 'Underwriting Approval Required',
    description: 'Determines if underwriting approval is required',
    type: 'UNDERWRITING' as const,
    priority: 3 as const, // High
    conditions: [
      {
        operator: 'greater_than' as const,
        field: 'policy.coverageAmount',
        value: 100000, // $100,000 threshold
      },
    ],
    actions: [
      {
        type: 'validate' as const,
        parameters: {
          field: 'policy.underwritingApproval',
          validation: 'required',
          message: 'Underwriting approval required for policies over $100,000',
        },
      },
      {
        type: 'notify' as const,
        parameters: {
          type: 'underwriting',
          message: 'Policy requires underwriting review',
          recipients: ['underwriting-team@company.com'],
        },
      },
    ],
    category: 'Underwriting',
    tags: ['policy', 'underwriting', 'approval'],
  },
};
