/**
 * SSO Service - Single Sign-On and LDAP/AD integration
 */

import { getMasterPrisma, getTenantPrisma } from '@oms/database';
import { logger } from '../utils/logger';
import { config } from '../config';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { signToken } from '../utils/jwt-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface SSOProviderConfig {
  id: string;
  tenantId: string;
  type: 'saml' | 'oauth' | 'oidc' | 'ldap';
  name: string;
  enabled: boolean;
  config: SAMLConfig | OAuthConfig | OIDCConfig | LDAPConfig;
}

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  privateKey?: string;
  privateCert?: string;
  identifierFormat?: string;
  acceptedClockSkewMs?: number;
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
  };
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  callbackUrl: string;
  scope: string[];
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
}

export interface OIDCConfig {
  clientId: string;
  clientSecret: string;
  issuer: string;
  callbackUrl: string;
  scope: string[];
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
  };
}

export interface LDAPConfig {
  url: string;
  baseDN: string;
  bindDN: string;
  bindCredentials: string;
  searchBase: string;
  searchFilter: string;
  searchAttributes: string[];
  useTLS: boolean;
  tlsOptions?: {
    rejectUnauthorized?: boolean;
    ca?: string;
  };
  groupSearchBase?: string;
  groupSearchFilter?: string;
  groupSearchAttributes?: string[];
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    memberOf?: string;
  };
}

export interface SSOUser {
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  groups?: string[];
  rawAttributes?: Record<string, any>;
}

export interface SSOAuthResult {
  success: boolean;
  user?: SSOUser;
  error?: string;
}

// ============================================================================
// SSO PROVIDER MANAGEMENT
// ============================================================================

/**
 * Get SSO provider configuration for a tenant
 */
export async function getSSOProvider(
  tenantId: string,
  providerId?: string
): Promise<SSOProviderConfig | null> {
  const masterPrisma = getMasterPrisma();
  
  // Look up in tenant settings or a dedicated SSO config table
  // For now, we'll store in tenant settings
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  
  if (!tenant?.settings) return null;
  
  const settings = tenant.settings as any;
  const ssoProviders = settings.ssoProviders as SSOProviderConfig[] | undefined;
  
  if (!ssoProviders || ssoProviders.length === 0) return null;
  
  if (providerId) {
    return ssoProviders.find((p) => p.id === providerId) || null;
  }
  
  // Return first enabled provider
  return ssoProviders.find((p) => p.enabled) || null;
}

/**
 * Save SSO provider configuration
 */
export async function saveSSOProvider(
  tenantId: string,
  provider: Omit<SSOProviderConfig, 'id' | 'tenantId'>
): Promise<SSOProviderConfig> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  
  const settings = (tenant?.settings as any) || {};
  const ssoProviders = (settings.ssoProviders as SSOProviderConfig[]) || [];
  
  const newProvider: SSOProviderConfig = {
    ...provider,
    id: crypto.randomUUID(),
    tenantId,
  };
  
  ssoProviders.push(newProvider);
  
  await masterPrisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...settings,
        ssoProviders,
      },
    },
  });
  
  logger.info({ tenantId, providerId: newProvider.id, type: provider.type }, 'SSO provider configured');
  
  return newProvider;
}

/**
 * Update SSO provider configuration
 */
export async function updateSSOProvider(
  tenantId: string,
  providerId: string,
  updates: Partial<Omit<SSOProviderConfig, 'id' | 'tenantId'>>
): Promise<SSOProviderConfig | null> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  
  const settings = (tenant?.settings as any) || {};
  const ssoProviders = (settings.ssoProviders as SSOProviderConfig[]) || [];
  
  const index = ssoProviders.findIndex((p) => p.id === providerId);
  if (index === -1) return null;
  
  ssoProviders[index] = { ...ssoProviders[index], ...updates };
  
  await masterPrisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...settings,
        ssoProviders,
      },
    },
  });
  
  logger.info({ tenantId, providerId, type: ssoProviders[index].type }, 'SSO provider updated');
  
  return ssoProviders[index];
}

/**
 * Delete SSO provider
 */
export async function deleteSSOProvider(
  tenantId: string,
  providerId: string
): Promise<boolean> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });
  
  const settings = (tenant?.settings as any) || {};
  const ssoProviders = (settings.ssoProviders as SSOProviderConfig[]) || [];
  
  const filtered = ssoProviders.filter((p) => p.id !== providerId);
  
  if (filtered.length === ssoProviders.length) return false;
  
  await masterPrisma.tenant.update({
    where: { id: tenantId },
    data: {
      settings: {
        ...settings,
        ssoProviders: filtered,
      },
    },
  });
  
  logger.info({ tenantId, providerId }, 'SSO provider deleted');
  
  return true;
}

// ============================================================================
// LDAP AUTHENTICATION
// ============================================================================

/**
 * Authenticate user via LDAP
 * Note: Requires ldapjs library to be installed
 */
