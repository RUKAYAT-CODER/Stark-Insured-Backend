import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, principalId: string) {
    if (id !== principalId) {
      throw new Error('Unauthorized access to user record');
    }
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, principalId: string, data: any) {
    if (id !== principalId) {
      throw new Error('Unauthorized update attempt');
    }
    return this.prisma.user.update({ where: { id }, data });
  }
}
