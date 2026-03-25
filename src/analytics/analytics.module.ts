import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AnalyticsController } from './analytics.controller'
import { AnalyticsService } from './analytics.service'
import { ClaimEntity } from '../claims/entities/claim.entity'
import { StakeEntity } from '../stakes/entities/stake.entity'
import { PoolEntity } from '../pools/entities/pool.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ClaimEntity, StakeEntity, PoolEntity])],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}