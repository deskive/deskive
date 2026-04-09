import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { notificationsApi, type Notification } from '@/lib/api/notifications-api';
import { NotificationItem } from './NotificationItem';
import { useNavigate, useParams } from 'react-router-dom';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { toast } from 'sonner';

// Helper to strip HTML tags and decode entities for plain text display
const stripHtml = (html: string): string => {
  if (!html) return '';
  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

export function NotificationBell() {
  const intl = useIntl();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { socket } = useWebSocket();

  // Load notifications
  const loadNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await notificationsApi.getNotifications({
        limit: 10,
        is_archived: false,
      });
      setNotifications(response.data || []);
      setUnreadCount(response.unread_count || 0);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load unread count
  const loadUnreadCount = async () => {
    try {
      const response = await notificationsApi.getUnreadCount();
      setUnreadCount(response.count || 0);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setUnreadCount(prev => Math.max(0, prev - 1));
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    // Navigate to action URL
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Request desktop notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Show desktop notification
  const showDesktopNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Strip HTML from message for plain text display
      const plainTextMessage = stripHtml(notification.message || '');
      const notif = new Notification(notification.title, {
        body: plainTextMessage,
        icon: 'https://cdn.deskive.com/deskive/logo.png',
        badge: 'https://cdn.deskive.com/deskive/logo.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent' || notification.priority === 'high',
        silent: !notification.soundEnabled, // Control sound based on user preference
      });

      notif.onclick = () => {
        window.focus();
        if (notification.action_url) {
          navigate(notification.action_url);
        }
        notif.close();
      };
    }
  }, [navigate]);

  // Real-time notification listener
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data: any) => {
      console.log('New notification received:', data);

      // Extract notification from the event data
      const notification = data.data || data;

      // Check if this is an actual new notification (not a read/delete update)
      // Read updates come through 'notification_read' event, not here
      if (!notification || !notification.title) {
        console.log('Skipping invalid notification data:', notification);
        return;
      }

      // Update state - always add to notification list
      setNotifications(prev => [notification, ...prev.slice(0, 9)]);
      setUnreadCount(prev => prev + 1);

      // Always show toast notification (sooner - top-right corner)
      // Strip HTML from message for plain text display
      const plainTextMessage = stripHtml(notification.message || '');
      toast(notification.title, {
        description: plainTextMessage,
        duration: 5000,
        action: notification.action_url ? {
          label: 'View',
          onClick: () => navigate(notification.action_url),
        } : undefined,
      });

      // Only show desktop (browser) notification if push is enabled
      // Backend sends shouldShowBrowserNotification based on user's push setting
      if (notification.shouldShowBrowserNotification !== false) {
        console.log('✅ Showing browser notification (push enabled)');
        showDesktopNotification(notification);
      } else {
        console.log('⏭️ Skipping browser notification (push disabled)');
      }
    };

    const handleNotificationRead = (data: { notification_id: string }) => {
      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notification_id ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    socket.on('notification:event', handleNewNotification);
    socket.on('notification_read', handleNotificationRead);

    return () => {
      socket.off('notification:event', handleNewNotification);
      socket.off('notification_read', handleNotificationRead);
    };
  }, [socket, navigate]);

  // Load notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Load unread count on mount
  useEffect(() => {
    loadUnreadCount();
  }, []);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[400px] p-0">
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="font-semibold">{intl.formatMessage({ id: 'notifications.title' })}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
            >
              {intl.formatMessage({ id: 'notifications.markAllAsRead' })}
            </Button>
          )}
        </div>
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'notifications.noNotifications' })}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              navigate(`/workspaces/${workspaceId}/notifications`);
              setIsOpen(false);
            }}
          >
            {intl.formatMessage({ id: 'notifications.viewAll' })}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
