'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

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

interface UseWebSocketOptions {
  userId?: string;
  tenantId?: string;
  tenantSlug?: string;
  token?: string;
  autoConnect?: boolean;
  showToasts?: boolean;
  onNotification?: (notification: Notification) => void;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

interface UseWebSocketReturn {
  isConnected: boolean;
  notifications: Notification[];
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
  clearNotifications: () => void;
}

const WS_URL = process.env.NEXT_PUBLIC_NOTIFICATION_WS_URL || 'http://localhost:3007';

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    userId,
    tenantId,
    tenantSlug,
    token,
    autoConnect = true,
    showToasts = true,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;
    if (!userId || !tenantId) {
      console.warn('WebSocket: Missing userId or tenantId');
      return;
    }

    const socket = io(WS_URL, {
      path: '/ws',
      auth: {
        token,
        userId,
        tenantId,
        tenantSlug,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      onError?.(error);
    });

    socket.on('notification', (notification: Notification) => {
      console.log('Received notification:', notification);
      
      // Add to local state
      setNotifications((prev) => [notification, ...prev]);

      // Show toast based on priority
      if (showToasts) {
        const toastOptions: any = {
          description: notification.message,
          action: notification.actionUrl
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = notification.actionUrl!;
                },
              }
            : undefined,
        };

        switch (notification.priority) {
          case 'urgent':
            toast.error(notification.title, toastOptions);
            break;
          case 'high':
            toast.warning(notification.title, toastOptions);
            break;
          default:
            toast.info(notification.title, toastOptions);
        }
      }

      // Call custom handler
      onNotification?.(notification);
    });

    socket.on('notification_read', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    });

    socket.on('all_notifications_read', () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    });

    socket.on('server_shutdown', () => {
      toast.warning('Server is restarting', {
        description: 'You may experience a brief disconnection',
      });
    });

    socketRef.current = socket;
  }, [userId, tenantId, tenantSlug, token, showToasts, onNotification, onConnect, onDisconnect, onError]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const markAsRead = useCallback((notificationId: string) => {
    socketRef.current?.emit('mark_read', { notificationId });
  }, []);

  const markAllAsRead = useCallback(() => {
    socketRef.current?.emit('mark_all_read');
  }, []);

  const subscribeToChannel = useCallback((channel: string) => {
    socketRef.current?.emit('subscribe', channel);
  }, []);

  const unsubscribeFromChannel = useCallback((channel: string) => {
    socketRef.current?.emit('unsubscribe', channel);
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && userId && tenantId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, userId, tenantId, connect, disconnect]);

  return {
    isConnected,
    notifications,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    subscribeToChannel,
    unsubscribeFromChannel,
    clearNotifications,
  };
}
