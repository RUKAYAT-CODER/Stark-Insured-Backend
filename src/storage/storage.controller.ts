import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';

@Controller('api/storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('metadata')
  async pinProjectMetadata(@Body() metadata: any): Promise<string> {
    return this.storageService.pinProjectMetadata(metadata);
  }

  @Post('banner')
  @UseInterceptors(FileInterceptor('file'))
  async optimizeAndUploadBanner(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: '.(png|jpeg|jpg|webp)' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('width') width?: string,
    @Body('height') height?: string,
  ): Promise<string> {
    const optimizedImage = await this.storageService.optimizeImage(
      file.buffer,
      width ? parseInt(width, 10) : 800,
      height ? parseInt(height, 10) : 600,
    );
    const cid = await this.storageService.pinProjectMetadata({ image: optimizedImage });
    return cid;
  }

  @Post('verify-hash')
  async verifyIPFSHash(@Body('hash') hash: string): Promise<boolean> {
    return this.storageService.verifyIPFSHash(hash);
  }
}
