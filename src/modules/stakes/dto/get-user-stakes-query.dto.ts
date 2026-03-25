import { Transform } from 'class-transformer'
import { IsInt, IsOptional, Min } from 'class-validator'

export class GetUserStakesQueryDto {
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  limit?: number = 10
}