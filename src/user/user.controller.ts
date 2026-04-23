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
import { UserService } from './user.service';
import { UserParamsDto } from './dto/user-params.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param() params: UserParamsDto) {
    const user = await this.userService.findById(params.id);
    return this.mapUserResponse(user);
  }

  @Get('wallet/:address')
  async getUserByWallet(@Param('address') address: string) {
    const user = await this.userService.findByWallet(address);
    return this.mapUserResponse(user);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateUser(
    @Param() params: UserParamsDto,
    @Body() updateData: UpdateUserDto,
  ) {
    const user = await this.userService.update(params.id, updateData);
    return this.mapUserResponse(user);
  }

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
