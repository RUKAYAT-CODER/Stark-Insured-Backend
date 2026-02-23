import { IsString, IsEnum, IsNotEmpty, IsOptional, IsObject, IsNumber, IsDateString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { OracleProvider, OracleDataType } from '../enums/oracle-provider.enum';

export class OraclePayloadDto {
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @IsEnum(OracleDataType)
  dataType: OracleDataType;

  @IsObject()
  payload: Record<string, any>;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  numericValue?: number;

  @IsOptional()
  @IsString()
  stringValue?: string;

  @IsDateString()
  oracleTimestamp: string;

  @IsOptional()
  @IsString()
  signature?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  sourceUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  @Type(() => Number)
  confidenceScore?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
