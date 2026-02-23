import { Test, TestingModule } from '@nestjs/testing';
import { KeyManagementService } from './key-management.service';
import { ConfigService } from '@nestjs/config';

describe('KeyManagementService', () => {
    let service: KeyManagementService;
    let configService: ConfigService;

    const validKey = Buffer.from('12345678901234567890123456789012').toString('base64');
    const envKeys = `v1:${validKey},v2:${validKey}`;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KeyManagementService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key) => {
                            if (key === 'ENCRYPTION_KEYS') return envKeys;
                            return null;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<KeyManagementService>(KeyManagementService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should load keys from environment', () => {
        const activeKey = service.getActiveKey();
        expect(activeKey.id).toBe('v1');
        expect(activeKey.key.length).toBe(32);
    });

    it('should retrieve specific key by id', () => {
        const key = service.getKey('v2');
        expect(key.id).toBe('v2');
        expect(key.key.length).toBe(32);
    });

    it('should throw error if key id not found', () => {
        expect(() => service.getKey('nonexistent')).toThrow('Encryption key with ID nonexistent not found');
    });

    it('should throw error if no keys configured in production', () => {
        // Create a new instance with no keys and NODE_ENV=production
        const mockConfig = {
            get: jest.fn((key) => {
                if (key === 'NODE_ENV') return 'production';
                return null;
            }),
        } as any;

        const newService = new KeyManagementService(mockConfig);
        expect(() => newService.getActiveKey()).toThrow('No encryption keys configured');
    });
});
