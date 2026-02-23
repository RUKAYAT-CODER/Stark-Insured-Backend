import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OracleModule } from '../../src/modules/oracle/oracle.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OracleData } from '../../src/modules/oracle/entities/oracle-data.entity';
import { OracleProvider, OracleDataType } from '../../src/modules/oracle/enums/oracle-provider.enum';
import { AppConfigService } from '../../src/config/app-config.service';

describe('OracleModule Integration Tests', () => {
  let app: INestApplication;
  let moduleRef: TestingModule;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [OracleData],
          synchronize: true,
          logging: false,
        }),
        TypeOrmModule.forFeature([OracleData]),
        OracleModule,
      ],
    })
    .overrideProvider(AppConfigService)
    .useValue(mockConfigService)
    .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // Mock environment variables
    mockConfigService.get.mockImplementation((key: string) => {
      const envVars: Record<string, string> = {
        'ORACLE_VALID_TOKENS': 'valid-token-1,valid-token-2',
        'ORACLE_API_KEYS': 'api-key-1,api-key-2',
        'CHAINLINK_PUBLIC_KEY': 'mock-chainlink-public-key',
        'PYTH_PUBLIC_KEY': 'mock-pyth-public-key',
      };
      return envVars[key] || '';
    });
  });

  afterAll(async () => {
    await app.close();
    await moduleRef.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Oracle Ingestion Flow', () => {
    const validChainlinkPayload = {
      externalId: 'ETH-USD',
      dataType: OracleDataType.PRICE,
      payload: { price: 2000.50, symbol: 'ETH/USD' },
      numericValue: 2000.50,
      oracleTimestamp: new Date().toISOString(),
      confidenceScore: 99.5,
    };

    it('should ingest valid Chainlink oracle data', async () => {
      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(validChainlinkPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe(OracleProvider.CHAINLINK);
      expect(response.body.data.externalId).toBe('ETH-USD');
      expect(response.body.data.dataType).toBe(OracleDataType.PRICE);
      expect(response.body.message).toBe('Oracle data ingested successfully');
    });

    it('should reject oracle data with invalid provider', async () => {
      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/invalid-provider')
        .send(validChainlinkPayload)
        .expect(404);

      expect(response.body.statusCode).toBe(404);
    });

    it('should reject stale oracle data', async () => {
      const stalePayload = {
        ...validChainlinkPayload,
        oracleTimestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(stalePayload)
        .expect(400);

      expect(response.body.message).toContain('too old');
    });

    it('should reject future timestamps', async () => {
      const futurePayload = {
        ...validChainlinkPayload,
        oracleTimestamp: new Date(Date.now() + 60000).toISOString(), // 1 minute in future
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(futurePayload)
        .expect(400);

      expect(response.body.message).toContain('future');
    });

    it('should reject duplicate oracle data', async () => {
      // First ingestion should succeed
      await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(validChainlinkPayload)
        .expect(201);

      // Second ingestion with same data should fail
      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(validChainlinkPayload)
        .expect(400);

      expect(response.body.message).toContain('already exists');
    });

    it('should ingest different data types', async () => {
      const weatherPayload = {
        externalId: 'NYC-WEATHER',
        dataType: OracleDataType.WEATHER,
        payload: { temperature: 25.5, humidity: 60, location: 'NYC' },
        numericValue: 25.5,
        oracleTimestamp: new Date().toISOString(),
        confidenceScore: 95.0,
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/pyth')
        .send(weatherPayload)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.provider).toBe(OracleProvider.PYTH);
      expect(response.body.data.dataType).toBe(OracleDataType.WEATHER);
    });
  });

  describe('Oracle Data Retrieval', () => {
    const testPayload = {
      externalId: 'BTC-USD',
      dataType: OracleDataType.PRICE,
      payload: { price: 45000.00, symbol: 'BTC/USD' },
      numericValue: 45000.00,
      oracleTimestamp: new Date().toISOString(),
      confidenceScore: 98.5,
    };

    beforeEach(async () => {
      // Insert test data
      await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(testPayload)
        .expect(201);
    });

    it('should retrieve oracle data with authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/oracle')
        .set('Authorization', 'Oracle api-key-1')
        .query({ provider: OracleProvider.CHAINLINK })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should reject requests without authentication', async () => {
      await request(app.getHttpServer())
        .get('/oracle')
        .expect(401);
    });

    it('should reject requests with invalid API key', async () => {
      await request(app.getHttpServer())
        .get('/oracle')
        .set('Authorization', 'Oracle invalid-key')
        .expect(401);
    });

    it('should retrieve oracle data by ID', async () => {
      // First, get all data to find an ID
      const listResponse = await request(app.getHttpServer())
        .get('/oracle')
        .set('Authorization', 'Oracle api-key-1')
        .expect(200);

      const firstItem = listResponse.body.data[0];
      
      const response = await request(app.getHttpServer())
        .get(`/oracle/${firstItem.id}`)
        .set('Authorization', 'Oracle api-key-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(firstItem.id);
    });

    it('should return 404 for non-existent oracle data', async () => {
      const response = await request(app.getHttpServer())
        .get('/oracle/non-existent-id')
        .set('Authorization', 'Oracle api-key-1')
        .expect(400);

      expect(response.body.message).toContain('not found');
    });

    it('should get latest oracle data', async () => {
      const response = await request(app.getHttpServer())
        .get('/oracle/latest/chainlink/price')
        .set('Authorization', 'Oracle api-key-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      if (response.body.data) {
        expect(response.body.data.provider).toBe(OracleProvider.CHAINLINK);
        expect(response.body.data.dataType).toBe(OracleDataType.PRICE);
      }
    });

    it('should check oracle data freshness', async () => {
      // First, get a valid ID
      const listResponse = await request(app.getHttpServer())
        .get('/oracle')
        .set('Authorization', 'Oracle api-key-1')
        .expect(200);

      const firstItem = listResponse.body.data[0];

      const response = await request(app.getHttpServer())
        .get(`/oracle/${firstItem.id}/freshness`)
        .set('Authorization', 'Oracle api-key-1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('isFresh');
      expect(response.body.data).toHaveProperty('maxAgeSeconds');
      expect(response.body.data.maxAgeSeconds).toBe(300);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on ingest endpoint', async () => {
      const payload = {
        externalId: `TEST-${Date.now()}`,
        dataType: OracleDataType.PRICE,
        payload: { price: 1000.00 },
        numericValue: 1000.00,
        oracleTimestamp: new Date().toISOString(),
      };

      // Make multiple requests quickly
      const promises = Array(15).fill(null).map(() =>
        request(app.getHttpServer())
          .post('/oracle/ingest/chainlink')
          .send(payload)
      );

      const results = await Promise.allSettled(promises);
      const rejectedCount = results.filter(r => r.status === 'rejected').length;

      // Some requests should be rejected due to rate limiting
      expect(rejectedCount).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Input Validation', () => {
    it('should reject malformed payloads', async () => {
      const invalidPayload = {
        externalId: '', // Empty string
        dataType: 'invalid-type',
        payload: null,
        oracleTimestamp: 'invalid-date',
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should reject missing required fields', async () => {
      const incompletePayload = {
        externalId: 'TEST-123',
        // Missing dataType, payload, oracleTimestamp
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(incompletePayload)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });

    it('should validate confidence score range', async () => {
      const invalidPayload = {
        externalId: 'TEST-123',
        dataType: OracleDataType.PRICE,
        payload: { price: 1000.00 },
        oracleTimestamp: new Date().toISOString(),
        confidenceScore: 150.0, // Invalid: > 100
      };

      const response = await request(app.getHttpServer())
        .post('/oracle/ingest/chainlink')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });
});
