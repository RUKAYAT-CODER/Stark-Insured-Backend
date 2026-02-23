import { Controller, Get, Logger } from '@nestjs/common';

@Controller('logging')
export class LoggingController {
  private readonly logger = new Logger(LoggingController.name);

  @Get('health')
  getLoggingHealth() {
    this.logger.log('Logging health check requested', {
      endpoint: '/logging/health',
      timestamp: new Date().toISOString(),
    });

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      logLevel: 'debug',
    };
  }

  @Get('test')
  testLogging() {
    // Test different log levels
    this.logger.verbose('Verbose log message test');
    this.logger.debug('Debug log message test');
    this.logger.log('Info log message test');
    this.logger.warn('Warning log message test');
    this.logger.error('Error log message test');

    this.logger.log('Logging test completed successfully', {
      testType: 'logging',
      timestamp: new Date().toISOString(),
    });

    return {
      message: 'Logging test successful',
      timestamp: new Date().toISOString(),
    };
  }
}