import { HttpStatus } from '@nestjs/common';
import { FILE_UPLOAD_SECURITY_CONFIG } from './file-upload-security.config';

/**
 * Legacy file upload configuration
 * @deprecated Use FILE_UPLOAD_SECURITY_CONFIG instead
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: FILE_UPLOAD_SECURITY_CONFIG.MAX_FILE_SIZE,

  ALLOWED_FILE_TYPES: [
    'image/jpeg', 
    'image/png', 
    'image/webp', 
    'application/pdf'
  ], 

  ERROR_HTTP_STATUS: HttpStatus.UNPROCESSABLE_ENTITY, 
} as const;

/**
 * Export security configuration as default
 */
export { FILE_UPLOAD_SECURITY_CONFIG } from './file-upload-security.config';