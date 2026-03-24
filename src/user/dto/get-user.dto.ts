import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetUserDto {
  @ApiProperty({
    description: 'User unique identifier',
    example: 'cuid123...'
  })
  @IsUUID()
  id: string;
}
