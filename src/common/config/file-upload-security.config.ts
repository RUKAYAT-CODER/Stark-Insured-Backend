import { HttpStatus } from '@nestjs/common';

/**
 * Comprehensive file upload security configuration
 * Centralized configuration for all file upload security settings
 */
export const FILE_UPLOAD_SECURITY_CONFIG = {
  // Size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB default
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,  // 5MB for images
  MAX_PDF_SIZE: 20 * 1024 * 1024,   // 20MB for PDFs
  MAX_DOCUMENT_SIZE: 15 * 1024 * 1024, // 15MB for documents
  
  // Allowed MIME types whitelist
  ALLOWED_MIME_TYPES: [
    // Images
    'image/jpeg',
    'image/png', 
    'image/webp',
    'image/gif',
    
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    
    // Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  
  // Allowed file extensions
  ALLOWED_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.webp', '.gif',
    '.pdf', '.doc', '.docx', '.txt',
    '.xls', '.xlsx'
  ],
  
  // Executable and dangerous file extensions to reject
  BLOCKED_EXTENSIONS: [
    '.exe', '.bat', '.cmd', '.sh', '.php', 
    '.jsp', '.asp', '.aspx', '.pl', '.py',
    '.js', '.vbs', '.wsf', '.scr', '.com'
  ],
  
  // Security settings
  SCAN_FOR_MALWARE: true,
  REJECT_EXECUTABLES: true,
  REJECT_EMPTY_FILES: true,
  REJECT_CORRUPTED_FILES: true,
  CHECK_CONTENT_TYPE_CONSISTENCY: true,
  PREVENT_PATH_TRAVERSAL: true,
  
  // Rate limiting
  MAX_UPLOADS_PER_HOUR: 10,
  MAX_UPLOADS_PER_DAY: 50,
  MAX_CONCURRENT_UPLOADS: 3,
  
  // Storage settings
  UPLOAD_DIRECTORY: './uploads',
  TEMP_DIRECTORY: './temp',
  MAX_STORAGE_SPACE: 100 * 1024 * 1024 * 1024, // 100GB total
  
  // Validation settings
  VALIDATE_FILE_SIGNATURE: true,
  VALIDATE_FILE_EXTENSION: true,
  VALIDATE_MIME_TYPE: true,
  
  // Error handling
  ERROR_HTTP_STATUS: HttpStatus.UNPROCESSABLE_ENTITY,
  LOG_SECURITY_VIOLATIONS: true,
  LOG_VALIDATION_FAILURES: true,
  
  // File processing
  GENERATE_THUMBNAILS: true,
  EXTRACT_METADATA: true,
  VALIDATE_FILE_INTEGRITY: true,
} as const;

/**
 * File type specific configurations
 */
export const FILE_TYPE_CONFIGS = {
  image: {
    maxSize: FILE_UPLOAD_SECURITY_CONFIG.MAX_IMAGE_SIZE,
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif']
  },
  pdf: {
    maxSize: FILE_UPLOAD_SECURITY_CONFIG.MAX_PDF_SIZE,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['.pdf']
  },
  document: {
    maxSize: FILE_UPLOAD_SECURITY_CONFIG.MAX_DOCUMENT_SIZE,
    allowedTypes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ],
    allowedExtensions: ['.doc', '.docx', '.txt']
  }
} as const;

/**
 * Security validation rules
 */
export const SECURITY_RULES = {
  // Suspicious patterns to detect
  SUSPICIOUS_PATTERNS: [
    /(\.\.\/|\.\.\\)/,           // Path traversal
    /(script|javascript|vbscript)/i, // Script tags
    /(<\?php|<\?=|<\?)/i,        // PHP tags
    /(eval|exec|system|shell)/i, // Dangerous functions
    /(\.exe|\.bat|\.cmd)/i,      // Executable files
  ],
  
  // Minimum file size (reject empty files)
  MIN_FILE_SIZE: 1,
  
  // Maximum filename length
  MAX_FILENAME_LENGTH: 255,
  
  // Allowed characters in filenames
  FILENAME_ALLOWED_CHARS: /^[a-zA-Z0-9._-]+$/,
} as const;