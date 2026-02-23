import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { EncryptionService } from './encryption.service';
import { getEncryptionTransformer, getObjectEncryptionTransformer } from './encryption.transformer';
import { ValueTransformer } from 'typeorm';

@Injectable()
export class EncryptionRegistry implements OnModuleInit {
    private static instance: EncryptionRegistry | null = null;
    private readonly logger = new Logger(EncryptionRegistry.name);

    constructor(private readonly encryptionService: EncryptionService) { }

    onModuleInit() {
        EncryptionRegistry.instance = this;
        this.logger.log('EncryptionRegistry initialized for TypeORM instances');
    }

    static getEncryptionTransformer(): ValueTransformer | any {
        if (!EncryptionRegistry.instance) {
            
            console.warn('EncryptionRegistry: Delaying initialization for entities...');
            return {
                to: (value: any) => value,
                from: (value: any) => value,
            };
        }
        return getEncryptionTransformer(EncryptionRegistry.instance.encryptionService);
    }
static getObjectEncryptionTransformer<T>(): ValueTransformer | any {
        if (!EncryptionRegistry.instance) {
            
            console.warn(' EncryptionRegistry: Delaying Object initialization for entities...');
            return {
                to: (value: any) => value,
                from: (value: any) => value,
            };
        }
        return getObjectEncryptionTransformer<T>(EncryptionRegistry.instance.encryptionService);
    }
}
