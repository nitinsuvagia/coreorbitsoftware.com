// ============================================
// VALIDATION UTILITIES
// ============================================

import validator from 'validator';
import { z } from 'zod';

// ============================================
// BASIC VALIDATORS
// ============================================

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  return validator.isEmail(email);
}

/**
 * Validate phone number
 */
export function isValidPhone(phone: string, locale: string = 'any'): boolean {
  return validator.isMobilePhone(phone, locale as any);
}

/**
 * Validate URL
 */
export function isValidUrl(url: string): boolean {
  return validator.isURL(url, {
    protocols: ['http', 'https'],
    require_protocol: true,
  });
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: string): boolean {
  return validator.isUUID(uuid);
}

/**
 * Validate date string
 */
export function isValidDate(dateString: string): boolean {
  return validator.isISO8601(dateString);
}

/**
 * Validate JSON string
 */
export function isValidJson(str: string): boolean {
  return validator.isJSON(str);
}

/**
 * Check if string is alphanumeric
 */
export function isAlphanumeric(str: string): boolean {
  return validator.isAlphanumeric(str);
}

/**
 * Check if string is numeric
 */
export function isNumeric(str: string): boolean {
  return validator.isNumeric(str);
}

// ============================================
// PASSWORD VALIDATION
// ============================================

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordRules {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumber?: boolean;
  requireSpecialChar?: boolean;
}

const DEFAULT_PASSWORD_RULES: PasswordRules = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true,
};

/**
 * Validate password against rules
 */
export function validatePassword(
  password: string,
  rules: PasswordRules = DEFAULT_PASSWORD_RULES
): PasswordValidationResult {
  const errors: string[] = [];
  const mergedRules = { ...DEFAULT_PASSWORD_RULES, ...rules };

  if (mergedRules.minLength && password.length < mergedRules.minLength) {
    errors.push(`Password must be at least ${mergedRules.minLength} characters`);
  }

  if (mergedRules.maxLength && password.length > mergedRules.maxLength) {
    errors.push(`Password must be at most ${mergedRules.maxLength} characters`);
  }

  if (mergedRules.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (mergedRules.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (mergedRules.requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (mergedRules.requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Check password strength (0-4)
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  return Math.min(4, strength);
}

// ============================================
// BUSINESS VALIDATORS
// ============================================

/**
 * Validate employee code format (e.g., EMP001)
 */
export function isValidEmployeeCode(code: string): boolean {
  return /^EMP\d{3,6}$/.test(code);
}

/**
 * Validate project code format (e.g., PRJ001)
 */
export function isValidProjectCode(code: string): boolean {
  return /^PRJ\d{3,6}$/.test(code);
}

/**
 * Validate asset tag format (e.g., AST-001)
 */
export function isValidAssetTag(tag: string): boolean {
  return /^AST-\d{3,6}$/.test(tag);
}

/**
 * Validate invoice number format
 */
export function isValidInvoiceNumber(number: string): boolean {
  return /^INV-\d{4}-\d{4,6}$/.test(number);
}

/**
 * Validate IFSC code (Indian bank)
 */
export function isValidIfsc(ifsc: string): boolean {
  return /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc);
}

/**
 * Validate PAN number (Indian)
 */
export function isValidPan(pan: string): boolean {
  return /^[A-Z]{5}\d{4}[A-Z]$/.test(pan);
}

/**
 * Validate GST number (Indian)
 */
export function isValidGst(gst: string): boolean {
  return /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gst);
}

// ============================================
// ZOD SCHEMAS (Reusable)
// ============================================

export const emailSchema = z.string().email('Invalid email address');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/\d/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

export const phoneSchema = z.string().regex(/^\+?[\d\s-]{10,15}$/, 'Invalid phone number');

export const uuidSchema = z.string().uuid('Invalid UUID');

export const slugSchema = z
  .string()
  .min(2)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

export const dateSchema = z.string().datetime('Invalid date format');

export const urlSchema = z.string().url('Invalid URL');

export const positiveNumberSchema = z.number().positive('Must be a positive number');

export const percentageSchema = z.number().min(0).max(100, 'Must be between 0 and 100');

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitize string (trim, remove extra spaces)
 */
export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

/**
 * Sanitize email (lowercase, trim)
 */
export function sanitizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Sanitize phone (remove non-digits except +)
 */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(str: string): string {
  return validator.escape(str);
}

/**
 * Strip HTML tags
 */
export function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, '');
}
