'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';

export default function ReactivateTenantPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid reactivation link. Please use the link from your email.');
      return;
    }

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/v1/auth/tenant/reactivate', {
        token,
        email,
      });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Organization reactivated successfully!');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(response.data.error?.message || 'Failed to reactivate organization');
      }
    } catch (err: any) {
      console.error('[Reactivate] API call failed:', err);
      console.error('[Reactivate] Error response:', err.response?.data);
      setError(err.response?.data?.error?.message || 'Failed to reactivate organization. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              This reactivation link is invalid or has expired. Please use the link from your email or request a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Organization Reactivated!</CardTitle>
            <CardDescription>
              Your organization and all user accounts have been reactivated. You will be redirected to the login page shortly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Building2 className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <CardTitle>Reactivate Organization</CardTitle>
          <CardDescription>
            Enter your email address to reactivate your organization and all user accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReactivate} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address you used to register the organization.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate Organization'
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/login')}
            >
              Back to Login
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
