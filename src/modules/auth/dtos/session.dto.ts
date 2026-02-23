import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for logout
 */
export class LogoutDto {
  @ApiPropertyOptional({
    description: 'Refresh token to revoke',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({
    description: 'Session token to revoke',
  })
  @IsString()
  @IsOptional()
  sessionToken?: string;

  @ApiPropertyOptional({
    description: 'Logout from all devices',
  })
  @IsOptional()
  logoutAll?: boolean;
}

/**
 * DTO for revoking a session
 */
export class RevokeSessionDto {
  @ApiProperty({
    description: 'Session ID to revoke',
  })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiPropertyOptional({
    description: 'Reason for revocation',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

/**
 * DTO for getting sessions
 */
export class SessionQueryDto {
  @ApiPropertyOptional({
    description: 'Include device details',
  })
  @IsOptional()
  includeDetails?: boolean;
}
