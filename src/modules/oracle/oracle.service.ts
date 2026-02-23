import { Injectable, BadRequestException, UnauthorizedException, Logger } from '@nestjs/common';
import { ExternalServiceClient } from '../../common/services/external-service.client';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, Between } from 'typeorm';
import { OracleData } from './entities/oracle-data.entity';
import { OraclePayloadDto, CreateOracleDataDto, QueryOracleDataDto } from './dto';
import { OracleProvider, OracleDataType, OracleStatus } from './enums/oracle-provider.enum';
import * as crypto from 'crypto';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class OracleService {
  private readonly logger = new Logger(OracleService.name);
  private readonly ORACLE_FRESHNESS_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(OracleData)
    private readonly oracleDataRepository: Repository<OracleData>,
    private readonly configService: AppConfigService,
    private readonly externalClient: ExternalServiceClient,
  ) {}

  async ingestOracleData(provider: OracleProvider, payload: OraclePayloadDto, signature?: string): Promise<OracleData> {
    this.logger.log(`Ingesting oracle data from ${provider} for external ID: ${payload.externalId}`);

    // Validate payload freshness
    this.validatePayloadFreshness(payload.oracleTimestamp);

    // Verify signature if provided
    if (signature) {
      this.verifySignature(provider, payload, signature);
    }

    // Check for duplicates
    const existingData = await this.findExistingOracleData(provider, payload.externalId, payload.dataType);
    if (existingData) {
      throw new BadRequestException(`Oracle data already exists for provider ${provider}, external ID ${payload.externalId}`);
    }

    // Create oracle data entity
    const oracleData = this.oracleDataRepository.create({
      provider,
      externalId: payload.externalId,
      dataType: payload.dataType,
      payload: payload.payload,
      numericValue: payload.numericValue,
      stringValue: payload.stringValue,
      oracleTimestamp: new Date(payload.oracleTimestamp),
      receivedAt: new Date(),
      status: OracleStatus.ACTIVE,
      signature,
      metadata: payload.metadata,
      sourceUrl: payload.sourceUrl,
      confidenceScore: payload.confidenceScore,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : undefined,
      verificationHash: this.generateVerificationHash(payload),
    });

    const savedData = await this.oracleDataRepository.save(oracleData);
    
    this.logger.log(`Successfully ingested oracle data with ID: ${savedData.id}`);
    return savedData;
  }

  async getOracleData(query: QueryOracleDataDto): Promise<OracleData[]> {
    const whereConditions: any = {};

    if (query.provider) whereConditions.provider = query.provider;
    if (query.dataType) whereConditions.dataType = query.dataType;
    if (query.status) whereConditions.status = query.status;
    if (query.externalId) whereConditions.externalId = query.externalId;

    if (query.fromDate && query.toDate) {
      whereConditions.oracleTimestamp = Between(
        new Date(query.fromDate),
        new Date(query.toDate)
      );
    } else if (query.fromDate) {
      whereConditions.oracleTimestamp = MoreThan(new Date(query.fromDate));
    } else if (query.toDate) {
      whereConditions.oracleTimestamp = LessThan(new Date(query.toDate));
    }

    return this.oracleDataRepository.find({
      where: whereConditions,
      order: { oracleTimestamp: 'DESC' },
    });
  }

  async getOracleDataById(id: string): Promise<OracleData> {
    const oracleData = await this.oracleDataRepository.findOne({ where: { id } });
    if (!oracleData) {
      throw new BadRequestException(`Oracle data with ID ${id} not found`);
    }
    return oracleData;
  }

  async getLatestOracleData(provider: OracleProvider, dataType: OracleDataType, externalId?: string): Promise<OracleData | null> {
    const whereConditions: any = {
      provider,
      dataType,
      status: OracleStatus.ACTIVE,
    };

    if (externalId) {
      whereConditions.externalId = externalId;
    }

    return this.oracleDataRepository.findOne({
      where: whereConditions,
      order: { oracleTimestamp: 'DESC' },
    });
  }

  async validateOracleDataFreshness(id: string): Promise<boolean> {
    const oracleData = await this.getOracleDataById(id);
    const now = new Date();
    const ageMs = now.getTime() - oracleData.oracleTimestamp.getTime();
    
    return ageMs <= this.ORACLE_FRESHNESS_WINDOW_MS;
  }

  async deactivateExpiredOracleData(): Promise<void> {
    const expiredData = await this.oracleDataRepository.find({
      where: {
        expiresAt: LessThan(new Date()),
        status: OracleStatus.ACTIVE,
      },
    });

    if (expiredData.length > 0) {
      await this.oracleDataRepository.update(
        expiredData.map(data => data.id),
        { status: OracleStatus.INACTIVE }
      );
      this.logger.log(`Deactivated ${expiredData.length} expired oracle data entries`);
    }
  }

  private validatePayloadFreshness(oracleTimestamp: string): void {
    const timestamp = new Date(oracleTimestamp);
    const now = new Date();
    const ageMs = now.getTime() - timestamp.getTime();

    if (ageMs > this.ORACLE_FRESHNESS_WINDOW_MS) {
      throw new BadRequestException(
        `Oracle data is too old. Maximum age is ${this.ORACLE_FRESHNESS_WINDOW_MS / 1000} seconds`
      );
    }

    if (timestamp > now) {
      throw new BadRequestException('Oracle timestamp cannot be in the future');
    }
  }

  private verifySignature(provider: OracleProvider, payload: OraclePayloadDto, signature: string): void {
    const publicKey = this.getProviderPublicKey(provider);
    if (!publicKey) {
      throw new UnauthorizedException(`No public key configured for provider ${provider}`);
    }

    const payloadString = JSON.stringify(payload);
    const isValid = crypto.verify(
      'RSA-SHA256',
      Buffer.from(payloadString),
      publicKey,
      Buffer.from(signature, 'base64')
    );

    if (!isValid) {
      throw new UnauthorizedException('Invalid signature for oracle payload');
    }
  }

  private getProviderPublicKey(provider: OracleProvider): string | null {
    // In production, this would fetch from secure configuration
    const providerKeys = {
      [OracleProvider.CHAINLINK]: process.env.CHAINLINK_PUBLIC_KEY,
      [OracleProvider.PYTH]: process.env.PYTH_PUBLIC_KEY,
      [OracleProvider.BAND_PROTOCOL]: process.env.BAND_PROTOCOL_PUBLIC_KEY,
      [OracleProvider.CUSTOM]: process.env.CUSTOM_ORACLE_PUBLIC_KEY,
    };

    return providerKeys[provider] || null;
  }

  private async findExistingOracleData(
    provider: OracleProvider,
    externalId: string,
    dataType: OracleDataType
  ): Promise<OracleData | null> {
    return this.oracleDataRepository.findOne({
      where: {
        provider,
        externalId,
        dataType,
      },
    });
  }

  /**
   * Example call to an external oracle provider API. Retries and
   * circuit breaker behaviour are handled by ExternalServiceClient.
   */
  async fetchProviderData(provider: OracleProvider, externalId: string): Promise<any> {
    const endpoint = this.configService.get(`ORACLE_${provider.toUpperCase()}_URL`, '');
    if (!endpoint) {
      throw new BadRequestException(`No URL configured for provider ${provider}`);
    }

    const url = `${endpoint}/data/${externalId}`;
    try {
      return await this.externalClient.get(url);
    } catch (err) {
      // ExternalServiceClient already converts to ExternalServiceError
      throw err;
    }
  }

  private generateVerificationHash(payload: OraclePayloadDto): string {
    const payloadString = JSON.stringify(payload);
    return crypto.createHash('sha256').update(payloadString).digest('hex');
  }
}
