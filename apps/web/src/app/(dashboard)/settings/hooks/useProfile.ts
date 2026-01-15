'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/auth-context';
import { apiClient } from '@/lib/api/client';
import type { UserProfile } from '../types';

interface UseProfileReturn {
  profile: UserProfile | null;
  profileForm: Partial<UserProfile>;
  loading: boolean;
  saving: boolean;
  avatarFile: File | null;
  avatarPreview: string | null;
  fetchProfile: () => Promise<void>;
  updateProfileForm: (field: keyof UserProfile, value: UserProfile[keyof UserProfile]) => void;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  saveProfile: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<UserProfile>('/api/v1/users/profile');
      if (response.success && response.data) {
        setProfile(response.data);
        setProfileForm(response.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch profile:', error);
      // Use auth user as fallback
      if (user) {
        const fallbackProfile = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          avatar: user.avatar,
        };
        setProfile(fallbackProfile);
        setProfileForm(fallbackProfile);
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Populate profile from auth user when user becomes available
  useEffect(() => {
    if (user && !profile && !loading) {
      const fallbackProfile = {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
      };
      setProfile(fallbackProfile);
      setProfileForm(fallbackProfile);
    }
  }, [user, profile, loading]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfileForm = (field: keyof UserProfile, value: UserProfile[keyof UserProfile]) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);
      
      const response = await apiClient.put<UserProfile>('/api/v1/users/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone,
        bio: profileForm.bio,
        timezone: profileForm.timezone,
        language: profileForm.language,
        dateFormat: profileForm.dateFormat,
        skills: profileForm.skills,
        location: profileForm.location,
        avatar: avatarFile && avatarPreview ? avatarPreview : undefined,
      });

      if (response.success && response.data) {
        setProfile(response.data);
        setProfileForm(response.data);
        setAvatarFile(null);
        setAvatarPreview(null);
        toast.success('Profile updated successfully');
      }
    } catch (error: any) {
      console.error('Failed to save profile:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return {
    profile,
    profileForm,
    loading,
    saving,
    avatarFile,
    avatarPreview,
    fetchProfile,
    updateProfileForm,
    handleAvatarChange,
    saveProfile,
  };
}
