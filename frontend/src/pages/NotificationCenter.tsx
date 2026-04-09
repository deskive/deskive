import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { notificationsApi, type Notification } from '@/lib/api/notifications-api';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';

export function NotificationCenter() {
  const intl = useIntl();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClearingRead, setIsClearingRead] = useState(false);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadNotifications = async (reset = false) => {
    try {
      setIsLoading(true);
      const currentPage = reset ? 1 : page;

      const params: any = {
        page: currentPage,
        limit: 20,
        is_archived: false,
      };

      if (filter === 'unread') params.is_read = false;
      if (filter === 'read') params.is_read = true;

      const response = await notificationsApi.getNotifications(params);

      if (reset) {
        setNotifications(response.data || []);
      } else {
        setNotifications(prev => [...prev, ...(response.data || [])]);
      }

      setHasMore(response.data?.length === 20);
      if (!reset) setPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadNotifications(true);
  }, [filter]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      try {
        await notificationsApi.markAsRead(notification.id);
        setNotifications(prev =>
          prev.map(n => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    }

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAllRead(true);
      await notificationsApi.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const handleClearRead = async () => {
    try {
      setIsClearingRead(true);
      await notificationsApi.clearAllRead();
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (error) {
      console.error('Failed to clear read notifications:', error);
    } finally {
      setIsClearingRead(false);
    }
  };

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{intl.formatMessage({ id: 'notifications.title' })}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleMarkAllAsRead} disabled={isMarkingAllRead}>
            {isMarkingAllRead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {intl.formatMessage({ id: 'notifications.markAllRead' })}
          </Button>
          <Button variant="outline" onClick={handleClearRead} disabled={isClearingRead}>
            {isClearingRead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {intl.formatMessage({ id: 'notifications.clearRead' })}
          </Button>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="all">{intl.formatMessage({ id: 'notifications.tabs.all' })}</TabsTrigger>
          <TabsTrigger value="unread">{intl.formatMessage({ id: 'notifications.tabs.unread' })}</TabsTrigger>
          <TabsTrigger value="read">{intl.formatMessage({ id: 'notifications.tabs.read' })}</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          <div className="border rounded-lg">
            {isLoading && notifications.length === 0 ? (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Bell className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">{intl.formatMessage({ id: 'notifications.empty.title' })}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {intl.formatMessage({ id: 'notifications.empty.message' })}
                </p>
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {notifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => handleNotificationClick(notification)}
                    />
                  ))}
                </div>
                {hasMore && (
                  <div className="p-4 text-center border-t">
                    <Button
                      variant="ghost"
                      onClick={() => loadNotifications()}
                      disabled={isLoading}
                    >
                      {isLoading ? intl.formatMessage({ id: 'notifications.loading' }) : intl.formatMessage({ id: 'notifications.loadMore' })}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
