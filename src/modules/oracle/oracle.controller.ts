import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  HttpCode, 
  HttpStatus,
  ValidationPipe,
  Headers,
  BadRequestException,
  UnauthorizedException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OracleService } from './oracle.service';
import { OraclePayloadDto, QueryOracleDataDto } from './dto';
import { OracleProvider } from './enums/oracle-provider.enum';
import { OracleAuthGuard } from './guards/oracle-auth.guard';

@ApiTags('oracle')
@Controller('oracle')
export class OracleController {
  constructor(private readonly oracleService: OracleService) {}

  @Post('ingest/:provider')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60 } }) // 10 requests per minute
  @ApiOperation({ summary: 'Ingest oracle data from external provider' })
  @ApiResponse({ status: 201, description: 'Oracle data successfully ingested' })
  @ApiResponse({ status: 400, description: 'Invalid payload or stale data' })
  @ApiResponse({ status: 401, description: 'Invalid signature or unauthorized provider' })
  async ingestOracleData(
    @Param('provider') provider: OracleProvider,
    @Body(ValidationPipe) payload: OraclePayloadDto,
    @Headers('x-oracle-signature') signature?: string,
  ) {
    try {
      const oracleData = await this.oracleService.ingestOracleData(provider, payload, signature);
      return {
        success: true,
        data: {
          id: oracleData.id,
          provider: oracleData.provider,
          externalId: oracleData.externalId,
          dataType: oracleData.dataType,
          receivedAt: oracleData.receivedAt,
          status: oracleData.status,
        },
        message: 'Oracle data ingested successfully',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Failed to ingest oracle data');
    }
  }

  @Get()
  @UseGuards(OracleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Query oracle data with filters' })
  @ApiResponse({ status: 200, description: 'Oracle data retrieved successfully' })
  async getOracleData(@Query(ValidationPipe) query: QueryOracleDataDto) {
    try {
      const oracleData = await this.oracleService.getOracleData(query);
      return {
        success: true,
        data: oracleData,
        count: oracleData.length,
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve oracle data');
    }
  }

  @Get(':id')
  @UseGuards(OracleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get oracle data by ID' })
  @ApiResponse({ status: 200, description: 'Oracle data retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Oracle data not found' })
  async getOracleDataById(@Param('id') id: string) {
    try {
      const oracleData = await this.oracleService.getOracleDataById(id);
      return {
        success: true,
        data: oracleData,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to retrieve oracle data');
    }
  }

  @Get('latest/:provider/:dataType')
  @UseGuards(OracleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get latest oracle data for provider and data type' })
  @ApiResponse({ status: 200, description: 'Latest oracle data retrieved successfully' })
  async getLatestOracleData(
    @Param('provider') provider: OracleProvider,
    @Param('dataType') dataType: string,
    @Query('externalId') externalId?: string,
  ) {
    try {
      const oracleData = await this.oracleService.getLatestOracleData(
        provider, 
        dataType as any, 
        externalId
      );
      
      if (!oracleData) {
        return {
          success: true,
          data: null,
          message: 'No oracle data found for the specified criteria',
        };
      }

      return {
        success: true,
        data: oracleData,
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve latest oracle data');
    }
  }

  @Get(':id/freshness')
  @UseGuards(OracleAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if oracle data is fresh' })
  @ApiResponse({ status: 200, description: 'Freshness check completed' })
  async checkOracleDataFreshness(@Param('id') id: string) {
    try {
      const isFresh = await this.oracleService.validateOracleDataFreshness(id);
      return {
        success: true,
        data: {
          id,
          isFresh,
          maxAgeSeconds: 300, // 5 minutes
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to check oracle data freshness');
    }
  }
}
