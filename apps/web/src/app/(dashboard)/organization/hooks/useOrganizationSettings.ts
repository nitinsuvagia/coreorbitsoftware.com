'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { OrganizationSettings, SettingsFormErrors } from '../types';
import { DEFAULT_LOCALE_SETTINGS } from '@/lib/format';

const DEFAULT_SETTINGS: OrganizationSettings = {
  timezone: DEFAULT_LOCALE_SETTINGS.timezone,
  dateFormat: DEFAULT_LOCALE_SETTINGS.dateFormat,
  timeFormat: DEFAULT_LOCALE_SETTINGS.timeFormat,
  currency: DEFAULT_LOCALE_SETTINGS.currency,
  language: 'en',
  fiscalYearStart: 1,
  workingDays: [1, 2, 3, 4, 5],
  workStartTime: '09:00',
  workEndTime: '18:00',
};

export function useOrganizationSettings() {
  const [settings, setSettings] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState<OrganizationSettings>(DEFAULT_SETTINGS);
  const [errors, setErrors] = useState<SettingsFormErrors>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ settings: OrganizationSettings }>('/api/v1/organization/settings');
      if (response.success && response.data?.settings) {
        setSettings(response.data.settings);
        setSettingsForm(response.data.settings);
      }
    } catch (error: any) {
      console.error('Failed to fetch organization settings:', error);
      // Use defaults if fetch fails
    } finally {
      setLoading(false);
    }
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: SettingsFormErrors = {};
    
    if (!settingsForm.timezone) {
      newErrors.timezone = 'Timezone is required';
    }
    if (!settingsForm.dateFormat) {
      newErrors.dateFormat = 'Date format is required';
    }
    if (!settingsForm.currency) {
      newErrors.currency = 'Currency is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [settingsForm]);

  const saveSettings = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      const response = await apiClient.put<{ settings: OrganizationSettings }>(
        '/api/v1/organization/settings',
        settingsForm
      );
      
      if (response.success && response.data?.settings) {
        setSettings(response.data.settings);
        toast.success('Organization settings saved successfully');
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to save settings');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save organization settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsForm, validateForm]);

  const updateFormField = useCallback(<K extends keyof OrganizationSettings>(
    field: K,
    value: OrganizationSettings[K]
  ) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field as keyof SettingsFormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const resetForm = useCallback(() => {
    setSettingsForm(settings);
    setErrors({});
  }, [settings]);

  return {
    settings,
    settingsForm,
    errors,
    loading,
    saving,
    fetchSettings,
    saveSettings,
    updateFormField,
    resetForm,
    setErrors,
  };
}
