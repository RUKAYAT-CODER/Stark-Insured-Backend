import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    // Decrypt sensitive fields
    return this.decryptUser(user);
  }

  async findByWallet(walletAddress: string) {
    const user = await this.prisma.user.findUnique({
      where: { walletAddress },
    });
    if (!user) {
      throw new NotFoundException(`User with wallet address ${walletAddress} not found`);
    }
    // Decrypt sensitive fields
    return this.decryptUser(user);
  }

  async create(walletAddress: string, email?: string) {
    // Check if user exists (wallet address is public identifier, not encrypted)
    const existingUser = await this.prisma.user.findUnique({
      where: { walletAddress },
    });

    if (existingUser) {
      throw new ConflictException('User with this wallet address already exists');
    }

    // Encrypt email for privacy
    const encryptedEmail = email ? this.encryption.encrypt(email) : null;

    return this.prisma.user.create({
      data: {
        walletAddress, // Keep as-is for unique constraint and public lookup
        email: encryptedEmail,
      },
    });
  }

  async update(id: string, updateData: UpdateUserDto) {
    await this.findById(id); // Ensure user exists

    // Encrypt sensitive fields if they're being updated
    const data: any = { ...updateData };
    if (data.walletAddress) {
      data.walletAddress = this.encryption.encrypt(data.walletAddress);
    }
    if (data.email) {
      data.email = this.encryption.encrypt(data.email);
    }
    if (data.pushSubscription) {
      data.pushSubscription = this.encryption.encrypt(JSON.stringify(data.pushSubscription));
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Decrypt sensitive fields in user object
   */
  private decryptUser(user: any) {
    const decrypted = { ...user };
    
    if (decrypted.walletAddress) {
      try {
        decrypted.walletAddress = this.encryption.decrypt(decrypted.walletAddress);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    if (decrypted.email) {
      try {
        decrypted.email = this.encryption.decrypt(decrypted.email);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    if (decrypted.pushSubscription) {
      try {
        const decryptedJson = this.encryption.decrypt(decrypted.pushSubscription as string);
        decrypted.pushSubscription = JSON.parse(decryptedJson);
      } catch (error) {
        // If decryption fails, keep encrypted value
      }
    }
    
    return decrypted;
  }
}
