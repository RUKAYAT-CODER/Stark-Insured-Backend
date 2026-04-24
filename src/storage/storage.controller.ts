import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StorageService } from './storage.service';

@Controller({ path: 'projects', version: '1' })
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Throttle({ default: { limit: 20, ttl: 3600000 } }) // 20 metadata pins per hour
  @Post('metadata')
  async pinProjectMetadata(@Body() metadata: any): Promise<string> {
    return this.storageService.pinProjectMetadata(metadata);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 banner uploads per hour
  @Post('banner')
  async optimizeAndUploadBanner(@Body() banner: any): Promise<string> {
    const optimizedImage = await this.storageService.optimizeImage(
      banner.imagePath,
      banner.width,
      banner.height,
    );
    const cid = await this.storageService.pinProjectMetadata({ image: optimizedImage });
    return cid;
  }

  @Throttle({ default: { limit: 100, ttl: 60000 } }) // 100 hash verifications per minute
  @Post('verify-hash')
  async verifyIPFSHash(@Body('hash') hash: string): Promise<boolean> {
    return this.storageService.verifyIPFSHash(hash);
  }
}
