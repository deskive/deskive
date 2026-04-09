// src/lib/api/settings-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationSettings;
}

export interface NotificationCategory {
  id: string;
  label: string;
  description: string;
  settings: {
    email: boolean;
    push: boolean;
    inApp: boolean;
  };
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  desktop: boolean;
  mentions: boolean;
  directMessages: boolean;
  channelMessages: boolean;
  tasks: boolean;
  calendar: boolean;
  marketing: boolean;
  categories: NotificationCategory[];
  generalSettings?: {
    doNotDisturb: boolean;
    quietHours: {
      enabled: boolean;
      startTime: string;
      endTime: string;
    };
    frequency: 'immediate' | 'digest' | 'daily' | 'weekly';
    sound: boolean;
  };
}

export interface SecuritySettings {
  twoFactor?: {
    enabled: boolean;
    backupCodes: string[];
    lastEnabledAt?: string;
  };
  preferences?: {
    requirePasswordForSensitiveActions: boolean;
    logoutInactiveDevices: boolean;
    emailSecurityAlerts: boolean;
  };
  sessions?: Session[];
  loginHistory?: LoginHistoryEntry[];
}

export interface Session {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  lastActive: string;
  isCurrent: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  device: string;
  browser: string;
  location: string;
  ipAddress: string;
  timestamp: string;
  success: boolean;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface TwoFactorEnableResponse {
  qrCode: string;
  secret: string;
  backupCodes: string[];
}

export interface WorkspaceSettings {
  name: string;
  description?: string;
  logo?: string;
  subdomain?: string;
  allowedDomains?: string[];
  defaultRole: 'admin' | 'member' | 'guest';
  features: {
    chat: boolean;
    projects: boolean;
    files: boolean;
    calendar: boolean;
    notes: boolean;
    video: boolean;
    ai: boolean;
  };
}

export interface BillingSettings {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'past_due' | 'cancelled';
  nextBillingDate?: string;
  paymentMethod?: {
    type: 'card' | 'bank';
    last4: string;
    expiryMonth?: number;
    expiryYear?: number;
  };
  usage: {
    storage: number;
    users: number;
    apiCalls: number;
  };
  limits: {
    storage: number;
    users: number;
    apiCalls: number;
  };
}

// Tab Arrangement Types
export interface TabArrangement {
  bottomNavTabIds: string[];
  moreMenuTabIds: string[];
  lastModified: string | null;
}

export interface UpdateTabArrangementDto {
  bottomNavTabIds: string[];
  moreMenuTabIds: string[];
}

// Query Keys
export const settingsKeys = {
  all: ['settings'] as const,
  user: () => [...settingsKeys.all, 'user'] as const,
  security: () => [...settingsKeys.all, 'security'] as const,
  notifications: () => [...settingsKeys.all, 'notifications'] as const,
  tabArrangement: () => [...settingsKeys.all, 'tabArrangement'] as const,
  workspace: (workspaceId: string) => [...settingsKeys.all, 'workspace', workspaceId] as const,
  billing: (workspaceId: string) => [...settingsKeys.all, 'billing', workspaceId] as const,
  sessions: () => [...settingsKeys.all, 'sessions'] as const,
  loginHistory: () => [...settingsKeys.all, 'loginHistory'] as const,
};

// API Functions
export const settingsApi = {
  // User Settings
  async getUserSettings(): Promise<UserSettings> {
    return api.get<UserSettings>('/settings/user');
  },

  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return api.patch<UserSettings>('/settings/user', settings);
  },

  // Profile Management
  async updateProfile(data: {
    name: string;
    email: string;
    website?: string;
    bio?: string;
    phone?: string;
    countryCode?: string;
    location?: string;
    timezone?: string;
    language?: string;
    avatarUrl?: string;
  }): Promise<{ message: string; user: unknown }> {
    return api.put<{ message: string; user: unknown }>('/auth/profile', data);
  },

  async uploadAvatar(file: File): Promise<{ user: { avatarUrl: string } }> {
    const formData = new FormData();
    formData.append('avatar', file); // Field name 'avatar' matches backend

    // Don't set Content-Type manually - let browser set it with boundary
    return api.post<{ user: { avatarUrl: string } }>('/auth/profile/image', formData);
  },

  // Security Settings
  async getSecuritySettings(): Promise<SecuritySettings> {
    // Return default security settings - no backend endpoint needed for now
    return Promise.resolve({
      twoFactor: {
        enabled: false,
        backupCodes: []
      },
      preferences: {
        requirePasswordForSensitiveActions: true,
        logoutInactiveDevices: false,
        emailSecurityAlerts: true
      },
      sessions: []
    });
  },

  async changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
    // Use the existing auth password/change endpoint
    return api.post<{ message: string }>('/auth/password/change', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
  },

  async enableTwoFactor(): Promise<TwoFactorEnableResponse> {
    // TODO: Implement 2FA with deskive SDK
    throw new Error('Two-factor authentication is not yet implemented');
  },

  async disableTwoFactor(): Promise<{ message: string }> {
    // TODO: Implement 2FA with deskive SDK
    throw new Error('Two-factor authentication is not yet implemented');
  },

  async verifyTwoFactor(code: string): Promise<{ message: string }> {
    // TODO: Implement 2FA with deskive SDK
    throw new Error('Two-factor authentication is not yet implemented');
  },

  async regenerateBackupCodes(): Promise<{ backupCodes: string[] }> {
    // TODO: Implement 2FA with deskive SDK
    throw new Error('Two-factor authentication is not yet implemented');
  },

  async updateSecurityPreferences(preferences: SecuritySettings['preferences']): Promise<SecuritySettings> {
    // TODO: Store preferences in user metadata
    console.log('Security preferences update:', preferences);
    return Promise.resolve({
      twoFactor: { enabled: false, backupCodes: [] },
      preferences,
      sessions: []
    });
  },

