import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UserService } from './user.service';
import { UserParamsDto } from './dto/user-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 user lookups per minute
  @Get(':id')
  async getUser(@Param() params: UserParamsDto) {
    const user = await this.userService.findById(params.id);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 wallet lookups per minute
  @Get('wallet/:address')
  async getUserByWallet(@Param('address') address: string) {
    const user = await this.userService.findByWallet(address);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 updates per hour per user
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(
    @Param() params: UserParamsDto,
    @Body() updateData: UpdateUserDto,
  ) {
    const user = await this.userService.update(params.id, updateData);
    return this.mapUserResponse(user);
  }

  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 deletions per hour per user
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param() params: UserParamsDto) {
    return this.userService.delete(params.id);
  }

  private mapUserResponse(user: any) {
    return {
      id: user.id,
      walletAddress: user.walletAddress,
      reputationScore: user.reputationScore,
      trustScore: user.trustScore,
      email: user.email,
      profileData: user.profileData,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
