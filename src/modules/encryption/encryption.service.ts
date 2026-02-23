import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { KeyManagementService } from './key-management.service';

@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly algorithm = 'aes-256-gcm';
    private readonly ivLength = 12; // 96 bits for GCM
    private readonly authTagLength = 16; // 128 bits for GCM

    constructor(private keyManagementService: KeyManagementService) { }

    /**
     * Encrypts a plaintext string using AES-256-GCM.
     * Format of output: `<key_id>:<base64_iv>:<base64_auth_tag>:<base64_ciphertext>`
     */
    encrypt(plaintext: string | null | undefined): string | null {
        if (plaintext === null || plaintext === undefined) {
            return null;
        }

        try {
            const activeKey = this.keyManagementService.getActiveKey();

            const iv = crypto.randomBytes(this.ivLength);
            const cipher = crypto.createCipheriv(
                this.algorithm,
                activeKey.key,
                iv,
            );

            let encrypted = cipher.update(plaintext, 'utf8', 'base64');
            encrypted += cipher.final('base64');

            const authTag = cipher.getAuthTag();

            // Return formatted string containing all necessary parameters for decryption
            return `${activeKey.id}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
        } catch (error) {
            this.logger.error(`Encryption failed: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypts an encrypted string that was formatted by the encrypt method.
     * Format of input: `<key_id>:<base64_iv>:<base64_auth_tag>:<base64_ciphertext>`
     */
    decrypt(encryptedData: string | null | undefined): string | null {
        if (!encryptedData) {
            return encryptedData as null | undefined; // return as is if null/undefined/empty
        }

        try {
            const parts = encryptedData.split(':');

            // If the data doesn't match our format, it might be unencrypted legacy data
            // In a real migration scenario, you'd check for a specific prefix 
            // or try to parse and catch. We assume strict format here.
            if (parts.length !== 4) {
                this.logger.warn('Data does not appear to be formatted correctly for decryption, assuming plain text.');
                return encryptedData;
            }

            const [keyId, ivBase64, authTagBase64, ciphertextBase64] = parts;

            const keyFile = this.keyManagementService.getKey(keyId);
            const iv = Buffer.from(ivBase64, 'base64');
            const authTag = Buffer.from(authTagBase64, 'base64');

            const decipher = crypto.createDecipheriv(
                this.algorithm,
                keyFile.key,
                iv,
            );

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(ciphertextBase64, 'base64', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            this.logger.error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
            // If decryption fails (wrong key, tampered data), we don't return the raw ciphertext.
            // But we shouldn't necessarily crash the whole app just for one field.
            // Throwing error is safer so we don't accidentally overwrite good data with "DECRYPTION_FAILED" on save.
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Encrypts an object by stringifying it first
     */
    encryptObject(obj: any): string | null {
        if (obj === null || obj === undefined) return null;
        return this.encrypt(JSON.stringify(obj));
    }

    /**
     * Decrypts string and parses it back to an object
     */
    decryptObject<T>(encryptedData: string | null | undefined): T | null {
        if (!encryptedData) return null;
        try {
            const decrypted = this.decrypt(encryptedData);
            if (!decrypted) return null;
            return JSON.parse(decrypted) as T;
        } catch (e) {
            this.logger.error('Failed to parse decrypted object');
            // Return null or throw? Better to throw so we don't lose data on subsequent saves.
            throw new Error('Failed to parse decrypted object');
        }
    }
}
