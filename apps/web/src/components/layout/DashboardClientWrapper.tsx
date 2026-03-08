'use client';

import { OnboardingChecklist } from '@/components/onboarding';
import { AiChatPanel } from '@/components/ai/AiChatPanel';
import { useAuth } from '@/lib/auth/auth-context';

export function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Show onboarding for tenant owners and admins
  const isTenantAdminOrOwner = user?.role === 'tenant_admin' || user?.role === 'tenant_owner';
  
  return (
    <>
      {children}
      {isTenantAdminOrOwner && <OnboardingChecklist />}
      <AiChatPanel />
    </>
  );
}
