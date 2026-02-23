import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

/**
 * File metadata information
 */
export class FileMetadata {
  @ApiProperty({
    description: 'Unique file identifier',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  id: string;

  @ApiProperty({
    description: 'Stored filename',
    example: 'a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8.pdf',
  })
  filename: string;

  @ApiProperty({
    description: 'Original filename from client',
    example: 'insurance_document.pdf',
  })
  originalname: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 1024000,
  })
  size: number;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  mimetype: string;

  @ApiProperty({
    description: 'File extension',
    example: '.pdf',
  })
  extension: string;

  @ApiProperty({
    description: 'URL to access the file',
    example: '/api/v1/files/a1b2c3d4-e5f6-7890-g1h2-i3j4k5l6m7n8',
  })
  url: string;

  @ApiProperty({
    description: 'File upload timestamp',
    example: '2026-02-20T10:00:00.000Z',
  })
  uploadedAt: string;

  @ApiProperty({
    description: 'File category/type',
    example: 'document',
    required: false,
  })
  category?: string;

  @ApiProperty({
    description: 'Reference ID if provided',
    example: 'claim_12345',
    required: false,
  })
  referenceId?: string;

  @ApiProperty({
    description: 'File hash for integrity verification',
    example: 'sha256:abc123def456...',
    required: false,
  })
  hash?: string;
}

/**
 * File Upload Request DTO
 * Validates file upload request parameters
 */
export class FileUploadDto {
  @ApiProperty({
    description: 'File to upload',
    type: 'string',
    format: 'binary',
  })
  @IsNotEmpty({ message: 'File is required' })
  file: any;

  @ApiProperty({
    description: 'Optional description of the file',
    example: 'Insurance document for claim #12345',
    required: false,
  })
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must not exceed 1000 characters' })
  description?: string;

  @ApiProperty({
    description: 'Category or type of file',
    example: 'document',
    required: false,
  })
  @IsString({ message: 'Category must be a string' })
  @Matches(/^(image|document|pdf|spreadsheet|other)$/, {
    message: 'Category must be one of: image, document, pdf, spreadsheet, other'
  })
  category?: string;

  @ApiProperty({
    description: 'Reference ID for associating file with entity',
    example: 'claim_12345',
    required: false,
  })
  @IsString({ message: 'Reference ID must be a string' })
  @MaxLength(100, { message: 'Reference ID must not exceed 100 characters' })
  referenceId?: string;
}

/**
 * File Upload Response DTO
 * Standardized response for file upload operations
 */
export class FileUploadResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'File uploaded successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Uploaded file metadata',
  })
  data: FileMetadata;

  @ApiProperty({
    description: 'Response timestamp',
    example: '2026-02-20T10:00:00.000Z',
  })
  timestamp: string;
}

/**
 * File validation result DTO
 * Used for returning detailed validation results
 */
export class FileValidationResultDto {
  @ApiProperty({
    description: 'Whether the file is valid',
    example: true,
  })
  isValid: boolean;

  @ApiProperty({
    description: 'Validation errors if any',
    type: [Object],
    required: false,
  })
  errors?: Array<{
    type: string;
    message: string;
    field: string;
    details?: any;
  }>;

  @ApiProperty({
    description: 'File metadata if validation passed',
    required: false,
  })
  metadata?: FileMetadata;
}