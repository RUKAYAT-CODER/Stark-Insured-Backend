import { IsString, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { OracleProvider, OracleDataType, OracleStatus } from '../enums/oracle-provider.enum';

export class CreateOracleDataDto {
  @IsEnum(OracleProvider)
  provider: OracleProvider;

  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(OracleDataType)
  dataType: OracleDataType;

  @IsString()
  @IsNotEmpty()
  payload: string; // JSON string

  @IsString()
  @IsNotEmpty()
  oracleTimestamp: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsString()
  metadata?: string; // JSON string

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsString()
  confidenceScore?: string;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}

export class QueryOracleDataDto {
  @IsOptional()
  @IsEnum(OracleProvider)
  provider?: OracleProvider;

  @IsOptional()
  @IsEnum(OracleDataType)
  dataType?: OracleDataType;

  @IsOptional()
  @IsEnum(OracleStatus)
  status?: OracleStatus;

  @IsOptional()
  @IsString()
  externalId?: string;

  @IsOptional()
  @IsString()
  fromDate?: string;

  @IsOptional()
  @IsString()
  toDate?: string;
}
