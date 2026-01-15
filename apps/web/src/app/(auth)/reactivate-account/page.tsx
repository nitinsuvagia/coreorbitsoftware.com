'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import { RefreshCw, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';

function ReactivateAccountContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const token = searchParams.get('token');
  const tenant = searchParams.get('tenant');
  
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');

  // If no token, show email input form
  const hasToken = !!token && !!tenant;

  const handleReactivate = async () => {
    if (!email || !token || !tenant) {
      toast.error('Please provide your email address.');
      return;
    }

    setStatus('loading');
    setErrorMessage('');

    try {
      const response = await fetch('/api/v1/auth/account/reactivate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenant,
        },
        body: JSON.stringify({ token, email }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus('success');
        toast.success('Your account has been successfully reactivated. You can now log in.');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push(`/login?tenant=${tenant}`);
        }, 3000);
      } else {
        setStatus('error');
        setErrorMessage(result.error?.message || 'Failed to reactivate account');
        toast.error(result.error?.message || 'Failed to reactivate account');
      }
    } catch (error) {
      setStatus('error');
      setErrorMessage('An unexpected error occurred. Please try again.');
      toast.error('An unexpected error occurred. Please try again.');
    }
  };

  if (!hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This reactivation link is invalid or incomplete. Please use the link from your email.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-green-600">Account Reactivated!</CardTitle>
            <CardDescription>
              Your account has been successfully reactivated. You will be redirected to the login page shortly.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Link href={`/login?tenant=${tenant}`}>
              <Button>
                Go to Login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Reactivate Your Account</CardTitle>
          <CardDescription>
            Enter your email address to confirm and reactivate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'error' && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {errorMessage}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={status === 'loading'}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            className="w-full" 
            onClick={handleReactivate}
            disabled={status === 'loading' || !email}
          >
            {status === 'loading' ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Reactivating...
              </>
            ) : (
              'Reactivate Account'
            )}
          </Button>
          <Link href="/login" className="text-sm text-muted-foreground hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ReactivateAccountPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ReactivateAccountContent />
    </Suspense>
  );
}
