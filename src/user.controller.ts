import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { UserParamsDto } from './dto/user-params.dto';

@Controller('api/user')
export class UserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':id')
  async getUser(@Param() params: UserParamsDto) {
    const { id } = params;
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return { error: 'User not found' };
    // Only return relevant fields
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
