import {
    Controller,
    Post,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiConsumes,
    ApiBody,
    ApiBadRequestResponse,
} from '@nestjs/swagger';
import { FileService } from './file.service';
import { FileUploadDto, FileUploadResponseDto, FileValidationResultDto } from './dto/file-upload.dto';
import { FileUploadValidationInterceptor } from './file-upload.interceptor';

@ApiTags('Files')
@Controller('files')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@UseInterceptors(FileUploadValidationInterceptor)
export class FileController {
    constructor(private readonly fileService: FileService) { }

    @Post('upload')
    @ApiOperation({ summary: 'Upload a file with validation' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'File upload with optional metadata',
        type: FileUploadDto,
    })
    @ApiResponse({
        status: 201,
        description: 'File uploaded successfully',
        type: FileUploadResponseDto,
    })
    @ApiBadRequestResponse({
        description: 'File validation failed',
        schema: {
            example: {
                success: false,
                message: 'File validation failed',
                statusCode: 422,
                errorCode: 'FILE_VALIDATION_ERROR',
                timestamp: '2026-02-20T10:00:00.000Z',
                path: '/api/v1/files/upload',
                details: {
                    violations: [
                        {
                            type: 'FILE_SIZE_EXCEEDED',
                            message: 'File size 15MB exceeds maximum allowed size of 10MB',
                            field: 'file',
                        },
                    ],
                },
            },
        },
    })
    @UseInterceptors(FileInterceptor('file'))
    async upload(@UploadedFile() file: Express.Multer.File): Promise<FileUploadResponseDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        try {
            return await this.fileService.processUpload(file);
        } catch (error) {
            // Re-throw validation errors for proper error handling
            if (error.name === 'FileValidationError') {
                throw error;
            }
            throw new BadRequestException('File upload failed: ' + error.message);
        }
    }

    @Post('validate')
    @ApiOperation({ summary: 'Validate a file without storing it' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'File to validate',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 200,
        description: 'File validation result',
        type: FileValidationResultDto,
    })
    @UseInterceptors(FileInterceptor('file'))
    async validateFile(
        @UploadedFile() file: Express.Multer.File
    ): Promise<FileValidationResultDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        return await this.fileService.validateFile(file);
    }

    @Post('upload/advanced')
    @ApiOperation({ summary: 'Upload file with metadata' })
    @ApiConsumes('multipart/form-data')
    @ApiBody({
        description: 'File upload with metadata',
        schema: {
            type: 'object',
            properties: {
                file: {
                    type: 'string',
                    format: 'binary',
                },
                description: {
                    type: 'string',
                    example: 'Insurance document',
                },
                category: {
                    type: 'string',
                    example: 'document',
                },
                referenceId: {
                    type: 'string',
                    example: 'claim_12345',
                },
            },
            required: ['file'],
        },
    })
    @ApiResponse({
        status: 201,
        description: 'File uploaded successfully with metadata',
        type: FileUploadResponseDto,
    })
    @UseInterceptors(FileInterceptor('file'))
    async uploadAdvanced(
        @UploadedFile() file: Express.Multer.File,
        // In a real implementation, you'd extract form fields here
        // This is simplified for demonstration
    ): Promise<FileUploadResponseDto> {
        if (!file) {
            throw new BadRequestException('No file provided');
        }

        try {
            // Extract metadata from request (simplified)
            // In a real implementation, you'd use @Body() or custom parsing
            const options = {
                description: 'Uploaded file', // Would come from request body
                category: 'document',         // Would come from request body
                referenceId: 'ref_123',       // Would come from request body
            };

            return await this.fileService.processUpload(file, options);
        } catch (error) {
            if (error.name === 'FileValidationError') {
                throw error;
            }
            throw new BadRequestException('File upload failed: ' + error.message);
        }
    }
}
