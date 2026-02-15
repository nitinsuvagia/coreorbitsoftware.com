'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';

export interface EmployeeCodeSettings {
  autoGenerate: boolean;
  prefix: string;
  yearSeqDigits: number;
  totalSeqDigits: number;
  separator: '-' | '_' | '';
}

export interface EmployeeCodePreview {
  previewCode: string;
  breakdown: {
    prefix: string;
    year: number;
    yearSequence: number;
    totalSequence: number;
  };
}

const DEFAULT_SETTINGS: EmployeeCodeSettings = {
  autoGenerate: true,
  prefix: 'EMP',
  yearSeqDigits: 5,
  totalSeqDigits: 5,
  separator: '-',
};

export function useEmployeeCodeSettings() {
  const [settings, setSettings] = useState<EmployeeCodeSettings>(DEFAULT_SETTINGS);
  const [settingsForm, setSettingsForm] = useState<EmployeeCodeSettings>(DEFAULT_SETTINGS);
  const [preview, setPreview] = useState<EmployeeCodePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<EmployeeCodeSettings>('/api/v1/organization/employee-code-settings');
      if (response.success && response.data) {
        setSettings(response.data);
        setSettingsForm(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch employee code settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPreview = useCallback(async () => {
    try {
      setLoadingPreview(true);
      const response = await apiClient.get<{ previewCode: string; breakdown: EmployeeCodePreview['breakdown'] }>(
        '/api/v1/organization/employee-code-preview'
      );
      if (response.success && response.data) {
        setPreview({
          previewCode: response.data.previewCode,
          breakdown: response.data.breakdown,
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const saveSettings = useCallback(async () => {
    if (!settingsForm.prefix.trim()) {
      toast.error('Prefix is required');
      return false;
    }
    
    try {
      setSaving(true);
      const response = await apiClient.put<EmployeeCodeSettings>(
        '/api/v1/organization/employee-code-settings',
        settingsForm
      );
      
      if (response.success && response.data) {
        setSettings(response.data);
        toast.success('Employee code settings saved successfully');
        // Refresh preview after saving
        fetchPreview();
        return true;
      } else {
        toast.error(response.error?.message || 'Failed to save settings');
        return false;
      }
    } catch (error: any) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save employee code settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [settingsForm, fetchPreview]);

  const updateFormField = useCallback(<K extends keyof EmployeeCodeSettings>(
    field: K,
    value: EmployeeCodeSettings[K]
  ) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setSettingsForm(settings);
  }, [settings]);

  // Generate live preview based on current form values
  const generateLivePreview = useCallback(() => {
    const { prefix, separator, yearSeqDigits, totalSeqDigits } = settingsForm;
    const year = new Date().getFullYear();
    const yearSeq = preview?.breakdown.yearSequence || 1;
    const totalSeq = preview?.breakdown.totalSequence || 1;
    
    const yearSeqStr = String(yearSeq).padStart(yearSeqDigits, '0');
    const totalSeqStr = String(totalSeq).padStart(totalSeqDigits, '0');
    
    return `${prefix}${separator}${year}${separator}${yearSeqStr}${separator}${totalSeqStr}`;
  }, [settingsForm, preview]);

  return {
    settings,
    settingsForm,
    preview,
    loading,
    saving,
    loadingPreview,
    fetchSettings,
    fetchPreview,
    saveSettings,
    updateFormField,
    resetForm,
    generateLivePreview,
  };
}
