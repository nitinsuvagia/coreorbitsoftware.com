/**
 * Domain & Subdomain Types - Multi-tenant domain resolution
 * 
 * Architecture:
 * - Main Domain (youroms.com) → Platform Admin Portal (SuperAdmin/SubAdmin/AdminUser ONLY)
 * - Tenant Subdomain (acme.youroms.com) → Tenant Portal (Tenant users ONLY)
 * - Custom Domain (hr.acmecorp.com) → Mapped to Tenant (optional premium feature)
 */

import { BaseEntity } from '../common';

// ============================================================================
// DOMAIN ACCESS LEVELS
// ============================================================================

/**
 * Domain types in the system
 */
export type DomainType = 
  | 'main'        // Main platform domain (youroms.com) - Platform Admins only
  | 'subdomain'   // Tenant subdomain (acme.youroms.com) - Tenant users only
  | 'custom';     // Custom domain mapped to tenant (hr.acmecorp.com)

/**
 * Domain resolution result
 */
export interface DomainResolution {
  type: DomainType;
  isMainDomain: boolean;
  isTenantDomain: boolean;
  tenantId?: string;
  tenantSlug?: string;
  customDomainId?: string;
  allowedUserTypes: AllowedUserType[];
}

/**
 * User types allowed based on domain
 */
export type AllowedUserType = 
  | 'platform_super_admin'    // Full platform access (SaaS owner)
  | 'platform_sub_admin'      // Limited platform admin access
  | 'platform_admin_user'     // Platform admin user (support, operations)
  | 'tenant_admin'            // Tenant owner/admin
  | 'tenant_user';            // Regular tenant employee

// ============================================================================
// SUBDOMAIN CONFIGURATION
// ============================================================================

/**
 * Subdomain status
 */
export type SubdomainStatus = 'pending' | 'active' | 'suspended' | 'reserved';

/**
 * Reserved subdomains that cannot be used by tenants
 */
export const RESERVED_SUBDOMAINS = [
  'www',
  'app',
  'api',
  'admin',
  'platform',
  'dashboard',
  'portal',
  'manage',
  'support',
  'help',
  'docs',
  'blog',
  'mail',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'media',
  'files',
  'status',
  'health',
  'metrics',
  'staging',
  'dev',
  'test',
  'demo',
  'sandbox',
  'beta',
  'alpha',
  'preview',
] as const;

export type ReservedSubdomain = (typeof RESERVED_SUBDOMAINS)[number];

/**
 * Subdomain registration/configuration
 */
