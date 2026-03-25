import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto) {
    return this.prisma.user.create({
      data: {
        walletAddress: dto.walletAddress,
        email: dto.email,
        profileData: dto.profileData,
      },
    });
  }

  /**
   * Update user details
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.user.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Get user by ID (safe fields only)
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      profileData: user.profileData,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get user by wallet address
   */
  async getUserByWalletAddress(walletAddress: string) {
    const user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) throw new NotFoundException('User not found');

    return this.getUserById(user.id);
  }
}
