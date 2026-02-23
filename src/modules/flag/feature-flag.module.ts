import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FeatureFlag } from './feature-flag.entity';
import { FeatureUsage } from './feature-usage.entity';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './feature-flag.guard';
import { AdminFeatureFlagController } from './admin-feature-flag.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag, FeatureUsage])],
  providers: [FeatureFlagService, FeatureFlagGuard],
  controllers: [AdminFeatureFlagController],
  exports: [FeatureFlagService],
})
export class FeatureFlagModule {}