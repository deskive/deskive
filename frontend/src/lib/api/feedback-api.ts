// src/lib/api/feedback-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export type FeedbackType = 'bug' | 'issue' | 'improvement' | 'feature_request';
export type FeedbackStatus = 'pending' | 'in_review' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackCategory = 'ui' | 'performance' | 'feature' | 'security' | 'other';

export interface FeedbackAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface DeviceInfo {
  platform?: string;
  osVersion?: string;
  deviceModel?: string;
  screenResolution?: string;
}

export interface Feedback {
  id: string;
  userId: string;
  type: FeedbackType;
  title: string;
  description: string;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  category?: FeedbackCategory;
  attachments: FeedbackAttachment[];
  appVersion?: string;
  deviceInfo: DeviceInfo;
  resolutionNotes?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  notifiedAt?: string;
  assignedTo?: string;
  duplicateOfId?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface FeedbackResponse {
  id: string;
  feedbackId: string;
  userId: string;
  content: string;
  isInternal: boolean;
  statusChange?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface FeedbackFilters {
  type?: FeedbackType;
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  category?: FeedbackCategory;
  userId?: string;
  assignedTo?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedFeedback {
  data: Feedback[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UpdateFeedbackData {
  status?: FeedbackStatus;
  priority?: FeedbackPriority;
  assignedTo?: string;
  duplicateOfId?: string;
}

export interface ResolveFeedbackData {
  resolutionNotes?: string;
  notifyUser?: boolean;
}

export interface CreateFeedbackResponseData {
  content: string;
  isInternal?: boolean;
  statusChange?: FeedbackStatus;
}

export interface CreateFeedbackDto {
  type: FeedbackType;
  title: string;
  description: string;
  category?: FeedbackCategory;
  attachments?: FeedbackAttachment[];
  appVersion?: string;
  deviceInfo?: DeviceInfo;
}

// API Functions
export const feedbackApi = {
  // User endpoints
  async createFeedback(data: CreateFeedbackDto): Promise<Feedback> {
    const response = await api.post<{ data: Feedback; message: string }>('/feedback', data);
    return response.data;
  },

  async getUserFeedback(filters?: Partial<FeedbackFilters>): Promise<PaginatedFeedback> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    const response = await api.get<{ data: PaginatedFeedback; message: string }>(
      `/feedback/my${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  async uploadAttachment(file: File): Promise<FeedbackAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<{ data: FeedbackAttachment; message: string }>(
      '/feedback/upload',
      formData
    );
    return response.data;
  },

  // Get all feedback (admin)
  async getAllFeedback(filters?: FeedbackFilters): Promise<PaginatedFeedback> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    const queryString = params.toString();
    const response = await api.get<{ data: PaginatedFeedback; message: string }>(
      `/feedback/admin/list${queryString ? `?${queryString}` : ''}`
    );
    return response.data;
  },

  // Get single feedback
  async getFeedback(id: string): Promise<Feedback> {
    const response = await api.get<{ data: Feedback; message: string }>(`/feedback/${id}`);
    return response.data;
  },

  // Update feedback (status, priority, assignee)
  async updateFeedback(id: string, data: UpdateFeedbackData): Promise<Feedback> {
    const response = await api.patch<{ data: Feedback; message: string }>(`/feedback/${id}`, data);
    return response.data;
  },

  // Resolve feedback
  async resolveFeedback(id: string, data: ResolveFeedbackData): Promise<Feedback> {
    const response = await api.patch<{ data: Feedback; message: string }>(`/feedback/${id}/resolve`, data);
    return response.data;
  },

  // Get feedback responses
  async getResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    const response = await api.get<{ data: FeedbackResponse[]; message: string }>(
      `/feedback/admin/${feedbackId}/responses`
    );
    return response.data;
  },

  // Add response to feedback
  async addResponse(feedbackId: string, data: CreateFeedbackResponseData): Promise<FeedbackResponse> {
    const response = await api.post<{ data: FeedbackResponse; message: string }>(
      `/feedback/${feedbackId}/response`,
      data
    );
    return response.data;
  },

  // Get feedback stats for dashboard
  async getStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    byType: Record<FeedbackType, number>;
    byPriority: Record<FeedbackPriority, number>;
  }> {
    const response = await api.get<{ data: any; message: string }>('/feedback/admin/stats');
    return response.data;
  },
};

// React Query Hooks

// User hooks
export function useUserFeedback(filters?: Partial<FeedbackFilters>) {
  return useQuery({
    queryKey: ['user-feedback', filters],
    queryFn: () => feedbackApi.getUserFeedback(filters),
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: feedbackApi.createFeedback,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-feedback'] });
    },
  });
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: feedbackApi.uploadAttachment,
  });
}

// Admin hooks
export function useFeedbackList(filters?: FeedbackFilters) {
  return useQuery({
    queryKey: ['admin-feedback', filters],
    queryFn: () => feedbackApi.getAllFeedback(filters),
  });
}

export function useFeedback(id: string) {
  return useQuery({
    queryKey: ['admin-feedback', id],
    queryFn: () => feedbackApi.getFeedback(id),
    enabled: !!id,
  });
}

export function useFeedbackResponses(feedbackId: string) {
  return useQuery({
    queryKey: ['admin-feedback-responses', feedbackId],
    queryFn: () => feedbackApi.getResponses(feedbackId),
    enabled: !!feedbackId,
  });
}

export function useUpdateFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateFeedbackData }) =>
      feedbackApi.updateFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
    },
  });
}

export function useResolveFeedback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveFeedbackData }) =>
      feedbackApi.resolveFeedback(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
    },
  });
}

export function useAddFeedbackResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ feedbackId, data }: { feedbackId: string; data: CreateFeedbackResponseData }) =>
      feedbackApi.addResponse(feedbackId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-feedback-responses', variables.feedbackId] });
      queryClient.invalidateQueries({ queryKey: ['admin-feedback'] });
    },
  });
}

export default feedbackApi;
