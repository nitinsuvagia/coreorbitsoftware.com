'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api/client';
import type { NotificationPreferences } from '../types';

const DEFAULT_PREFS: NotificationPreferences = {
  emailNotifications: true,
  pushNotifications: true,
  taskReminders: true,
  leaveUpdates: true,
  projectUpdates: true,
  weeklyDigest: false,
  mentionAlerts: true,
  systemAnnouncements: true,
};

interface UseNotificationsReturn {
  preferences: NotificationPreferences;
  saving: boolean;
  updatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
  savePreferences: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = useCallback(async () => {
    try {
      const response = await apiClient.get<NotificationPreferences>('/api/v1/users/notification-preferences');
      if (response.success && response.data) {
        setPreferences(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch notification preferences:', error);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = (key: keyof NotificationPreferences, value: boolean) => {
    setPreferences({ ...preferences, [key]: value });
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const response = await apiClient.put('/api/v1/users/notification-preferences', preferences);
      if (response.success) {
        toast.success('Notification preferences saved');
      }
    } catch (error: any) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return {
    preferences,
    saving,
    updatePreference,
    savePreferences,
    fetchPreferences,
  };
}
