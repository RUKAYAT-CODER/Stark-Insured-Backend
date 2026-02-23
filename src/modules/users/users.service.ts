import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { CachingService } from '../../common/caching/caching.service';
import { Cacheable, CacheInvalidateByTag, CacheInvalidate } from '../../common/caching/cache.decorators';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cachingService: CachingService,
  ) {}

  @Cacheable({
    ttl: 300, // 5 minutes
    tags: ['users', 'user-lookup'],
  })
  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { walletAddress } });
  }

  @Cacheable({
    ttl: 300, // 5 minutes
    tags: ['users', 'user-lookup'],
  })
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  @Cacheable({
    ttl: 300, // 5 minutes
    tags: ['users', 'user-lookup'],
  })
  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  @CacheInvalidateByTag('users', 'user-lookup')
  async create(walletAddress: string): Promise<User> {
    const newUser = this.userRepository.create({
      walletAddress,
      roles: [UserRole.USER],
    });
    return this.userRepository.save(newUser);
  }

  @CacheInvalidateByTag('users', 'user-lookup')
  async updateLastLogin(id: string): Promise<void> {
    await this.userRepository.update(id, { lastLoginAt: new Date() });
  }

  @CacheInvalidateByTag('users', 'user-lookup')
  async update(userId: string, data: Partial<User>): Promise<User | null> {
    await this.userRepository.update(userId, data);
    return this.findById(userId);
  }
}
