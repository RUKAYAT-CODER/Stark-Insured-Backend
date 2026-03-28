import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { calculateTrustScore } from './calculators/trust-score.calculator';
import {
	PrismaClientKnownRequestError,
	PrismaClientInitializationError,
} from '@prisma/client/runtime/library';

// Maximum number of retry attempts for transient errors
const MAX_RETRIES = 3;
// Delay between retries (in milliseconds)
const RETRY_DELAY_MS = 100;

@Injectable()
export class ReputationService {
	private readonly logger = new Logger(ReputationService.name);

	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Updates the trust score for a user atomically with retry logic.
	 * Uses Prisma interactive transaction to ensure consistency.
	 * @param userId - The user ID to update
	 * @returns The updated trust score
	 */
	async updateTrustScore(userId: string): Promise<number> {
		let lastError: Error | undefined;

		for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
			try {
				// Use Prisma interactive transaction for atomicity
				const score = await this.prisma.$transaction(
					async (tx) => {
						// Calculate score within transaction
						const calculatedScore = await calculateTrustScore(tx, userId);

						// Update user within same transaction
						await tx.user.update({
							where: { id: userId },
							data: { trustScore: calculatedScore },
						});

						return calculatedScore;
					},
					{
						// Transaction options for better reliability
						maxWait: 5000, // Maximum time to wait for transaction to start
						timeout: 10000, // Maximum time for transaction to complete
					},
				);

				return score;
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				// Check if this is a retryable error (connection issues, deadlocks, etc.)
				if (this.isRetryableError(error) && attempt < MAX_RETRIES) {
					this.logger.warn(
						`Retryable error updating trust score for user ${userId} (attempt ${attempt}/${MAX_RETRIES}): ${lastError.message}`,
					);
					await this.delay(RETRY_DELAY_MS * attempt);
					continue;
				}

				// Non-retryable error or max retries exceeded
				this.logger.error(
					`Failed to update trust score for user ${userId}: ${lastError.message}`,
				);
				throw error;
			}
		}

		throw lastError;
	}

	/**
	 * Checks if an error is retryable (transient database errors)
	 */
	private isRetryableError(error: unknown): boolean {
		if (error instanceof PrismaClientKnownRequestError) {
			// P2024: Timed out fetching a new connection from the connection pool
			// P2034: Transaction failed due to a write conflict or a deadlock
			// P2020: Value out of range for the column
			// P2031: Prisma Client could not connect to the database
			// P2023: Inconsistent column data
			const retryableCodes = ['P2024', 'P2034', 'P2031', 'P2023'];
			return retryableCodes.includes(error.code);
		}

		// Retry on connection errors
		if (error instanceof PrismaClientInitializationError) {
			return true;
		}

		return false;
	}

	/**
	 * Utility function for delay (exponential backoff)
	 */
	private delay(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
