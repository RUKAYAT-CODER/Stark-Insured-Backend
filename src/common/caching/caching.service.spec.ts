import { Test, TestingModule } from '@nestjs/testing';
import { CachingService } from './caching.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { AppConfigService } from '../../config/app-config.service';

describe('CachingService', () => {
  let service: CachingService;
  let cacheManager: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachingService,
        {
          provide: CACHE_MANAGER,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            reset: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            cacheDefaultTtl: 300,
            cacheMaxItems: 10000,
            cacheKeyPrefix: 'test_cache:',
            isProductionEnvironment: false,
          },
        },
      ],
    }).compile();

    service = module.get<CachingService>(CachingService);
    cacheManager = module.get(CACHE_MANAGER);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get', () => {
    it('should return cached data when found', async () => {
      const testData = { id: '1', name: 'test' };
      const cachedResult = {
        data: testData,
        cachedAt: new Date(),
        ttl: 300,
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(cachedResult);

      const result = await service.get('test-key');
      
      expect(result).toEqual(testData);
      expect(cacheManager.get).toHaveBeenCalledWith('app_cache:test-key');
    });

    it('should return null when cache entry not found', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(null);

      const result = await service.get('non-existent-key');
      
      expect(result).toBeNull();
    });

    it('should return null when cache entry is expired', async () => {
      const expiredResult = {
        data: { id: '1', name: 'test' },
        cachedAt: new Date(Date.now() - 400000), // 400 seconds ago
        ttl: 300, // 5 minutes
      };

      jest.spyOn(cacheManager, 'get').mockResolvedValue(expiredResult);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      const result = await service.get('expired-key');
      
      expect(result).toBeNull();
      expect(cacheManager.del).toHaveBeenCalledWith('app_cache:expired-key');
    });
  });

  describe('set', () => {
    it('should set data in cache with default TTL', async () => {
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const testData = { id: '1', name: 'test' };
      await service.set('test-key', testData);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'app_cache:test-key',
        expect.objectContaining({
          data: testData,
          ttl: 300,
        }),
        300
      );
    });

    it('should set data in cache with custom TTL', async () => {
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const testData = { id: '1', name: 'test' };
      await service.set('test-key', testData, { ttl: 600 });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'app_cache:test-key',
        expect.objectContaining({
          data: testData,
          ttl: 600,
        }),
        600
      );
    });

    it('should bypass cache when bypass option is true', async () => {
      jest.spyOn(cacheManager, 'set').mockResolvedValue(undefined);

      const testData = { id: '1', name: 'test' };
      await service.set('test-key', testData, { bypass: true });

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('invalidate', () => {
    it('should delete cache entry', async () => {
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.invalidate('test-key');

      expect(cacheManager.del).toHaveBeenCalledWith('app_cache:test-key');
    });
  });

  describe('invalidateByTag', () => {
    it('should invalidate all cache entries with given tag', async () => {
      const taggedKeys = ['app_cache:user:123', 'app_cache:user:456'];
      jest.spyOn(cacheManager, 'get').mockResolvedValue(taggedKeys);
      jest.spyOn(cacheManager, 'del').mockResolvedValue(undefined);

      await service.invalidateByTag('users');

      expect(cacheManager.del).toHaveBeenCalledWith('app_cache:tag:users');
      expect(cacheManager.del).toHaveBeenCalledWith('app_cache:user:123');
      expect(cacheManager.del).toHaveBeenCalledWith('app_cache:user:456');
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', async () => {
      jest.spyOn(cacheManager, 'get').mockResolvedValue(['key1', 'key2', 'key3']);

      const stats = await service.getCacheStats();

      expect(stats).toEqual({
        totalKeys: 3,
        hitRate: 0,
        memoryUsage: 0,
        hits: expect.any(Number),
        misses: expect.any(Number),
        evictions: 0,
      });
    });
  });
});