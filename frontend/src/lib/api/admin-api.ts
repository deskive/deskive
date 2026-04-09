// src/lib/api/admin-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  avatar?: string;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
  organizations?: any[];
}

export interface AdminStats {
  totalUsers: number;
  totalWorkspaces: number;
  activeUsers: number;
  storageUsed: number;
}

export interface AdminAnalytics {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  workspaces: {
    total: number;
    active: number;
  };
  storage: {
    used: number;
    total: number;
  };
  activity: {
    daily: number[];
    weekly: number[];
    monthly: number[];
  };
  overview?: any;
  systemHealth?: any;
  topOrganizations?: any[];
}

export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  timestamp: string;
  metadata?: any;
  user?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogFilters {
  userId?: string;
  action?: string;
  resource?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  plan: string;
  membersCount: number;
  storageUsed: number;
  createdAt: string;
  updatedAt?: string;
  metrics?: any;
  settings?: any;
  website?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string;
  industry?: string;
  size?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  author?: any;
  categoryId: string;
  tags: string[];
  status: 'draft' | 'published' | 'archived' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  featuredImage?: string;
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  categories?: Array<{ id: string; name: string }>;
}

export interface CreateBlogPostData {
  title: string;
  slug?: string;
  content: string;
  excerpt?: string;
  categoryId?: string;
  tags?: string[];
  status: 'draft' | 'published' | 'archived' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  publishedAt?: string;
  scheduledAt?: string;
  featuredImage?: string;
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  categories?: any[];
}

export interface UpdateBlogPostData {
  title?: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  categoryId?: string;
  tags?: string[];
  status?: 'draft' | 'published' | 'archived' | 'DRAFT' | 'PUBLISHED' | 'SCHEDULED' | 'ARCHIVED';
  publishedAt?: string;
  scheduledAt?: string;
  featuredImage?: string;
  seoMeta?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };
  categories?: any[];
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postsCount: number;
}

export interface BlogTag {
  id: string;
  name: string;
  slug: string;
  postsCount: number;
}

export interface SystemConfig {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  updatedAt: string;
  // Nested configuration sections
  general?: {
    siteName?: string;
    siteDescription?: string;
    supportEmail?: string;
    adminEmail?: string;
    timezone?: string;
    dateFormat?: string;
    [key: string]: any;
  };
  features?: {
    enableChat?: boolean;
    enableProjects?: boolean;
    enableFiles?: boolean;
    enableCalendar?: boolean;
    enableNotes?: boolean;
    enableAI?: boolean;
    [key: string]: any;
  };
  security?: {
    requireEmailVerification?: boolean;
    enable2FA?: boolean;
    passwordMinLength?: number;
    sessionTimeout?: number;
    [key: string]: any;
  };
  email?: {
    smtpHost?: string;
    smtpPort?: number;
    smtpUser?: string;
    smtpPassword?: string;
    fromEmail?: string;
    fromName?: string;
    [key: string]: any;
  };
  storage?: {
    provider?: string;
    maxFileSize?: number;
    allowedFileTypes?: string[];
    [key: string]: any;
  };
  [key: string]: any;
}

// Query Keys
export const adminKeys = {
  all: ['admin'] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
  auditLogs: () => [...adminKeys.all, 'auditLogs'] as const,
};

// API Functions
export const adminApi = {
  async getUsers(filters?: any): Promise<PaginatedResponse<UserProfile>> {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return api.get<PaginatedResponse<UserProfile>>(`/admin/users${queryString}`);
  },

  async getUser(id: string): Promise<AdminUser> {
    return api.get<AdminUser>(`/admin/users/${id}`);
  },

  async updateUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    return api.patch<AdminUser>(`/admin/users/${id}`, data);
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/admin/users/${id}`);
  },

  async getStats(): Promise<AdminStats> {
    return api.get<AdminStats>('/admin/stats');
  },

  async getAuditLogs(filters?: AuditLogFilters): Promise<PaginatedResponse<AuditLog>> {
    const queryString = filters ? `?${new URLSearchParams(filters as any).toString()}` : '';
    return api.get<PaginatedResponse<AuditLog>>(`/admin/audit-logs${queryString}`);
  },

  async getSystemConfig(): Promise<SystemConfig> {
    return api.get<SystemConfig>('/admin/system-config');
  },

  async updateSystemConfig(config: Partial<SystemConfig>): Promise<SystemConfig> {
    return api.patch<SystemConfig>('/admin/system-config', config);
  },

  async getDashboardAnalytics(): Promise<AdminAnalytics> {
    return api.get<AdminAnalytics>('/admin/analytics');
  },

  async uploadFile(file: File): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/admin/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  async getOrganizations(filters?: any): Promise<PaginatedResponse<Organization>> {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return api.get<PaginatedResponse<Organization>>(`/admin/organizations${queryString}`);
  },

  async deleteOrganization(id: string): Promise<void> {
    await api.delete(`/admin/organizations/${id}`);
  },

  async exportOrganizations(format: 'csv' | 'json' | 'xlsx'): Promise<Blob> {
    return api.get(`/admin/organizations/export?format=${format}`, {
      headers: { Accept: 'application/octet-stream' }
    }) as any;
  },

  async getBlogPosts(filters?: any): Promise<PaginatedResponse<BlogPost>> {
    const queryString = filters ? `?${new URLSearchParams(filters).toString()}` : '';
    return api.get<PaginatedResponse<BlogPost>>(`/admin/blog/posts${queryString}`);
  },

  async createBlogPost(data: CreateBlogPostData): Promise<BlogPost> {
    return api.post<BlogPost>('/admin/blog/posts', data);
  },

  async updateBlogPost(id: string, data: UpdateBlogPostData): Promise<BlogPost> {
    return api.patch<BlogPost>(`/admin/blog/posts/${id}`, data);
  },

  async deleteBlogPost(id: string): Promise<void> {
    await api.delete(`/admin/blog/posts/${id}`);
  },

  async getBlogPost(id: string): Promise<BlogPost> {
    return api.get<BlogPost>(`/admin/blog/posts/${id}`);
  },

  async getBlogCategories(): Promise<BlogCategory[]> {
    return api.get<BlogCategory[]>('/admin/blog/categories');
  },

  async getBlogTags(): Promise<BlogTag[]> {
    return api.get<BlogTag[]>('/admin/blog/tags');
  },

  async createBlogTag(name: string): Promise<BlogTag> {
    return api.post<BlogTag>('/admin/blog/tags', { name });
  },

  async exportUsers(format: 'csv' | 'json' | 'xlsx'): Promise<Blob> {
    return api.get(`/admin/users/export?format=${format}`, {
      headers: { Accept: 'application/octet-stream' }
    }) as any;
  },
};

// React Query Hooks
export const useAdminUsers = () => {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: adminApi.getUsers,
  });
};

export const useAdminUser = (id: string) => {
  return useQuery({
    queryKey: adminKeys.user(id),
    queryFn: () => adminApi.getUser(id),
    enabled: !!id,
  });
};

export const useUpdateAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) =>
      adminApi.updateUser(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: adminKeys.user(id) });
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
};

export const useDeleteAdminUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
    },
  });
};

export const useAdminStats = () => {
  return useQuery({
    queryKey: adminKeys.stats(),
    queryFn: adminApi.getStats,
  });
};

export const useAuditLogs = (filters?: AuditLogFilters) => {
  return useQuery({
    queryKey: [...adminKeys.auditLogs(), filters],
    queryFn: () => adminApi.getAuditLogs(filters),
  });
};

// Backward compatibility: export as adminService
export const adminService = adminApi;
