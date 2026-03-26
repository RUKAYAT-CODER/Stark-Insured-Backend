import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create } from 'ipfs-http-client';

import sharp from 'sharp';

@Injectable()
export class StorageService {
  private ipfs: ReturnType<typeof create>;

  constructor(private readonly config: ConfigService) {
    const ipfsUrl = this.config.get<string>('STELLAR_HORIZON_URL') || 'http://localhost:5001';
    this.ipfs = create({ url: ipfsUrl });
  }

  async pinFile(fileBuffer: Buffer): Promise<string> {
    const cid = await this.ipfs.add(fileBuffer);
    return cid.path;
  }

  async pinProjectMetadata(metadata: any): Promise<string> {
    const data = typeof metadata === 'string' ? metadata : JSON.stringify(metadata);
    const cid = await this.ipfs.add(data);
    return cid.path;
  }

  async optimizeImage(fileBuffer: Buffer, width: number, height: number): Promise<Buffer> {
    const optimizedImage = await sharp(fileBuffer)
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
