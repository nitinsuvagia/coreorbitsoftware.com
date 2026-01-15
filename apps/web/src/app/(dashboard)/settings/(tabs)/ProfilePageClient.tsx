'use client';

import { useProfile } from '../hooks';
import { ProfileTab } from '../_components';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePageClient() {
  const {
    profile,
    profileForm,
    loading: loadingProfile,
    saving: savingProfile,
    avatarPreview,
    updateProfileForm,
    handleAvatarChange,
    saveProfile,
  } = useProfile();

  if (loadingProfile) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-72 mt-2" />
        </div>
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <ProfileTab
      profile={profile}
      profileForm={profileForm}
      saving={savingProfile}
      avatarPreview={avatarPreview}
      onUpdateProfileForm={updateProfileForm}
      onAvatarChange={handleAvatarChange}
      onSaveProfile={saveProfile}
    />
  );
}
