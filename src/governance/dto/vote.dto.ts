import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VoteDto {
  @ApiProperty({ description: 'True for "For", False for "Against"' })
  @IsBoolean()
  @IsNotEmpty()
  support: boolean;
}
