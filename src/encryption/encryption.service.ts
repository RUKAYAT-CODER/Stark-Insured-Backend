import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';

export interface EncryptionResult {
  encryptedData: string;
  iv: string;
  keyId: string;
}

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKeys: Map<string, Buffer>;
  private readonly activeKeyId: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private readonly configService: ConfigService) {
    this.encryptionKeys = new Map();
    this.activeKeyId = this.loadEncryptionKeys();
  }

  /**
   * Load encryption keys from environment variables
   * Format: KEY_ID1:base64_32byte_key,KEY_ID2:base64_32byte_key2
   */
  private loadEncryptionKeys(): string {
    const keysConfig = this.configService.get<string>('ENCRYPTION_KEYS');
    
    if (!keysConfig) {
      throw new Error('ENCRYPTION_KEYS environment variable is not set');
    }

    const pairs = keysConfig.split(',');
    let activeKeyId = '';

    for (const pair of pairs) {
      const [keyId, base64Key] = pair.split(':');
      
      if (!keyId || !base64Key) {
        throw new Error(`Invalid encryption key format: ${pair}`);
      }

      try {
        const keyBuffer = Buffer.from(base64Key, 'base64');
        
        if (keyBuffer.length !== 32) {
          throw new Error(`Key must be 32 bytes for AES-256. Key ID: ${keyId}`);
        }

        this.encryptionKeys.set(keyId, keyBuffer);
        
        // First key is the active one by default
        if (!activeKeyId) {
          activeKeyId = keyId;
        }
      } catch (error) {
        throw new Error(`Failed to load encryption key ${keyId}: ${error.message}`);
      }
    }

    this.logger.log(`Loaded ${this.encryptionKeys.size} encryption key(s). Active key ID: ${activeKeyId}`);
    return activeKeyId;
  }

  /**
   * Encrypt a string value
   * @param plaintext - The plain text to encrypt
   * @returns Encrypted data with IV and key ID
   */
  encrypt(plaintext: string): EncryptionResult {
    if (!plaintext) {
      throw new Error('Cannot encrypt empty or null value');
    }

    const key = this.encryptionKeys.get(this.activeKeyId);
    if (!key) {
      throw new Error(`Active encryption key not found: ${this.activeKeyId}`);
    }

    try {
      // Generate a random IV (16 bytes for AES)
      const iv = randomBytes(16);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt the plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get auth tag (16 bytes for GCM mode)
      const authTag = cipher.getAuthTag();

      return {
        encryptedData: encrypted,
        iv: iv.toString('base64'),
        keyId: this.activeKeyId,
      };
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`, error.stack);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  /**
   * Decrypt an encrypted value
   * @param encryptedData - The encrypted data (base64)
   * @param iv - The initialization vector (base64)
   * @param keyId - The key ID used for encryption
   * @param authTag - The authentication tag (base64)
   * @returns Decrypted plain text
   */
  decrypt(encryptedData: string, iv: string, keyId: string, authTag: string): string {
    if (!encryptedData || !iv || !keyId || !authTag) {
      throw new Error('Missing required decryption parameters');
    }

    const key = this.encryptionKeys.get(keyId);
    if (!key) {
      throw new Error(`Encryption key not found: ${keyId}`);
    }

    try {
      const decipher = createDecipheriv(
        this.algorithm,
        key,
        Buffer.from(iv, 'base64'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'base64'));

      let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`, error.stack);
      throw new Error(`Failed to decrypt data: ${error.message}`);
    }
  }

  /**
   * Encrypt and return a format suitable for storage
   * Returns: keyId:iv:authTag:encryptedData (all base64)
   */
  encryptForStorage(plaintext: string): string {
    const result = this.encrypt(plaintext);
    
    // We need to get the auth tag from the cipher
    // Let's modify to include auth tag in the result
    const key = this.encryptionKeys.get(this.activeKeyId);
    const iv = Buffer.from(result.iv, 'base64');
    const cipher = createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();

    // Format: keyId:iv:authTag:encryptedData
    return `${result.keyId}:${result.iv}:${authTag.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt from storage format
   * Expects: keyId:iv:authTag:encryptedData
   */
  decryptFromStorage(encryptedString: string): string {
    if (!encryptedString) {
      throw new Error('Cannot decrypt empty or null value');
    }

    const parts = encryptedString.split(':');
    
    if (parts.length !== 4) {
      throw new Error('Invalid encrypted data format');
    }

    const [keyId, iv, authTag, encryptedData] = parts;

    return this.decrypt(encryptedData, iv, keyId, authTag);
  }

  /**
   * Check if a value is encrypted (has the encrypted format)
   */
  isEncrypted(value: string): boolean {
    if (!value) return false;
    
    const parts = value.split(':');
    return parts.length === 4;
  }

  /**
   * Get the active key ID (for monitoring/admin purposes)
   */
  getActiveKeyId(): string {
    return this.activeKeyId;
  }
}
