/**
 * Authentication Flow Types - Domain-aware authentication
 * 
 * This file defines the complete authentication flow considering:
 * 1. Main domain → Platform Admin login ONLY
 * 2. Tenant subdomain → Tenant user login ONLY
 * 3. Cross-domain access prevention
 */

import { AllowedUserType, DomainType, DomainLoginContext } from '../tenant/domain.types';
import { PlatformAdminRoleType } from './platform-admin.types';

// ============================================================================
// LOGIN REQUEST/RESPONSE
// ============================================================================

/**
 * Login request - Domain-aware
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
  deviceInfo?: DeviceInfo;
}

/**
 * Device information for login tracking
 */
export interface DeviceInfo {
  fingerprint?: string;
  userAgent: string;
  platform: string;
  screenResolution?: string;
  timezone: string;
  language: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  requiresMfa: boolean;
  mfaMethod?: 'totp' | 'sms' | 'email';
  tokens?: AuthTokens;
  user?: AuthenticatedUser;
  error?: LoginError;
}

/**
 * Login error
 */
export interface LoginError {
  code: LoginErrorCode;
  message: string;
  remainingAttempts?: number;
  lockoutEndsAt?: Date;
}

export type LoginErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_SUSPENDED'
  | 'ACCOUNT_PENDING'
  | 'MFA_REQUIRED'
  | 'MFA_INVALID'
  | 'DOMAIN_NOT_ALLOWED'        // User trying to login from wrong domain
  | 'TENANT_SUSPENDED'
  | 'TENANT_NOT_FOUND'
  | 'SUBSCRIPTION_EXPIRED'
  | 'IP_NOT_ALLOWED'
  | 'SESSION_EXPIRED'
  | 'TOO_MANY_ATTEMPTS';

// ============================================================================
// AUTH TOKENS
// ============================================================================

/**
 * Auth tokens returned after successful login
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
  tokenType: 'Bearer';
}

/**
 * Access token payload
 */
export interface AccessTokenPayload {
  // Common fields
  sub: string;                  // User ID
  email: string;
  type: 'platform_admin' | 'tenant_user';
  iat: number;
  exp: number;
  jti: string;                  // Unique token ID
  
  // Domain context
  domain: DomainType;
  
  // For platform admins (main domain)
  platformRole?: PlatformAdminRoleType;
  
  // For tenant users (subdomain)
  tenantId?: string;
  tenantSlug?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * Refresh token payload
 */
export interface RefreshTokenPayload {
  sub: string;
  type: 'platform_admin' | 'tenant_user';
  tenantId?: string;
  jti: string;
  iat: number;
  exp: number;
  family: string;              // Token family for rotation
}

// ============================================================================
// AUTHENTICATED USER
// ============================================================================

/**
 * Authenticated user - returned in login response and stored in context
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  type: 'platform_admin' | 'tenant_user';
  profile: {
    firstName: string;
    lastName: string;
    displayName: string;
    avatar?: string;
  };
  
  // Domain context
  domain: DomainType;
  allowedDomains: DomainType[];
  
  // For platform admins
  platformRole?: PlatformAdminRoleType;
  platformPermissions?: string[];
  
  // For tenant users
  tenantId?: string;
  tenantSlug?: string;
  tenantName?: string;
  employeeId?: string;
  roles?: string[];
  permissions?: string[];
}

// ============================================================================
// DOMAIN-AWARE AUTH CONTEXT
// ============================================================================

/**
 * Authentication context for requests
 */
export interface AuthContext {
  isAuthenticated: boolean;
  user?: AuthenticatedUser;
  domain: DomainLoginContext;
  session?: SessionInfo;
}

/**
 * Session information
 */
export interface SessionInfo {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  lastActivityAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
}

// ============================================================================
// DOMAIN ACCESS VALIDATION
// ============================================================================

/**
 * Domain access check request
 */
export interface DomainAccessCheckRequest {
  userId: string;
  userType: 'platform_admin' | 'tenant_user';
  requestedDomain: DomainType;
  tenantSlug?: string;
}

/**
 * Domain access check response
 */
export interface DomainAccessCheckResponse {
  allowed: boolean;
  reason?: string;
  redirectTo?: string;
}

/**
 * Access denial reasons
 */
export const ACCESS_DENIAL_REASONS = {
  PLATFORM_ADMIN_WRONG_DOMAIN: 'Platform admins can only access the main domain',
  TENANT_USER_MAIN_DOMAIN: 'Tenant users cannot access the main domain. Please use your company subdomain.',
  TENANT_USER_WRONG_SUBDOMAIN: 'You do not have access to this organization',
  TENANT_SUSPENDED: 'This organization\'s account has been suspended',
  SUBSCRIPTION_EXPIRED: 'This organization\'s subscription has expired',
  IP_RESTRICTED: 'Access from your IP address is not allowed',
} as const;

// ============================================================================
// SSO / SOCIAL LOGIN
// ============================================================================

/**
 * SSO login request
 */
export interface SSOLoginRequest {
  provider: SSOProvider;
  code: string;                 // OAuth authorization code
  state: string;                // CSRF state token
  redirectUri: string;
}

/**
 * SSO providers
 */
export type SSOProvider = 'google' | 'microsoft' | 'saml' | 'okta' | 'auth0' | 'onelogin';

/**
 * SSO configuration per tenant
 */
export interface TenantSSOConfig {
  tenantId: string;
  provider: SSOProvider;
  enabled: boolean;
  clientId: string;
  clientSecret?: string;        // Encrypted
  issuer?: string;              // For SAML
  certificate?: string;         // For SAML
  metadata?: Record<string, unknown>;
  allowedDomains: string[];     // Email domains allowed for SSO
  autoProvision: boolean;       // Auto-create users on first SSO login
  defaultRole?: string;         // Default role for auto-provisioned users
}

// ============================================================================
// PASSWORD RESET / FORGOT PASSWORD
// ============================================================================

/**
 * Forgot password request
 */
export interface ForgotPasswordRequest {
  email: string;
  domainType: DomainType;
  tenantSlug?: string;
}

/**
 * Reset password request
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Password reset token payload
 */
export interface PasswordResetTokenPayload {
  sub: string;
  email: string;
  type: 'platform_admin' | 'tenant_user';
  tenantId?: string;
  purpose: 'password_reset';
  exp: number;
  jti: string;
}

// ============================================================================
// MFA (Multi-Factor Authentication)
// ============================================================================

/**
 * MFA setup request
 */
export interface MFASetupRequest {
  method: 'totp' | 'sms' | 'email';
  phone?: string;               // For SMS method
}

/**
 * MFA setup response
 */
export interface MFASetupResponse {
  method: 'totp' | 'sms' | 'email';
  secret?: string;              // For TOTP
  qrCode?: string;              // QR code data URL for TOTP
  backupCodes?: string[];
  verificationSent?: boolean;   // For SMS/Email
}

/**
 * MFA verification request
 */
export interface MFAVerifyRequest {
  code: string;
  method: 'totp' | 'sms' | 'email' | 'backup';
}

export default {
  ACCESS_DENIAL_REASONS,
};
