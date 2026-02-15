// Settings Types
// Centralized type definitions for the settings page

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatar?: string;
  bio?: string;
  skills?: string[];
  location?: string;
  department?: string;
  role?: string;
  manager?: string;
  joinDate?: string;
  employeeId?: string;
}

export interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  leaveUpdates: boolean;
  projectUpdates: boolean;
  weeklyDigest: boolean;
  mentionAlerts: boolean;
  systemAnnouncements: boolean;
}

export interface ActiveSession {
  id: string;
  device: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ShowPasswords {
  current: boolean;
  new: boolean;
  confirm: boolean;
}

export interface TwoFactorSetup {
  enabled: boolean;
  qrCode: string;
  verificationCode: string;
}

export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';
export type AccentColor = 'blue' | 'purple' | 'green' | 'orange' | 'red' | 'pink' | 'teal' | 'indigo';
export type FontFamily = 'inter' | 'roboto' | 'open-sans' | 'lato' | 'poppins' | 'montserrat' | 'nunito' | 'raleway' | 'source-sans' | 'work-sans';

export interface AppearancePreferences {
  theme: Theme;
  accentColor: AccentColor;
  fontSize: FontSize;
  fontFamily: FontFamily;
  compactMode: boolean;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
}

// Valid tab values for deep linking
export const VALID_SETTINGS_TABS = ['profile', 'security', 'notifications', 'appearance'] as const;
export type SettingsTabValue = typeof VALID_SETTINGS_TABS[number];
