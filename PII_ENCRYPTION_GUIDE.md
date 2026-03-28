# PII Encryption Implementation Guide

## 🔐 Overview

This document describes the implementation of encryption for Personally Identifiable Information (PII) in the Stellar Insured Backend. All sensitive user data is now encrypted at rest using AES-256-GCM authenticated encryption.

## 📋 Security Summary

- **Algorithm**: AES-256-GCM (Authenticated Encryption with Associated Data)
- **Key Size**: 256 bits (32 bytes)
- **IV Size**: 128 bits (16 bytes) - randomly generated per encryption
- **Authentication Tag**: 128 bits (16 bytes) - ensures data integrity
- **Storage Format**: `keyId:iv:authTag:encryptedData` (all base64 encoded)

## 🎯 Encrypted Fields

The following PII fields are encrypted in the database:

### User Model
- `email` - User's email address
- `profileData` - User's profile information (JSON stored as encrypted string)

## 🚀 Implementation Details

### Architecture

```
┌─────────────────┐
│  Client Request │
│  (Plain Text)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   DTO Layer     │ ← Input validation
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Service Layer  │ ← Encryption happens here
│                 │
│ - Encrypt on    │   write
│ - Decrypt on    │   read
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Prisma ORM    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   PostgreSQL    │ ← Encrypted data stored
└─────────────────┘
```

### Key Components

#### 1. EncryptionService (`src/encryption/encryption.service.ts`)

Core encryption/decryption functionality:
- `encryptForStorage(plaintext)` - Encrypts data for database storage
- `decryptFromStorage(encryptedString)` - Decrypts data from database
- `isEncrypted(value)` - Checks if value is already encrypted

#### 2. UserService Updates (`src/user/user.service.ts`)

Modified methods:
- `createUser()` - Encrypts PII before saving
- `updateUser()` - Encrypts updated PII fields
- `getUserById()` - Decrypts PII when retrieving

#### 3. EncryptionModule (`src/encryption/encryption.module.ts`)

Global module that provides encryption services throughout the application.

## 🔑 Key Management

### Generating Encryption Keys

**Option 1: Using OpenSSL**
```bash
openssl rand -base64 32
```

**Option 2: Using Node.js**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Configuring Keys

Edit your `.env` file:

```bash
# Single key (development)
ENCRYPTION_KEYS=v1:YOUR_BASE64_32BYTE_KEY_HERE

# Multiple keys (production with rotation)
ENCRYPTION_KEYS=v1:CURRENT_KEY_BASE64,v2:PREVIOUS_KEY_BASE64
```

**Important Notes:**
- Keys must be exactly 32 bytes (256 bits) for AES-256
- The first key in the list is used for new encryptions
- Keep old keys for decrypting existing data
- Use secrets manager in production (AWS Secrets Manager, Azure Key Vault, etc.)

### Key Rotation Process

1. Generate a new 32-byte key
2. Add it to the beginning of `ENCRYPTION_KEYS`
3. Old keys remain for decryption
4. Optionally run re-encryption script to update all data to new key

Example:
```bash
# Before rotation
ENCRYPTION_KEYS=v1:old_key_base64

# After adding new key
ENCRYPTION_KEYS=v2:new_key_base64,v1:old_key_base64
```

## 📦 Installation & Setup

### Step 1: Generate Encryption Key

```bash
# Generate key
openssl rand -base64 32

# Copy the output
```

### Step 2: Update Environment Variables

```bash
# In .env file
ENCRYPTION_KEYS=v1:<paste_your_key_here>
```

### Step 3: Update Application Module

The `EncryptionModule` is global and automatically available. Just import it in modules that need it:

```typescript
import { EncryptionModule } from '../encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  // ...
})
export class YourModule {}
```

### Step 4: Migrate Existing Data

**⚠️ IMPORTANT: Backup your database first!**

```bash
# Run the migration script
npx ts-node scripts/migrate-pii-encryption.ts
```

The migration script:
- ✅ Detects already encrypted data (skips it)
- ✅ Encrypts plain text PII fields
- ✅ Handles errors gracefully
- ✅ Provides progress reporting

### Step 5: Verify Migration

Check that data is encrypted in the database:

