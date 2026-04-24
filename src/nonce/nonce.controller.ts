import { Controller, Post, VERSION_NEUTRAL } from '@nestjs/common';
import { NonceService } from './nonce.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller({ path: 'nonce', version: VERSION_NEUTRAL })
export class NonceController {
  constructor(private readonly nonceService: NonceService) {}

  @Public()
  @Post()
  async getNonce(): Promise<string> {
    return this.nonceService.generateNonce();
  }
}
