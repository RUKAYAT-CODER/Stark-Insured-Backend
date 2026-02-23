import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param,
  Post,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ErrorTrackingService } from '../services/error-tracking.service';
import { ErrorMetrics, ErrorCategory, ErrorSeverity } from '../types/error-severity';

/**
 * Controller for error tracking and analytics API endpoints
 */
@ApiTags('Error Tracking')
@Controller('api/v1/error-tracking')
@ApiBearerAuth()
export class ErrorTrackingController {
  private readonly logger = new Logger('ErrorTrackingController');

  constructor(private errorTrackingService: ErrorTrackingService) {}

  /**
   * Get error metrics for dashboard
   */
  @Get('metrics')
  @ApiOperation({
    summary: 'Get error metrics and statistics',
    description:
      'Returns error metrics including counts, rates, and top errors',
  })
  getMetrics(
    @Query('timewindow') timeWindow: string = '3600000',
  ): ErrorMetrics {
    const timeWindowMs = parseInt(timeWindow, 10) || 3600000;
    return this.errorTrackingService.getErrorMetrics(timeWindowMs);
  }

  /**
   * Get all error logs
   */
  @Get('logs')
  @ApiOperation({
    summary: 'Get all error logs',
    description: 'Returns recent error logs from the system',
  })
  getLogs() {
    return this.errorTrackingService.getAllErrorLogs();
  }

  /**
   * Get error logs by category
   */
  @Get('logs/category/:category')
  @ApiOperation({
    summary: 'Get error logs by category',
    description: 'Filter error logs by specific category',
  })
  getLogsByCategory(@Param('category') category: string) {
    const allLogs = this.errorTrackingService.getAllErrorLogs();
    return allLogs.filter((log) => log.category === category);
  }

  /**
   * Get error logs by severity
   */
  @Get('logs/severity/:severity')
  @ApiOperation({
    summary: 'Get error logs by severity',
    description: 'Filter error logs by severity level',
  })
  getLogsBySeverity(@Param('severity') severity: string) {
    const allLogs = this.errorTrackingService.getAllErrorLogs();
    return allLogs.filter((log) => log.severity === severity);
  }

  /**
   * Get health status of error tracking
   */
  @Get('health')
  @ApiOperation({
    summary: 'Check error tracking service health',
    description: 'Returns health status of the error tracking service',
  })
  health() {
    return {
      status: 'ok',
      initialized: this.errorTrackingService.isInitializedState(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Clear error logs (for testing)
   */
  @Post('logs/clear')
  @ApiOperation({
    summary: 'Clear error logs',
    description: 'Clear all error logs from memory',
  })
  clearLogs() {
    this.errorTrackingService.clearErrorLogs();
    this.logger.log('Error logs cleared');
    return { message: 'Error logs cleared successfully' };
  }

  /**
   * Force flush pending error reports to Sentry
   */
  @Post('flush')
  @ApiOperation({
    summary: 'Flush pending error reports',
    description: 'Force flush any pending error reports to Sentry',
  })
  async flush() {
    await this.errorTrackingService.flush(5000);
    return { message: 'Error reports flushed successfully' };
  }
}
