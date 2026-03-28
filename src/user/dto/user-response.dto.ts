import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'cuid123...'
  })
  id: string;

  @ApiProperty({
    description: 'User wallet address',
    example: '0x1234567890abcdef...'
  })
  walletAddress: string;

  @ApiProperty({
    description: 'User email address (decrypted from storage)',
    example: 'user@example.com',
    required: false
  })
  email?: string;

  @ApiProperty({
    description: 'User profile data (decrypted from storage)',
    required: false,
    example: { name: 'John Doe', avatar: 'https://example.com/avatar.jpg' }
  })
  profileData?: any;

  @ApiProperty({
    description: 'User reputation score',
    example: 100
  })
  reputationScore: number;

  @ApiProperty({
    description: 'User trust score',
    example: 500
  })
  trustScore: number;

  @ApiProperty({
    description: 'User creation timestamp',
    example: '2023-01-01T00:00:00.000Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User last update timestamp',
    example: '2023-01-01T00:00:00.000Z'
  })
  updatedAt: Date;
}
