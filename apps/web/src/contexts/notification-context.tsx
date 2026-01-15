'use client';

import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';
import { useAuth } from '@/lib/auth/auth-context';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  actionUrl?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  read?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isConnected: boolean;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const {
    isConnected,
    notifications,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    subscribeToChannel,
    unsubscribeFromChannel,
  } = useWebSocket({
    userId: user?.id,
    tenantId: user?.tenantId,
    tenantSlug: user?.tenantSlug,
    autoConnect: true,
    showToasts: true,
    onNotification: (notification) => {
      // Update unread count
      setUnreadCount((prev) => prev + 1);
      
      // Play notification sound for high priority
      if (notification.priority === 'urgent' || notification.priority === 'high') {
        playNotificationSound();
      }
    },
  });

  // Calculate unread count
  useEffect(() => {
    const count = notifications.filter((n) => !n.read).length;
    setUnreadCount(count);
  }, [notifications]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId);
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isConnected,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        clearNotifications,
        subscribeToChannel,
        unsubscribeFromChannel,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
}

// Simple notification sound
function playNotificationSound() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore autoplay errors
    });
  } catch {
    // Ignore audio errors
  }
}
