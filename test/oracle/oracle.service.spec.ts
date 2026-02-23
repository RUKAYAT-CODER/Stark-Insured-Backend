import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OracleService } from '../../src/modules/oracle/oracle.service';
import { OracleData } from '../../src/modules/oracle/entities/oracle-data.entity';
import { OracleProvider, OracleDataType, OracleStatus } from '../../src/modules/oracle/enums/oracle-provider.enum';
import { OraclePayloadDto } from '../../src/modules/oracle/dto';
import { AppConfigService } from '../../src/config/app-config.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('OracleService', () => {
  let service: OracleService;
  let repository: Repository<OracleData>;
  let configService: AppConfigService;

  const mockOracleData: OracleData = {
    id: 'test-id',
    provider: OracleProvider.CHAINLINK,
    externalId: 'ETH-USD',
    dataType: OracleDataType.PRICE,
    payload: { price: 2000.50, symbol: 'ETH/USD' },
    numericValue: 2000.50,
    stringValue: undefined,
    oracleTimestamp: new Date(),
    receivedAt: new Date(),
    status: OracleStatus.ACTIVE,
    signature: 'test-signature',
    metadata: { source: 'chainlink' },
    sourceUrl: 'https://chainlink.com',
    confidenceScore: 99.5,
    expiresAt: new Date(Date.now() + 3600000),
    verificationHash: 'test-hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OracleService,
        {
          provide: getRepositoryToken(OracleData),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<OracleService>(OracleService);
    repository = module.get<Repository<OracleData>>(getRepositoryToken(OracleData));
    configService = module.get<AppConfigService>(AppConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ingestOracleData', () => {
    const validPayload: OraclePayloadDto = {
      externalId: 'ETH-USD',
      dataType: OracleDataType.PRICE,
      payload: { price: 2000.50, symbol: 'ETH/USD' },
      numericValue: 2000.50,
      oracleTimestamp: new Date().toISOString(),
      confidenceScore: 99.5,
    };

    it('should successfully ingest valid oracle data', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockOracleData);
      jest.spyOn(repository, 'save').mockResolvedValue(mockOracleData);

      const result = await service.ingestOracleData(OracleProvider.CHAINLINK, validPayload);

      expect(result).toEqual(mockOracleData);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should reject stale data', async () => {
      const stalePayload = {
        ...validPayload,
        oracleTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      await expect(service.ingestOracleData(OracleProvider.CHAINLINK, stalePayload))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject future timestamps', async () => {
      const futurePayload = {
        ...validPayload,
        oracleTimestamp: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
      };

      await expect(service.ingestOracleData(OracleProvider.CHAINLINK, futurePayload))
        .rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate data', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockOracleData);

      await expect(service.ingestOracleData(OracleProvider.CHAINLINK, validPayload))
        .rejects.toThrow(BadRequestException);
    });

    it('should verify signature when provided', async () => {
      mockConfigService.get.mockReturnValue('test-public-key');
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockReturnValue(mockOracleData);
      jest.spyOn(repository, 'save').mockResolvedValue(mockOracleData);

      // Mock crypto.verify to return true
      const cryptoVerifySpy = jest.spyOn(require('crypto'), 'verify');
      cryptoVerifySpy.mockReturnValue(true);

      // Mock process.env to return the public key
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        CHAINLINK_PUBLIC_KEY: 'test-public-key',
      };

      try {
        await service.ingestOracleData(OracleProvider.CHAINLINK, validPayload, 'valid-signature');
        expect(cryptoVerifySpy).toHaveBeenCalled();
      } finally {
        process.env = originalEnv;
      }
    });

    it('should reject invalid signature', async () => {
      mockConfigService.get.mockReturnValue('test-public-key');
      
      // Mock crypto.verify to return false
      const cryptoVerifySpy = jest.spyOn(require('crypto'), 'verify');
      cryptoVerifySpy.mockReturnValue(false);

      await expect(service.ingestOracleData(OracleProvider.CHAINLINK, validPayload, 'invalid-signature'))
        .rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getOracleData', () => {
    it('should return oracle data with filters', async () => {
      const mockDataArray = [mockOracleData];
      jest.spyOn(repository, 'find').mockResolvedValue(mockDataArray);

      const result = await service.getOracleData({
        provider: OracleProvider.CHAINLINK,
        dataType: OracleDataType.PRICE,
      });

      expect(result).toEqual(mockDataArray);
      expect(repository.find).toHaveBeenCalledWith({
        where: {
          provider: OracleProvider.CHAINLINK,
          dataType: OracleDataType.PRICE,
        },
        order: { oracleTimestamp: 'DESC' },
      });
    });

    it('should handle date range filters', async () => {
      const mockDataArray = [mockOracleData];
      jest.spyOn(repository, 'find').mockResolvedValue(mockDataArray);

      const fromDate = '2023-01-01T00:00:00Z';
      const toDate = '2023-01-02T00:00:00Z';

      await service.getOracleData({ fromDate, toDate });

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          oracleTimestamp: expect.any(Object),
        },
        order: { oracleTimestamp: 'DESC' },
      });
    });
  });

  describe('getOracleDataById', () => {
    it('should return oracle data by ID', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockOracleData);

      const result = await service.getOracleDataById('test-id');

      expect(result).toEqual(mockOracleData);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'test-id' } });
    });

    it('should throw error if data not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);

      await expect(service.getOracleDataById('non-existent-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getLatestOracleData', () => {
    it('should return latest oracle data', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockOracleData);

      const result = await service.getLatestOracleData(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE
      );

      expect(result).toEqual(mockOracleData);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          provider: OracleProvider.CHAINLINK,
          dataType: OracleDataType.PRICE,
          status: OracleStatus.ACTIVE,
        },
        order: { oracleTimestamp: 'DESC' },
      });
    });

    it('should include external ID filter when provided', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(mockOracleData);

      await service.getLatestOracleData(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE,
        'ETH-USD'
      );

      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          provider: OracleProvider.CHAINLINK,
          dataType: OracleDataType.PRICE,
          status: OracleStatus.ACTIVE,
          externalId: 'ETH-USD',
        },
        order: { oracleTimestamp: 'DESC' },
      });
    });
  });

  describe('validateOracleDataFreshness', () => {
    it('should return true for fresh data', async () => {
      const freshData = {
        ...mockOracleData,
        oracleTimestamp: new Date(Date.now() - 60000), // 1 minute ago
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(freshData);

      const result = await service.validateOracleDataFreshness('test-id');

      expect(result).toBe(true);
    });

    it('should return false for stale data', async () => {
      const staleData = {
        ...mockOracleData,
        oracleTimestamp: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago
      };
      jest.spyOn(repository, 'findOne').mockResolvedValue(staleData);

      const result = await service.validateOracleDataFreshness('test-id');

      expect(result).toBe(false);
    });
  });

  describe('deactivateExpiredOracleData', () => {
    it('should deactivate expired oracle data', async () => {
      const expiredData = [
        { ...mockOracleData, id: 'expired-1', expiresAt: new Date(Date.now() - 1000) },
        { ...mockOracleData, id: 'expired-2', expiresAt: new Date(Date.now() - 1000) },
      ];

      jest.spyOn(repository, 'find').mockResolvedValue(expiredData);
      jest.spyOn(repository, 'update').mockResolvedValue({ affected: 2, raw: [], generatedMaps: [] });

      await service.deactivateExpiredOracleData();

      expect(repository.find).toHaveBeenCalledWith({
        where: {
          expiresAt: expect.any(Object),
          status: OracleStatus.ACTIVE,
        },
      });
      expect(repository.update).toHaveBeenCalledWith(
        ['expired-1', 'expired-2'],
        { status: OracleStatus.INACTIVE }
      );
    });

    it('should not update if no expired data found', async () => {
      jest.spyOn(repository, 'find').mockResolvedValue([]);

      await service.deactivateExpiredOracleData();

      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('fetchProviderData', () => {
    it('should delegate to ExternalServiceClient and return result', async () => {
      const fakeResponse = { foo: 'bar' };
      (service as any).externalClient = { get: jest.fn().mockResolvedValue(fakeResponse) };
      mockConfigService.get.mockReturnValue('https://api.example.com');

      const result = await service.fetchProviderData(OracleProvider.CHAINLINK, 'abc');
      expect(result).toEqual(fakeResponse);
      expect((service as any).externalClient.get).toHaveBeenCalledWith(
        'https://api.example.com/data/abc',
      );
    });

    it('should throw when no provider url is configured', async () => {
      mockConfigService.get.mockReturnValue('');
      await expect(service.fetchProviderData(OracleProvider.CHAINLINK, 'xyz'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
