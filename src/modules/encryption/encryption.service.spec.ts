import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import { KeyManagementService } from './key-management.service';

describe('EncryptionService', () => {
    let service: EncryptionService;
    let keyManagementService: KeyManagementService;

    const mockKey = Buffer.from('12345678901234567890123456789012'); // 32 bytes
    const mockActiveKey = { id: 'v1', key: mockKey };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EncryptionService,
                {
                    provide: KeyManagementService,
                    useValue: {
                        getActiveKey: jest.fn().mockReturnValue(mockActiveKey),
                        getKey: jest.fn().mockReturnValue(mockActiveKey),
                    },
                },
            ],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
        keyManagementService = module.get<KeyManagementService>(KeyManagementService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('encrypt', () => {
        it('should encrypt a string and return formatted output', () => {
            const plaintext = 'hello world';
            const result = service.encrypt(plaintext);

            expect(result).toBeDefined();
            expect(typeof result).toBe('string');
            const parts = result!.split(':');
            expect(parts.length).toBe(4);
            expect(parts[0]).toBe('v1'); // keyId
        });

        it('should return null for null input', () => {
            expect(service.encrypt(null)).toBeNull();
        });
    });

    describe('decrypt', () => {
        it('should decrypt a valid encrypted string', () => {
            const plaintext = 'sensitive data';
            const encrypted = service.encrypt(plaintext);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plaintext);
        });

        it('should throw error for tampered data', () => {
            const encrypted = service.encrypt('data');
            const parts = encrypted!.split(':');
            // Tamper with ciphertext
            parts[3] = Buffer.from('tampered').toString('base64');
            const tampered = parts.join(':');

            expect(() => service.decrypt(tampered)).toThrow('Failed to decrypt data');
        });

        it('should return the input if not in expected format (legacy support)', () => {
            const legacyData = 'plain data';
            const result = service.decrypt(legacyData);
            expect(result).toBe(legacyData);
        });
    });

    describe('Object encryption', () => {
        it('should encrypt and decrypt an object', () => {
            const obj = { foo: 'bar', secret: 123 };
            const encrypted = service.encryptObject(obj);
            const decrypted = service.decryptObject(encrypted);

            expect(decrypted).toEqual(obj);
        });
    });
});
