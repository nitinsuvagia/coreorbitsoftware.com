'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api/client';

export default function SSOCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Check for OAuth errors
      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error || 'Authentication failed');
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        return;
      }

      // Verify state to prevent CSRF
      const savedState = sessionStorage.getItem('sso_state');
      if (state !== savedState) {
        setStatus('error');
        setErrorMessage('Invalid state parameter - possible CSRF attack');
        return;
      }

      try {
        // Get code verifier for PKCE
        const codeVerifier = sessionStorage.getItem('sso_code_verifier');
        
        // Exchange code for tokens
        const response = await api.get('/api/v1/auth/sso/oauth/callback', {
          params: { code, state },
          headers: codeVerifier ? { 'X-Code-Verifier': codeVerifier } : {},
        });

        if (response.data.success) {
          // Clear session storage
          sessionStorage.removeItem('sso_state');
          sessionStorage.removeItem('sso_code_verifier');

          // Store tokens in cookies (the API should set HttpOnly cookies)
          // But we can also set the access token if provided
          if (response.data.data.accessToken) {
            document.cookie = `accessToken=${response.data.data.accessToken}; path=/; max-age=604800; SameSite=Strict`;
          }
          if (response.data.data.refreshToken) {
            document.cookie = `refreshToken=${response.data.data.refreshToken}; path=/; max-age=2592000; SameSite=Strict`;
          }

          setStatus('success');
          
          // Redirect to dashboard after short delay
          setTimeout(() => {
            router.push('/');
          }, 1500);
        } else {
          setStatus('error');
          setErrorMessage(response.data.error?.message || 'Authentication failed');
        }
      } catch (error: any) {
        setStatus('error');
        setErrorMessage(
          error.response?.data?.error?.message || 
          error.message || 
          'Failed to complete authentication'
        );
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            {status === 'loading' && (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            )}
            {status === 'error' && (
              <XCircle className="h-10 w-10 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Signing you in...'}
            {status === 'success' && 'Success!'}
            {status === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we complete your sign-in'}
            {status === 'success' && 'Redirecting to dashboard...'}
            {status === 'error' && errorMessage}
          </CardDescription>
        </CardHeader>
        {status === 'error' && (
          <CardContent className="text-center">
            <Button onClick={() => router.push('/login')} variant="outline">
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
