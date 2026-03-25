export type ClaimRatesResponse = {
  totalClaims: number
  approvedClaims: number
  rejectedClaims: number
  pendingClaims: number
  claimApprovalRate: number
  claimRejectionRate: number
}

export type RiskExposureResponse = {
  totalStakedAmount: number
  totalClaimedAmount: number
  totalApprovedClaimAmount: number
  exposureRatio: number
}

export type PoolUtilizationResponse = {
  totalPoolCapacity: number
  totalLockedAmount: number
  availableLiquidity: number
  utilizationRate: number
}

export type AnalyticsOverviewResponse = {
  claimRates: ClaimRatesResponse
  riskExposure: RiskExposureResponse
  poolUtilization: PoolUtilizationResponse
  generatedAt: string
}