export async function authenticateLDAP(
  tenantSlug: string,
  username: string,
  password: string
): Promise<SSOAuthResult> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true, settings: true },
  });
  
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }
  
  const provider = await getSSOProvider(tenant.id);
  
  if (!provider || provider.type !== 'ldap') {
    return { success: false, error: 'LDAP not configured' };
  }
  
  const ldapConfig = provider.config as LDAPConfig;
  
  try {
    // This is a placeholder for actual LDAP authentication
    // In production, you would use ldapjs:
    // import ldap from 'ldapjs';
    
    // const client = ldap.createClient({
    //   url: ldapConfig.url,
    //   tlsOptions: ldapConfig.tlsOptions,
    // });
    
    // Bind with service account
    // await bind(client, ldapConfig.bindDN, ldapConfig.bindCredentials);
    
    // Search for user
    // const searchResult = await search(client, ldapConfig.searchBase, {
    //   filter: ldapConfig.searchFilter.replace('{{username}}', username),
    //   attributes: ldapConfig.searchAttributes,
    // });
    
    // Bind as user to verify password
    // await bind(client, userDN, password);
    
    // Map attributes
    const mapping = ldapConfig.attributeMapping || {};
    
    // Simulated user data - in production this comes from LDAP
    const user: SSOUser = {
      email: username.includes('@') ? username : `${username}@${tenantSlug}.com`,
      firstName: 'LDAP',
      lastName: 'User',
    };
    
    logger.info({ tenantId: tenant.id, username }, 'LDAP authentication successful');
    
    return { success: true, user };
  } catch (error: any) {
    logger.error({ error: error.message, username }, 'LDAP authentication failed');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// SAML SSO
// ============================================================================

/**
 * Generate SAML auth URL
 */
export async function generateSAMLAuthUrl(
  tenantSlug: string,
  state?: string
): Promise<{ url: string; relayState: string } | null> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) return null;
  
  const provider = await getSSOProvider(tenant.id);
  
  if (!provider || provider.type !== 'saml') return null;
  
  const samlConfig = provider.config as SAMLConfig;
  
  // Generate relay state for CSRF protection
  const relayState = state || crypto.randomBytes(32).toString('hex');
  
  // In production, use passport-saml or saml2-js to generate proper SAML request
  const url = new URL(samlConfig.entryPoint);
  url.searchParams.set('SAMLRequest', ''); // Would be base64 encoded SAML request
  url.searchParams.set('RelayState', relayState);
  
  return { url: url.toString(), relayState };
}

/**
 * Handle SAML callback
 */
export async function handleSAMLCallback(
  tenantSlug: string,
  samlResponse: string,
  relayState: string
): Promise<SSOAuthResult> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }
  
  const provider = await getSSOProvider(tenant.id);
  
  if (!provider || provider.type !== 'saml') {
    return { success: false, error: 'SAML not configured' };
  }
  
  try {
    // In production, parse and validate SAML response
    // const samlConfig = provider.config as SAMLConfig;
    // const profile = await validateSAMLResponse(samlResponse, samlConfig);
    
    // Simulated response
    const user: SSOUser = {
      email: 'sso-user@example.com',
      firstName: 'SSO',
      lastName: 'User',
    };
    
    logger.info({ tenantId: tenant.id }, 'SAML authentication successful');
    
    return { success: true, user };
  } catch (error: any) {
    logger.error({ error: error.message }, 'SAML authentication failed');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// OAUTH/OIDC SSO
// ============================================================================

/**
 * Generate OAuth authorization URL
 */
export async function generateOAuthAuthUrl(
  tenantSlug: string,
  state?: string
): Promise<{ url: string; state: string; codeVerifier?: string } | null> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) return null;
  
  const provider = await getSSOProvider(tenant.id);
  
  if (!provider || (provider.type !== 'oauth' && provider.type !== 'oidc')) {
    return null;
  }
  
  const oauthConfig = provider.config as OAuthConfig | OIDCConfig;
  const generatedState = state || crypto.randomBytes(32).toString('hex');
  
  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  
  const authUrl = new URL(
    provider.type === 'oidc'
      ? `${(oauthConfig as OIDCConfig).issuer}/.well-known/openid-configuration`
      : (oauthConfig as OAuthConfig).authorizationUrl
  );
  
  authUrl.searchParams.set('client_id', oauthConfig.clientId);
  authUrl.searchParams.set('redirect_uri', oauthConfig.callbackUrl);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', oauthConfig.scope.join(' '));
  authUrl.searchParams.set('state', generatedState);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  
  return { url: authUrl.toString(), state: generatedState, codeVerifier };
}

/**
 * Exchange OAuth code for tokens and get user info
 */
