import { api } from '@/lib/fetch';

export interface Notification {
  id: string;
  user_id: string;
  workspace_id?: string;
  type: string;
  title: string;
  message?: string;
  data?: Record<string, any>;
  action_url?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  is_read: boolean;
  is_archived: boolean;
  read_at?: string;
  expires_at?: string;
  sent_via?: {
    in_app: boolean;
    email: boolean;
    push: boolean;
  };
  shouldShowBrowserNotification?: boolean; // Controls desktop notification based on push setting
  soundEnabled?: boolean; // Controls notification sound
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  id: string;
  user_id: string;
  workspace_id?: string;
  global_enabled: boolean;
  in_app_enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
  do_not_disturb: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  frequency: 'immediate' | 'digest' | 'daily' | 'weekly';
  digest_time?: string;
  categories: Record<string, { in_app: boolean; email: boolean; push: boolean }>;
  muted_workspaces: string[];
  muted_projects: string[];
  muted_channels: string[];
}

export interface NotificationQueryParams {
  page?: number;
  limit?: number;
  type?: string;
  types?: string[];
  category?: string;
  is_read?: boolean;
  is_archived?: boolean;
  priority?: string;
  start_date?: string;
  end_date?: string;
}

export interface PaginatedNotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  unread_count: number;
}

export const notificationsApi = {
  // Get paginated notifications
  getNotifications: async (params?: NotificationQueryParams): Promise<PaginatedNotificationsResponse> => {
    const queryString = params ? '?' + new URLSearchParams(params as any).toString() : '';
    return api.get<PaginatedNotificationsResponse>(`/notifications${queryString}`);
  },

  // Get unread count
  getUnreadCount: async (): Promise<{ count: number }> => {
    return api.get<{ count: number }>('/notifications/unread-count');
  },

  // Mark notification as read
  markAsRead: async (notificationId: string): Promise<Notification> => {
    return api.put<Notification>(`/notifications/${notificationId}/read`);
  },

  // Mark notification as unread
  markAsUnread: async (notificationId: string): Promise<Notification> => {
    return api.put<Notification>(`/notifications/${notificationId}/unread`);
  },

  // Mark all as read
  markAllAsRead: async (): Promise<{ updated: number }> => {
    return api.post<{ updated: number }>('/notifications/mark-all-read');
  },

  // Bulk mark as read
  bulkMarkAsRead: async (notificationIds: string[]): Promise<{ message: string; updated_count: number }> => {
    return api.post<{ message: string; updated_count: number }>('/notifications/bulk-read', { notification_ids: notificationIds });
  },

  // Delete notification
  deleteNotification: async (notificationId: string): Promise<{ message: string }> => {
    return api.delete<{ message: string }>(`/notifications/${notificationId}`);
  },

  // Clear all read notifications
  clearAllRead: async (): Promise<{ deleted: number }> => {
    return api.delete<{ deleted: number }>('/notifications/clear-all');
  },

  // Get preferences
  getPreferences: async (): Promise<NotificationPreferences> => {
    return api.get<NotificationPreferences>('/notifications/preferences');
  },

  // Update preferences
  updatePreferences: async (preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    return api.put<NotificationPreferences>('/notifications/preferences', preferences);
  },

  // Subscribe to push notifications
  subscribeToPush: async (subscription: PushSubscription): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/notifications/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
    });
  },

  // Unsubscribe from push notifications
  unsubscribeFromPush: async (endpoint: string): Promise<{ message: string }> => {
    return api.post<{ message: string }>('/notifications/unsubscribe', { endpoint });
  },
};

// Helper function to convert ArrayBuffer to Base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
