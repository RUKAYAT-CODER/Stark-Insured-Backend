import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Repository, QueryRunner } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class PoolService {
  constructor(@InjectRepository(InsurancePool) private readonly repo: Repository<InsurancePool>) {}

  async addCapital(poolId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const pool = await this.repo.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException(`Pool ${poolId} not found`);
    }
    pool.capital = Number(pool.capital) + amount;
    return this.repo.save(pool);
  }

  async lockCapital(poolId: string, amount: number, queryRunner?: QueryRunner) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const manager = queryRunner?.manager || this.repo.manager;
    const pool = await manager.findOne(InsurancePool, { where: { id: poolId } });
    if (!pool) {
      throw new NotFoundException(`Pool ${poolId} not found`);
    }
    pool.lockedCapital = Number(pool.lockedCapital) + amount;
    return manager.save(pool);
  }
}
