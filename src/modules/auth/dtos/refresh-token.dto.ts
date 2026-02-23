import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for refreshing access token using refresh token
 */
export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token obtained from login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({
    description: 'Session token for device tracking (optional)',
    example: 'session_token_here',
  })
  @IsString()
  @IsOptional()
  sessionToken?: string;
}
