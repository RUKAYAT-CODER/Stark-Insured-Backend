export type StakeLedgerItem = {
  id: string
  callId: string
  userAddress: string
  amount: number
  position: 'YES' | 'NO'
  profitLoss?: number | null
  transactionHash?: string | null
  createdAt: string
  updatedAt: string
  resolutionStatus: 'PENDING' | 'RESOLVED'
  call?: {
    id: string
    description: string
    outcome: 'YES' | 'NO' | 'PENDING'
    resolvedAt?: string | null
    expiresAt?: string | null
    createdAt: string
  }
}

export type UserStakesResponse = {
  data: StakeLedgerItem[]
  total: number
  page: number
  limit: number
}