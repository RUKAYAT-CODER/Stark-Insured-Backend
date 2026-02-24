import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import {
  getEncryptionTransformer,
  getObjectEncryptionTransformer,
} from './encryption.transformer';
import { ValueTransformer } from 'typeorm';

@Injectable()
export class EncryptionRegistry implements OnModuleInit {
  private static instance: EncryptionRegistry | null = null;
  private static readonly logger = new Logger(EncryptionRegistry.name);

  constructor(private readonly encryptionService: EncryptionService) {}

  onModuleInit() {
    EncryptionRegistry.instance = this;
    EncryptionRegistry.logger.log(
      'EncryptionRegistry initialized for TypeORM entities',
    );
  }

  /**
   * Expose the encryption service for testing purposes.
   * In production, prefer accessing transformers through the static factory methods.
   */
  static setService(service: EncryptionService): void {
    EncryptionRegistry.instance = {
      encryptionService: service,
    } as unknown as EncryptionRegistry;
  }

  static getEncryptionTransformer(): ValueTransformer | any {
    if (!EncryptionRegistry.instance) {
      // Expected during bootstrap: TypeORM entity decorators run before NestJS DI initializes
      EncryptionRegistry.logger.debug(
        'Deferring encryption transformer — registry not yet initialized',
      );
      return {
        to: (value: any) => value,
        from: (value: any) => value,
      };
    }
    return getEncryptionTransformer(
      EncryptionRegistry.instance.encryptionService,
    );
  }

  static getObjectEncryptionTransformer<T>(): ValueTransformer | any {
    if (!EncryptionRegistry.instance) {
      // Expected during bootstrap: TypeORM entity decorators run before NestJS DI initializes
      EncryptionRegistry.logger.debug(
        'Deferring object encryption transformer — registry not yet initialized',
      );
      return {
        to: (value: any) => value,
        from: (value: any) => value,
      };
    }
    return getObjectEncryptionTransformer<T>(
      EncryptionRegistry.instance.encryptionService,
    );
  }
}
