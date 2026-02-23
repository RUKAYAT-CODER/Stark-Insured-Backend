import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({ description: 'New access token' })
  accessToken: string;

  @ApiProperty({ description: 'Access token expires in seconds' })
  expiresIn: number;

  @ApiProperty({ description: 'Expiration timestamp for access token' })
  expiresAt: Date;

  @ApiProperty({ description: 'Token type', example: 'Bearer' })
  tokenType: 'Bearer';

  @ApiPropertyOptional({
    description: 'Rotated refresh token (present if rotation is enabled)',
  })
  refreshToken?: string;
}
