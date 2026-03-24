import { Controller, Get, Query } from '@nestjs/common'
import { AnalyticsService } from './analytics.service'
import { AnalyticsQueryDto } from './dto/analytics-query.dto'
import {
  AnalyticsOverviewResponse,
  ClaimRatesResponse,
  PoolUtilizationResponse,
  RiskExposureResponse,
} from './types/analytics-response.type'

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('claim-rates')
  async getClaimRates(
    @Query() query: AnalyticsQueryDto,
  ): Promise<ClaimRatesResponse> {
    return this.analyticsService.getClaimRates(query)
  }

  @Get('risk-exposure')
  async getRiskExposure(
    @Query() query: AnalyticsQueryDto,
  ): Promise<RiskExposureResponse> {
    return this.analyticsService.getRiskExposure(query)
  }

  @Get('pool-utilization')
  async getPoolUtilization(
    @Query() query: AnalyticsQueryDto,
  ): Promise<PoolUtilizationResponse> {
    return this.analyticsService.getPoolUtilization(query)
  }

  @Get('overview')
  async getOverview(
    @Query() query: AnalyticsQueryDto,
  ): Promise<AnalyticsOverviewResponse> {
    return this.analyticsService.getOverview(query)
  }
}