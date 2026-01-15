/**
 * Session & Token Types - Authentication sessions
 */

import { BaseEntity } from '../common';

export interface Session extends BaseEntity {
  userId: string;
  tenantId: string;
  token: string;
  refreshToken?: string;
  deviceInfo: SessionDeviceInfo;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  isValid: boolean;
  lastActivityAt: Date;
}

/**
 * @deprecated Use DeviceInfo from auth-flow.types.ts for new code
 * Kept for backward compatibility with existing session management
 */
export interface SessionDeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  browser: string;
  deviceId?: string;
}

export interface TokenPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * @deprecated Use RefreshTokenPayload from auth-flow.types.ts for new code
 * Kept for backward compatibility
 */
export interface SessionRefreshTokenPayload {
  sub: string;
  tenantId: string;
  sessionId: string;
  tokenFamily: string;
  iat: number;
  exp: number;
}

/**
 * @deprecated Use AuthTokens from auth-flow.types.ts for new code
 * Kept for backward compatibility
 */
export interface SessionAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

/**
 * @deprecated Use LoginRequest from auth-flow.types.ts for new code
 * Kept for backward compatibility with simple login flows
 */
export interface SimpleLoginRequest {
  email: string;
  password: string;
  tenantSlug?: string;
  mfaCode?: string;
  rememberMe?: boolean;
}

/**
 * @deprecated Use LoginResponse from auth-flow.types.ts for new code
 * Kept for backward compatibility with simple login flows
 */
export interface SimpleLoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    roles: string[];
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  };
  tokens: SessionAuthTokens;
  requiresMfa?: boolean;
}

export interface PasswordResetRequest {
  email: string;
  tenantSlug?: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}
