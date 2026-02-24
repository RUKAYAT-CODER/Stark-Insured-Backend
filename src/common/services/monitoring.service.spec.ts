import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringService } from './monitoring.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let cache: any;

  beforeEach(async () => {
    cache = new Map();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        { provide: CACHE_MANAGER, useValue: {
            get: jest.fn().mockImplementation(key => cache.get(key)),
            set: jest.fn().mockImplementation((key, value, ttl) => cache.set(key, value)),
          } },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
  });

  it('should record token fraud and increment counter', async () => {
    await service.recordTokenFraud('user1', '1.1.1.1', { reason: 'test' });
    const today = new Date().toISOString().split('T')[0];
    const key = `monitoring:token_fraud:user1:1.1.1.1:${today}`;
    expect(cache.get(key)).toBe(1);
  });
});
