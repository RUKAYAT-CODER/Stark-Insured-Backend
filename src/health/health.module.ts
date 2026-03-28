import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { IndexerHealthIndicator } from './indicators/indexer.health';
import { IndexerModule } from '../indexer/indexer.module';
import { DatabaseModule } from '../database.module';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    TerminusModule,
    IndexerModule,
    DatabaseModule,
  ],
  controllers: [HealthController],
  providers: [
    IndexerHealthIndicator,
    PrismaService, // Required for PrismaHealthIndicator if not provided by DatabaseModule
  ],
})
export class HealthModule {}
