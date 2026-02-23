import { UnauthorizedException } from '@nestjs/common';

export class ChallengeExpiredException extends UnauthorizedException {
  constructor() {
    super(
      'Login challenge has expired. Please request a new challenge (valid for 5 minutes).',
    );
  }
}
