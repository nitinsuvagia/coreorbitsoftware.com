'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';
import { setCookie, deleteCookie, getCookie } from 'cookies-next';
import { toast } from 'sonner';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: string;
  tenantId?: string;
  tenantSlug?: string;
  isPlatformAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  mfaVerify: (code: string, mfaToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = getCookie('accessToken');
      if (!token) {
        setIsLoading(false);
        return;
      }

      const response = await api.get('/api/v1/auth/me');
      const userData = response.data.data || response.data.user;
      setUser(userData);
    } catch (err) {
      console.error('[Auth] checkAuth error', err);
      deleteCookie('accessToken');
      deleteCookie('refreshToken');
    } finally {
      setIsLoading(false);
    }
  }

  function getTenantSlugFromHost(): string | null {
    if (typeof window === 'undefined') return null;
    
    const hostname = window.location.hostname.toLowerCase();
    
    // Check for subdomain.localhost pattern (development)
    const localhostMatch = hostname.match(/^([a-z0-9-]+)\.localhost$/);
    if (localhostMatch) {
      return localhostMatch[1];
    }
    
    // Check for subdomain.domain.com pattern (production)
    const parts = hostname.split('.');
    if (parts.length >= 3) {
      return parts[0];
    }
    
    return null;
  }

  async function login(email: string, password: string) {
    // Determine if this is a tenant login based on subdomain
    const tenantSlug = getTenantSlugFromHost();
    const loginEndpoint = tenantSlug ? '/api/v1/auth/tenant/login' : '/api/v1/auth/platform/login';
    
    try {
      // Auth login has a different response format: { success, tokens, user }
      const response = await api.post(loginEndpoint, { email, password });
      const data = response.data;

      if (data.requiresMfa) {
        // Return for MFA handling
        throw { requiresMfa: true, mfaToken: data.mfaToken };
      }

      if (data.tokens?.accessToken && data.tokens?.refreshToken) {
      setCookie('accessToken', data.tokens.accessToken, {
        maxAge: 60 * 60 * 24,
        path: '/',
        sameSite: 'lax',
        secure: false,
      }); // 24 hours
      setCookie('refreshToken', data.tokens.refreshToken, {
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
        sameSite: 'lax',
        secure: false,
      }); // 30 days
      
      // Build user object from response - handle both platform admin and tenant user formats
      const isTenantUser = !!data.user.tenantId;
      const userData: User = {
        id: data.user.id,
        email: data.user.email,
        firstName: data.user.firstName || data.user.displayName?.split(' ')[0] || '',
        lastName: data.user.lastName || data.user.displayName?.split(' ').slice(1).join(' ') || '',
        avatar: data.user.avatar,
        role: data.user.role || (data.user.roles?.[0] || 'user'),
        tenantId: data.user.tenantId,
        tenantSlug: data.user.tenantSlug,
        isPlatformAdmin: !isTenantUser && (data.user.role === 'SUPER_ADMIN' || data.user.role === 'SUB_ADMIN' || data.user.role === 'ADMIN_USER'),
      };
      
      setUser(userData);
      
      // Use Next.js router for client-side navigation
      const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
      
      // Show success toast
      toast.success('Welcome back!');
      
      // Use router.push for client-side navigation (preserves cookies)
      router.push(redirectUrl);
    }
    } catch (error: any) {
      // Check if this is an axios error with MFA required response
      if (error.response?.data?.requiresMfa) {
        throw { requiresMfa: true, mfaToken: error.response.data.mfaToken };
      }
      // Re-throw the error for other cases
      throw error;
    }
  }

  async function mfaVerify(code: string, mfaToken: string) {
    const response = await api.post('/api/v1/auth/mfa/verify', { code, mfaToken });
    const data = response.data;

    setCookie('accessToken', data.tokens?.accessToken || data.accessToken, {
      maxAge: 60 * 60 * 24,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    setCookie('refreshToken', data.tokens?.refreshToken || data.refreshToken, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
      secure: false,
    });
    
    const userData = data.user;
    setUser(userData);
    
    // Use Next.js router for client-side navigation
    const redirectUrl = userData.isPlatformAdmin ? '/admin/dashboard' : '/dashboard';
    router.push(redirectUrl);
  }

  async function logout() {
    // Determine redirect URL before clearing user state
    const isAdmin = user?.isPlatformAdmin;
    const redirectUrl = isAdmin ? '/login' : '/login';
    
    // Delete cookies immediately
    const cookieOptions = { path: '/' };
    deleteCookie('accessToken', cookieOptions);
    deleteCookie('refreshToken', cookieOptions);
    
    // Clear user state
    setUser(null);
    
    // Try to call logout API but don't wait for it
    api.post('/api/v1/auth/logout', {}).catch(() => {
      // Ignore errors - we're logging out anyway
    });
    
    // Force a full page navigation to clear all state
    window.location.href = redirectUrl;
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, mfaVerify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
