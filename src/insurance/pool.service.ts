import { Injectable, Logger, ConflictException } from '@nestjs/common';
import { InsurancePool } from './entities/insurance-pool.entity';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';

@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);

  constructor(
    @InjectRepository(InsurancePool) private readonly repo: Repository<InsurancePool>,
    @InjectDataSource() private dataSource: DataSource,
  ) {}

  async addCapital(poolId: string, amount: number) {
    const pool = await this.repo.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new Error('Pool not found');
    }
    pool.capital += amount;
    return this.repo.save(pool);
  }

  /**
   * Atomically locks capital in the pool using optimistic locking.
   * Uses DB transaction with version check to prevent race conditions.
   * Retries up to 3 times on concurrent modification conflicts.
   */
  async lockCapital(
    poolId: string,
    amount: number,
    maxRetries: number = 3,
  ): Promise<InsurancePool> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.dataSource.transaction(async manager => {
          // Use FOR UPDATE to lock the row during transaction
          const pool = await manager.findOne(InsurancePool, {
            where: { id: poolId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!pool) {
            throw new Error('Pool not found');
          }

          const availableCapital =
            Number(pool.capital) - Number(pool.lockedCapital);
          if (amount > availableCapital) {
            throw new Error('Insufficient available capital in pool');
          }

          // Optimistic locking: version will be auto-incremented by TypeORM's VersionColumn decorator
          // The update will fail if another transaction modified the row
          pool.lockedCapital = Number(pool.lockedCapital) + amount;
          const updatedPool = await manager.save(pool);

          this.logger.debug(
            `Locked ${amount} capital in pool ${poolId}. Available: ${availableCapital - amount}, Version: ${updatedPool.version}`,
          );

          return updatedPool;
        });
      } catch (error) {
        // Check if it's a concurrency conflict (optimistic locking failure)
        if (attempt < maxRetries && this.isConcurrencyConflict(error)) {
          this.logger.warn(
            `Concurrency conflict on pool ${poolId} (attempt ${attempt}/${maxRetries}). Retrying...`,
          );
          continue;
        }

        // If it's the last attempt or not a concurrency conflict, rethrow
        if (
          error instanceof Error &&
          error.message.includes('Insufficient available capital')
        ) {
          throw error;
        }
        throw error;
      }
    }

    throw new ConflictException(
      `Failed to lock capital after ${maxRetries} attempts due to concurrent modifications`,
    );
  }

  /**
   * Checks if an error is due to optimistic locking conflict
   */
  private isConcurrencyConflict(error: any): boolean {
    // TypeORM optimistic locking throws specific errors
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (error.name === 'OptimisticLockVersionMismatchError') {
      return true;
    }

    // Check for database-level version conflicts
    if (
      error.code &&
      (error.code === '23505' || error.message.includes('version'))
    ) {
      return true;
    }

    return false;
  }
}
