import { IsString, IsNotEmpty, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProposalDto {
  @ApiProperty({ description: 'The title of the proposal' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Detailed description of the proposal' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: 'Expiration date for voting', example: '2026-03-30T12:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  expiresAt: string;
}
