'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo } from 'react';
import { apiClient } from '@/lib/api/client';
import { 
  DEFAULT_LOCALE_SETTINGS, 
  type OrganizationLocaleSettings,
  formatDate as formatDateUtil,
  formatTime as formatTimeUtil,
  formatCurrency as formatCurrencyUtil,
  formatDateTime as formatDateTimeUtil,
} from '@/lib/format';

interface OrgSettingsContextType {
  settings: OrganizationLocaleSettings;
  loading: boolean;
  refresh: () => Promise<void>;
}

const OrgSettingsContext = createContext<OrgSettingsContextType | null>(null);

// Helper to check if user is authenticated (has accessToken cookie)
function isAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
  return !!match;
}

export function OrgSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<OrganizationLocaleSettings>(DEFAULT_LOCALE_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    // Only fetch settings if user is authenticated
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await apiClient.get<{ settings: OrganizationLocaleSettings }>('/api/v1/organization/settings');
      if (response.success && response.data?.settings) {
        setSettings({
          timezone: response.data.settings.timezone || DEFAULT_LOCALE_SETTINGS.timezone,
          dateFormat: response.data.settings.dateFormat || DEFAULT_LOCALE_SETTINGS.dateFormat,
          timeFormat: response.data.settings.timeFormat || DEFAULT_LOCALE_SETTINGS.timeFormat,
          currency: response.data.settings.currency || DEFAULT_LOCALE_SETTINGS.currency,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch organization settings:', error);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <OrgSettingsContext.Provider value={{ settings, loading, refresh: fetchSettings }}>
      {children}
    </OrgSettingsContext.Provider>
  );
}

export function useOrgSettings(): OrganizationLocaleSettings {
  const context = useContext(OrgSettingsContext);
  if (!context) {
    // Return defaults if used outside provider
    return DEFAULT_LOCALE_SETTINGS;
  }
  return context.settings;
}

export function useOrgSettingsContext(): OrgSettingsContextType {
  const context = useContext(OrgSettingsContext);
  if (!context) {
    return {
      settings: DEFAULT_LOCALE_SETTINGS,
      loading: false,
      refresh: async () => {},
    };
  }
  return context;
}

/**
 * Hook that provides formatting functions pre-configured with organization settings
 * Use this in components to format dates, times, and currency consistently
 */
export function useOrgFormatters() {
  const settings = useOrgSettings();
  
  return useMemo(() => ({
    formatDate: (date: Date | string | null | undefined, customFormat?: string) => 
      formatDateUtil(date, settings, customFormat),
    formatTime: (date: Date | string | null | undefined) => 
      formatTimeUtil(date, settings),
    formatDateTime: (date: Date | string | null | undefined) => 
      formatDateTimeUtil(date, settings),
    formatCurrency: (amount: number, options?: { showSymbol?: boolean; compact?: boolean; decimals?: number }) => 
      formatCurrencyUtil(amount, settings, options),
    settings,
  }), [settings]);
}
