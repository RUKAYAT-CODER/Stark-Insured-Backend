import { Injectable } from '@nestjs/common';
import { StringSanitizationService } from './sanitizers/string.sanitization.service';
import { 
  FILE_UPLOAD_SECURITY_CONFIG, 
  FILE_TYPE_CONFIGS, 
  SECURITY_RULES 
} from '../config/file-upload-security.config';
import {
  FileUploadError,
  FileSizeExceededError,
  FileSizeTooSmallError,
  InvalidFileTypeError,
  InvalidFileExtensionError,
  BlockedFileExtensionError,
  EmptyFileError,
  CorruptedFileError,
  ContentTypeMismatchError,
  SecurityViolationError,
  PathTraversalError,
  SuspiciousContentError,
  FileValidationError
} from './file-upload.errors';

/**
 * Comprehensive file validation service
 * Handles all aspects of file upload security and validation
 */
@Injectable()
export class FileUploadValidationService {
  constructor(
    private readonly sanitizationService: StringSanitizationService
  ) {}

  /**
   * Validate file upload with comprehensive security checks
   */
  async validateFileUpload(
    file: Express.Multer.File,
    fileType?: keyof typeof FILE_TYPE_CONFIGS
  ): Promise<void> {
    const violations: FileUploadError[] = [];

    try {
      // 1. Basic file existence check
      if (!file) {
        violations.push(new FileUploadError(
          'No file provided',
          'NO_FILE_PROVIDED',
          'file'
        ));
        throw new FileValidationError(violations);
      }

      // 2. Filename validation
      const filenameViolations = this.validateFilename(file.originalname);
      violations.push(...filenameViolations);

      // 3. Size validation
      const sizeViolations = this.validateFileSize(file, fileType);
      violations.push(...sizeViolations);

      // 4. File type validation
      const typeViolations = this.validateFileType(file, fileType);
      violations.push(...typeViolations);

      // 5. Extension validation
      const extensionViolations = this.validateFileExtension(file);
      violations.push(...extensionViolations);

      // 6. Content validation
      const contentViolations = await this.validateFileContent(file);
      violations.push(...contentViolations);

      // 7. Security validation
      const securityViolations = this.validateFileSecurity(file);
      violations.push(...securityViolations);

      // If any violations found, throw validation error
      if (violations.length > 0) {
        throw new FileValidationError(violations);
      }

    } catch (error) {
      if (error instanceof FileValidationError) {
        throw error;
      }
      // Handle unexpected errors
      violations.push(new FileUploadError(
        'Unexpected error during file validation',
        'VALIDATION_ERROR',
        'file',
        { error: error.message }
      ));
      throw new FileValidationError(violations);
    }
  }

  /**
   * Validate filename for security issues
   */
  private validateFilename(filename: string): FileUploadError[] {
    const violations: FileUploadError[] = [];

    if (!filename) {
      violations.push(new FileUploadError(
        'Filename is required',
        'MISSING_FILENAME',
        'file'
      ));
      return violations;
    }

    // Check filename length
    if (filename.length > SECURITY_RULES.MAX_FILENAME_LENGTH) {
      violations.push(new FileUploadError(
        `Filename too long: ${filename.length} characters (max ${SECURITY_RULES.MAX_FILENAME_LENGTH})`,
        'FILENAME_TOO_LONG',
        'file'
      ));
    }

    // Check for path traversal attempts
    if (SECURITY_RULES.SUSPICIOUS_PATTERNS[0].test(filename)) {
      violations.push(new PathTraversalError('file', filename));
    }

    // Sanitize filename
    const sanitized = this.sanitizationService.sanitizeFileName(filename);
    if (sanitized !== filename) {
      violations.push(new SecurityViolationError(
        'file',
        'UNSAFE_FILENAME_CHARACTERS',
        { original: filename, sanitized }
      ));
    }

    return violations;
  }

