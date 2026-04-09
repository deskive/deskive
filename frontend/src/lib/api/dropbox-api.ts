// Dropbox API Client
import { api } from '@/lib/fetch';

export interface DropboxConnection {
  id: string;
  workspaceId: string;
  userId: string;
  accountId: string;
  dropboxEmail: string;
  dropboxName: string;
  dropboxPicture?: string;
  isActive: boolean;
  createdAt: string;
}

export interface DropboxFile {
  id: string;
  name: string;
  pathDisplay: string;
  size: number;
  clientModified: string;
  serverModified: string;
  contentHash: string;
  isFolder: boolean;
}

export const dropboxApi = {
  // OAuth & Connection
  async getAuthUrl(workspaceId: string, returnUrl?: string): Promise<{ authorizationUrl: string; state: string }> {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const response = await api.get<{ data: { authorizationUrl: string; state: string }; message: string }>(
      `/workspaces/${workspaceId}/dropbox/auth/url${params}`
    );
    return response.data;
  },

  async getConnection(workspaceId: string): Promise<DropboxConnection | null> {
    const response = await api.get<{ data: DropboxConnection | null; message: string }>(
      `/workspaces/${workspaceId}/dropbox/connection`
    );
    return response.data;
  },

  async disconnect(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/dropbox/disconnect`);
  },

  // File Operations
  async listFiles(workspaceId: string, path: string = '', query?: string): Promise<DropboxFile[]> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    if (query) params.append('query', query);

    const response = await api.get<{ data: { files: DropboxFile[]; hasMore: boolean }; message: string }>(
      `/workspaces/${workspaceId}/dropbox/files?${params.toString()}`
    );
    return response.data.files;
  },

  async downloadFile(workspaceId: string, path: string): Promise<Blob> {
    const response = await api.get(`/workspaces/${workspaceId}/dropbox/files/download?path=${encodeURIComponent(path)}`, {
      headers: { 'Accept': 'application/octet-stream' },
    });
    return response as any; // Return blob
  },

  async uploadFile(workspaceId: string, path: string, file: File): Promise<DropboxFile> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('path', path);

    const response = await api.post<{ data: DropboxFile; message: string }>(
      `/workspaces/${workspaceId}/dropbox/upload`,
      formData
    );
    return response.data;
  },

  async createFolder(workspaceId: string, path: string): Promise<DropboxFile> {
    const response = await api.post<{ data: DropboxFile; message: string }>(
      `/workspaces/${workspaceId}/dropbox/folders`,
      { path }
    );
    return response.data;
  },

  async deleteFile(workspaceId: string, path: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/dropbox/files?path=${encodeURIComponent(path)}`);
  },

  async shareFile(workspaceId: string, path: string): Promise<{ url: string }> {
    const response = await api.post<{ data: { url: string; expires?: string }; message: string }>(
      `/workspaces/${workspaceId}/dropbox/share`,
      { path }
    );
    return response.data;
  },

  async getStorageQuota(workspaceId: string): Promise<{ used: number; allocated: number }> {
    const response = await api.get<{ data: { used: number; allocated: number }; message: string }>(
      `/workspaces/${workspaceId}/dropbox/storage-quota`
    );
    return response.data;
  },
};

export default dropboxApi;
