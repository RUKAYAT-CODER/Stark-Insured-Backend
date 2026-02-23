import { DomainError } from '../errors/domain.error';

/**
 * Base file upload error
 */
export class FileUploadError extends DomainError {
  constructor(
    message: string,
    code: string,
    public readonly field: string,
    public readonly details?: any
  ) {
    super(message, code, details);
  }
}

/**
 * File size validation errors
 */
export class FileSizeExceededError extends FileUploadError {
  constructor(
    field: string,
    fileSize: number,
    maxSize: number,
    fileType?: string
  ) {
    const fileTypeText = fileType ? ` for ${fileType} files` : '';
    const message = `File size ${formatFileSize(fileSize)} exceeds maximum allowed size of ${formatFileSize(maxSize)}${fileTypeText}`;
    
    super(
      message,
      'FILE_SIZE_EXCEEDED',
      field,
      {
        fileSize,
        maxSize,
        fileType
      }
    );
  }
}

export class FileSizeTooSmallError extends FileUploadError {
  constructor(
    field: string,
    fileSize: number,
    minSize: number
  ) {
    const message = `File size ${formatFileSize(fileSize)} is too small. Minimum size is ${formatFileSize(minSize)}`;
    
    super(
      message,
      'FILE_SIZE_TOO_SMALL',
      field,
      {
        fileSize,
        minSize
      }
    );
  }
}

/**
 * File type validation errors
 */
export class InvalidFileTypeError extends FileUploadError {
  constructor(
    field: string,
    mimeType: string,
    allowedTypes: string[]
  ) {
    const message = `Invalid file type: ${mimeType}. Allowed types: ${allowedTypes.join(', ')}`;
    
    super(
      message,
      'INVALID_FILE_TYPE',
      field,
      {
        mimeType,
        allowedTypes
      }
    );
  }
}

export class InvalidFileExtensionError extends FileUploadError {
  constructor(
    field: string,
    extension: string,
    allowedExtensions: string[]
  ) {
    const message = `Invalid file extension: ${extension}. Allowed extensions: ${allowedExtensions.join(', ')}`;
    
    super(
      message,
      'INVALID_FILE_EXTENSION',
      field,
      {
        extension,
        allowedExtensions
      }
    );
  }
}

export class BlockedFileExtensionError extends FileUploadError {
  constructor(
    field: string,
    extension: string
  ) {
    const message = `File extension ${extension} is not allowed for security reasons`;
    
    super(
      message,
      'BLOCKED_FILE_EXTENSION',
      field,
      {
        extension
      }
    );
  }
}

/**
 * File content validation errors
 */
export class EmptyFileError extends FileUploadError {
  constructor(field: string) {
    const message = 'File cannot be empty';
    
    super(
      message,
      'EMPTY_FILE',
      field
    );
  }
}

export class CorruptedFileError extends FileUploadError {
  constructor(
    field: string,
    reason: string
  ) {
    const message = `File appears to be corrupted: ${reason}`;
    
    super(
      message,
      'CORRUPTED_FILE',
      field,
      {
        reason
      }
    );
  }
}

export class ContentTypeMismatchError extends FileUploadError {
  constructor(
    field: string,
    declaredType: string,
    detectedType: string
  ) {
    const message = `Content type mismatch: declared as ${declaredType} but detected as ${detectedType}`;
    
    super(
      message,
      'CONTENT_TYPE_MISMATCH',
      field,
      {
        declaredType,
        detectedType
      }
    );
  }
}

/**
 * Security validation errors
 */
export class SecurityViolationError extends FileUploadError {
  constructor(
    field: string,
    violationType: string,
    details?: any
  ) {
    const message = `Security violation detected: ${violationType}`;
    
    super(
      message,
      'SECURITY_VIOLATION',
      field,
      {
        violationType,
        ...details
      }
    );
  }
}

export class PathTraversalError extends SecurityViolationError {
  constructor(field: string, path: string) {
    super(
      field,
      'PATH_TRAVERSAL_ATTEMPT',
      { path }
    );
  }
}

export class SuspiciousContentError extends SecurityViolationError {
  constructor(
    field: string,
    pattern: string,
    contentPreview?: string
  ) {
    super(
      field,
      'SUSPICIOUS_CONTENT',
      {
        pattern,
        contentPreview
      }
    );
  }
}

/**
 * Rate limiting errors
 */
export class UploadRateLimitError extends FileUploadError {
  constructor(
    field: string,
    limitType: string,
    limit: number,
    period?: string
  ) {
    const periodText = period ? ` per ${period}` : '';
    const message = `Upload rate limit exceeded: ${limit}${periodText} for ${limitType}`;
    
    super(
      message,
      'UPLOAD_RATE_LIMIT_EXCEEDED',
      field,
      {
        limitType,
        limit,
        period
      }
    );
  }
}

export class ConcurrentUploadLimitError extends FileUploadError {
  constructor(
    field: string,
    current: number,
    max: number
  ) {
    const message = `Concurrent upload limit exceeded: ${current}/${max} uploads in progress`;
    
    super(
      message,
      'CONCURRENT_UPLOAD_LIMIT_EXCEEDED',
      field,
      {
        current,
        max
      }
    );
  }
}

/**
 * Storage errors
 */
export class StorageQuotaExceededError extends FileUploadError {
  constructor(
    field: string,
    usedSpace: number,
    quota: number
  ) {
    const message = `Storage quota exceeded: ${formatFileSize(usedSpace)} used of ${formatFileSize(quota)} available`;
    
    super(
      message,
      'STORAGE_QUOTA_EXCEEDED',
      field,
      {
        usedSpace,
        quota
      }
    );
  }
}

/**
 * Utility function to format file sizes
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * File validation error collection
 */
export class FileValidationError extends DomainError {
  constructor(
    public readonly violations: FileUploadError[]
  ) {
    const message = `File validation failed with ${violations.length} error(s)`;
    super(
      message,
      'FILE_VALIDATION_ERROR',
      {
        violationCount: violations.length,
        violations: violations.map(v => ({
          type: v.code,
          message: v.message,
          field: v.field,
          details: v.details
        }))
      }
    );
  }
}