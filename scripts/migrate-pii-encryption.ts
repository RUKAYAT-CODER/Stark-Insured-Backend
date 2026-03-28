/**
 * PII Data Migration Script
 * 
 * This script migrates existing plain text PII data to encrypted format.
 * Run this script AFTER setting up the ENCRYPTION_KEYS environment variable.
 * 
 * Usage:
 *   npx ts-node scripts/migrate-pii-encryption.ts
 * 
 * IMPORTANT: 
 * - Backup your database before running this script
 * - Ensure ENCRYPTION_KEYS is properly configured in .env
 * - This script is idempotent - it checks if data is already encrypted
 */

import { PrismaClient } from '@prisma/client';
import { createCipheriv, randomBytes } from 'crypto';

const prisma = new PrismaClient();

// Get encryption key from environment
const ENCRYPTION_KEYS = process.env.ENCRYPTION_KEYS;

if (!ENCRYPTION_KEYS) {
  console.error('❌ ERROR: ENCRYPTION_KEYS environment variable is not set');
  process.exit(1);
}

// Parse the first key (active key)
const parseEncryptionKeys = (keysConfig: string): Map<string, Buffer> => {
  const keys = new Map<string, Buffer>();
  const pairs = keysConfig.split(',');
  
  for (const pair of pairs) {
    const [keyId, base64Key] = pair.split(':');
    if (!keyId || !base64Key) {
      throw new Error(`Invalid encryption key format: ${pair}`);
    }
    
    const keyBuffer = Buffer.from(base64Key, 'base64');
    if (keyBuffer.length !== 32) {
      throw new Error(`Key must be 32 bytes for AES-256. Key ID: ${keyId}`);
    }
    
    keys.set(keyId, keyBuffer);
  }
  
  return keys;
};

const encryptForStorage = (plaintext: string, keys: Map<string, Buffer>, activeKeyId: string): string => {
  const key = keys.get(activeKeyId);
  if (!key) {
    throw new Error(`Active encryption key not found: ${activeKeyId}`);
  }

  const algorithm = 'aes-256-gcm';
  const iv = randomBytes(16);
  const cipher = createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: keyId:iv:authTag:encryptedData
  return `${activeKeyId}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
};

async function migrateUserData() {
  console.log('🚀 Starting PII data migration...\n');
  
  const keys = parseEncryptionKeys(ENCRYPTION_KEYS);
  const activeKeyId = Array.from(keys.keys())[0];
  
  console.log(`✅ Loaded ${keys.size} encryption key(s). Active key ID: ${activeKeyId}\n`);
  
  try {
    // Get all users with unencrypted email or profileData
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            AND: [
              { email: { not: null } },
              { email: { not: { startsWith: 'v' } } } // Simple check - encrypted emails start with key ID
            ]
          },
          {
            AND: [
              { profileData: { not: null } },
              { NOT: { profileData: { string_contains: ':' } } } // Encrypted profileData contains colons
            ]
          }
        ]
      },
      select: {
        id: true,
        email: true,
        profileData: true,
      }
    });
    
    console.log(`📊 Found ${users.length} users with unencrypted PII\n`);
    
    let migratedCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        const updateData: any = {};
        
        // Migrate email if needed
        if (user.email && !user.email.includes(':')) {
          console.log(`📧 Migrating email for user ${user.id}...`);
          updateData.email = encryptForStorage(user.email, keys, activeKeyId);
        }
        
        // Migrate profileData if needed
        if (user.profileData && typeof user.profileData === 'string' && !user.profileData.includes(':')) {
          console.log(`👤 Migrating profileData for user ${user.id}...`);
          updateData.profileData = encryptForStorage(user.profileData, keys, activeKeyId);
        } else if (user.profileData && typeof user.profileData === 'object') {
          console.log(`👤 Migrating profileData (object) for user ${user.id}...`);
          const profileString = JSON.stringify(user.profileData);
          updateData.profileData = encryptForStorage(profileString, keys, activeKeyId);
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: user.id },
            data: updateData,
          });
          migratedCount++;
          console.log(`✅ Migrated user ${user.id}\n`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating user ${user.id}:`, error.message);
      }
    }
    
    console.log('\n===========================================');
    console.log('🎉 Migration completed!');
    console.log(`✅ Successfully migrated: ${migratedCount} users`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('===========================================\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateUserData()
  .then(() => {
    console.log('✨ Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
