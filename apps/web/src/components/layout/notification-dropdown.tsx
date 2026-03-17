'use client';

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Calendar, FileText, User, Briefcase, DollarSign, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  read: boolean;
  archived?: boolean;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'leave.requested':
    case 'leave.approved':
    case 'leave.rejected':
      return Calendar;
    case 'task.assigned':
    case 'task.mentioned':
    case 'task.commented':
      return FileText;
    case 'employee.onboarded':
      return User;
    case 'interview.scheduled':
    case 'interview.rescheduled':
    case 'interview.cancelled':
      return Briefcase;
    case 'billing.invoice_created':
    case 'billing.payment_received':
    case 'billing.payment_failed':
      return DollarSign;
    case 'document.expiring':
    case 'document.expired':
      return AlertCircle;
    default:
      return Bell;
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'border-l-red-500';
    case 'high':
      return 'border-l-orange-500';
    case 'normal':
      return 'border-l-blue-500';
    default:
      return 'border-l-gray-300';
  }
};

export function NotificationDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/notifications');
      const data = response.data as { success: boolean; data: Notification[] };
      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on mount and when dropdown opens
  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await apiClient.put(`/api/v1/notifications/${id}/read`);
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ));
    } catch (error) {
      // Optimistically update
      setNotifications(notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    try {
      await apiClient.put('/api/v1/notifications/read-all');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    } catch (error) {
      // Optimistically update
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
    }
  };

  // Filter out archived, separate unread and read
  const activeNotifications = notifications.filter(n => !n.archived);
  const unreadNotifications = activeNotifications.filter(n => !n.read);
  const readNotifications = activeNotifications.filter(n => n.read);
  const unreadCount = unreadNotifications.length;

  // Show max 5 unread + 5 read in dropdown
  const displayUnread = unreadNotifications.slice(0, 5);
  const displayRead = readNotifications.slice(0, 5);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[380px]" align="end" forceMount>
        <DropdownMenuLabel className="flex items-center justify-between py-3">
          <span className="text-base font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-xs"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {loading && notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Clock className="h-4 w-4 mr-2 animate-spin" />
              Loading...
            </div>
          ) : activeNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <>
              {/* Unread Notifications */}
              {displayUnread.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    UNREAD ({unreadCount})
                  </div>
                  {displayUnread.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        asChild
                        className={cn(
                          "flex items-start gap-3 p-3 cursor-pointer border-l-4",
                          getPriorityColor(notification.priority),
                          "bg-blue-50/50 dark:bg-blue-950/20"
                        )}
                      >
                        <Link href={notification.actionUrl || '/notifications'} className="flex-1">
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 flex-shrink-0"
                              onClick={(e) => markAsRead(notification.id, e)}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}

              {/* Read Notifications */}
              {displayRead.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50">
                    EARLIER
                  </div>
                  {displayRead.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <DropdownMenuItem
                        key={notification.id}
                        asChild
                        className="flex items-start gap-3 p-3 cursor-pointer opacity-70 hover:opacity-100"
                      >
                        <Link href={notification.actionUrl || '/notifications'} className="flex-1">
                          <div className="flex items-start gap-3 w-full">
                            <div className="flex-shrink-0">
                              <p className="text-[10px] text-muted-foreground w-12 text-right">
                                {format(new Date(notification.createdAt), 'MMM d')}
                                <br />
                                {format(new Date(notification.createdAt), 'HH:mm')}
                              </p>
                            </div>
                            <div className="flex-shrink-0 mt-0.5">
                              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-1">{notification.title}</p>
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {notification.message}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </>
              )}
            </>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />
        <div className="p-2">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/notifications">
              View All Notifications
            </Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
