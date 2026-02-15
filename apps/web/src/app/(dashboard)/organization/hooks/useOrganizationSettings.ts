'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { OrganizationSettings, SettingsFormErrors, WeeklyWorkingHours, DayWorkingHours } from '../types';
import { DEFAULT_LOCALE_SETTINGS } from '@/lib/format';

// Default working hours for a regular working day
const DEFAULT_WORKING_DAY: DayWorkingHours = {
  isWorkingDay: true,
  isHalfDay: false,
  startTime: '09:00',
  endTime: '18:00',
};

// Default for non-working day (weekend)
const DEFAULT_NON_WORKING_DAY: DayWorkingHours = {
  isWorkingDay: false,
  isHalfDay: false,
  startTime: '09:00',
  endTime: '18:00',
};

// Default half day (e.g., for Saturday)
const DEFAULT_HALF_DAY: DayWorkingHours = {
  isWorkingDay: true,
  isHalfDay: true,
  startTime: '09:00',
  endTime: '13:00',
};

const DEFAULT_WEEKLY_HOURS: WeeklyWorkingHours = {
  sunday: DEFAULT_NON_WORKING_DAY,
  monday: DEFAULT_WORKING_DAY,
  tuesday: DEFAULT_WORKING_DAY,
  wednesday: DEFAULT_WORKING_DAY,
  thursday: DEFAULT_WORKING_DAY,
  friday: DEFAULT_WORKING_DAY,
  saturday: DEFAULT_NON_WORKING_DAY,
};

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
  weeklyWorkingHours: DEFAULT_WEEKLY_HOURS,
  excludeHolidaysFromLeave: true,
  excludeWeekendsFromLeave: true,
  enabledHolidayTypes: {
    public: true,
    optional: true,
    restricted: true,
  },
  optionalHolidayQuota: 2,
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
        // Merge weeklyWorkingHours with defaults to ensure all days have values
        const fetchedSettings = response.data.settings;
        const mergedWeeklyHours: WeeklyWorkingHours = {
          sunday: { ...DEFAULT_NON_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.sunday },
          monday: { ...DEFAULT_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.monday },
          tuesday: { ...DEFAULT_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.tuesday },
          wednesday: { ...DEFAULT_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.wednesday },
          thursday: { ...DEFAULT_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.thursday },
          friday: { ...DEFAULT_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.friday },
          saturday: { ...DEFAULT_NON_WORKING_DAY, ...fetchedSettings.weeklyWorkingHours?.saturday },
        };
        
        const mergedSettings: OrganizationSettings = {
          ...DEFAULT_SETTINGS,
          ...fetchedSettings,
          weeklyWorkingHours: mergedWeeklyHours,
        };
        
        setSettings(mergedSettings);
        setSettingsForm(mergedSettings);
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

  // Save only Regional Settings (timezone, dateFormat, timeFormat, currency, fiscalYearStart, language)
  const saveRegionalSettings = useCallback(async () => {
    if (!validateForm()) return false;
    
    try {
      setSaving(true);
      const regionalData = {
        timezone: settingsForm.timezone,
        dateFormat: settingsForm.dateFormat,
        timeFormat: settingsForm.timeFormat,
        currency: settingsForm.currency,
        fiscalYearStart: settingsForm.fiscalYearStart,
        language: settingsForm.language,
      };
      
      const response = await apiClient.put<{ settings: OrganizationSettings }>(
        '/api/v1/organization/settings',
        regionalData
      );
      
      if (response.success && response.data?.settings) {
        setSettings(prev => ({ ...prev, ...regionalData }));
        toast.success('Regional settings saved successfully');
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to save regional settings');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to save regional settings:', error);
      toast.error('Failed to save regional settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsForm, validateForm]);

  // Save only Working Environment Settings (weeklyWorkingHours, holidays, leave settings)
  const saveWorkingEnvironmentSettings = useCallback(async () => {
    try {
      setSaving(true);
      const workingEnvData = {
        // Required fields from schema (include current values)
        timezone: settingsForm.timezone,
        dateFormat: settingsForm.dateFormat,
        timeFormat: settingsForm.timeFormat,
        currency: settingsForm.currency,
        // Working environment specific fields
        workingDays: settingsForm.workingDays,
        workStartTime: settingsForm.workStartTime,
        workEndTime: settingsForm.workEndTime,
        weeklyWorkingHours: settingsForm.weeklyWorkingHours,
        excludeHolidaysFromLeave: settingsForm.excludeHolidaysFromLeave,
        excludeWeekendsFromLeave: settingsForm.excludeWeekendsFromLeave,
        enabledHolidayTypes: settingsForm.enabledHolidayTypes,
        optionalHolidayQuota: settingsForm.optionalHolidayQuota,
      };
      
      const response = await apiClient.put<{ settings: OrganizationSettings }>(
        '/api/v1/organization/settings',
        workingEnvData
      );
      
      if (response.success && response.data?.settings) {
        setSettings(prev => ({ ...prev, ...workingEnvData }));
        toast.success('Working environment settings saved successfully');
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to save working environment settings');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to save working environment settings:', error);
      toast.error('Failed to save working environment settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsForm]);

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

  // Reset only Regional Settings to saved values
  const resetRegionalSettings = useCallback(() => {
    setSettingsForm(prev => ({
      ...prev,
      timezone: settings.timezone,
      dateFormat: settings.dateFormat,
      timeFormat: settings.timeFormat,
      currency: settings.currency,
      fiscalYearStart: settings.fiscalYearStart,
      language: settings.language,
    }));
    setErrors({});
  }, [settings]);

  // Reset only Working Environment Settings to saved values
  const resetWorkingEnvironmentSettings = useCallback(() => {
    setSettingsForm(prev => ({
      ...prev,
      workingDays: settings.workingDays,
      workStartTime: settings.workStartTime,
      workEndTime: settings.workEndTime,
      weeklyWorkingHours: settings.weeklyWorkingHours,
      excludeHolidaysFromLeave: settings.excludeHolidaysFromLeave,
      excludeWeekendsFromLeave: settings.excludeWeekendsFromLeave,
      enabledHolidayTypes: settings.enabledHolidayTypes,
      optionalHolidayQuota: settings.optionalHolidayQuota,
    }));
  }, [settings]);

  return {
    settings,
    settingsForm,
    errors,
    loading,
    saving,
    fetchSettings,
    saveSettings,
    saveRegionalSettings,
    saveWorkingEnvironmentSettings,
    updateFormField,
    resetForm,
    resetRegionalSettings,
    resetWorkingEnvironmentSettings,
    setErrors,
  };
}
