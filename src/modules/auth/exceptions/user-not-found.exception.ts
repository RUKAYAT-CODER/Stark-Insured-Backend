import { NotFoundException } from '@nestjs/common';

export class UserNotFoundException extends NotFoundException {
  constructor(walletAddress?: string) {
    super(
      walletAddress
        ? `No registered user found for wallet address ${walletAddress}.`
        : 'User not found. Wallet address is not registered.',
    );
  }
}
