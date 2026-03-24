import { IsOptional, IsString, IsEmail } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @Trim()
  walletAddress?: string;

  @IsOptional()
  @IsEmail()
  @Trim()
  email?: string;

  @IsOptional()
  profileData?: any;
}
