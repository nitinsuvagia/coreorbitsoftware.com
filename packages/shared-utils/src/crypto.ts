// ============================================
// CRYPTOGRAPHY UTILITIES
// ============================================

import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain password with a hashed password
 */
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Generate a random token (for password reset, email verification, etc.)
 */
export function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a secure random string (URL-safe)
 */
export function generateSecureId(length: number = 21): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(text: string, secretKey: string): string {
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt data encrypted with AES-256-GCM
 */
export function decrypt(encryptedData: string, secretKey: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const key = crypto.scryptSync(secretKey, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Hash data using SHA-256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using MD5 (for checksums, not security)
 */
export function md5(data: string): string {
  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * Generate HMAC signature
 */
export function generateHmac(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function verifyHmac(data: string, signature: string, secret: string): boolean {
  const expectedSignature = generateHmac(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Mask sensitive data (e.g., email, phone)
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const maskedLocal = local.length > 2 
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '*'.repeat(local.length);
  
  return `${maskedLocal}@${domain}`;
}

export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}

export function maskCardNumber(cardNumber: string): string {
  const cleaned = cardNumber.replace(/\D/g, '');
  if (cleaned.length < 4) return '*'.repeat(cleaned.length);
  
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
}
