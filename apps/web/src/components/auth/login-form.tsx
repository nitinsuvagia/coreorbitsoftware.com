'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const mfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type MfaFormData = z.infer<typeof mfaSchema>;

export function LoginForm() {
  const { login, mfaVerify } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [frozenAccount, setFrozenAccount] = useState<{
    show: boolean;
    email: string;
    firstName?: string;
    expiresAt?: string;
  }>({ show: false, email: '' });

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
  );
}
