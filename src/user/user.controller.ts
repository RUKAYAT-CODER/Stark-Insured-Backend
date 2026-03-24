import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { GetUserDto } from './dto/get-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './user.service';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUser(@Param() params: GetUserDto) {
    return this.userService.getUserById(params.id);
  }

  @Post()
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  @Put(':id')
  async updateUser(@Param() params: GetUserDto, @Body() dto: UpdateUserDto) {
    return this.userService.updateUser(params.id, dto);
  }
}
