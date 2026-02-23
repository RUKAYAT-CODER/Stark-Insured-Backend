import { Module } from '@nestjs/common';
import { SimilarityService } from './providers/similarity.service';
import { FraudDetectionService } from './providers/fraud-detection.service';

@Module({
  providers: [FraudDetectionService, SimilarityService],
  exports: [FraudDetectionService],
})
export class FraudDetectionModule {}