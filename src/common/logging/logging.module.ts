import { Global, Module } from '@nestjs/common';
import { LoggerConfigService } from './logger.config';
import { LoggingController } from './logging.controller';

@Global()
@Module({
  controllers: [LoggingController],
  providers: [LoggerConfigService],
  exports: [LoggerConfigService],
})
export class LoggingModule {}
