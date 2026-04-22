import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByWallet(walletAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });
    if (!user) {
      throw new NotFoundException(`User with wallet address ${walletAddress} not found`);
    }
    return user;
  }

  async create(walletAddress: string, email?: string) {
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    return this.prisma.user.create({
      data: {
        walletAddress,
        email,
      },
    });
  }

  async update(id: string, updateData: UpdateUserDto) {
    await this.findById(id); // Ensure user exists

    return this.prisma.user.update({
      where: { id },
      data: {
        ...updateData,
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
