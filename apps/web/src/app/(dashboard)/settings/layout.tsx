'use client';

import React from 'react';
import { User, Shield, Bell, Palette } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/settings', label: 'Profile', icon: User, exact: true },
  { href: '/settings/security', label: 'Security', icon: Shield },
  { href: '/settings/notifications', label: 'Notifications', icon: Bell },
  { href: '/settings/appearance', label: 'Appearance', icon: Palette },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and application preferences
        </p>
      </div>
      <div className="space-y-4">
        <nav className="flex space-x-1 border-b">
          {NAV_ITEMS.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
