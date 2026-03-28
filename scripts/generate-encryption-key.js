#!/usr/bin/env node

/**
 * Encryption Key Generator
 * 
 * Generates a secure 32-byte (256-bit) encryption key for AES-256-GCM encryption.
 * Output is base64 encoded for easy use in environment variables.
 * 
 * Usage:
 *   node scripts/generate-encryption-key.js
 * 
 * Add the output to your .env file:
 *   ENCRYPTION_KEYS=v1:<paste_key_here>
 */

const crypto = require('crypto');

console.log('\n🔐 Generating secure encryption key...\n');

// Generate 32 bytes (256 bits) for AES-256
const key = crypto.randomBytes(32);
const base64Key = key.toString('base64');

console.log('✅ Generated encryption key:\n');
console.log('─'.repeat(60));
console.log(`v1:${base64Key}`);
console.log('─'.repeat(60));
console.log('\n📋 Add this to your .env file as:\n');
console.log(`ENCRYPTION_KEYS=v1:${base64Key}\n`);

// Verify key length
const decoded = Buffer.from(base64Key, 'base64');
console.log(`📏 Key length: ${decoded.length} bytes (${decoded.length * 8} bits)`);
console.log('✅ Key length is correct for AES-256 encryption\n');
