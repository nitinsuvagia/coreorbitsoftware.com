'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/auth-context';

interface AppearancePreferences {
  theme: string;
  accentColor: string;
  fontSize: string;
  fontFamily: string;
  compactMode: boolean;
  reducedMotion: boolean;
  sidebarCollapsed: boolean;
}

/**
 * Component that loads and applies user appearance preferences globally
 * This runs once when the user is authenticated
 */
export function AppearanceLoader() {
  const { setTheme } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const response = await apiClient.get<AppearancePreferences>('/api/v1/users/appearance-preferences');
        if (response.success && response.data) {
          const prefs = response.data;

          // Apply theme
          if (prefs.theme) {
            setTheme(prefs.theme);
          }

          // Apply accent color
          if (prefs.accentColor) {
            document.documentElement.setAttribute('data-accent-color', prefs.accentColor);
          }

          // Apply font family
          if (prefs.fontFamily) {
            document.documentElement.setAttribute('data-font-family', prefs.fontFamily);
          }

          // Apply font size
          if (prefs.fontSize) {
            document.documentElement.setAttribute('data-font-size', prefs.fontSize);
          }

          // Apply compact mode
          document.documentElement.setAttribute('data-compact', String(prefs.compactMode ?? false));

          // Apply reduced motion
          document.documentElement.setAttribute('data-reduced-motion', String(prefs.reducedMotion ?? false));
        }
      } catch (error) {
        console.error('Failed to load appearance preferences:', error);
      }
    };

    loadPreferences();
  }, [user, setTheme]);

  return null; // This component doesn't render anything
}
