'use client';

import { useNotifications } from '../../hooks';
import { NotificationsTab } from '../../_components';

export default function NotificationsPage() {
  const {
    preferences: notificationPrefs,
    saving: savingNotifications,
    updatePreference: updateNotificationPref,
    savePreferences: saveNotificationPrefs,
  } = useNotifications();

  return (
    <NotificationsTab
      preferences={notificationPrefs}
      saving={savingNotifications}
      onUpdatePreference={updateNotificationPref}
      onSavePreferences={saveNotificationPrefs}
    />
  );
}
