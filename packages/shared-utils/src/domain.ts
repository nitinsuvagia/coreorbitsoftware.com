/**
 * Domain Utilities - Subdomain extraction and validation
 * 
 * These utilities are used by the API Gateway and all services
 * to resolve tenant context from request hostname
 */

import { 
  DomainType, 
  DomainResolution, 
  DomainValidationResult,
  RESERVED_SUBDOMAINS,
  AllowedUserType,
} from '@oms/shared-types';

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Domain configuration interface
 */
export interface DomainConfig {
  mainDomain: string;           // e.g., "youroms.com"
  platformAdminSubdomain?: string; // e.g., "admin" for admin.youroms.com (optional)
  allowCustomDomains: boolean;
  environment: 'development' | 'staging' | 'production';
}

/**
 * Default domain configuration (override via environment)
 */
const DEFAULT_CONFIG: DomainConfig = {
  mainDomain: process.env.MAIN_DOMAIN || 'youroms.com',
  platformAdminSubdomain: process.env.PLATFORM_ADMIN_SUBDOMAIN || undefined,
  allowCustomDomains: process.env.ALLOW_CUSTOM_DOMAINS === 'true',
  environment: (process.env.NODE_ENV as DomainConfig['environment']) || 'development',
};

// ============================================================================
// SUBDOMAIN EXTRACTION
// ============================================================================

/**
 * Extract subdomain from hostname
 * 
 * Examples:
 * - "acme.youroms.com" → "acme"
 * - "youroms.com" → null (main domain)
 * - "www.youroms.com" → null (www treated as main)
 * - "hr.acmecorp.com" → null (custom domain, handled separately)
 * - "localhost:3000" → null (development)
 * - "acme.localhost:3000" → "acme" (development)
 */
export function extractSubdomain(
  hostname: string, 
  config: DomainConfig = DEFAULT_CONFIG
): string | null {
  // Remove port if present
  const host = hostname.split(':')[0].toLowerCase();
  
  // Handle localhost for development
  if (config.environment === 'development') {
    if (host === 'localhost' || host === '127.0.0.1') {
      return null; // Main domain in development
    }
    
    // Check for subdomain.localhost pattern
    const localhostMatch = host.match(/^([a-z0-9-]+)\.localhost$/);
    if (localhostMatch) {
      const subdomain = localhostMatch[1];
      return isReservedSubdomain(subdomain) ? null : subdomain;
    }
  }
  
  // Check if hostname ends with main domain
  const mainDomainLower = config.mainDomain.toLowerCase();
  
  if (host === mainDomainLower || host === `www.${mainDomainLower}`) {
    return null; // Main domain, no subdomain
  }
  
  if (!host.endsWith(`.${mainDomainLower}`)) {
    return null; // Custom domain or different domain entirely
  }
  
  // Extract subdomain
  const subdomain = host.slice(0, -(mainDomainLower.length + 1));
  
  // Check for multi-level subdomains (not supported)
  if (subdomain.includes('.')) {
    return null;
  }
  
  // Check if reserved
  if (isReservedSubdomain(subdomain)) {
    return null;
  }
  
  return subdomain;
}

/**
 * Check if a subdomain is reserved
 */
export function isReservedSubdomain(subdomain: string): boolean {
  return RESERVED_SUBDOMAINS.includes(subdomain.toLowerCase() as any);
}

// ============================================================================
// DOMAIN RESOLUTION
// ============================================================================

/**
 * Resolve domain type and tenant context from hostname
 */
export function resolveDomain(
  hostname: string,
  config: DomainConfig = DEFAULT_CONFIG
): DomainResolution {
  const host = hostname.split(':')[0].toLowerCase();
  const subdomain = extractSubdomain(hostname, config);
  
  // Check if it's the main domain
  if (isMainDomain(hostname, config)) {
    return {
      type: 'main',
      isMainDomain: true,
      isTenantDomain: false,
      allowedUserTypes: ['platform_super_admin', 'platform_sub_admin', 'platform_admin_user'],
    };
  }
  
  // Check if it's a tenant subdomain
  if (subdomain) {
    return {
      type: 'subdomain',
      isMainDomain: false,
      isTenantDomain: true,
      tenantSlug: subdomain,
      allowedUserTypes: ['tenant_admin', 'tenant_user'],
    };
  }
  
  // Check if it might be a custom domain
  if (config.allowCustomDomains && !host.endsWith(config.mainDomain)) {
    return {
      type: 'custom',
      isMainDomain: false,
      isTenantDomain: true, // Will need DB lookup to confirm
      allowedUserTypes: ['tenant_admin', 'tenant_user'],
    };
  }
  
  // Default to main domain (fallback)
  return {
    type: 'main',
    isMainDomain: true,
    isTenantDomain: false,
    allowedUserTypes: ['platform_super_admin', 'platform_sub_admin', 'platform_admin_user'],
  };
}

/**
 * Check if hostname is the main domain
 */
