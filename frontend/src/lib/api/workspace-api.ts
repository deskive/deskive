// src/lib/api/workspace-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Workspace, WorkspaceMember } from '@/types';

// Types
export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  logo?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  logo?: string;
  settings?: Record<string, any>;
}

export interface InviteMemberRequest {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

export interface UpdateMemberRoleRequest {
  role: 'admin' | 'member' | 'viewer';
  permissions?: string[];
}

// Query Keys
export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (filters: string) => [...workspaceKeys.lists(), { filters }] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
  invitations: (id: string) => [...workspaceKeys.detail(id), 'invitations'] as const,
};

// API Functions
export const workspaceApi = {
  async getWorkspaces(): Promise<Workspace[]> {
    return api.get<Workspace[]>('/workspaces');
  },

  async getWorkspace(id: string): Promise<Workspace> {
    return api.get<Workspace>(`/workspaces/${id}`);
  },

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    return api.post<Workspace>('/workspaces', data);
  },

  async updateWorkspace(id: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    return api.patch<Workspace>(`/workspaces/${id}`, data);
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/workspaces/${id}`);
  },

  async getMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return api.get<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`);
  },

  // Alias for backward compatibility
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    return this.getMembers(workspaceId);
  },

  async inviteMember(workspaceId: string, data: InviteMemberRequest): Promise<{ message: string }> {
    return api.post(`/workspaces/${workspaceId}/invite`, data);
  },

  async removeMember(workspaceId: string, memberId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  async updateMemberRole(workspaceId: string, memberId: string, data: UpdateMemberRoleRequest): Promise<WorkspaceMember> {
    return api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, data);
  },

  async acceptInvitation(token: string): Promise<Workspace> {
    return api.post<Workspace>('/workspaces/accept-invitation', { token });
  },

  async switchWorkspace(workspaceId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/switch`, null);
    // Update local storage (use the key that WorkspaceContext expects)
    localStorage.setItem('currentWorkspaceId', workspaceId);
  },

  async leaveWorkspace(workspaceId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/leave`, null);
  },

  async uploadWorkspaceLogo(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ url: string }>('/workspaces/logo/upload', formData);

    return response;
  },
};

// React Query Hooks
export const useWorkspaces = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: workspaceKeys.lists(),
    queryFn: workspaceApi.getWorkspaces,
    enabled: options?.enabled ?? true, // Can be controlled by parent
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (previously cacheTime)
    refetchOnMount: 'always', // Always fetch on mount to ensure fresh data after login
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};

export const useWorkspace = (id: string) => {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: () => workspaceApi.getWorkspace(id),
    enabled: !!id,
  });
};

export const useCreateWorkspace = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: workspaceApi.createWorkspace,
    onSuccess: (newWorkspace) => {
      // Invalidate workspaces list to refetch all workspaces
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
      // Store the new workspace ID in localStorage (use the key that WorkspaceContext expects)
      localStorage.setItem('currentWorkspaceId', newWorkspace.id);
    },
  });
};

export const useUpdateWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceRequest }) =>
      workspaceApi.updateWorkspace(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
};

export const useDeleteWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workspaceApi.deleteWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
};

export const useWorkspaceMembers = (workspaceId: string) => {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceApi.getMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
};

export const useInviteMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: InviteMemberRequest }) =>
      workspaceApi.inviteMember(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.invitations(workspaceId) });
    },
  });
};

export const useRemoveMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) =>
      workspaceApi.removeMember(workspaceId, memberId),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
  });
};

export const useUpdateMemberRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, memberId, data }: { workspaceId: string; memberId: string; data: UpdateMemberRoleRequest }) =>
      workspaceApi.updateMemberRole(workspaceId, memberId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
  });
};

export const useSwitchWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workspaceApi.switchWorkspace,
    onSuccess: () => {
      // Clear all queries and reload page
      queryClient.clear();
      window.location.reload();
    },
  });
};

export const useAcceptInvitation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workspaceApi.acceptInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
};

export const useLeaveWorkspace = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: workspaceApi.leaveWorkspace,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
  });
};

export const useUploadWorkspaceLogo = () => {
  return useMutation({
    mutationFn: workspaceApi.uploadWorkspaceLogo,
  });
};

// Backward compatibility: export as workspaceService
export const workspaceService = workspaceApi;