  /**
   * Validate file size based on type and configuration
   */
  private validateFileSize(
    file: Express.Multer.File,
    fileType?: string
  ): FileUploadError[] {
    const violations: FileUploadError[] = [];
    const fileSize = file.size;

    // Check minimum size
    if (fileSize < SECURITY_RULES.MIN_FILE_SIZE) {
      violations.push(new EmptyFileError('file'));
      return violations;
    }

    // Check maximum size based on file type or default
    let maxSize = FILE_UPLOAD_SECURITY_CONFIG.MAX_FILE_SIZE;
    
    if (fileType && FILE_TYPE_CONFIGS[fileType as keyof typeof FILE_TYPE_CONFIGS]) {
      maxSize = FILE_TYPE_CONFIGS[fileType as keyof typeof FILE_TYPE_CONFIGS].maxSize;
    }

    if (fileSize > maxSize) {
      violations.push(new FileSizeExceededError(
        'file',
        fileSize,
        maxSize,
        fileType as string
      ));
    }

    return violations;
  }

  /**
   * Validate file type (MIME type)
   */
  private validateFileType(
    file: Express.Multer.File,
    fileType?: string
  ): FileUploadError[] {
    const violations: FileUploadError[] = [];
    const mimeType = file.mimetype;

    if (!mimeType) {
      violations.push(new FileUploadError(
        'File MIME type is missing',
        'MISSING_MIME_TYPE',
        'file'
      ));
      return violations;
    }

    // Check against file type specific allowed types
    if (fileType && FILE_TYPE_CONFIGS[fileType as keyof typeof FILE_TYPE_CONFIGS]) {
      const allowedTypes = [...FILE_TYPE_CONFIGS[fileType as keyof typeof FILE_TYPE_CONFIGS].allowedTypes];
      if (!allowedTypes.includes(mimeType as any)) {
        violations.push(new InvalidFileTypeError(
          'file',
          mimeType,
          allowedTypes
        ));
      }
    } else {
      // Check against global allowed types
      if (!FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any)) {
        violations.push(new InvalidFileTypeError(
          'file',
          mimeType,
          [...FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_MIME_TYPES]
        ));
      }
    }

