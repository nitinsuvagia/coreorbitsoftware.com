'use client';

import { useAppearance } from '../../hooks';
import { AppearanceTab } from '../../_components';

export default function AppearancePage() {
  const {
    preferences,
    saving,
    loading,
    updatePreference,
    savePreferences,
    resetToDefaults,
  } = useAppearance();

  return (
    <AppearanceTab
      preferences={preferences}
      saving={saving}
      loading={loading}
      onUpdatePreference={updatePreference}
      onSavePreferences={savePreferences}
      onResetToDefaults={resetToDefaults}
    />
  );
}
