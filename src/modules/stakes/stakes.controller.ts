import { Controller, Get, Param, Query } from '@nestjs/common'
import { StakesService } from './stakes.service'
import { GetUserStakesQueryDto } from './dto/get-user-stakes-query.dto'
import { UserStakesResponse } from './types/user-stakes-response.type'

@Controller('stakes')
export class StakesController {
  constructor(private readonly stakesService: StakesService) {}

  @Get('user/:userAddress')
  async getUserStakes(
    @Param('userAddress') userAddress: string,
    @Query() query: GetUserStakesQueryDto,
  ): Promise<UserStakesResponse> {
    return this.stakesService.getUserStakes(
      userAddress,
      query.page ?? 1,
      query.limit ?? 10,
    )
  }
}