import { Injectable } from '@nestjs/common';

@Injectable()
export class SimilarityService {

  // -----------------------------
  // Levenshtein Distance
  // -----------------------------
  private levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  // -----------------------------
  // Normalized Text Similarity (0–1)
  // -----------------------------
  textSimilarity(a: string, b: string): number {
    if (!a || !b) return 0;

    const distance = this.levenshtein(
      a.toLowerCase(),
      b.toLowerCase(),
    );

    const maxLength = Math.max(a.length, b.length);
    return 1 - distance / maxLength;
  }

  // -----------------------------
  // Numeric Similarity (Amount)
  // -----------------------------
  numericSimilarity(a: number, b: number): number {
    if (!a || !b) return 0;

    const diff = Math.abs(a - b);
    const max = Math.max(a, b);

    return 1 - diff / max;
  }

  // -----------------------------
  // Date Proximity (within days)
  // -----------------------------
  dateSimilarity(a: Date, b: Date): number {
    const diffDays = Math.abs(
      (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24),
    );

    const MAX_WINDOW = 90; // 90 days threshold

    if (diffDays > MAX_WINDOW) return 0;

    return 1 - diffDays / MAX_WINDOW;
  }
}