/**
 * Security utility functions for encryption, hashing, and rate limiting
 * 
 * This module provides:
 * - AES-256-GCM encryption for 2FA secrets
 * - Bcrypt hashing for backup codes
 * - Rate limiting helpers
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { hashSync, compareSync } from 'bcrypt-ts';

// Environment-based encryption key derivation
function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET environment variable is required for encryption');
  }
  // Derive a 32-byte key from AUTH_SECRET using scrypt
  return scryptSync(secret, 'barzakh-2fa-salt', 32);
}

/**
 * Encrypt a 2FA secret using AES-256-GCM
 * Returns base64 encoded: iv:authTag:encryptedData
 */
export function encrypt2FASecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData (all base64)
  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt a 2FA secret encrypted with AES-256-GCM
 */
export function decrypt2FASecret(encryptedData: string): string {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[0], 'base64');
  const authTag = Buffer.from(parts[1], 'base64');
  const encrypted = parts[2];
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Check if a string is encrypted (has our encryption format)
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  const parts = data.split(':');
  return parts.length === 3 && parts.every(p => p.length > 0);
}

/**
 * Hash a backup code using bcrypt
 */
export function hashBackupCode(code: string): string {
  return hashSync(code.toUpperCase(), 10);
}

/**
 * Verify a backup code against its hash
 */
export function verifyBackupCode(code: string, hash: string): boolean {
  return compareSync(code.toUpperCase(), hash);
}

/**
 * Generate hashed backup codes
 * Returns both plain codes (to show user once) and hashed codes (to store)
 */
export function generateHashedBackupCodes(count: number = 8): { plainCodes: string[], hashedCodes: string[] } {
  const { nanoid } = require('nanoid');
  const plainCodes: string[] = [];
  const hashedCodes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const code = nanoid(8).toUpperCase();
    plainCodes.push(code);
    hashedCodes.push(hashBackupCode(code));
  }
  
  return { plainCodes, hashedCodes };
}

/**
 * Find and verify a backup code from hashed list
 * Returns the index if found, -1 otherwise
 */
export function findBackupCode(code: string, hashedCodes: string[]): number {
  const upperCode = code.toUpperCase();
  for (let i = 0; i < hashedCodes.length; i++) {
    if (verifyBackupCode(upperCode, hashedCodes[i])) {
      return i;
    }
  }
  return -1;
}

// Rate limiting using in-memory store (for single instance)
// For production multi-instance, use Redis
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit for a given key
 * @param key - Unique identifier (e.g., `2fa:${userId}` or `login:${ip}`)
 * @param limit - Maximum requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, resetIn: number }
 */
export function checkRateLimit(
  key: string, 
  limit: number, 
  windowMs: number
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetTime) {
    // First request or window expired
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetIn: windowMs };
  }
  
  if (entry.count >= limit) {
    // Rate limited
    return { allowed: false, remaining: 0, resetIn: entry.resetTime - now };
  }
  
  // Increment count
  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetIn: entry.resetTime - now };
}

/**
 * Reset rate limit for a key (e.g., after successful auth)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}
