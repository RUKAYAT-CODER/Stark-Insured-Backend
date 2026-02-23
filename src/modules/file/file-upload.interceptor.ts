import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { FileUploadValidationService } from '../../common/validation/file-upload.validator';
import { FileValidationError } from '../../common/validation/file-upload.errors';
import { ApiErrorResponse } from '../../common/interfaces/api-response.interface';

/**
 * File Upload Validation Interceptor
 * Automatically validates file uploads and provides standardized error responses
 */
@Injectable()
export class FileUploadValidationInterceptor implements NestInterceptor {
  constructor(
    private readonly fileValidationService: FileUploadValidationService
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    
    // Check if this is a file upload request
    if (this.isFileUploadRequest(request)) {
      try {
        // Get file from request
        const file = this.extractFileFromRequest(request);
        
        if (file) {
          // Determine file type from request or file properties
          const fileType = this.determineFileType(request, file);
          
          // Validate the file
          await this.fileValidationService.validateFileUpload(file, fileType as any);
        }
      } catch (error) {
        // Handle validation errors
        if (error instanceof FileValidationError) {
          return throwError(() => this.createValidationErrorResponse(error, context));
        }
        
        // Handle other errors
        return throwError(() => new BadRequestException('File upload validation failed'));
      }
    }

    return next.handle().pipe(
      catchError((error) => {
        // Handle any errors that occur during file processing
        if (error instanceof FileValidationError) {
          return throwError(() => this.createValidationErrorResponse(error, context));
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if the request is a file upload
   */
  private isFileUploadRequest(request: any): boolean {
    return (
      request.method === 'POST' &&
      request.headers &&
      request.headers['content-type'] &&
      request.headers['content-type'].includes('multipart/form-data')
    );
  }

  /**
   * Extract file from request
   */
  private extractFileFromRequest(request: any): Express.Multer.File | null {
    // Check common file field names
    const fileFields = ['file', 'document', 'image', 'attachment'];
    
    for (const field of fileFields) {
      if (request.file && request.file.fieldname === field) {
        return request.file;
      }
      if (request.files && request.files[field]) {
        return request.files[field][0] || request.files[field];
      }
    }
    
    // If no specific field found, return the first file
    if (request.file) {
      return request.file;
    }
    
    if (request.files) {
      const files = Object.values(request.files).flat();
      if (files.length > 0) {
        return files[0] as Express.Multer.File;
      }
    }
    
    return null;
  }

  /**
   * Determine file type from request context
   */
  private determineFileType(request: any, file: Express.Multer.File): string | undefined {
    // Check URL path for type hints
    const url = request.url.toLowerCase();
    
    if (url.includes('image') || file.mimetype?.startsWith('image/')) {
      return 'image';
    }
    
    if (url.includes('pdf') || file.mimetype === 'application/pdf') {
      return 'pdf';
    }
    
    if (url.includes('document') || 
        file.mimetype?.includes('document') || 
        file.mimetype === 'text/plain') {
      return 'document';
    }
    
    // Try to infer from file extension
    const extension = file.originalname?.split('.').pop()?.toLowerCase();
    if (extension) {
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        return 'image';
      }
      if (extension === 'pdf') {
        return 'pdf';
      }
      if (['doc', 'docx', 'txt'].includes(extension)) {
        return 'document';
      }
    }
    
    return undefined;
  }

  /**
   * Create standardized validation error response
   */
  private createValidationErrorResponse(
    error: FileValidationError,
    context: ExecutionContext
  ): BadRequestException {
    const request = context.switchToHttp().getRequest();
    
    const response: ApiErrorResponse = {
      success: false,
      message: 'File validation failed',
      statusCode: 422,
      errorCode: error.code,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: {
        violations: error.violations.map(violation => ({
          type: violation.code,
          message: violation.message,
          field: violation.field,
          details: violation.details
        }))
      }
    };

    // Create a custom exception with the structured response
    class FileValidationException extends BadRequestException {
      constructor() {
        super(response);
      }
      
      getResponse(): ApiErrorResponse {
        return response;
      }
    }

    return new FileValidationException();
  }
}