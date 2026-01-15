'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useState } from 'react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { AppearanceLoader } from '@/components/appearance-loader';
import { OrgSettingsProvider } from '@/hooks/use-org-settings';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <OrgSettingsProvider>
            <AppearanceLoader />
            {children}
          </OrgSettingsProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
