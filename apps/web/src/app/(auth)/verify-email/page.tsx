'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';

type VerificationState = 'loading' | 'success' | 'error' | 'expired';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const tenant = searchParams.get('tenant');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setState('error');
        setMessage('Missing verification token.');
        return;
      }

      try {
        const response = await fetch('/api/v1/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(tenant ? { 'X-Tenant-Slug': tenant } : {}),
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (data.success) {
          setState('success');
          setMessage(data.data?.message || 'Email verified successfully!');
        } else {
          if (data.error?.message?.includes('expired')) {
            setState('expired');
          } else {
            setState('error');
          }
          setMessage(data.error?.message || 'Verification failed.');
        }
      } catch (error) {
        setState('error');
        setMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [token, tenant]);

  const handleResendVerification = async () => {
    // Redirect to resend verification page
    router.push('/resend-verification');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>
            {state === 'loading' && 'Verifying your email address...'}
            {state === 'success' && 'Your email has been verified'}
            {state === 'error' && 'Verification failed'}
            {state === 'expired' && 'Verification link expired'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          {state === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-16 w-16 text-primary animate-spin" />
              <p className="text-muted-foreground">Please wait...</p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <p className="text-center text-muted-foreground">{message}</p>
              <Button asChild className="w-full">
                <Link href="/login">Continue to Login</Link>
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <p className="text-center text-muted-foreground">{message}</p>
              <div className="flex flex-col w-full space-y-2">
                <Button onClick={handleResendVerification} variant="outline" className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Verification Email
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </div>
          )}

          {state === 'expired' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="rounded-full bg-yellow-100 p-4">
                <Mail className="h-12 w-12 text-yellow-600" />
              </div>
              <p className="text-center text-muted-foreground">{message}</p>
              <div className="flex flex-col w-full space-y-2">
                <Button onClick={handleResendVerification} className="w-full">
                  <Mail className="mr-2 h-4 w-4" />
                  Request New Verification Email
                </Button>
                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">Back to Login</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VerifyEmailFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Email Verification</CardTitle>
          <CardDescription>Verifying your email address...</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
            <p className="text-muted-foreground">Please wait...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
