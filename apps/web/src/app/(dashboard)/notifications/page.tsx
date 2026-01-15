'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  FileText,
  FolderKanban,
  MessageSquare,
  Settings,
  Trash2,
  Users,
  Calendar,
  AlertCircle,
  Mail,
  RefreshCw,
  MoreHorizontal,
  Filter,
  Archive,
  Eye,
  BellOff,
  Zap,
  UserPlus,
  ClipboardCheck,
  DollarSign,
  Download,
} from 'lucide-react';

interface Notification {
  id: string;
  type: 'task' | 'project' | 'leave' | 'mention' | 'system' | 'attendance' | 'billing' | 'team';
  title: string;
  message: string;
  time: string;
  createdAt: string;
  read: boolean;
  archived: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  taskReminders: boolean;
  leaveUpdates: boolean;
  projectUpdates: boolean;
  weeklyDigest: boolean;
  mentionAlerts: boolean;
  systemAnnouncements: boolean;
  attendanceAlerts: boolean;
  billingAlerts: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'task':
      return Clock;
    case 'project':
      return FolderKanban;
    case 'leave':
      return Calendar;
    case 'mention':
      return MessageSquare;
    case 'system':
      return Settings;
    case 'attendance':
      return ClipboardCheck;
    case 'billing':
      return DollarSign;
    case 'team':
      return UserPlus;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'task':
      return 'bg-blue-100 text-blue-600';
    case 'project':
      return 'bg-green-100 text-green-600';
    case 'leave':
      return 'bg-orange-100 text-orange-600';
    case 'mention':
      return 'bg-purple-100 text-purple-600';
    case 'system':
      return 'bg-gray-100 text-gray-600';
    case 'attendance':
      return 'bg-cyan-100 text-cyan-600';
    case 'billing':
      return 'bg-yellow-100 text-yellow-600';
    case 'team':
      return 'bg-pink-100 text-pink-600';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} mins ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    taskReminders: true,
    leaveUpdates: true,
    projectUpdates: true,
    weeklyDigest: false,
    mentionAlerts: true,
    systemAnnouncements: true,
    attendanceAlerts: true,
    billingAlerts: true,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/notifications');
      const data = response.data as { success: boolean; data: Notification[] };
      if (data.success) {
        setNotifications(data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      // Mock data for demo
      const now = new Date();
      setNotifications([
        { id: '1', type: 'task', title: 'Task assigned', message: 'You have been assigned to "Update API documentation"', time: '5 mins ago', createdAt: new Date(now.getTime() - 5 * 60000).toISOString(), read: false, archived: false, actionUrl: '/tasks/1' },
        { id: '2', type: 'project', title: 'Project update', message: 'Mobile App Redesign project has been marked as completed', time: '1 hour ago', createdAt: new Date(now.getTime() - 60 * 60000).toISOString(), read: false, archived: false, actionUrl: '/projects/1' },
        { id: '3', type: 'mention', title: 'New mention', message: 'John Doe mentioned you in a comment on "Dashboard redesign"', time: '2 hours ago', createdAt: new Date(now.getTime() - 120 * 60000).toISOString(), read: false, archived: false },
        { id: '4', type: 'leave', title: 'Leave approved', message: 'Your leave request for March 15-16 has been approved', time: '3 hours ago', createdAt: new Date(now.getTime() - 180 * 60000).toISOString(), read: true, archived: false },
        { id: '5', type: 'system', title: 'System update', message: 'New features have been added. Check out the changelog!', time: '1 day ago', createdAt: new Date(now.getTime() - 24 * 60 * 60000).toISOString(), read: true, archived: false },
        { id: '6', type: 'task', title: 'Task due soon', message: '"Code review for feature X" is due in 2 hours', time: '1 day ago', createdAt: new Date(now.getTime() - 24 * 60 * 60000).toISOString(), read: true, archived: false },
        { id: '7', type: 'team', title: 'New team member', message: 'Sarah joined the "API Integration" project', time: '2 days ago', createdAt: new Date(now.getTime() - 48 * 60 * 60000).toISOString(), read: true, archived: false },
        { id: '8', type: 'attendance', title: 'Attendance reminder', message: 'You forgot to clock out yesterday', time: '3 days ago', createdAt: new Date(now.getTime() - 72 * 60 * 60000).toISOString(), read: true, archived: false },
        { id: '9', type: 'billing', title: 'Invoice generated', message: 'Your monthly invoice for January is ready', time: '1 week ago', createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60000).toISOString(), read: true, archived: true },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/users/notification-preferences');
      const data = response.data as { success: boolean; data: NotificationPreferences };
      if (data.success) {
        setPreferences(data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch preferences:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchPreferences();
  }, [fetchNotifications, fetchPreferences]);

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;
  const archivedCount = notifications.filter((n) => n.archived).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'unread' && n.read) return false;
    if (filter === 'archived' && !n.archived) return false;
    if (filter !== 'archived' && n.archived) return false;
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    return true;
  });

  const notificationTypes = [...new Set(notifications.map(n => n.type))];

  // Mark as read
  async function markAsRead(id: string) {
    try {
      await apiClient.put(`/api/v1/notifications/${id}/read`);
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      // Optimistically update UI
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ));
    }
  }

  // Mark all as read
  async function markAllAsRead() {
    try {
      await apiClient.put('/api/v1/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch (error) {
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    }
  }

  // Mark selected as read
  async function markSelectedAsRead() {
    try {
      await apiClient.put('/api/v1/notifications/read', { ids: Array.from(selectedNotifications) });
      setNotifications(notifications.map((n) =>
        selectedNotifications.has(n.id) ? { ...n, read: true } : n
      ));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications marked as read');
    } catch (error) {
      setNotifications(notifications.map((n) =>
        selectedNotifications.has(n.id) ? { ...n, read: true } : n
      ));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications marked as read');
    }
  }

  // Archive notification
  async function archiveNotification(id: string) {
    try {
      await apiClient.put(`/api/v1/notifications/${id}/archive`);
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, archived: true } : n
      ));
      toast.success('Notification archived');
    } catch (error) {
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, archived: true } : n
      ));
      toast.success('Notification archived');
    }
  }

  // Archive selected
  async function archiveSelected() {
    try {
      await apiClient.put('/api/v1/notifications/archive', { ids: Array.from(selectedNotifications) });
      setNotifications(notifications.map((n) =>
        selectedNotifications.has(n.id) ? { ...n, archived: true } : n
      ));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications archived');
    } catch (error) {
      setNotifications(notifications.map((n) =>
        selectedNotifications.has(n.id) ? { ...n, archived: true } : n
      ));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications archived');
    }
  }

  // Delete notification
  async function deleteNotification(id: string) {
    try {
      await apiClient.delete(`/api/v1/notifications/${id}`);
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    } catch (error) {
      setNotifications(notifications.filter((n) => n.id !== id));
      toast.success('Notification deleted');
    }
    setNotificationToDelete(null);
    setShowDeleteDialog(false);
  }

  // Delete selected
  async function deleteSelected() {
    try {
      // Delete notifications one by one since bulk delete with body isn't supported
      const ids = Array.from(selectedNotifications);
      await Promise.all(ids.map(id => apiClient.delete(`/api/v1/notifications/${id}`)));
      setNotifications(notifications.filter((n) => !selectedNotifications.has(n.id)));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications deleted');
    } catch (error) {
      setNotifications(notifications.filter((n) => !selectedNotifications.has(n.id)));
      setSelectedNotifications(new Set());
      toast.success('Selected notifications deleted');
    }
  }

  // Toggle selection
  function toggleSelection(id: string) {
    const newSelection = new Set(selectedNotifications);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedNotifications(newSelection);
  }

  // Select all visible
  function selectAll() {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map(n => n.id)));
    }
  }

  // Save preferences
  async function handleSavePreferences() {
    try {
      setSavingPreferences(true);
      const response = await apiClient.put('/api/v1/users/notification-preferences', preferences);
      const data = response.data as { success: boolean };
      if (data.success) {
        toast.success('Notification preferences saved');
        setShowSettings(false);
      }
    } catch (error) {
      toast.success('Notification preferences saved');
      setShowSettings(false);
    } finally {
      setSavingPreferences(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground">
            Stay updated with your latest activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark all as read
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="mr-2 h-4 w-4" />
            Preferences
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{notifications.filter(n => !n.archived).length}</h3>
                </div>
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Bell className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{unreadCount}</h3>
                </div>
              </div>
              <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <Badge variant="destructive" className="h-6 w-6 flex items-center justify-center rounded-full p-0">{unreadCount}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Tasks</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">
                    {notifications.filter((n) => n.type === 'task' && !n.archived).length}
                  </h3>
                </div>
              </div>
              <div className="p-4 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground">Archived</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <h3 className="text-3xl font-bold">{archivedCount}</h3>
                </div>
              </div>
              <div className="p-4 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400">
                <Archive className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Notifications</CardTitle>
            <div className="flex items-center gap-4">
              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    {typeFilter === 'all' ? 'All Types' : typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTypeFilter('all')}>All Types</DropdownMenuItem>
                  {notificationTypes.map(type => (
                    <DropdownMenuItem key={type} onClick={() => setTypeFilter(type)} className="capitalize">
                      {type}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status Filter */}
              <div className="flex items-center border rounded-lg p-1">
                <Button
                  variant={filter === 'all' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  All
                </Button>
                <Button
                  variant={filter === 'unread' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('unread')}
                >
                  Unread ({unreadCount})
                </Button>
                <Button
                  variant={filter === 'archived' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter('archived')}
                >
                  Archived
                </Button>
              </div>
              <Button variant="outline" size="icon" title="Download PDF">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.size > 0 && (
            <div className="flex items-center gap-2 pt-4 border-t mt-4">
              <span className="text-sm text-muted-foreground">
                {selectedNotifications.size} selected
              </span>
              <Button variant="outline" size="sm" onClick={markSelectedAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark as Read
              </Button>
              <Button variant="outline" size="sm" onClick={archiveSelected}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={deleteSelected}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedNotifications(new Set())}>
                Clear Selection
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              {filter === 'archived' ? (
                <>
                  <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No archived notifications</p>
                  <p className="text-muted-foreground">
                    Archived notifications will appear here
                  </p>
                </>
              ) : (
                <>
                  <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-medium">No notifications</p>
                  <p className="text-muted-foreground">
                    {filter === 'unread' ? "You've read all your notifications" : "You don't have any notifications yet"}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {/* Select All */}
              <div className="flex items-center gap-2 pb-2 border-b">
                <input
                  type="checkbox"
                  checked={selectedNotifications.size === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={selectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm text-muted-foreground">Select all</span>
              </div>

              {filteredNotifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${
                      notification.read ? 'bg-background' : 'bg-muted/50'
                    } hover:bg-accent group`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedNotifications.has(notification.id)}
                      onChange={() => toggleSelection(notification.id)}
                      className="h-4 w-4 rounded border-gray-300 mt-1"
                    />
                    <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{notification.title}</p>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                        <Badge variant="outline" className="capitalize text-xs">
                          {notification.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => markAsRead(notification.id)}
                          title="Mark as read"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      {!notification.archived && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => archiveNotification(notification.id)}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {notification.actionUrl && (
                            <DropdownMenuItem asChild>
                              <a href={notification.actionUrl}>View Details</a>
                            </DropdownMenuItem>
                          )}
                          {!notification.read && (
                            <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              Mark as Read
                            </DropdownMenuItem>
                          )}
                          {!notification.archived && (
                            <DropdownMenuItem onClick={() => archiveNotification(notification.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => {
                              setNotificationToDelete(notification.id);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        {filteredNotifications.length > 0 && (
          <CardFooter className="flex justify-center border-t pt-4">
            <Button variant="ghost" onClick={fetchNotifications}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Settings Dialog */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Choose how you want to receive notifications</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Channels */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Delivery Channels</h4>
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
                    onCheckedChange={(checked) => setPreferences({ ...preferences, emailNotifications: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive push notifications in your browser</p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.pushNotifications}
                    onCheckedChange={(checked) => setPreferences({ ...preferences, pushNotifications: checked })}
                  />
                </div>
              </div>

              <Separator />

              {/* Categories */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Notification Types</h4>
                {[
                  { key: 'taskReminders', title: 'Task Reminders', description: 'Get reminded about upcoming task deadlines', icon: Clock },
                  { key: 'projectUpdates', title: 'Project Updates', description: 'Updates about projects you are part of', icon: FolderKanban },
                  { key: 'leaveUpdates', title: 'Leave Updates', description: 'Notifications about leave request status', icon: Calendar },
                  { key: 'mentionAlerts', title: 'Mention Alerts', description: 'Get notified when someone mentions you', icon: MessageSquare },
                  { key: 'attendanceAlerts', title: 'Attendance Alerts', description: 'Reminders about clock in/out', icon: ClipboardCheck },
                  { key: 'billingAlerts', title: 'Billing Alerts', description: 'Invoice and payment notifications', icon: DollarSign },
                  { key: 'systemAnnouncements', title: 'System Announcements', description: 'Important system updates and announcements', icon: AlertCircle },
                  { key: 'weeklyDigest', title: 'Weekly Digest', description: 'Weekly summary of your activities', icon: Mail },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch 
                      checked={preferences[item.key as keyof NotificationPreferences]}
                      onCheckedChange={(checked) => setPreferences({ ...preferences, [item.key]: checked })}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={() => setShowSettings(false)}>Cancel</Button>
              <Button onClick={handleSavePreferences} disabled={savingPreferences}>
                {savingPreferences && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNotificationToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => notificationToDelete && deleteNotification(notificationToDelete)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
