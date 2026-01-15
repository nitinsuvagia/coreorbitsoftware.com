// ============================================
// FORMATTING UTILITIES
// ============================================

import slugify from 'slugify';

// ============================================
// STRING FORMATTING
// ============================================

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalize each word
 */
export function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert to title case
 */
export function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Convert to slug
 */
export function toSlug(str: string): string {
  return slugify(str, {
    lower: true,
    strict: true,
    trim: true,
  });
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

/**
 * Convert snake_case to Title Case
 */
export function snakeToTitle(str: string): string {
  return str
    .split('_')
    .map(word => capitalize(word))
    .join(' ');
}

/**
 * Convert to camelCase
 */
export function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase());
}

/**
 * Convert to snake_case
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/\s+/g, '_');
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number, suffix: string = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

/**
 * Get initials from name
 */
export function getInitials(name: string, maxInitials: number = 2): string {
  return name
    .split(' ')
    .slice(0, maxInitials)
    .map(word => word.charAt(0).toUpperCase())
    .join('');
}

/**
 * Format full name
 */
export function formatFullName(
  firstName: string,
  lastName: string,
  middleName?: string
): string {
  const parts = [firstName, middleName, lastName].filter(Boolean);
  return parts.join(' ');
}

/**
 * Pluralize word based on count
 */
export function pluralize(word: string, count: number, plural?: string): string {
  if (count === 1) return word;
  return plural || `${word}s`;
}

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format number with commas
 */
export function formatNumber(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1,
  locale: string = 'en-US'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

/**
 * Format compact number (e.g., 1.2K, 3.4M)
 */
export function formatCompactNumber(num: number, locale: string = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Format ordinal number (1st, 2nd, 3rd, etc.)
 */
export function formatOrdinal(num: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/**
 * Pad number with leading zeros
 */
export function padNumber(num: number, length: number): string {
  return num.toString().padStart(length, '0');
}

/**
 * Round to decimal places
 */
export function roundTo(num: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
}

// ============================================
// CODE GENERATORS
// ============================================

/**
 * Generate employee code
 */
export function generateEmployeeCode(sequence: number): string {
  return `EMP${padNumber(sequence, 4)}`;
}

/**
 * Generate project code
 */
export function generateProjectCode(sequence: number): string {
  return `PRJ${padNumber(sequence, 4)}`;
}

/**
 * Generate task number
 */
export function generateTaskNumber(projectCode: string, sequence: number): string {
  return `${projectCode}-${padNumber(sequence, 4)}`;
}

/**
 * Generate asset tag
 */
export function generateAssetTag(sequence: number): string {
  return `AST-${padNumber(sequence, 4)}`;
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${padNumber(sequence, 5)}`;
}

/**
 * Generate job code
 */
export function generateJobCode(sequence: number): string {
  return `JOB-${padNumber(sequence, 4)}`;
}

/**
 * Generate candidate code
 */
export function generateCandidateCode(sequence: number): string {
  return `CND-${padNumber(sequence, 5)}`;
}

// ============================================
// PHONE & ADDRESS FORMATTING
// ============================================

/**
 * Format phone number
 */
export function formatPhone(phone: string, format: string = 'international'): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (format === 'international' && cleaned.length === 10) {
    return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

/**
 * Format address to single line
 */
export function formatAddress(address: {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}): string {
  const parts = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.state,
    address.postalCode,
    address.country,
  ].filter(Boolean);
  
  return parts.join(', ');
}
