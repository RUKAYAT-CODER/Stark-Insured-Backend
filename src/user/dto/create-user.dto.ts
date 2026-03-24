import { IsString, IsEmail, IsOptional, IsNotEmpty } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  walletAddress: string;

  @IsOptional()
  @IsEmail()
  @Trim()
  email?: string;

  @IsOptional()
  profileData?: any;
}
