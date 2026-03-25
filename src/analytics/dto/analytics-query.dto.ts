import { IsOptional, IsUUID, IsDateString } from 'class-validator'

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string

  @IsOptional()
  @IsDateString()
  to?: string

  @IsOptional()
  @IsUUID()
  poolId?: string
}