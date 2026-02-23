import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MigrationService } from './migration.service';
import { MigrationController } from './migration.controller';

@Module({
  imports: [ConfigModule],
  controllers: [MigrationController],
  providers: [MigrationService],
  exports: [MigrationService],
})
export class MigrationModule {}