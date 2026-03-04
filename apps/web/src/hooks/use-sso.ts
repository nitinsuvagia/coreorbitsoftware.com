import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api/client';

// SSO Provider Types
export type SSOProviderType = 'saml' | 'oauth' | 'oidc' | 'ldap';

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

export interface SAMLConfig {
  entryPoint: string;
  issuer: string;
  cert: string;
  callbackUrl: string;
  signatureAlgorithm?: string;
  digestAlgorithm?: string;
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    groups?: string;
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
  attributeMapping?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    memberOf?: string;
  };
}

export interface SSOProvider {
  id: string;
  tenantId: string;
  type: SSOProviderType;
  name: string;
  enabled: boolean;
  config: OAuthConfig | SAMLConfig | OIDCConfig | LDAPConfig;
}

export interface SSOStatus {
  enabled: boolean;
  type?: SSOProviderType;
  name?: string;
}

export interface SSOConfigurePayload {
  type: SSOProviderType;
  name: string;
  enabled: boolean;
  config: OAuthConfig | SAMLConfig | OIDCConfig | LDAPConfig;
}

export interface SSOAuthUrlResponse {
  authUrl: string;
  state: string;
  codeVerifier?: string;
  relayState?: string;
}

// Get SSO Status for current tenant
export function useSSOStatus() {
  return useQuery({
    queryKey: ['sso', 'status'],
    queryFn: () => get<SSOStatus>('/api/v1/auth/sso/status'),
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get full SSO configuration (admin only)
export function useSSOConfig() {
  return useQuery({
    queryKey: ['sso', 'config'],
    queryFn: () => get<{ provider: SSOProvider | null }>('/api/v1/auth/sso/config'),
    retry: false,
  });
}

// Configure SSO Provider
export function useConfigureSSO() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: SSOConfigurePayload) => 
      post<{ providerId: string; type: SSOProviderType }>('/api/v1/auth/sso/configure', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso'] });
    },
  });
}

// Update SSO Provider
export function useUpdateSSO() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ providerId, data }: { providerId: string; data: Partial<SSOConfigurePayload> }) => 
      put<{ providerId: string }>(`/api/v1/auth/sso/configure/${providerId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso'] });
    },
  });
}

// Delete SSO Provider
export function useDeleteSSO() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (providerId: string) => 
      del<{ success: boolean }>(`/api/v1/auth/sso/configure/${providerId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sso'] });
    },
  });
}

// Test SSO Configuration
export function useTestSSO() {
  return useMutation({
    mutationFn: (type: SSOProviderType) => 
      post<{ success: boolean; message: string }>('/api/v1/auth/sso/test', { type }),
  });
}

// Get OAuth Login URL
export function useGetOAuthLoginUrl() {
  return useMutation({
    mutationFn: () => 
      get<SSOAuthUrlResponse>('/api/v1/auth/sso/oauth/login'),
  });
}

// Get SAML Login URL
export function useGetSAMLLoginUrl() {
  return useMutation({
    mutationFn: () => 
      get<SSOAuthUrlResponse>('/api/v1/auth/sso/saml/login'),
  });
}

// Google Workspace preset configuration
export const GOOGLE_OAUTH_PRESET: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'callbackUrl'> = {
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
  scope: ['openid', 'email', 'profile'],
  attributeMapping: {
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
  },
};

// Microsoft Azure AD preset configuration
export const MICROSOFT_OAUTH_PRESET: Omit<OAuthConfig, 'clientId' | 'clientSecret' | 'callbackUrl'> = {
  authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
  userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
  scope: ['openid', 'email', 'profile'],
  attributeMapping: {
    email: 'email',
    firstName: 'given_name',
    lastName: 'family_name',
    displayName: 'name',
  },
};

// Okta SAML preset (partial - requires user to fill in tenant-specific values)
export const OKTA_SAML_PRESET: Partial<SAMLConfig> = {
  signatureAlgorithm: 'sha256',
  digestAlgorithm: 'sha256',
  attributeMapping: {
    email: 'email',
    firstName: 'firstName',
    lastName: 'lastName',
  },
};
