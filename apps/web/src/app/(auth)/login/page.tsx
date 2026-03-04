'use client';

import { useState, useEffect } from 'react';
import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Building2 } from 'lucide-react';

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
            {isPlatformLogin ? (
              <Shield className="h-10 w-10 text-primary" />
            ) : (
              <Building2 className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {isPlatformLogin ? 'Platform Admin Login' : 'Welcome Back'}
          </CardTitle>
          <CardDescription>
            {isPlatformLogin 
              ? 'Sign in as Platform Administrator'
              : tenantSlug 
                ? `Sign in to ${tenantSlug.charAt(0).toUpperCase() + tenantSlug.slice(1)}`
                : 'Sign in to your Office Management account'
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
