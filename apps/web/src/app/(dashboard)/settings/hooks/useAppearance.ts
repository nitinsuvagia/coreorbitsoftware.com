'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import { useTheme } from 'next-themes';
import type { Theme, FontSize, FontFamily, AccentColor, AppearancePreferences } from '../types';

const DEFAULT_PREFERENCES: AppearancePreferences = {
  theme: 'system',
  accentColor: 'blue',
  fontSize: 'medium',
  fontFamily: 'inter',
  compactMode: false,
  reducedMotion: false,
  sidebarCollapsed: false,
};

interface UseAppearanceReturn {
  preferences: AppearancePreferences;
  saving: boolean;
  loading: boolean;
  updatePreference: <K extends keyof AppearancePreferences>(key: K, value: AppearancePreferences[K]) => void;
  savePreferences: () => Promise<void>;
  resetToDefaults: () => void;
}

export function useAppearance(): UseAppearanceReturn {
  const [preferences, setPreferences] = useState<AppearancePreferences>(DEFAULT_PREFERENCES);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const { setTheme: setNextTheme } = useTheme();

  const fetchPreferences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<AppearancePreferences>('/api/v1/users/appearance-preferences');
      if (response.success && response.data) {
        const prefs = { ...DEFAULT_PREFERENCES, ...response.data };
        setPreferences(prefs);
        
        // Apply theme immediately
        if (prefs.theme) {
          setNextTheme(prefs.theme);
        }
        
        // Apply font size
        if (prefs.fontSize) {
          document.documentElement.setAttribute('data-font-size', prefs.fontSize);
        }
        
        // Apply compact mode
        document.documentElement.setAttribute('data-compact', String(prefs.compactMode));
        
        // Apply reduced motion
        document.documentElement.setAttribute('data-reduced-motion', String(prefs.reducedMotion));
        
        // Apply accent color
        if (prefs.accentColor) {
          document.documentElement.setAttribute('data-accent-color', prefs.accentColor);
        }
        
        // Apply font family
        if (prefs.fontFamily) {
          document.documentElement.setAttribute('data-font-family', prefs.fontFamily);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch appearance preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [setNextTheme]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = <K extends keyof AppearancePreferences>(
    key: K,
    value: AppearancePreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
    
    // Apply theme change immediately for instant feedback
    if (key === 'theme') {
      setNextTheme(value as string);
    }
    
    // Apply accent color immediately
    if (key === 'accentColor') {
      document.documentElement.setAttribute('data-accent-color', value as string);
    }
    
    // Apply font size immediately
    if (key === 'fontSize') {
      document.documentElement.setAttribute('data-font-size', value as string);
    }
    
    // Apply compact mode immediately
    if (key === 'compactMode') {
      document.documentElement.setAttribute('data-compact', String(value));
    }
    
    // Apply reduced motion immediately
    if (key === 'reducedMotion') {
      document.documentElement.setAttribute('data-reduced-motion', String(value));
    }
    
    // Apply font family immediately
    if (key === 'fontFamily') {
      document.documentElement.setAttribute('data-font-family', value as string);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put('/api/v1/users/appearance-preferences', preferences);
      if (response.success) {
        toast.success('Appearance preferences saved');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
    setNextTheme('system');
    document.documentElement.removeAttribute('data-font-size');
    document.documentElement.removeAttribute('data-font-family');
    document.documentElement.removeAttribute('data-compact');
    document.documentElement.removeAttribute('data-reduced-motion');
    document.documentElement.removeAttribute('data-accent-color');
    toast.info('Reset to default appearance');
  };

  return {
    preferences,
    saving,
    loading,
    updatePreference,
    savePreferences,
    resetToDefaults,
  };
}
