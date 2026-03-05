'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useSSOStatus, useGetOAuthLoginUrl } from '@/hooks/use-sso';
import { getTenantSlugFromHostname } from '@/lib/domain-context';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const mfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MfaFormData = z.infer<typeof mfaSchema>;

/**
 * Extract tenant slug from the current hostname
 * Returns null if no tenant subdomain is detected
 */
function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;

  return getTenantSlugFromHostname(window.location.hostname);
}

export function LoginForm() {
  const { login, mfaVerify } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSSOLoading, setIsSSOLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [tenantChecked, setTenantChecked] = useState(false);
  const [frozenAccount, setFrozenAccount] = useState<{
    show: boolean;
    email: string;
    firstName?: string;
    expiresAt?: string;
  }>({ show: false, email: '' });

  // SSO hooks - only fetch for tenant logins
  const { data: ssoStatus } = useSSOStatus();
  const getOAuthLoginUrl = useGetOAuthLoginUrl();

  // Check for tenant subdomain on mount
  useEffect(() => {
    const slug = getTenantSlugFromHost();
    setTenantSlug(slug);
    setTenantChecked(true);
  }, []);

  // Handle SSO login
  const handleSSOLogin = async () => {
    setIsSSOLoading(true);
    try {
      const result = await getOAuthLoginUrl.mutateAsync();
      if (result.authUrl) {
        // Store state and code verifier in sessionStorage for callback verification
        sessionStorage.setItem('sso_state', result.state);
        if (result.codeVerifier) {
          sessionStorage.setItem('sso_code_verifier', result.codeVerifier);
        }
        // Redirect to OAuth provider
        window.location.href = result.authUrl;
      } else {
        toast.error('Failed to initiate SSO login');
        setIsSSOLoading(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'SSO login failed');
      setIsSSOLoading(false);
    }
  };

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const mfaForm = useForm<MfaFormData>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: '',
    },
  });

  async function onLoginSubmit(data: LoginFormData) {
    setIsLoading(true);
    setFrozenAccount({ show: false, email: '' });
    try {
      await login(data.email, data.password);
      // Toast and redirect are handled in auth-context
      // Keep loading state true since we're navigating away
    } catch (error: any) {
      if (error.requiresMfa) {
        setMfaRequired(true);
        setMfaToken(error.mfaToken);
        toast.info('Please enter your MFA code');
        setIsLoading(false);
      } else {
        const errorCode = error.response?.data?.error?.code;
        const errorMessage = error.response?.data?.error?.message 
          || error.response?.data?.error 
          || error.response?.data?.message
          || error.message
          || 'Invalid credentials';
        
        // Check if account is frozen
        if (errorCode === 'ACCOUNT_SUSPENDED' || errorMessage?.toLowerCase?.().includes('frozen') || errorMessage?.toLowerCase?.().includes('suspended')) {
          setFrozenAccount({
            show: true,
            email: data.email,
            firstName: error.response?.data?.error?.firstName,
            expiresAt: error.response?.data?.error?.expiresAt,
          });
        } else {
          toast.error(typeof errorMessage === 'string' ? errorMessage : 'Invalid credentials');
        }
        setIsLoading(false);
      }
    }
  }

  async function onMfaSubmit(data: MfaFormData) {
    setIsLoading(true);
    try {
      await mfaVerify(data.code, mfaToken);
      toast.success('Welcome back!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message 
        || error.response?.data?.error 
        || error.response?.data?.message
        || error.message
        || 'Invalid MFA code';
      toast.error(typeof errorMessage === 'string' ? errorMessage : 'Invalid MFA code');
    } finally {
      setIsLoading(false);
    }
  }

  // Show loading while checking tenant
  if (!tenantChecked) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Determine login type for display
  const isPlatformLogin = !tenantSlug;

  if (frozenAccount.show) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Account Frozen</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {frozenAccount.firstName 
                  ? `Hi ${frozenAccount.firstName}, your ` 
                  : 'Your '}
                account has been frozen. You can reactivate it by clicking the link in the email we sent you.
              </p>
              {frozenAccount.expiresAt && (
                <p className="text-xs text-yellow-600 mt-2">
                  Reactivation available until: {new Date(frozenAccount.expiresAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center text-sm text-muted-foreground">
          <p>Didn't receive the email? Check your spam folder or</p>
          <Link 
            href={`/resend-reactivation?email=${encodeURIComponent(frozenAccount.email)}`}
            className="text-primary hover:underline"
          >
            request a new reactivation link
          </Link>
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => setFrozenAccount({ show: false, email: '' })}
        >
          Back to login
        </Button>
      </div>
    );
  }

  if (mfaRequired) {
    return (
      <form onSubmit={mfaForm.handleSubmit(onMfaSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="code">Verification Code</Label>
          <Input
            id="code"
            type="text"
            placeholder="Enter 6-digit code"
            maxLength={6}
            {...mfaForm.register('code')}
          />
          {mfaForm.formState.errors.code && (
            <p className="text-sm text-destructive">
              {mfaForm.formState.errors.code.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Verify
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={() => {
            setMfaRequired(false);
            setMfaToken('');
          }}
        >
          Back to login
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {/* SSO Button - only show for tenant logins with SSO enabled */}
      {!isPlatformLogin && ssoStatus?.enabled && (
        <>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleSSOLogin}
            disabled={isSSOLoading}
          >
            {isSSOLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path 
                  fill="currentColor" 
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path 
                  fill="currentColor" 
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path 
                  fill="currentColor" 
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path 
                  fill="currentColor" 
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            Sign in with {ssoStatus.name || 'Google'}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>
        </>
      )}

      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@company.com"
            autoComplete="email"
            {...loginForm.register('email')}
          />
          {loginForm.formState.errors.email && (
            <p className="text-sm text-destructive">
              {loginForm.formState.errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            {...loginForm.register('password')}
          />
          {loginForm.formState.errors.password && (
            <p className="text-sm text-destructive">
              {loginForm.formState.errors.password.message}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign In
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <a href="/forgot-password" className="hover:text-primary">
            Forgot your password?
          </a>
        </p>
      </form>
    </div>
  );
}