    return violations;
  }

  /**
   * Validate file extension
   */
  private validateFileExtension(file: Express.Multer.File): FileUploadError[] {
    const violations: FileUploadError[] = [];
    const filename = file.originalname.toLowerCase();
    
    // Extract extension
    const extension = '.' + filename.split('.').pop();
    
    if (!extension || extension === '.') {
      violations.push(new FileUploadError(
        'File extension is missing',
        'MISSING_FILE_EXTENSION',
        'file'
      ));
      return violations;
    }

    // Check if extension is blocked
    if (FILE_UPLOAD_SECURITY_CONFIG.BLOCKED_EXTENSIONS.includes(extension as any)) {
      violations.push(new BlockedFileExtensionError('file', extension));
      return violations;
    }

    // Check if extension is allowed
    if (!FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension as any)) {
      violations.push(new InvalidFileExtensionError(
        'file',
        extension,
        [...FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_EXTENSIONS]
      ));
    }

    return violations;
  }

  /**
   * Validate file content for corruption and consistency
   */
  private async validateFileContent(file: Express.Multer.File): Promise<FileUploadError[]> {
    const violations: FileUploadError[] = [];

    // Check for empty buffer (corrupted file)
    if (!file.buffer || file.buffer.length === 0) {
      violations.push(new EmptyFileError('file'));
      return violations;
    }

    // Check file signature/magic numbers for consistency
    if (FILE_UPLOAD_SECURITY_CONFIG.VALIDATE_FILE_SIGNATURE) {
      const signatureViolations = this.validateFileSignature(file);
      violations.push(...signatureViolations);
    }

    // Check content-type consistency
    if (FILE_UPLOAD_SECURITY_CONFIG.CHECK_CONTENT_TYPE_CONSISTENCY) {
      const consistencyViolations = this.validateContentTypeConsistency(file);
      violations.push(...consistencyViolations);
    }

    return violations;
  }

  /**
   * Validate file signature (magic numbers)
   */
  private validateFileSignature(file: Express.Multer.File): FileUploadError[] {
    const violations: FileUploadError[] = [];
    const buffer = file.buffer;

    // Basic signature validation for common file types
    const signatures = {
      'image/jpeg': [0xFF, 0xD8, 0xFF],
      'image/png': [0x89, 0x50, 0x4E, 0x47],
      'image/gif': [0x47, 0x49, 0x46],
      'application/pdf': [0x25, 0x50, 0x44, 0x46],
    };

    const mimeType = file.mimetype;
    const expectedSignature = signatures[mimeType as keyof typeof signatures];

    if (expectedSignature && buffer.length >= expectedSignature.length) {
      const actualSignature = Array.from(buffer.slice(0, expectedSignature.length));
      
      const matches = expectedSignature.every((byte, index) => 
        actualSignature[index] === byte
      );

      if (!matches) {
        violations.push(new CorruptedFileError(
          'file',
          `File signature mismatch for ${mimeType}`
        ));
      }
    }

    return violations;
  }

  /**
   * Validate content-type consistency
   */
  private validateContentTypeConsistency(file: Express.Multer.File): FileUploadError[] {
    const violations: FileUploadError[] = [];
    
    // This would typically involve more sophisticated content analysis
    // For now, we'll do basic extension vs MIME type consistency checking
    
    const filename = file.originalname.toLowerCase();
    const mimeType = file.mimetype;
    
    // Simple consistency check
    const extension = filename.split('.').pop();
    const typeMap: Record<string, string[]> = {
      'jpg': ['image/jpeg'],
      'jpeg': ['image/jpeg'],
      'png': ['image/png'],
      'gif': ['image/gif'],
      'pdf': ['application/pdf'],
      'doc': ['application/msword'],
      'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'txt': ['text/plain']
    };

    if (extension && typeMap[extension]) {
      if (!typeMap[extension].includes(mimeType)) {
        violations.push(new ContentTypeMismatchError(
          'file',
          mimeType,
          typeMap[extension][0]
        ));
      }
    }

    return violations;
  }

  /**
   * Validate file for security violations
   */
  private validateFileSecurity(file: Express.Multer.File): FileUploadError[] {
    const violations: FileUploadError[] = [];
    
    // Check filename for suspicious patterns
    const filename = file.originalname;
    for (const pattern of SECURITY_RULES.SUSPICIOUS_PATTERNS) {
      if (pattern.test(filename)) {
        violations.push(new SuspiciousContentError(
          'file',
          pattern.toString(),
          filename.substring(0, 100) // Preview first 100 chars
        ));
      }
    }

    // Check buffer content for suspicious patterns (basic check)
    if (file.buffer && file.buffer.length > 0) {
      const content = file.buffer.toString('utf8', 0, Math.min(1000, file.buffer.length));
      
      for (const pattern of SECURITY_RULES.SUSPICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          violations.push(new SuspiciousContentError(
            'file',
            pattern.toString(),
            content.substring(0, 100) // Preview first 100 chars
          ));
        }
      }
    }

    return violations;
  }

  /**
   * Get file type configuration
   */
  getFileTypeConfig(fileType: keyof typeof FILE_TYPE_CONFIGS) {
    return FILE_TYPE_CONFIGS[fileType];
  }

  /**
   * Get all allowed MIME types
   */
  getAllowedMimeTypes(): string[] {
    return [...FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_MIME_TYPES];
  }

  /**
   * Get all allowed extensions
   */
  getAllowedExtensions(): string[] {
    return [...FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_EXTENSIONS];
  }

  /**
   * Check if a file type is allowed
   */
  isAllowedFileType(mimeType: string): boolean {
    return FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType as any);
  }

  /**
   * Check if a file extension is allowed
   */
  isAllowedExtension(extension: string): boolean {
    return FILE_UPLOAD_SECURITY_CONFIG.ALLOWED_EXTENSIONS.includes(extension.toLowerCase() as any);
  }
}