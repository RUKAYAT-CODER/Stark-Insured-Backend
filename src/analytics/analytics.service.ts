import { Injectable, Inject } from '@nestjs/common'
import { CACHE_MANAGER } from '@nestjs/cache-manager'
import { Cache } from 'cache-manager'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ClaimEntity } from '../claims/entities/claim.entity'
import { StakeEntity } from '../stakes/entities/stake.entity'
import { PoolEntity } from '../pools/entities/pool.entity'
import {
  AnalyticsOverviewResponse,
  ClaimRatesResponse,
  PoolUtilizationResponse,
  RiskExposureResponse,
} from './types/analytics-response.type'
import { AnalyticsQueryDto } from './dto/analytics-query.dto'

@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,

    @InjectRepository(ClaimEntity)
    private readonly claimRepository: Repository<ClaimEntity>,

    @InjectRepository(StakeEntity)
    private readonly stakeRepository: Repository<StakeEntity>,

    @InjectRepository(PoolEntity)
    private readonly poolRepository: Repository<PoolEntity>,
  ) {}

  private buildCacheKey(prefix: string, query?: AnalyticsQueryDto): string {
    return `${prefix}:${JSON.stringify(query || {})}`
  }

  private applyDateFilter<T>(
    qb: any,
    alias: string,
    query?: AnalyticsQueryDto,
  ): void {
    if (query?.from) {
      qb.andWhere(`${alias}.createdAt >= :from`, { from: query.from })
    }

    if (query?.to) {
      qb.andWhere(`${alias}.createdAt <= :to`, { to: query.to })
    }

    if (query?.poolId && alias === 'claim') {
      qb.andWhere(`${alias}.poolId = :poolId`, { poolId: query.poolId })
    }
  }

  async getClaimRates(query?: AnalyticsQueryDto): Promise<ClaimRatesResponse> {
    const cacheKey = this.buildCacheKey('analytics:claim-rates', query)
    const cached = await this.cacheManager.get<ClaimRatesResponse>(cacheKey)
    if (cached) return cached

    const qb = this.claimRepository.createQueryBuilder('claim')
    this.applyDateFilter(qb, 'claim', query)

    const claims = await qb.getMany()

    const totalClaims = claims.length
    const approvedClaims = claims.filter((c) => c.status === 'APPROVED').length
    const rejectedClaims = claims.filter((c) => c.status === 'REJECTED').length
    const pendingClaims = claims.filter((c) => c.status === 'PENDING').length

    const claimApprovalRate =
      totalClaims > 0 ? Number(((approvedClaims / totalClaims) * 100).toFixed(2)) : 0

    const claimRejectionRate =
      totalClaims > 0 ? Number(((rejectedClaims / totalClaims) * 100).toFixed(2)) : 0

    const response: ClaimRatesResponse = {
      totalClaims,
      approvedClaims,
      rejectedClaims,
      pendingClaims,
      claimApprovalRate,
      claimRejectionRate,
    }

    await this.cacheManager.set(cacheKey, response, 60)
    return response
  }

  async getRiskExposure(query?: AnalyticsQueryDto): Promise<RiskExposureResponse> {
    const cacheKey = this.buildCacheKey('analytics:risk-exposure', query)
    const cached = await this.cacheManager.get<RiskExposureResponse>(cacheKey)
    if (cached) return cached

    const stakeQb = this.stakeRepository.createQueryBuilder('stake')
    this.applyDateFilter(stakeQb, 'stake', query)

    const claimQb = this.claimRepository.createQueryBuilder('claim')
    this.applyDateFilter(claimQb, 'claim', query)

    const approvedClaimQb = this.claimRepository
      .createQueryBuilder('claim')
      .where('claim.status = :status', { status: 'APPROVED' })

    this.applyDateFilter(approvedClaimQb, 'claim', query)

    const stakeRaw = await stakeQb
      .select('COALESCE(SUM(stake.amount), 0)', 'totalStakedAmount')
      .getRawOne()

    const claimRaw = await claimQb
      .select('COALESCE(SUM(claim.amount), 0)', 'totalClaimedAmount')
      .getRawOne()

    const approvedClaimRaw = await approvedClaimQb
      .select('COALESCE(SUM(claim.amount), 0)', 'totalApprovedClaimAmount')
      .getRawOne()

    const totalStakedAmount = Number(stakeRaw.totalStakedAmount || 0)
    const totalClaimedAmount = Number(claimRaw.totalClaimedAmount || 0)
    const totalApprovedClaimAmount = Number(approvedClaimRaw.totalApprovedClaimAmount || 0)

    const exposureRatio =
      totalStakedAmount > 0
        ? Number(((totalApprovedClaimAmount / totalStakedAmount) * 100).toFixed(2))
        : 0

    const response: RiskExposureResponse = {
      totalStakedAmount,
      totalClaimedAmount,
      totalApprovedClaimAmount,
      exposureRatio,
    }

    await this.cacheManager.set(cacheKey, response, 60)
    return response
  }

  async getPoolUtilization(
    query?: AnalyticsQueryDto,
  ): Promise<PoolUtilizationResponse> {
    const cacheKey = this.buildCacheKey('analytics:pool-utilization', query)
    const cached = await this.cacheManager.get<PoolUtilizationResponse>(cacheKey)
    if (cached) return cached

    const qb = this.poolRepository.createQueryBuilder('pool')

    if (query?.poolId) {
      qb.where('pool.id = :poolId', { poolId: query.poolId })
    }

    const raw = await qb
      .select('COALESCE(SUM(pool.totalCapacity), 0)', 'totalPoolCapacity')
      .addSelect('COALESCE(SUM(pool.lockedAmount), 0)', 'totalLockedAmount')
      .addSelect('COALESCE(SUM(pool.availableLiquidity), 0)', 'availableLiquidity')
      .getRawOne()

    const totalPoolCapacity = Number(raw.totalPoolCapacity || 0)
    const totalLockedAmount = Number(raw.totalLockedAmount || 0)
    const availableLiquidity = Number(raw.availableLiquidity || 0)

    const utilizationRate =
      totalPoolCapacity > 0
        ? Number(((totalLockedAmount / totalPoolCapacity) * 100).toFixed(2))
        : 0

    const response: PoolUtilizationResponse = {
      totalPoolCapacity,
      totalLockedAmount,
      availableLiquidity,
      utilizationRate,
    }

    await this.cacheManager.set(cacheKey, response, 60)
    return response
  }

  async getOverview(query?: AnalyticsQueryDto): Promise<AnalyticsOverviewResponse> {
    const cacheKey = this.buildCacheKey('analytics:overview', query)
    const cached = await this.cacheManager.get<AnalyticsOverviewResponse>(cacheKey)
    if (cached) return cached

    const [claimRates, riskExposure, poolUtilization] = await Promise.all([
      this.getClaimRates(query),
      this.getRiskExposure(query),
      this.getPoolUtilization(query),
    ])

    const response: AnalyticsOverviewResponse = {
      claimRates,
      riskExposure,
      poolUtilization,
      generatedAt: new Date().toISOString(),
    }

    await this.cacheManager.set(cacheKey, response, 60)
    return response
  }
}