/**
 * Real-time Notifications Hook
 * Provides real-time notification functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { type NotificationData } from '@/lib/api/websocket-api';

export interface NotificationState {
  notifications: NotificationData[];
  unreadCount: number;
  isLoading: boolean;
}

export interface UseRealTimeNotificationsOptions {
  autoMarkAsRead?: boolean;
  maxNotifications?: number;
  showToast?: (notification: NotificationData) => void;
}

export const useRealTimeNotifications = (options: UseRealTimeNotificationsOptions = {}) => {
  const {
    autoMarkAsRead = false,
    maxNotifications = 100,
    showToast,
  } = options;

  const { 
    isConnected, 
    unreadNotifications,
    markNotificationAsRead,
    clearAllNotifications: wsClearAllNotifications,
    on,
    off,
  } = useWebSocket();

  const [notificationState, setNotificationState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
  });

  // Update state when WebSocket notifications change
  useEffect(() => {
    setNotificationState(prev => ({
      ...prev,
      notifications: unreadNotifications.slice(-maxNotifications),
      unreadCount: unreadNotifications.length,
    }));
  }, [unreadNotifications, maxNotifications]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    markNotificationAsRead(notificationId);
  }, [markNotificationAsRead]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    notificationState.notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationAsRead(notification.id);
      }
    });
  }, [notificationState.notifications, markNotificationAsRead]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    wsClearAllNotifications();
  }, [wsClearAllNotifications]);

  // Handle new notification
  useEffect(() => {
    if (!isConnected) return;

    const handleNotificationReceived = (notification: NotificationData) => {
      // Show toast if provided
      if (showToast && !notification.read) {
        showToast(notification);
      }

      // Auto mark as read if enabled
      if (autoMarkAsRead) {
        setTimeout(() => {
          markNotificationAsRead(notification.id);
        }, 3000); // Mark as read after 3 seconds
      }
    };

    on('notification_received', handleNotificationReceived);

    return () => {
      off('notification_received', handleNotificationReceived);
    };
  }, [isConnected, showToast, autoMarkAsRead, markNotificationAsRead, on, off]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback((notification: NotificationData) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico', // Adjust path as needed
        tag: notification.id,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

      // Handle notification click
      browserNotification.onclick = () => {
        window.focus();
        markAsRead(notification.id);
        browserNotification.close();
      };
    }
  }, [markAsRead]);

  // Filter notifications by type
  const getNotificationsByType = useCallback((type: NotificationData['type']) => {
    return notificationState.notifications.filter(notification => notification.type === type);
  }, [notificationState.notifications]);

  // Get recent notifications (limited to maxNotifications)
  const getRecentNotifications = useCallback(() => {
    return notificationState.notifications.slice(-20); // Get last 20 notifications
  }, [notificationState.notifications]);

  return {
    ...notificationState,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    requestPermission,
    showBrowserNotification,
    getNotificationsByType,
    getRecentNotifications,
    isConnected,
  };
};