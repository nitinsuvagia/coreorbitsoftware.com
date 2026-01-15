'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { TenantInfo } from '../types';

interface WelcomeHeaderProps {
  firstName?: string;
  tenant?: TenantInfo;
}

export function WelcomeHeader({ firstName, tenant }: WelcomeHeaderProps) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {firstName}!
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening in your organization today.
        </p>
        <Button variant="outline" size="sm" className="mt-3" asChild>
          <Link href="/admin-360">
            <Sparkles className="mr-2 h-4 w-4" />
            View 360° Dashboard
          </Link>
        </Button>
      </div>
      {tenant && (
        <div className="text-right">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{tenant.name}</span>
            <Badge variant={tenant.status === 'ACTIVE' ? 'success' : 'warning'}>
              {tenant.status.toLowerCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tenant.plan} Plan
            {tenant.daysRemaining !== null && (
              <span> · {tenant.daysRemaining} days remaining</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
