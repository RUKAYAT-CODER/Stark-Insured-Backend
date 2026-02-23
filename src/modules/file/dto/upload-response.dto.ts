import { ApiProperty } from '@nestjs/swagger';

export class UploadResponseDto {
  @ApiProperty({ description: 'Stored filename (unique identifier)' })
  filename: string;

  @ApiProperty({ description: 'Original filename from client' })
  originalname: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type of the file' })
  mimetype: string;
}
