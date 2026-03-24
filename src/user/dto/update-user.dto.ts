import { IsOptional, IsString, IsEmail } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'User wallet address',
    example: '0x1234567890abcdef...'
  })
  @IsOptional()
  @IsString()
  @Trim()
  walletAddress?: string;

  @ApiPropertyOptional({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsOptional()
  @IsEmail()
  @Trim()
  email?: string;

  @ApiPropertyOptional({
    description: 'User profile data (JSON object)',
    example: { name: 'John Doe', avatar: 'https://example.com/avatar.jpg' }
  })
  @IsOptional()
  profileData?: any;
}
