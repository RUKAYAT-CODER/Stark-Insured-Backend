import { NotFoundException } from '@nestjs/common';

export class ChallengeNotFoundException extends NotFoundException {
  constructor(walletAddress?: string) {
    super(
      walletAddress
        ? `No login challenge found for wallet ${walletAddress}. Please request a new challenge.`
        : 'Login challenge not found or has expired. Please request a new challenge.',
    );
  }
}
