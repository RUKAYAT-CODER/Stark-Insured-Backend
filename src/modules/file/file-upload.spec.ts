import { Test, TestingModule } from '@nestjs/testing';
import { FileService } from './file.service';
import { FileUploadValidationService } from '../../common/validation/file-upload.validator';
import { StringSanitizationService } from '../../common/validation/sanitizers/string.sanitization.service';
import { FileValidationError } from '../../common/validation/file-upload.errors';

describe('File Upload Validation', () => {
  let fileService: FileService;
  let fileValidationService: FileUploadValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileService,
        FileUploadValidationService,
        StringSanitizationService,
      ],
    }).compile();

    fileService = module.get<FileService>(FileService);
    fileValidationService = module.get<FileUploadValidationService>(FileUploadValidationService);
  });

  describe('File Validation Service', () => {
    it('should reject files with invalid extensions', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'malicious.exe',
        encoding: '7bit',
        mimetype: 'application/x-msdownload',
        buffer: Buffer.from('test'),
        size: 1000,
      } as Express.Multer.File;

      await expect(
        fileValidationService.validateFileUpload(mockFile)
      ).rejects.toThrow(FileValidationError);
    });

    it('should reject oversized files', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'large.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.alloc(15 * 1024 * 1024), // 15MB
        size: 15 * 1024 * 1024,
      } as Express.Multer.File;

      await expect(
        fileValidationService.validateFileUpload(mockFile)
      ).rejects.toThrow(FileValidationError);
    });

    it('should accept valid files', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'document.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 test content'),
        size: 1024,
      } as Express.Multer.File;

      await expect(
        fileValidationService.validateFileUpload(mockFile)
      ).resolves.toBeUndefined();
    });

    it('should reject empty files', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'empty.txt',
        encoding: '7bit',
        mimetype: 'text/plain',
        buffer: Buffer.alloc(0),
        size: 0,
      } as Express.Multer.File;

      await expect(
        fileValidationService.validateFileUpload(mockFile)
      ).rejects.toThrow(FileValidationError);
    });
  });

  describe('File Service', () => {
    it('should validate files and return metadata', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'image.png',
        encoding: '7bit',
        mimetype: 'image/png',
        buffer: Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]),
        size: 5000,
      } as Express.Multer.File;

      const result = await fileService.processUpload(mockFile);
      
      expect(result.success).toBe(true);
      expect(result.data.originalname).toBe('image.png');
      expect(result.data.mimetype).toBe('image/png');
      expect(result.data.size).toBe(5000);
    });

    it('should provide file validation without processing', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'valid.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 valid content'),
        size: 1024,
      } as Express.Multer.File;

      const result = await fileService.validateFile(mockFile);
      
      expect(result.isValid).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata?.originalname).toBe('valid.pdf');
    });

    it('should reject invalid files during validation', async () => {
      const mockFile = {
        fieldname: 'file',
        originalname: 'dangerous.bat',
        encoding: '7bit',
        mimetype: 'application/bat',
        buffer: Buffer.from('echo dangerous'),
        size: 100,
      } as Express.Multer.File;

      const result = await fileService.validateFile(mockFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should provide allowed file types', () => {
      const mimeTypes = fileValidationService.getAllowedMimeTypes();
      expect(mimeTypes).toContain('image/jpeg');
      expect(mimeTypes).toContain('application/pdf');
    });

    it('should provide allowed extensions', () => {
      const extensions = fileValidationService.getAllowedExtensions();
      expect(extensions).toContain('.jpg');
      expect(extensions).toContain('.pdf');
    });

    it('should validate file type allowance', () => {
      expect(fileValidationService.isAllowedFileType('image/png')).toBe(true);
      expect(fileValidationService.isAllowedFileType('application/exe')).toBe(false);
    });

    it('should validate extension allowance', () => {
      expect(fileValidationService.isAllowedExtension('.png')).toBe(true);
      expect(fileValidationService.isAllowedExtension('.exe')).toBe(false);
    });
  });
});