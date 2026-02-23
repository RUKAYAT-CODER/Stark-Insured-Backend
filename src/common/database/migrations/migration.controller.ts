import { Controller, Get, Post, Delete, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MigrationService, MigrationStatus, MigrationResult } from './migration.service';

@ApiTags('Database Migrations')
@Controller('migrations')
export class MigrationController {
  private readonly logger = new Logger(MigrationController.name);

  constructor(private readonly migrationService: MigrationService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get migration status' })
  @ApiResponse({ 
    status: 200, 
    description: 'Migration status retrieved successfully',
    type: [MigrationStatus]
  })
  async getMigrationStatus(): Promise<MigrationStatus[]> {
    try {
      this.logger.log('Migration status check requested');
      return await this.migrationService.getMigrationStatus();
    } catch (error) {
      this.logger.error('Failed to get migration status', error);
      throw new HttpException(
        `Failed to get migration status: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('run')
  @ApiOperation({ summary: 'Run pending migrations' })
  @ApiResponse({ 
    status: 200, 
    description: 'Migrations executed successfully',
    type: MigrationResult
  })
  async runMigrations(): Promise<MigrationResult> {
    try {
      this.logger.log('Migration execution requested');
      const result = await this.migrationService.runMigrations();
      
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to run migrations', error);
      throw new HttpException(
        `Failed to run migrations: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('revert')
  @ApiOperation({ summary: 'Revert last migration' })
  @ApiResponse({ 
    status: 200, 
    description: 'Last migration reverted successfully',
    type: MigrationResult
  })
  async revertLastMigration(): Promise<MigrationResult> {
    try {
      this.logger.log('Migration revert requested');
      const result = await this.migrationService.revertLastMigration();
      
      if (!result.success) {
        throw new HttpException(result.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      
      return result;
    } catch (error) {
      this.logger.error('Failed to revert migration', error);
      throw new HttpException(
        `Failed to revert migration: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('preflight')
  @ApiOperation({ summary: 'Run pre-flight migration checks' })
  @ApiResponse({ 
    status: 200, 
    description: 'Pre-flight checks completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        timestamp: { type: 'string', format: 'date-time' }
      }
    }
  })
  async preFlightCheck(): Promise<any> {
    try {
      this.logger.log('Pre-flight check requested');
      await this.migrationService.preFlightCheck();
      
      return {
        success: true,
        message: 'Pre-flight checks completed successfully',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('Pre-flight check failed', error);
      throw new HttpException(
        `Pre-flight check failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}