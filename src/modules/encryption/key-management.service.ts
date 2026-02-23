import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface EncryptionKey {
  id: string;
  key: Buffer;
  isActive: boolean;
}

@Injectable()
export class KeyManagementService implements OnModuleInit {
  private readonly logger = new Logger(KeyManagementService.name);
  private keys: Map<string, EncryptionKey> = new Map();
  private activeKeyId: string | null = null;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.loadKeys();
  }

  private loadKeys() {
    // Expected format: KEY_ID:base64_key,KEY_ID2:base64_key2
    // The first key is considered the active key
    const keysConfig = this.configService.get<string>('ENCRYPTION_KEYS');
    
    if (!keysConfig) {
      this.logger.warn(
        'ENCRYPTION_KEYS not found in environment. Using a fallback temporary key. THIS IS INSECURE FOR PRODUCTION.',
      );
      // Generate a temporary 32-byte key (256 bits) for development/testing if none provided
      const tempKey = Buffer.alloc(32, 'dev_fallback_key_do_not_use_prod');
      this.activeKeyId = 'dev-fallback';
      this.keys.set(this.activeKeyId, {
        id: this.activeKeyId,
        key: tempKey,
        isActive: true,
      });
      return;
    }

    try {
      const keyEntries = keysConfig.split(',');
      if (keyEntries.length === 0) {
        throw new Error('No keys found in ENCRYPTION_KEYS');
      }

      keyEntries.forEach((entry, index) => {
        const [id, base64Key] = entry.split(':');
        if (!id || !base64Key) {
          throw new Error('Invalid key format. Expected ID:base64');
        }

        const keyBuffer = Buffer.from(base64Key, 'base64');
        if (keyBuffer.length !== 32) {
          throw new Error(`Key ${id} must be exactly 32 bytes (256 bits) for AES-256`);
        }

        const isActive = index === 0; // First key in the list is the active one for new encryptions
        if (isActive) {
          this.activeKeyId = id;
        }

        this.keys.set(id, {
          id,
          key: keyBuffer,
          isActive,
        });
      });

      this.logger.log(`Loaded ${this.keys.size} encryption keys. Active key: ${this.activeKeyId}`);
    } catch (error) {
      this.logger.error(`Failed to load encryption keys: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('Critical configuration error: Invalid ENCRYPTION_KEYS');
    }
  }

  getActiveKey(): EncryptionKey {
    if (!this.activeKeyId) {
      throw new Error('No active encryption key found');
    }
    const key = this.keys.get(this.activeKeyId);
    if (!key) {
      throw new Error(`Active key ${this.activeKeyId} not found in key map`);
    }
    return key;
  }

  getKey(id: string): EncryptionKey {
    const key = this.keys.get(id);
    if (!key) {
      throw new Error(`Encryption key ${id} not found. This encrypted data cannot be read until the key is restored.`);
    }
    return key;
  }
}