  // Session Management
  async getSessions(): Promise<Session[]> {
    return api.get<Session[]>('/settings/security/sessions');
  },

  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/settings/security/sessions/${sessionId}`);
  },

  async revokeAllSessions(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/settings/security/sessions/revoke-all', null);
  },

  async getLoginHistory(limit = 50): Promise<LoginHistoryEntry[]> {
    return api.get<LoginHistoryEntry[]>(`/settings/security/login-history?limit=${limit}`);
  },

  // Notification Settings
  async getNotificationSettings(): Promise<NotificationSettings> {
    return api.get<NotificationSettings>('/settings/notifications');
  },

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return api.patch<NotificationSettings>('/settings/notifications', settings);
  },

  // Workspace Settings
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    return api.get<WorkspaceSettings>(`/workspaces/${workspaceId}/settings`);
  },

  async updateWorkspaceSettings(workspaceId: string, settings: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
    return api.patch<WorkspaceSettings>(`/workspaces/${workspaceId}/settings`, settings);
  },

  async deleteWorkspace(workspaceId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/workspaces/${workspaceId}`);
  },

  // Billing Settings
  async getBillingSettings(workspaceId: string): Promise<BillingSettings> {
    return api.get<BillingSettings>(`/workspaces/${workspaceId}/billing`);
  },

  async updatePaymentMethod(workspaceId: string, paymentMethodId: string): Promise<BillingSettings> {
    return api.post<BillingSettings>(`/workspaces/${workspaceId}/billing/payment-method`, { paymentMethodId });
  },

  async upgradePlan(workspaceId: string, plan: 'pro' | 'enterprise'): Promise<BillingSettings> {
    return api.post<BillingSettings>(`/workspaces/${workspaceId}/billing/upgrade`, { plan });
  },

  async cancelSubscription(workspaceId: string): Promise<BillingSettings> {
    return api.post<BillingSettings>(`/workspaces/${workspaceId}/billing/cancel`, null);
  },

  async getInvoices(workspaceId: string): Promise<any[]> {
    return api.get<any[]>(`/workspaces/${workspaceId}/billing/invoices`);
  },

  // Account Deletion
  async deleteAccount(password: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>('/auth/account', {
      body: JSON.stringify({ password })
    });
  },

  // Tab Arrangement
  async getTabArrangement(): Promise<TabArrangement> {
    return api.get<TabArrangement>('/settings/tab-arrangement');
  },

  async updateTabArrangement(dto: UpdateTabArrangementDto): Promise<TabArrangement> {
    return api.put<TabArrangement>('/settings/tab-arrangement', dto);
  },
};

// React Query Hooks

// User Settings
export const useUserSettings = () => {
  return useQuery({
    queryKey: settingsKeys.user(),
    queryFn: settingsApi.getUserSettings,
  });
};

export const useUpdateUserSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.user() });
    },
  });
};

// Security Settings
export const useSecuritySettings = () => {
  return useQuery({
    queryKey: settingsKeys.security(),
    queryFn: settingsApi.getSecuritySettings,
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: settingsApi.changePassword,
  });
};

export const useEnableTwoFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.enableTwoFactor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security() });
    },
  });
};

export const useDisableTwoFactor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.disableTwoFactor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security() });
    },
  });
};

export const useUpdateSecurityPreferences = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateSecurityPreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.security() });
    },
  });
};

// Sessions
export const useSessions = () => {
  return useQuery({
    queryKey: settingsKeys.sessions(),
    queryFn: settingsApi.getSessions,
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.sessions() });
    },
  });
};

export const useLoginHistory = (limit = 50) => {
  return useQuery({
    queryKey: [...settingsKeys.loginHistory(), limit],
    queryFn: () => settingsApi.getLoginHistory(limit),
  });
};

// Notification Settings
export const useNotificationSettings = () => {
  return useQuery({
    queryKey: settingsKeys.notifications(),
    queryFn: settingsApi.getNotificationSettings,
  });
};

export const useUpdateNotificationSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.notifications() });
    },
  });
};

// Workspace Settings
export const useWorkspaceSettings = (workspaceId: string) => {
  return useQuery({
    queryKey: settingsKeys.workspace(workspaceId),
    queryFn: () => settingsApi.getWorkspaceSettings(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useUpdateWorkspaceSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, settings }: { workspaceId: string; settings: Partial<WorkspaceSettings> }) =>
      settingsApi.updateWorkspaceSettings(workspaceId, settings),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.workspace(workspaceId) });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
};

// Billing Settings
export const useBillingSettings = (workspaceId: string) => {
  return useQuery({
    queryKey: settingsKeys.billing(workspaceId),
    queryFn: () => settingsApi.getBillingSettings(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useUpdatePaymentMethod = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, paymentMethodId }: { workspaceId: string; paymentMethodId: string }) =>
      settingsApi.updatePaymentMethod(workspaceId, paymentMethodId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.billing(workspaceId) });
    },
  });
};

export const useUpgradePlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, plan }: { workspaceId: string; plan: 'pro' | 'enterprise' }) =>
      settingsApi.upgradePlan(workspaceId, plan),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.billing(workspaceId) });
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.cancelSubscription,
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.billing(workspaceId) });
    },
  });
};

// Tab Arrangement
export const useTabArrangement = () => {
  return useQuery({
    queryKey: settingsKeys.tabArrangement(),
    queryFn: settingsApi.getTabArrangement,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};

export const useUpdateTabArrangement = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: settingsApi.updateTabArrangement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.tabArrangement() });
    },
  });
};

// Backward compatibility: export as settingsService
export const settingsService = settingsApi;
