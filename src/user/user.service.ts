import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hash password securely using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Validate password against stored hash
   */
  private async validatePassword(hash: string, plain: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }

  /**
   * Create a new user with secure password hashing
   */
  async createUser(dto: CreateUserDto) {
    const hashedPassword = await this.hashPassword(dto.password);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
      },
    });
  }

  /**
   * Update user details (with optional password rehashing)
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = { ...dto };

    if (dto.password) {
      updateData.password = await this.hashPassword(dto.password);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Validate login credentials
   */
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await this.validatePassword(user.password, password);
    if (!isValid) throw new BadRequestException('Invalid credentials');

    return user;
  }

  /**
   * Get user by ID (safe fields only)
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
