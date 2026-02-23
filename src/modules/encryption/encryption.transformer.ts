import { ValueTransformer } from 'typeorm';
import { EncryptionService } from './encryption.service';

/**
 * A factory function that returns a TypeORM ValueTransformer
 * which uses the provided EncryptionService instance.
 * 
 * Note: Since TypeORM transformers are usually instantiated outside the NestJS DI container,
 * we have to pass the service instance to the factory, typically during bootstrap or via a static registry.
 */
export function getEncryptionTransformer(encryptionService: EncryptionService): ValueTransformer {
    return {
        to: (value: string | null | undefined): string | null => {
            if (value == null) return null;
            return encryptionService.encrypt(value);
        },
        from: (value: string | null | undefined): string | null => {
            if (value == null) return null;
            return encryptionService.decrypt(value);
        }
    };
}

export function getObjectEncryptionTransformer<T>(encryptionService: EncryptionService): ValueTransformer {
    return {
        to: (value: T | null | undefined): string | null => {
            if (value == null) return null;
            return encryptionService.encryptObject(value);
        },
        from: (value: string | null | undefined): T | null => {
            if (value == null) return null;
            // Value from DB is a string, which should be decrypted back into an object
            return encryptionService.decryptObject<T>(value);
        }
    };
}
