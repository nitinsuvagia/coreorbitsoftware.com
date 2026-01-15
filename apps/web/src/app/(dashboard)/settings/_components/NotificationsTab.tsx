'use client';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Bell, Mail, Clock, User, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import type { NotificationPreferences } from '../types';

interface NotificationsTabProps {
  preferences: NotificationPreferences;
  saving: boolean;
  onUpdatePreference: (key: keyof NotificationPreferences, value: boolean) => void;
  onSavePreferences: () => Promise<void>;
}

const NOTIFICATION_CATEGORIES = [
  { key: 'taskReminders' as const, title: 'Task Reminders', description: 'Get reminded about upcoming task deadlines', icon: Clock },
  { key: 'leaveUpdates' as const, title: 'Leave Updates', description: 'Notifications about leave request status', icon: User },
  { key: 'projectUpdates' as const, title: 'Project Updates', description: 'Updates about projects you are part of', icon: User },
  { key: 'mentionAlerts' as const, title: 'Mention Alerts', description: 'Get notified when someone mentions you', icon: User },
  { key: 'systemAnnouncements' as const, title: 'System Announcements', description: 'Important system updates and announcements', icon: AlertTriangle },
  { key: 'weeklyDigest' as const, title: 'Weekly Digest', description: 'Weekly summary of your activities', icon: Mail },
];

export function NotificationsTab({
  preferences,
  saving,
  onUpdatePreference,
  onSavePreferences,
}: NotificationsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email & Push */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Channels</h4>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive emails for important updates</p>
              </div>
            </div>
            <Switch 
              checked={preferences.emailNotifications}
              onCheckedChange={(checked) => onUpdatePreference('emailNotifications', checked)}
            />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Push Notifications</p>
                <p className="text-sm text-muted-foreground">Receive push notifications on your devices</p>
              </div>
            </div>
            <Switch 
              checked={preferences.pushNotifications}
              onCheckedChange={(checked) => onUpdatePreference('pushNotifications', checked)}
            />
          </div>
        </div>

        <Separator />

        {/* Categories */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Categories</h4>
          {NOTIFICATION_CATEGORIES.map((item) => (
            <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <Switch 
                checked={preferences[item.key]}
                onCheckedChange={(checked) => onUpdatePreference(item.key, checked)}
              />
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onSavePreferences} disabled={saving}>
          {saving ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Preferences
        </Button>
      </CardFooter>
    </Card>
  );
}
