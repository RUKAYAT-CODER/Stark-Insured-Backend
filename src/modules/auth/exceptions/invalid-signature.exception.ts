import { UnauthorizedException } from '@nestjs/common';

export class InvalidSignatureException extends UnauthorizedException {
  constructor(detail?: string) {
    super(
      detail ||
        'Signature verification failed. Please sign the challenge with your Stellar wallet private key.',
    );
  }
}
