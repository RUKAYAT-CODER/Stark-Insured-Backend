import { Injectable } from '@nestjs/common';
import { SimilarityService } from './similarity.service';

interface Claim {
  id: string;
  title: string;
  description: string;
  amount: number;
  eventDate: Date;
  userId: string;
  policyId: string;
}

@Injectable()
export class FraudDetectionService {
  constructor(
    private readonly similarityService: SimilarityService,
  ) {}

  computeSimilarityScore(newClaim: Claim, existingClaim: Claim): number {
    const titleScore = this.similarityService.textSimilarity(
      newClaim.title,
      existingClaim.title,
    );

    const descriptionScore =
      this.similarityService.textSimilarity(
        newClaim.description,
        existingClaim.description,
      );

    const amountScore = this.similarityService.numericSimilarity(
      newClaim.amount,
      existingClaim.amount,
    );

    const dateScore = this.similarityService.dateSimilarity(
      newClaim.eventDate,
      existingClaim.eventDate,
    );

    const userBonus =
      newClaim.userId === existingClaim.userId ? 0.1 : 0;

    const finalScore =
      titleScore * 0.3 +
      descriptionScore * 0.3 +
      amountScore * 0.2 +
      dateScore * 0.2 +
      userBonus;

    return Math.min(finalScore, 1);
  }

  isDuplicate(score: number): boolean {
    const THRESHOLD = 0.75;
    return score >= THRESHOLD;
  }
}