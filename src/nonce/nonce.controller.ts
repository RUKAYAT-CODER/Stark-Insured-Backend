import { Controller, Post } from '@nestjs/common';
import { NonceService } from './nonce.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('nonce')
export class NonceController {
  constructor(private readonly nonceService: NonceService) {}

  @Public()
  @Post()
  async getNonce(): Promise<string> {
    return this.nonceService.generateNonce();
  }
}
