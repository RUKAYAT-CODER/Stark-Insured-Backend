import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create } from 'ipfs-http-client';

import sharp from 'sharp';

@Injectable()
export class StorageService {
  private ipfs: ReturnType<typeof create>;

  constructor(private configService: ConfigService) {
    this.ipfs = create({
      host: this.configService.get<string>('IPFS_HOST', 'localhost'),
      port: parseInt(this.configService.get<string>('IPFS_PORT', '5001')),
      protocol: this.configService.get<string>('IPFS_PROTOCOL', 'https'),
    });
  }

  async pinProjectMetadata(metadata: any): Promise<string> {
    const cid = await this.ipfs.add(metadata);
    return cid.path;
  }

  async optimizeImage(imagePath: string, width: number, height: number): Promise<Buffer> {
    const optimizedImage = await sharp(imagePath)
      .resize(width, height)
      .jpeg({ quality: 80 })
      .toBuffer();
    return optimizedImage;
  }

  async verifyIPFSHash(hash: string): Promise<boolean> {
    try {
      await this.ipfs.cat(hash);
      return true;
    } catch (error) {
      return false;
    }
  }
}
