/**
 * User Types - Authentication and user management
 */

import { AuditableEntity } from '../common';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'locked' | 'suspended';
export type AuthProvider = 'local' | 'google' | 'microsoft' | 'saml' | 'ldap';

export interface User extends AuditableEntity {
  tenantId: string;
  employeeId?: string;
  email: string;
  username?: string;
  passwordHash?: string;
  status: UserStatus;
  authProvider: AuthProvider;
  providerId?: string;
  profile: UserProfile;
  preferences: UserPreferences;
  security: UserSecurityInfo;
  roles: string[];
  permissions: string[];
  lastLoginAt?: Date;
  lastActivityAt?: Date;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: UserNotificationPrefs;
  dashboard: DashboardPrefs;
}

export interface UserNotificationPrefs {
  email: boolean;
  push: boolean;
  desktop: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  mentions: boolean;
  projectUpdates: boolean;
}

export interface DashboardPrefs {
  defaultView: string;
  widgets: string[];
  pinnedProjects: string[];
}

export interface UserSecurityInfo {
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];
  passwordChangedAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
}
