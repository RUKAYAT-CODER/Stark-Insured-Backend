import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadResponseDto, FileMetadata } from './dto/file-upload.dto';
import { FileUploadValidationService } from '../../common/validation/file-upload.validator';
import { FILE_UPLOAD_SECURITY_CONFIG } from '../../common/config/file-upload-security.config';
import { uploadToS3, getS3ObjectUrl, getSignedUrl } from './aws-s3.util';
import { getCloudFrontUrl } from './cloudfront.util';

@Injectable()
export class FileService {
  constructor(
    private readonly fileValidationService: FileUploadValidationService,
  ) {}

  /**
   * Process an uploaded file with comprehensive validation and security checks
   * Uploads file to AWS S3 and returns CDN/S3 URL
   */
  async processUpload(
    file: Express.Multer.File,
    options?: {
      description?: string;
      category?: string;
      referenceId?: string;
    },
  ): Promise<FileUploadResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      // Validate the file
      await this.fileValidationService.validateFileUpload(file);

      // Generate unique filename
      const uniqueId = uuidv4();
      const extension = this.getFileExtension(file.originalname);
      const storedFilename = `${uniqueId}${extension}`;

      // Upload file to S3
      // If file.stream exists, use it for large files
      const uploadSource = file.stream || file.buffer;
      await uploadToS3(uploadSource, storedFilename, file.mimetype);

      // Generate CDN/S3 URL
      const s3Url = getS3ObjectUrl(storedFilename);
      const cdnUrl = process.env.AWS_CLOUDFRONT_DOMAIN
        ? getCloudFrontUrl(storedFilename)
        : s3Url;
      const signedUrl = await getSignedUrl(storedFilename);

      // Create file metadata
      const metadata: FileMetadata = {
        id: uniqueId,
        filename: storedFilename,
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        extension: extension,
        url: cdnUrl,
        uploadedAt: new Date().toISOString(),
        category: options?.category,
        referenceId: options?.referenceId,
        hash: this.generateFileHash(file.buffer),
        signedUrl,
        s3Url,
        cdnUrl,
      };

      // Return success response
      return {
        success: true,
        message: 'File uploaded successfully',
        data: metadata,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      // Re-throw validation errors for proper error handling
      if (error.name === 'FileValidationError') {
        throw error;
      }

      throw new BadRequestException('File processing failed: ' + error.message);
    }
  }

  /**
   * Validate a file without processing it
   */
  async validateFile(file: Express.Multer.File): Promise<{
    isValid: boolean;
    errors?: any[];
    metadata?: FileMetadata;
  }> {
    if (!file) {
      return {
        isValid: false,
        errors: [
          {
            type: 'NO_FILE',
            message: 'No file provided',
            field: 'file',
          },
        ],
      };
    }

    try {
      await this.fileValidationService.validateFileUpload(file);

      // If validation passes, return basic metadata
      const extension = this.getFileExtension(file.originalname);

      return {
        isValid: true,
        metadata: {
          id: uuidv4(),
          filename: file.filename || 'temp',
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
          extension: extension,
          url: '',
          uploadedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      if (error.name === 'FileValidationError') {
        return {
          isValid: false,
          errors: error.violations?.map(v => ({
            type: v.code,
            message: v.message,
            field: v.field,
            details: v.details,
          })) || [
            {
              type: 'VALIDATION_ERROR',
              message: error.message,
              field: 'file',
            },
          ],
        };
      }

      return {
        isValid: false,
        errors: [
          {
            type: 'PROCESSING_ERROR',
            message: error.message,
            field: 'file',
          },
        ],
      };
    }
  }

  /**
   * Get file type configuration
   */
  getFileTypeConfig(fileType: string) {
    return this.fileValidationService.getFileTypeConfig(fileType as any);
  }

  /**
   * Get allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return this.fileValidationService.getAllowedMimeTypes();
  }

  /**
   * Get allowed file extensions
   */
  getAllowedExtensions(): string[] {
    return this.fileValidationService.getAllowedExtensions();
  }

  /**
   * Check if file type is allowed
   */
  isAllowedFileType(mimeType: string): boolean {
    return this.fileValidationService.isAllowedFileType(mimeType);
  }

  /**
   * Check if file extension is allowed
   */
  isAllowedExtension(extension: string): boolean {
    return this.fileValidationService.isAllowedExtension(extension);
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    if (!filename) return '';

    const parts = filename.split('.');
    if (parts.length < 2) return '';

    return '.' + parts[parts.length - 1].toLowerCase();
  }

  /**
   * Generate file hash for integrity verification
   * In production, use a proper crypto library
   */
  private generateFileHash(buffer: Buffer): string {
    // Simple hash for demonstration - use proper crypto in production
    if (!buffer || buffer.length === 0) return '';

    // Simple checksum (not secure, for demonstration only)
    let hash = 0;
    for (let i = 0; i < Math.min(buffer.length, 1000); i++) {
      hash = ((hash << 5) - hash + buffer[i]) & 0xffffffff;
    }

    return `simple:${Math.abs(hash).toString(16)}`;
  }
}
