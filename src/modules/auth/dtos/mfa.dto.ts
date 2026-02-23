import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for initiating MFA setup
 */
export class MfaSetupInitDto {
  @ApiPropertyOptional({
    description: 'MFA method to set up (default: TOTP)',
    enum: ['TOTP', 'SMS'],
  })
  @IsString()
  @IsOptional()
  method?: string;
}

/**
 * DTO for verifying MFA setup with TOTP code
 */
export class MfaSetupVerifyDto {
  @ApiProperty({
    description: 'TOTP code from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  totpCode: string;

  @ApiProperty({
    description: 'Secret key received during MFA setup',
    example: 'JBSWY3DPEBLW64TMMQ======',
  })
  @IsString()
  @IsNotEmpty()
  secret: string;
}

/**
 * DTO for MFA verification during login
 */
export class MfaVerifyDto {
  @ApiProperty({
    description: 'TOTP code or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Session token from initial login',
    example: 'session_token_here',
  })
  @IsString()
  @IsOptional()
  sessionToken?: string;

  @ApiPropertyOptional({
    description: 'Indicates if this is a backup code (default: false)',
  })
  @IsOptional()
  isBackupCode?: boolean;
}

/**
 * DTO for disabling MFA
 */
export class MfaDisableDto {
  @ApiProperty({
    description: 'Current password for verification',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
