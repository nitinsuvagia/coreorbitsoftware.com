'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTenantSlugFromHostname } from '@/lib/domain-context';

function getTenantSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null;

  return getTenantSlugFromHostname(window.location.hostname);
}

export default function LoginPage() {
  const [tenantSlug, setTenantSlug] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setTenantSlug(getTenantSlugFromHost());
    setChecked(true);
  }, []);

  const isPlatformLogin = checked && !tenantSlug;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img
              src="/logo-square.svg"
              alt="CoreOrbit Software"
              className="h-20 w-auto"
            />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isPlatformLogin ? 'Platform Admin Login' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isPlatformLogin 
              ? 'Sign in as Platform Administrator'
              : tenantSlug 
                ? `Sign in to ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}`
                : 'Sign in to your CoreOrbit account'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
