import { Test, TestingModule } from '@nestjs/testing';
import { SecurityFilterService } from '../../src/common/validation/filters/security-filter.service';
import { StringSanitizationService } from '../../src/common/validation/sanitizers/string.sanitization.service';
import { ValidationException } from '../../src/common/validation/errors/validation.exception';

describe('Security and Validation', () => {
  let securityFilter: SecurityFilterService;
  let sanitization: StringSanitizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityFilterService,
        StringSanitizationService,
      ],
    }).compile();

    securityFilter = module.get<SecurityFilterService>(SecurityFilterService);
    sanitization = module.get<StringSanitizationService>(StringSanitizationService);
  });

  describe('SecurityFilterService', () => {
    it('should detect blacklisted IP addresses', async () => {
      const result = await securityFilter.checkIpAddress('192.168.1.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('IP address is blacklisted');
      expect(result.riskLevel).toBe('high');
    });

    it('should allow whitelisted IP addresses', async () => {
      const result = await securityFilter.checkIpAddress('8.8.8.8');
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });

    it('should detect suspicious IP patterns', async () => {
      const result = await securityFilter.checkIpAddress('10.0.0.1');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Suspicious IP address detected');
      expect(result.riskLevel).toBe('medium');
    });

    it('should check suspended users', async () => {
      const result = await securityFilter.checkUserAccess('suspended-user', 'admin_operation');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('User account is suspended');
      expect(result.riskLevel).toBe('high');
    });

    it('should check operation permissions', async () => {
      const result = await securityFilter.checkUserAccess('regular-user', 'admin_operation');
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Operation requires admin privileges');
      expect(result.riskLevel).toBe('medium');
    });

    it('should allow valid user operations', async () => {
      const result = await securityFilter.checkUserAccess('admin-user', 'admin_operation');
      expect(result.allowed).toBe(true);
      expect(result.riskLevel).toBe('low');
    });
  });

  describe('StringSanitizationService', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>';
      const result = sanitization.sanitizeHtml(input);
      expect(result).toBe('');
    });

    it('should escape HTML entities', () => {
      const input = '<div>Test &amp; Content</div>';
      const result = sanitization.sanitizeHtml(input);
      expect(result).toBe('&lt;div&gt;Test &amp;amp; Content&lt;/div&gt;');
    });

    it('should remove SQL injection patterns', () => {
      const input = "SELECT * FROM users WHERE id = '1' OR '1'='1";
      const result = sanitization.escapeSql(input);
      expect(result).toBe('SELECT * FROM users WHERE id = ? OR ?=?');
    });

    it('should enforce maximum length', () => {
      const input = 'a'.repeat(1500);
      const result = sanitization.enforceMaxLength(input, 100);
      expect(result).toBe('a'.repeat(100));
    });

    it('should normalize whitespace', () => {
      const input = '  test   multiple   spaces ';
      const result = sanitization.normalizeWhitespace(input);
      expect(result).toBe('test multiple spaces');
    });

    it('should sanitize file names', () => {
      const maliciousFileName = '../../../etc/passwd';
      const result = sanitization.sanitizeFileName(maliciousFileName);
      expect(result).toBe('passwd.txt');
    });

    it('should sanitize URLs', () => {
      const maliciousUrl = 'javascript:alert("xss")';
      const result = sanitization.sanitizeUrl(maliciousUrl);
      expect(result).toBe('');
    });

    it('should sanitize JSON', () => {
      const maliciousJson = '{"script":"<script>alert(1)</script>"}';
      const result = sanitization.sanitizeJson(maliciousJson);
      expect(result).toBe('{}');
    });
  });

  describe('GlobalValidationPipe Integration', () => {
    it('should validate and transform valid data', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [GlobalValidationPipe],
      imports: [],
      }).compile();

      const app = module.createNestApplication();
      const pipe = new GlobalValidationPipe();

      const validData = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
      };

      const result = await pipe.transform(validData, { metatype: TestDto });
      expect(result).toEqual(validData);
    });

    it('should throw ValidationException for invalid data', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [GlobalValidationPipe],
        imports: [],
      }).compile();

      const app = module.createNestApplication();
      const pipe = new GlobalValidationPipe();

      const invalidData = {
        name: '',
        email: 'invalid-email',
        age: -5,
      };

      await expect(pipe.transform(invalidData, { metatype: TestDto }))
        .rejects.toThrow(ValidationException);
    });

    it('should strip non-whitelisted properties', async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [GlobalValidationPipe],
        imports: [],
      }).compile();

      const app = module.createNestApplication();
      const pipe = new GlobalValidationPipe({ forbidNonWhitelisted: true });

      const dataWithExtra = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        maliciousProperty: 'should be removed',
      };

      const result = await pipe.transform(dataWithExtra, { metatype: TestDto });
      expect(result).not.toHaveProperty('maliciousProperty');
    });
  });
});