export interface TenantSubdomain extends BaseEntity {
  tenantId: string;
  subdomain: string;           // e.g., "acme" for acme.youroms.com
  status: SubdomainStatus;
  isPrimary: boolean;          // Main subdomain for tenant
  sslCertificateId?: string;   // SSL certificate reference
  verifiedAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// CUSTOM DOMAIN MAPPING (Premium Feature)
// ============================================================================

/**
 * Custom domain verification status
 */
export type CustomDomainStatus = 
  | 'pending_verification'
  | 'dns_verification_failed'
  | 'ssl_pending'
  | 'ssl_failed'
  | 'active'
  | 'suspended'
  | 'expired';

/**
 * Custom domain DNS verification type
 */
export type DnsVerificationType = 'cname' | 'txt';

/**
 * Custom domain mapping (e.g., hr.acmecorp.com → acme tenant)
 */
export interface CustomDomainMapping extends BaseEntity {
  tenantId: string;
  domain: string;              // e.g., "hr.acmecorp.com"
  status: CustomDomainStatus;
  verificationType: DnsVerificationType;
  verificationToken: string;   // Token to add in DNS record
  verifiedAt?: Date;
  sslCertificateId?: string;
  sslExpiresAt?: Date;
  lastCheckedAt?: Date;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// DOMAIN VALIDATION & CONFIGURATION
// ============================================================================

/**
 * Platform domain configuration
 */
export interface PlatformDomainConfig {
  mainDomain: string;          // e.g., "youroms.com"
  subdomainPattern: string;    // e.g., "*.youroms.com"
  platformAdminUrl: string;    // e.g., "admin.youroms.com" or "youroms.com"
  apiDomain: string;           // e.g., "api.youroms.com"
  cdnDomain?: string;          // e.g., "cdn.youroms.com"
  supportedTlds: string[];     // Supported TLDs for custom domains
}

/**
 * Domain validation result
 */
export interface DomainValidationResult {
  isValid: boolean;
  isAvailable: boolean;
  isReserved: boolean;
  isTaken: boolean;
  errors: DomainValidationError[];
  suggestions?: string[];
}

/**
 * Domain validation error
 */
export interface DomainValidationError {
  code: DomainErrorCode;
  message: string;
  field?: string;
}

export type DomainErrorCode = 
  | 'INVALID_FORMAT'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'RESERVED'
  | 'ALREADY_TAKEN'
  | 'CONTAINS_PROFANITY'
  | 'INVALID_CHARACTERS'
  | 'DNS_NOT_CONFIGURED'
  | 'SSL_ERROR';

// ============================================================================
// DOMAIN ACCESS RULES
// ============================================================================

/**
 * Access rules for different domains
 */
export interface DomainAccessRules {
  mainDomain: MainDomainAccessConfig;
  tenantSubdomain: TenantSubdomainAccessConfig;
  customDomain: CustomDomainAccessConfig;
}

/**
 * Main domain access configuration (Platform Admin Portal)
 */
export interface MainDomainAccessConfig {
  allowedRoles: PlatformAdminRole[];
  requireMfa: boolean;
  allowedIpRanges?: string[];
  sessionTimeout: number;
  maxLoginAttempts: number;
}

/**
 * Tenant subdomain access configuration
 */
export interface TenantSubdomainAccessConfig {
  blockCrossTenantAccess: boolean;
  requireTenantContext: boolean;
  redirectToSubdomain: boolean;
  allowRememberDevice: boolean;
}

/**
 * Custom domain access configuration
 */
export interface CustomDomainAccessConfig {
  requireSslVerification: boolean;
  allowFallbackToSubdomain: boolean;
  cacheResolution: boolean;
  cacheTtlSeconds: number;
}

/**
 * Platform admin roles (for main domain access)
 */
export type PlatformAdminRole = 
  | 'super_admin'      // Full platform access - can manage everything
  | 'sub_admin'        // Limited admin - can manage tenants, billing
  | 'admin_user'       // Operations/support - can view tenants, handle support
  | 'billing_admin'    // Billing only - subscription & payment management
  | 'support_agent';   // Support tickets - read-only tenant access

// ============================================================================
// DOMAIN RESOLUTION REQUEST/RESPONSE
// ============================================================================

/**
 * Domain resolution request
 */
export interface DomainResolutionRequest {
  hostname: string;            // Full hostname from request
  originalUrl: string;         // Original request URL
  clientIp?: string;           // Client IP for logging
  userAgent?: string;          // User agent for device detection
}

/**
 * Domain resolution response
 */
export interface DomainResolutionResponse {
  success: boolean;
  resolution: DomainResolution;
  tenant?: {
    id: string;
    slug: string;
    name: string;
    status: string;
    databaseName: string;
  };
  redirect?: {
    required: boolean;
    url: string;
    permanent: boolean;
  };
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// LOGIN CONTEXT
// ============================================================================

/**
 * Login context based on domain
 */
export interface DomainLoginContext {
  domainType: DomainType;
  isMainDomain: boolean;
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  tenantLogo?: string;
  tenantBranding?: {
    primaryColor: string;
    secondaryColor: string;
  };
  ssoEnabled: boolean;
  ssoProviders?: string[];
  loginTitle: string;
  loginSubtitle?: string;
  allowedUserTypes: AllowedUserType[];
}

export default {
  RESERVED_SUBDOMAINS,
};