```sql
-- Encrypted emails should look like this:
SELECT id, email FROM users LIMIT 5;

-- Example encrypted value:
-- v1:dGhpc2lzYXJhbmRvbWl2O... (long base64 string with colons)
```

## 🔍 Usage Examples

### Injecting EncryptionService

```typescript
import { Injectable } from '@nestjs/common';
import { EncryptionService } from '../encryption/encryption.service';

@Injectable()
export class MyService {
  constructor(
    private readonly encryptionService: EncryptionService,
  ) {}

  async storeSensitiveData(data: string) {
    const encrypted = this.encryptionService.encryptForStorage(data);
    // Save encrypted to database
  }

  async retrieveSensitiveData(encrypted: string) {
    const decrypted = this.encryptionService.decryptFromStorage(encrypted);
    // Return decrypted data
  }
}
```

### Error Handling

```typescript
try {
  const decrypted = this.encryptionService.decryptFromStorage(encryptedData);
} catch (error) {
  // Handle decryption errors
  console.error('Decryption failed:', error.message);
  throw new Error('Failed to decrypt sensitive data');
}
```

## 🛡️ Security Best Practices

### Production Deployment

1. **Use Secrets Manager**
   - AWS Secrets Manager
   - Azure Key Vault
   - Google Secret Manager
   - HashiCorp Vault

2. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variable injection
   - Rotate keys regularly

3. **Database Access**
   - Limit database access to authorized personnel only
   - Use database encryption at rest (TDE)
   - Enable audit logging

4. **Key Rotation**
   - Rotate encryption keys annually
   - Immediately rotate if key compromise suspected
   - Maintain old keys for legacy data decryption

5. **Monitoring**
   - Log encryption/decryption failures
   - Monitor for unusual access patterns
   - Alert on repeated decryption failures

### What's Protected

✅ Database breach - attacker cannot read encrypted PII  
✅ Backup theft - encrypted data remains secure  
✅ DBA access - administrative users see only ciphertext  
✅ Compliance - meets GDPR, CCPA encryption requirements  

### What's NOT Protected

❌ Application compromise - if app is breached, data can be decrypted  
❌ Man-in-the-middle - use HTTPS for transit encryption  
❌ Client-side attacks - implement proper client security  

## 🧪 Testing

### Unit Tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from '../encryption/encryption.service';

describe('EncryptionService', () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncryptionService],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
  });

  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'test@example.com';
    const encrypted = service.encryptForStorage(plaintext);
    const decrypted = service.decryptFromStorage(encrypted);
    
    expect(decrypted).toBe(plaintext);
  });

  it('should detect encrypted values', () => {
    const encrypted = service.encryptForStorage('test');
    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(service.isEncrypted('plain')).toBe(false);
  });
});
```

## 📊 Performance Impact

- **Encryption overhead**: ~1-2ms per operation
- **Decryption overhead**: ~1-2ms per operation
- **Storage increase**: ~30-40% (due to base64 encoding + metadata)

## 🔄 Rollback Plan

If you need to rollback:

1. Keep the encryption keys available
2. The code supports both encrypted and unencrypted data
3. To decrypt all data permanently, create a reverse migration script

## 🆘 Troubleshooting

### Common Issues

**Issue: "Key must be 32 bytes"**
- Solution: Ensure your base64 key decodes to exactly 32 bytes
- Check: `echo YOUR_KEY | base64 -d | wc -c`

**Issue: "Failed to decrypt data"**
- Cause: Wrong key or corrupted data
- Solution: Verify ENCRYPTION_KEYS matches the key ID in encrypted data

**Issue: "ENCRYPTION_KEYS is not set"**
- Solution: Add ENCRYPTION_KEYS to your .env file
- Restart the application after adding

## 📚 Additional Resources

- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [AES-GCM Encryption](https://csrc.nist.gov/publications/detail/sp/800-38d/final)
- [GDPR Encryption Requirements](https://gdpr.eu/what-is-gdpr/)
- [NIST Guidelines for Cryptographic Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

## 🤝 Support

For questions or issues related to PII encryption:
1. Check this documentation
2. Review the encryption service code
3. Contact the security team

---

**Last Updated**: March 28, 2026  
**Version**: 1.0  
**Author**: Security Team