export function isMainDomain(
  hostname: string,
  config: DomainConfig = DEFAULT_CONFIG
): boolean {
  const host = hostname.split(':')[0].toLowerCase();
  const mainDomain = config.mainDomain.toLowerCase();
  
  // Development mode
  if (config.environment === 'development') {
    if (host === 'localhost' || host === '127.0.0.1') {
      return true;
    }
  }
  
  // Check main domain patterns
  if (host === mainDomain) return true;
  if (host === `www.${mainDomain}`) return true;
  
  // Check platform admin subdomain if configured
  if (config.platformAdminSubdomain) {
    if (host === `${config.platformAdminSubdomain}.${mainDomain}`) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if hostname is a tenant subdomain
 */
export function isTenantSubdomain(
  hostname: string,
  config: DomainConfig = DEFAULT_CONFIG
): boolean {
  const subdomain = extractSubdomain(hostname, config);
  return subdomain !== null;
}

// ============================================================================
// SUBDOMAIN VALIDATION
// ============================================================================

/**
 * Validate a subdomain for registration
 */
export function validateSubdomain(subdomain: string): DomainValidationResult {
  const errors: DomainValidationResult['errors'] = [];
  const normalizedSubdomain = subdomain.toLowerCase().trim();
  
  // Check minimum length
  if (normalizedSubdomain.length < 3) {
    errors.push({
      code: 'TOO_SHORT',
      message: 'Subdomain must be at least 3 characters long',
    });
  }
  
  // Check maximum length
  if (normalizedSubdomain.length > 63) {
    errors.push({
      code: 'TOO_LONG',
      message: 'Subdomain must be at most 63 characters long',
    });
  }
  
  // Check valid characters (alphanumeric and hyphens, no leading/trailing hyphens)
  const validPattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  if (!validPattern.test(normalizedSubdomain)) {
    errors.push({
      code: 'INVALID_CHARACTERS',
      message: 'Subdomain can only contain lowercase letters, numbers, and hyphens. Cannot start or end with a hyphen.',
    });
  }
  
  // Check reserved subdomains
  if (isReservedSubdomain(normalizedSubdomain)) {
    errors.push({
      code: 'RESERVED',
      message: 'This subdomain is reserved and cannot be used',
    });
  }
  
  // Check for profanity (basic check - should use a proper library in production)
  const profanityList = ['admin', 'fuck', 'shit', 'ass', 'damn', 'hell'];
  if (profanityList.some(word => normalizedSubdomain.includes(word))) {
    errors.push({
      code: 'CONTAINS_PROFANITY',
      message: 'This subdomain contains inappropriate language',
    });
  }
  
  return {
    isValid: errors.length === 0,
    isAvailable: true, // Needs DB check
    isReserved: isReservedSubdomain(normalizedSubdomain),
    isTaken: false, // Needs DB check
    errors,
    suggestions: errors.length > 0 ? generateSubdomainSuggestions(normalizedSubdomain) : undefined,
  };
}

/**
 * Generate subdomain suggestions
 */
function generateSubdomainSuggestions(original: string): string[] {
  const base = original.replace(/[^a-z0-9]/g, '').slice(0, 50);
  if (!base) return [];
  
  const suggestions: string[] = [];
  const suffixes = ['app', 'hq', 'team', 'io', 'co'];
  
  for (const suffix of suffixes) {
    const suggestion = `${base}${suffix}`;
    if (suggestion.length >= 3 && suggestion.length <= 63 && !isReservedSubdomain(suggestion)) {
      suggestions.push(suggestion);
    }
  }
  
  return suggestions.slice(0, 3);
}

// ============================================================================
// URL BUILDERS
// ============================================================================

/**
 * Build tenant URL from subdomain
 */
export function buildTenantUrl(
  subdomain: string,
  path: string = '/',
  config: DomainConfig = DEFAULT_CONFIG
): string {
  const protocol = config.environment === 'production' ? 'https' : 'http';
  
  if (config.environment === 'development') {
    return `${protocol}://${subdomain}.localhost:3000${path}`;
  }
  
  return `${protocol}://${subdomain}.${config.mainDomain}${path}`;
}

/**
 * Build main domain URL
 */
export function buildMainDomainUrl(
  path: string = '/',
  config: DomainConfig = DEFAULT_CONFIG
): string {
  const protocol = config.environment === 'production' ? 'https' : 'http';
  
  if (config.environment === 'development') {
    return `${protocol}://localhost:3000${path}`;
  }
  
  return `${protocol}://${config.mainDomain}${path}`;
}

/**
 * Build redirect URL for domain switching
 */
export function buildRedirectUrl(
  targetDomain: DomainType,
  tenantSlug: string | undefined,
  path: string = '/',
  config: DomainConfig = DEFAULT_CONFIG
): string {
  if (targetDomain === 'main') {
    return buildMainDomainUrl(path, config);
  }
  
  if (!tenantSlug) {
    throw new Error('Tenant slug is required for subdomain/custom domain redirect');
  }
  
  return buildTenantUrl(tenantSlug, path, config);
}

// ============================================================================
// ACCESS VALIDATION
// ============================================================================

/**
 * Validate if a user type can access the resolved domain
 */
export function canAccessDomain(
  userType: AllowedUserType,
  domainResolution: DomainResolution
): boolean {
  return domainResolution.allowedUserTypes.includes(userType);
}

/**
 * Get the appropriate redirect URL when access is denied
 */
export function getAccessDeniedRedirect(
  userType: AllowedUserType,
  tenantSlug: string | undefined,
  config: DomainConfig = DEFAULT_CONFIG
): string {
  // Platform admins should go to main domain
  if (userType.startsWith('platform_')) {
    return buildMainDomainUrl('/login', config);
  }
  
  // Tenant users should go to their subdomain
  if (tenantSlug) {
    return buildTenantUrl(tenantSlug, '/login', config);
  }
  
  // Fallback to main domain
  return buildMainDomainUrl('/login', config);
}

export default {
  extractSubdomain,
  resolveDomain,
  isMainDomain,
  isTenantSubdomain,
  validateSubdomain,
  buildTenantUrl,
  buildMainDomainUrl,
  buildRedirectUrl,
  canAccessDomain,
  getAccessDeniedRedirect,
  isReservedSubdomain,
};