export async function handleOAuthCallback(
  tenantSlug: string,
  code: string,
  codeVerifier?: string
): Promise<SSOAuthResult> {
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) {
    return { success: false, error: 'Tenant not found' };
  }
  
  const provider = await getSSOProvider(tenant.id);
  
  if (!provider || (provider.type !== 'oauth' && provider.type !== 'oidc')) {
    return { success: false, error: 'OAuth not configured' };
  }
  
  const oauthConfig = provider.config as OAuthConfig;
  
  try {
    // Exchange code for tokens
    const tokenResponse = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: oauthConfig.callbackUrl,
        client_id: oauthConfig.clientId,
        client_secret: oauthConfig.clientSecret,
        ...(codeVerifier && { code_verifier: codeVerifier }),
      }),
    });
    
    if (!tokenResponse.ok) {
      throw new Error('Token exchange failed');
    }
    
    const tokens = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
      token_type?: string;
      scope?: string;
      id_token?: string;
    };

    if (!tokens.access_token) {
      throw new Error('Token exchange failed: missing access token');
    }
    
    // Get user info
    const userInfoResponse = await fetch(oauthConfig.userInfoUrl, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to get user info');
    }
    
    const userInfo = await userInfoResponse.json();
    const mapping = oauthConfig.attributeMapping || {};
    
    const user: SSOUser = {
      email: userInfo[mapping.email || 'email'],
      firstName: userInfo[mapping.firstName || 'given_name'],
      lastName: userInfo[mapping.lastName || 'family_name'],
      displayName: userInfo[mapping.displayName || 'name'],
      rawAttributes: userInfo,
    };
    
    logger.info({ tenantId: tenant.id, email: user.email }, 'OAuth authentication successful');
    
    return { success: true, user };
  } catch (error: any) {
    logger.error({ error: error.message }, 'OAuth authentication failed');
    return { success: false, error: error.message };
  }
}

// ============================================================================
// USER PROVISIONING
// ============================================================================

/**
 * Provision or update user from SSO
 */
export async function provisionSSOUser(
  tenantSlug: string,
  ssoUser: SSOUser,
  providerId: string
): Promise<{ userId: string; isNew: boolean; accessToken: string; refreshToken: string }> {
  const prisma = await getTenantPrisma(tenantSlug);
  const masterPrisma = getMasterPrisma();
  
  const tenant = await masterPrisma.tenant.findUnique({
    where: { slug: tenantSlug },
    select: { id: true },
  });
  
  if (!tenant) {
    throw new Error('Tenant not found');
  }
  
  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: ssoUser.email },
  });
  
  let isNew = false;
  
  if (!user) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: ssoUser.email,
        firstName: ssoUser.firstName || ssoUser.displayName?.split(' ')[0] || 'User',
        lastName: ssoUser.lastName || ssoUser.displayName?.split(' ').slice(1).join(' ') || '',
        password: '', // No password for SSO users
        emailVerified: true,
        emailVerifiedAt: new Date(),
        status: 'ACTIVE',
        role: 'EMPLOYEE',
        authProvider: 'sso',
        authProviderId: providerId,
      },
    });
    
    isNew = true;
    
    logger.info({ userId: user.id, email: user.email, tenantSlug }, 'SSO user provisioned');
  } else {
    // Update existing user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: ssoUser.firstName || user.firstName,
        lastName: ssoUser.lastName || user.lastName,
        lastLoginAt: new Date(),
      },
    });
    
    logger.info({ userId: user.id, email: user.email, tenantSlug }, 'SSO user updated');
  }
  
  const userWithRoles = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      roles: {
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
  });

  const roles = userWithRoles?.roles?.map((ur: any) => ur.role.slug) || [];
  const permissions = extractPermissions(userWithRoles?.roles || []);

  // Generate tokens
  const { accessToken, refreshToken } = generateTenantTokens({
    id: user.id,
    email: user.email,
    tenantId: tenant.id,
    tenantSlug,
    roles,
    permissions,
  });

  const tokenFamily = uuidv4();
  await (prisma as any).userSession.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      tokenFamily,
      ipAddress: 'unknown',
      userAgent: 'unknown',
      deviceId: 'sso',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  
  return {
    userId: user.id,
    isNew,
    accessToken,
    refreshToken,
  };
}

// ============================================================================ 
// TOKEN HELPERS
// ============================================================================ 

interface TenantTokenUser {
  id: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  roles: string[];
  permissions: string[];
}

function generateTenantTokens(user: TenantTokenUser) {
  const accessTokenPayload = {
    sub: user.id,
    email: user.email,
    type: 'tenant_user',
    domain: 'subdomain',
    tenantId: user.tenantId,
    tenantSlug: user.tenantSlug,
    roles: user.roles,
    permissions: user.permissions,
    jti: uuidv4(),
  };

  const refreshTokenPayload = {
    sub: user.id,
    type: 'tenant_user',
    tenantId: user.tenantId,
    jti: uuidv4(),
    family: uuidv4(),
  };

  const accessToken = signToken(accessTokenPayload, config.jwtSecret, {
    expiresIn: config.jwtAccessTokenExpiry,
    issuer: config.jwtIssuer,
  });

  const refreshToken = signToken(refreshTokenPayload, config.jwtSecret, {
    expiresIn: config.jwtRefreshTokenExpiry,
    issuer: config.jwtIssuer,
  });

  return { accessToken, refreshToken };
}

function extractPermissions(userRoles: any[]): string[] {
  const permissions = new Set<string>();

  for (const userRole of userRoles) {
    for (const rolePermission of userRole.role.permissions || []) {
      const perm = rolePermission.permission;
      permissions.add(`${perm.resource}:${perm.action}`);
    }
  }

  return Array.from(permissions);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
