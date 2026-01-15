'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const resendSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ResendFormData = z.infer<typeof resendSchema>;

export default function ResendVerificationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [email, setEmail] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendFormData>({
    resolver: zodResolver(resendSchema),
  });

  const onSubmit = async (data: ResendFormData) => {
    setIsLoading(true);
    setEmail(data.email);

    try {
      // Get tenant from hostname
      const hostname = window.location.hostname;
      const parts = hostname.split('.');
      const tenant = parts.length > 1 ? parts[0] : null;

      const response = await fetch('/api/v1/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(tenant && tenant !== 'localhost' ? { 'X-Tenant-Slug': tenant } : {}),
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (result.success) {
        setIsSuccess(true);
      } else {
        toast.error(result.error?.message || 'Failed to send verification email');
      }
    } catch (error) {
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 rounded-full bg-green-100 p-4 w-fit">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a verification link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Click the link in the email to verify your account. The link will expire in 24 hours.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setIsSuccess(false)}
                className="text-primary underline hover:no-underline"
              >
                try again
              </button>
              .
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-primary/10 p-4 w-fit">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Resend Verification Email</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a new verification link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Verification Email
                </>
              )}
            </Button>

            <Button asChild variant="ghost" className="w-full">
              <Link href="/login">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Login
              </Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
