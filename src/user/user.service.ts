import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: EncryptionService,
  ) {}

  /**
   * Create a new user
   */
  async createUser(dto: CreateUserDto) {
    const userData: any = {
      walletAddress: dto.walletAddress,
    };

    // Encrypt email if provided
    if (dto.email) {
      userData.email = this.encryptionService.encryptForStorage(dto.email);
    }

    // Encrypt profileData if provided (stringify first if it's an object)
    if (dto.profileData) {
      const profileString = typeof dto.profileData === 'string' 
        ? dto.profileData 
        : JSON.stringify(dto.profileData);
      userData.profileData = this.encryptionService.encryptForStorage(profileString);
    }

    return this.prisma.user.create({ data: userData });
  }

  /**
   * Update user details
   */
  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};

    // Encrypt email if being updated
    if (dto.email !== undefined) {
      updateData.email = this.encryptionService.encryptForStorage(dto.email);
    }

    // Encrypt profileData if being updated
    if (dto.profileData !== undefined) {
      const profileString = typeof dto.profileData === 'string' 
        ? dto.profileData 
        : JSON.stringify(dto.profileData);
      updateData.profileData = this.encryptionService.encryptForStorage(profileString);
    }

    if (Object.keys(updateData).length === 0) {
      return user;
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get user by ID (safe fields only)
   */
  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    // Decrypt PII fields
    let email: string | null = null;
    if (user.email && this.encryptionService.isEncrypted(user.email)) {
      try {
        email = this.encryptionService.decryptFromStorage(user.email);
      } catch (error) {
        console.error('Failed to decrypt email:', error);
        email = null;
      }
    } else if (user.email) {
      // Fallback for unencrypted legacy data
      email = user.email;
    }

    let profileData: any = null;
    if (user.profileData && this.encryptionService.isEncrypted(user.profileData as string)) {
      try {
        const decryptedProfile = this.encryptionService.decryptFromStorage(user.profileData as string);
        profileData = JSON.parse(decryptedProfile);
      } catch (error) {
        console.error('Failed to decrypt profileData:', error);
        profileData = user.profileData;
      }
    } else if (user.profileData) {
      // Fallback for unencrypted legacy data
      profileData = user.profileData;
    }

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      email,
      profileData,
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
