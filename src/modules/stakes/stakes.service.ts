import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { StakeEntity } from './entities/stake.entity'
import { UserStakesResponse, StakeLedgerItem } from './types/user-stakes-response.type'

@Injectable()
export class StakesService {
  constructor(
    @InjectRepository(StakeEntity)
    private readonly stakeRepository: Repository<StakeEntity>,
  ) {}

  async getUserStakes(
    userAddress: string,
    page = 1,
    limit = 10,
  ): Promise<UserStakesResponse> {
    const skip = (page - 1) * limit

    const [stakes, total] = await this.stakeRepository.findAndCount({
      where: {
        userAddress,
      },
      relations: {
        call: true,
      },
      order: {
        createdAt: 'DESC',
      },
      skip,
      take: limit,
    })

    const data: StakeLedgerItem[] = stakes.map((stake) => ({
      id: stake.id,
      callId: stake.callId,
      userAddress: stake.userAddress,
      amount: Number(stake.amount),
      position: stake.position,
      profitLoss:
        stake.profitLoss !== null && stake.profitLoss !== undefined
          ? Number(stake.profitLoss)
          : null,
      transactionHash: stake.transactionHash ?? null,
      createdAt: stake.createdAt.toISOString(),
      updatedAt: stake.updatedAt.toISOString(),
      resolutionStatus: stake.resolutionStatus,
      call: stake.call
        ? {
            id: stake.call.id,
            description: stake.call.description,
            outcome: stake.call.outcome,
            resolvedAt: stake.call.resolvedAt
              ? stake.call.resolvedAt.toISOString()
              : null,
            expiresAt: stake.call.expiresAt
              ? stake.call.expiresAt.toISOString()
              : null,
            createdAt: stake.call.createdAt.toISOString(),
          }
        : undefined,
    }))

    return {
      data,
      total,
      page,
      limit,
    }
  }
}