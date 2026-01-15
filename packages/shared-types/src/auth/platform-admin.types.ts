/**
 * Platform Admin Types - Super Admin, Sub Admin, Admin User
 * 
 * These users can ONLY login through the main domain (youroms.com)
 * They manage the SaaS platform itself, not tenant data
 */

import { AuditableEntity } from '../common';

// ============================================================================
// PLATFORM ADMIN ROLES
// ============================================================================

/**
 * Platform admin role levels
 */
export type PlatformAdminRoleType = 
  | 'super_admin'      // Owner/CTO level - Full platform access
  | 'sub_admin'        // Admin level - Can manage tenants, limited settings
  | 'admin_user'       // Operator level - Support, monitoring
  | 'billing_admin'    // Finance level - Billing & subscriptions only
  | 'support_agent';   // Support level - Read-only tenant access

/**
 * Platform admin status
 */
export type PlatformAdminStatus = 'pending' | 'active' | 'inactive' | 'locked' | 'suspended';

// ============================================================================
// PLATFORM ADMIN ENTITY
// ============================================================================

/**
 * Platform Admin - Users who manage the SaaS platform
 * Stored in: Master Database (oms_master.platform_admins)
 * Access: Main domain ONLY (youroms.com)
 */
export interface PlatformAdmin extends AuditableEntity {
  email: string;
  username: string;
  passwordHash: string;
  role: PlatformAdminRoleType;
  status: PlatformAdminStatus;
  profile: PlatformAdminProfile;
  security: PlatformAdminSecurity;
  permissions: PlatformAdminPermission[];
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  invitedBy?: string;
  invitedAt?: Date;
}

/**
 * Platform admin profile
 */
export interface PlatformAdminProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  timezone: string;
  language: string;
}

/**
 * Platform admin security settings
 */
export interface PlatformAdminSecurity {
  mfaEnabled: boolean;          // MFA is REQUIRED for platform admins
  mfaType: 'totp' | 'sms' | 'email';
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  passwordChangedAt: Date;
  passwordExpiresAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  allowedIpAddresses?: string[]; // IP whitelist for extra security
  trustedDevices?: TrustedDevice[];
  loginHistory: LoginHistoryEntry[];
}

/**
 * Trusted device for platform admin
 */
export interface TrustedDevice {
  id: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  browser: string;
  os: string;
  fingerprint: string;
  lastUsedAt: Date;
  trustedAt: Date;
  expiresAt: Date;
}

/**
 * Login history entry
 */
export interface LoginHistoryEntry {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
  failureReason?: string;
  mfaUsed: boolean;
}

// ============================================================================
// PLATFORM ADMIN PERMISSIONS
// ============================================================================

/**
 * Platform admin permission
 */
export interface PlatformAdminPermission {
  resource: PlatformResource;
  actions: PlatformAction[];
}

/**
 * Platform resources that can be managed
 */
export type PlatformResource = 
  | 'tenants'           // Manage tenant accounts
  | 'subscriptions'     // Manage subscriptions & plans
  | 'billing'           // Billing, invoices, payments
  | 'platform_users'    // Manage other platform admins
  | 'system_settings'   // Platform-wide settings
  | 'feature_flags'     // Feature toggles
  | 'announcements'     // Platform announcements
  | 'support_tickets'   // Support ticket system
  | 'audit_logs'        // View all audit logs
  | 'analytics'         // Platform analytics
  | 'integrations'      // Third-party integrations
  | 'api_keys'          // API key management
  | 'webhooks'          // Webhook configuration
  | 'email_templates'   // Email template management
  | 'database'          // Database operations (dangerous)
  | 'deployment';       // Deployment & infrastructure

/**
 * Actions on platform resources
 */
export type PlatformAction = 
  | 'view'
  | 'create'
  | 'update'
  | 'delete'
  | 'export'
  | 'impersonate'      // Login as tenant user (for support)
  | 'manage';

// ============================================================================
// ROLE PERMISSION PRESETS
// ============================================================================

/**
 * Default permissions for each platform admin role
 */
export const PLATFORM_ROLE_PERMISSIONS: Record<PlatformAdminRoleType, PlatformAdminPermission[]> = {
  super_admin: [
    { resource: 'tenants', actions: ['view', 'create', 'update', 'delete', 'export', 'impersonate', 'manage'] },
    { resource: 'subscriptions', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'billing', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'platform_users', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'system_settings', actions: ['view', 'update', 'manage'] },
    { resource: 'feature_flags', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'announcements', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'support_tickets', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'audit_logs', actions: ['view', 'export'] },
    { resource: 'analytics', actions: ['view', 'export'] },
    { resource: 'integrations', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'api_keys', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'webhooks', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'email_templates', actions: ['view', 'create', 'update', 'delete', 'manage'] },
    { resource: 'database', actions: ['view', 'update', 'manage'] },
    { resource: 'deployment', actions: ['view', 'update', 'manage'] },
  ],
  
  sub_admin: [
    { resource: 'tenants', actions: ['view', 'create', 'update', 'impersonate'] },
    { resource: 'subscriptions', actions: ['view', 'update'] },
    { resource: 'billing', actions: ['view', 'update'] },
    { resource: 'platform_users', actions: ['view'] },
    { resource: 'system_settings', actions: ['view'] },
    { resource: 'feature_flags', actions: ['view', 'update'] },
    { resource: 'announcements', actions: ['view', 'create', 'update'] },
    { resource: 'support_tickets', actions: ['view', 'create', 'update'] },
    { resource: 'audit_logs', actions: ['view'] },
    { resource: 'analytics', actions: ['view'] },
  ],
  
  admin_user: [
    { resource: 'tenants', actions: ['view', 'impersonate'] },
    { resource: 'subscriptions', actions: ['view'] },
    { resource: 'billing', actions: ['view'] },
    { resource: 'support_tickets', actions: ['view', 'create', 'update'] },
    { resource: 'audit_logs', actions: ['view'] },
    { resource: 'analytics', actions: ['view'] },
  ],
  
  billing_admin: [
    { resource: 'tenants', actions: ['view'] },
    { resource: 'subscriptions', actions: ['view', 'create', 'update', 'manage'] },
    { resource: 'billing', actions: ['view', 'create', 'update', 'delete', 'export', 'manage'] },
    { resource: 'analytics', actions: ['view'] },
  ],
  
  support_agent: [
    { resource: 'tenants', actions: ['view'] },
    { resource: 'support_tickets', actions: ['view', 'create', 'update'] },
    { resource: 'audit_logs', actions: ['view'] },
  ],
};

// ============================================================================
// INVITATION & ONBOARDING
// ============================================================================

/**
 * Platform admin invitation
 */
export interface PlatformAdminInvitation extends AuditableEntity {
  email: string;
  role: PlatformAdminRoleType;
  invitedBy: string;
  token: string;
  expiresAt: Date;
  acceptedAt?: Date;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

/**
 * Platform admin creation request
 */
export interface CreatePlatformAdminRequest {
  email: string;
  role: PlatformAdminRoleType;
  profile: Omit<PlatformAdminProfile, 'displayName'>;
  sendInvitation: boolean;
}

/**
 * Platform admin update request
 */
export interface UpdatePlatformAdminRequest {
  role?: PlatformAdminRoleType;
  status?: PlatformAdminStatus;
  profile?: Partial<PlatformAdminProfile>;
  permissions?: PlatformAdminPermission[];
}

export default {
  PLATFORM_ROLE_PERMISSIONS,
};
