'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, Mail, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import Link from 'next/link';

export default function ResendReactivationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialEmail = searchParams.get('email') || '';
  
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/api/v1/auth/resend-reactivation-link', { email });

      if (response.data.success) {
        setSuccess(true);
        toast.success('Reactivation link sent! Check your email.');
      } else {
        toast.error(response.data.error?.message || 'Failed to send reactivation link');
      }
    } catch (err: any) {
      // We still show success even on server error for security (don't reveal if email exists)
      setSuccess(true);
      toast.success('If an account exists, a reactivation link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <CardTitle>Check Your Email</CardTitle>
            <CardDescription>
              If an account exists with that email, we've sent a reactivation link. Check your inbox and spam folder.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              The link will expire in 30 days. Click the link in your email to reactivate your organization.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.push('/login')} className="w-full">
                Back to Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setSuccess(false)} 
                className="w-full"
              >
                Send Another Link
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <CardTitle>Request Reactivation Link</CardTitle>
          <CardDescription>
            Enter the email address you used to register your organization. We'll send you a new reactivation link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <p className="text-xs text-muted-foreground">
                Enter the email address of the organization owner.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reactivation Link'
              )}
            </Button>

            <div className="text-center">
              <Link 
                href="/login" 
                className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
