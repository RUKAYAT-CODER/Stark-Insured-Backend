import { Test, TestingModule } from '@nestjs/testing';
import { OracleController } from '../../src/modules/oracle/oracle.controller';
import { OracleService } from '../../src/modules/oracle/oracle.service';
import { OracleProvider, OracleDataType } from '../../src/modules/oracle/enums/oracle-provider.enum';
import { OraclePayloadDto } from '../../src/modules/oracle/dto';
import { OracleAuthGuard } from '../../src/modules/oracle/guards/oracle-auth.guard';
import { AppConfigService } from '../../src/config/app-config.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

describe('OracleController', () => {
  let controller: OracleController;
  let service: OracleService;

  const mockOracleData = {
    id: 'test-id',
    provider: OracleProvider.CHAINLINK,
    externalId: 'ETH-USD',
    dataType: OracleDataType.PRICE,
    receivedAt: new Date(),
    status: 'active',
  };

  const mockOracleService = {
    ingestOracleData: jest.fn(),
    getOracleData: jest.fn(),
    getOracleDataById: jest.fn(),
    getLatestOracleData: jest.fn(),
    validateOracleDataFreshness: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OracleController],
      providers: [
        {
          provide: OracleService,
          useValue: mockOracleService,
        },
        {
          provide: AppConfigService,
          useValue: mockConfigService,
        },
        OracleAuthGuard,
      ],
    }).compile();

    controller = module.get<OracleController>(OracleController);
    service = module.get<OracleService>(OracleService);
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

    it('should successfully ingest oracle data', async () => {
      mockOracleService.ingestOracleData.mockResolvedValue(mockOracleData);

      const result = await controller.ingestOracleData(
        OracleProvider.CHAINLINK,
        validPayload
      );

      expect(result).toEqual({
        success: true,
        data: {
          id: mockOracleData.id,
          provider: mockOracleData.provider,
          externalId: mockOracleData.externalId,
          dataType: mockOracleData.dataType,
          receivedAt: mockOracleData.receivedAt,
          status: mockOracleData.status,
        },
        message: 'Oracle data ingested successfully',
      });
      expect(service.ingestOracleData).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        validPayload,
        undefined
      );
    });

    it('should handle signature in headers', async () => {
      const signature = 'test-signature';
      mockOracleService.ingestOracleData.mockResolvedValue(mockOracleData);

      const result = await controller.ingestOracleData(
        OracleProvider.CHAINLINK,
        validPayload,
        signature
      );

      expect(result.success).toBe(true);
      expect(service.ingestOracleData).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        validPayload,
        signature
      );
    });

    it('should handle BadRequestException from service', async () => {
      mockOracleService.ingestOracleData.mockRejectedValue(new BadRequestException('Stale data'));

      await expect(controller.ingestOracleData(OracleProvider.CHAINLINK, validPayload))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle UnauthorizedException from service', async () => {
      mockOracleService.ingestOracleData.mockRejectedValue(new UnauthorizedException('Invalid signature'));

      await expect(controller.ingestOracleData(OracleProvider.CHAINLINK, validPayload))
        .rejects.toThrow(UnauthorizedException);
    });

    it('should handle generic errors', async () => {
      mockOracleService.ingestOracleData.mockRejectedValue(new Error('Database error'));

      await expect(controller.ingestOracleData(OracleProvider.CHAINLINK, validPayload))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getOracleData', () => {
    it('should return oracle data', async () => {
      const mockDataArray = [mockOracleData];
      mockOracleService.getOracleData.mockResolvedValue(mockDataArray);

      const result = await controller.getOracleData({
        provider: OracleProvider.CHAINLINK,
        dataType: OracleDataType.PRICE,
      });

      expect(result).toEqual({
        success: true,
        data: mockDataArray,
        count: mockDataArray.length,
      });
      expect(service.getOracleData).toHaveBeenCalledWith({
        provider: OracleProvider.CHAINLINK,
        dataType: OracleDataType.PRICE,
      });
    });

    it('should handle service errors', async () => {
      mockOracleService.getOracleData.mockRejectedValue(new Error('Database error'));

      await expect(controller.getOracleData({}))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getOracleDataById', () => {
    it('should return oracle data by ID', async () => {
      mockOracleService.getOracleDataById.mockResolvedValue(mockOracleData);

      const result = await controller.getOracleDataById('test-id');

      expect(result).toEqual({
        success: true,
        data: mockOracleData,
      });
      expect(service.getOracleDataById).toHaveBeenCalledWith('test-id');
    });

    it('should handle service errors', async () => {
      mockOracleService.getOracleDataById.mockRejectedValue(new Error('Not found'));

      await expect(controller.getOracleDataById('invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getLatestOracleData', () => {
    it('should return latest oracle data', async () => {
      mockOracleService.getLatestOracleData.mockResolvedValue(mockOracleData);

      const result = await controller.getLatestOracleData(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE
      );

      expect(result).toEqual({
        success: true,
        data: mockOracleData,
      });
      expect(service.getLatestOracleData).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE,
        undefined
      );
    });

    it('should handle external ID parameter', async () => {
      mockOracleService.getLatestOracleData.mockResolvedValue(mockOracleData);

      await controller.getLatestOracleData(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE,
        'ETH-USD'
      );

      expect(service.getLatestOracleData).toHaveBeenCalledWith(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE,
        'ETH-USD'
      );
    });

    it('should handle null result', async () => {
      mockOracleService.getLatestOracleData.mockResolvedValue(null);

      const result = await controller.getLatestOracleData(
        OracleProvider.CHAINLINK,
        OracleDataType.PRICE
      );

      expect(result).toEqual({
        success: true,
        data: null,
        message: 'No oracle data found for the specified criteria',
      });
    });

    it('should handle service errors', async () => {
      mockOracleService.getLatestOracleData.mockRejectedValue(new Error('Database error'));

      await expect(controller.getLatestOracleData(OracleProvider.CHAINLINK, OracleDataType.PRICE))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOracleDataFreshness', () => {
    it('should return freshness check result', async () => {
      mockOracleService.validateOracleDataFreshness.mockResolvedValue(true);

      const result = await controller.checkOracleDataFreshness('test-id');

      expect(result).toEqual({
        success: true,
        data: {
          id: 'test-id',
          isFresh: true,
          maxAgeSeconds: 300,
        },
      });
      expect(service.validateOracleDataFreshness).toHaveBeenCalledWith('test-id');
    });

    it('should handle service errors', async () => {
      mockOracleService.validateOracleDataFreshness.mockRejectedValue(new Error('Not found'));

      await expect(controller.checkOracleDataFreshness('invalid-id'))
        .rejects.toThrow(BadRequestException);
    });
  });
});
