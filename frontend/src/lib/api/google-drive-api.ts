// src/lib/api/google-drive-api.ts
import { api, fetchWithAuth } from '@/lib/fetch';

// ==================== Types ====================

export interface GoogleDriveConnection {
  id: string;
  workspaceId: string;
  userId: string; // User who owns this connection
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface GoogleDriveDrive {
  id: string;
  name: string;
  kind?: string;
}

export type GoogleDriveFileType =
  | 'file'
  | 'folder'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'image'
  | 'video'
  | 'pdf';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  fileType: GoogleDriveFileType;
  parentId?: string;
}

export interface ListFilesParams {
  folderId?: string;
  driveId?: string;
  query?: string;
  fileType?: string;
  pageToken?: string;
  pageSize?: number;
  includeTrashed?: boolean;
  view?: 'recent' | 'starred' | 'trash' | 'shared';
}

export interface ListFilesResponse {
  files: GoogleDriveFile[];
  nextPageToken?: string;
}

export interface ImportFileParams {
  fileId: string;
  targetFolderId?: string;
  convertTo?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';
}

export interface ImportFileResponse {
  success: boolean;
  deskiveFileId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface ExportFileParams {
  fileId: string;
  targetFolderId?: string;
}

export interface ExportFileResponse {
  success: boolean;
  googleDriveFileId: string;
  fileName: string;
  webViewLink?: string;
  webContentLink?: string;
}

export interface StorageQuota {
  limit: number;
  usage: number;
  usageInDrive: number;
  usageInDriveTrash: number;
  limitFormatted: string;
  usageFormatted: string;
  usagePercent: number;
}

// ==================== API Functions ====================

export const googleDriveApi = {
  // ==================== OAuth & Connection ====================

  /**
   * Get OAuth authorization URL
   */
  async getAuthUrl(workspaceId: string, returnUrl?: string): Promise<{
    authorizationUrl: string;
    state: string;
  }> {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    const response = await api.get<{ data: { authorizationUrl: string; state: string } }>(
      `/workspaces/${workspaceId}/google-drive/auth/url${params}`
    );
    return response.data;
  },

  /**
   * Get current connection status
   */
  async getConnection(workspaceId: string): Promise<GoogleDriveConnection | null> {
    const response = await api.get<{ data: GoogleDriveConnection | null }>(
      `/workspaces/${workspaceId}/google-drive/connection`
    );
    return response.data;
  },

  /**
   * Disconnect Google Drive
   */
  async disconnect(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/google-drive/disconnect`);
  },

  // ==================== Drive & File Browsing ====================

  /**
   * List available drives (My Drive + Shared Drives)
   */
  async listDrives(workspaceId: string): Promise<GoogleDriveDrive[]> {
    const response = await api.get<{ data: GoogleDriveDrive[] }>(
      `/workspaces/${workspaceId}/google-drive/drives`
    );
    return response.data;
  },

  /**
   * Get storage quota information
   */
  async getStorageQuota(workspaceId: string): Promise<StorageQuota> {
    const response = await api.get<{ data: StorageQuota }>(
      `/workspaces/${workspaceId}/google-drive/storage-quota`
    );
    return response.data;
  },

  /**
   * List files in a folder
   */
  async listFiles(workspaceId: string, params: ListFilesParams = {}): Promise<ListFilesResponse> {
    const queryParams = new URLSearchParams();

    if (params.folderId) queryParams.append('folderId', params.folderId);
    if (params.driveId) queryParams.append('driveId', params.driveId);
    if (params.query) queryParams.append('query', params.query);
    if (params.fileType) queryParams.append('fileType', params.fileType);
    if (params.pageToken) queryParams.append('pageToken', params.pageToken);
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.includeTrashed) queryParams.append('includeTrashed', 'true');
    if (params.view) queryParams.append('view', params.view);

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/google-drive/files${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: ListFilesResponse }>(url);
    return response.data;
  },

  /**
   * Get file metadata
   */
  async getFile(workspaceId: string, fileId: string): Promise<GoogleDriveFile> {
    const response = await api.get<{ data: GoogleDriveFile }>(
      `/workspaces/${workspaceId}/google-drive/files/${fileId}`
    );
    return response.data;
  },

  /**
   * Get download URL for a file
   */
  getDownloadUrl(workspaceId: string, fileId: string, convertTo?: string): string {
    const baseUrl = `/workspaces/${workspaceId}/google-drive/files/${fileId}/download`;
    return convertTo ? `${baseUrl}?convertTo=${convertTo}` : baseUrl;
  },

  /**
   * Download a file directly (triggers browser download)
   */
  async downloadFile(workspaceId: string, fileId: string, fileName: string, convertTo?: string): Promise<void> {
    const url = this.getDownloadUrl(workspaceId, fileId, convertTo);

    // Fetch the file as a blob with authentication using fetchWithAuth directly
    const response = await fetchWithAuth(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    // Get the blob from response
    const blob = await response.blob();

    // Try to get filename from Content-Disposition header if available
    const contentDisposition = response.headers.get('Content-Disposition');
    let downloadFileName = fileName;
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)["']?/i);
      if (filenameMatch && filenameMatch[1]) {
        downloadFileName = decodeURIComponent(filenameMatch[1]);
      }
    }

    // Create a download link and trigger it
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  // ==================== File Operations ====================

  /**
   * Create a folder in Google Drive
   */
  async createFolder(workspaceId: string, name: string, parentId?: string, driveId?: string): Promise<GoogleDriveFile> {
    const response = await api.post<{ data: GoogleDriveFile }>(
      `/workspaces/${workspaceId}/google-drive/folders`,
      { name, parentId, driveId }
    );
    return response.data;
  },

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    workspaceId: string,
    file: File,
    options: { parentId?: string; driveId?: string; description?: string } = {}
  ): Promise<GoogleDriveFile> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.parentId) formData.append('parentId', options.parentId);
    if (options.driveId) formData.append('driveId', options.driveId);
    if (options.description) formData.append('description', options.description);

    const response = await api.post<{ data: GoogleDriveFile }>(
      `/workspaces/${workspaceId}/google-drive/upload`,
      formData
    );
    return response.data;
  },

  /**
   * Delete a file
   */
  async deleteFile(workspaceId: string, fileId: string, permanent: boolean = false): Promise<void> {
    await api.delete(
      `/workspaces/${workspaceId}/google-drive/files/${fileId}${permanent ? '?permanent=true' : ''}`
    );
  },

  /**
   * Share a file
   */
  async shareFile(
    workspaceId: string,
    fileId: string,
    email: string,
    role: 'reader' | 'commenter' | 'writer',
    sendNotification: boolean = true
  ): Promise<{ shareLink: string }> {
    const response = await api.post<{ data: { shareLink: string } }>(
      `/workspaces/${workspaceId}/google-drive/files/${fileId}/share`,
      { email, role, sendNotification }
    );
    return response.data;
  },

  // ==================== Import to Deskive ====================

  /**
   * Import a file from Google Drive to Deskive
   */
  async importFile(workspaceId: string, params: ImportFileParams): Promise<ImportFileResponse> {
    const response = await api.post<{ data: ImportFileResponse }>(
      `/workspaces/${workspaceId}/google-drive/import`,
      params
    );
    return response.data;
  },

  // ==================== Export from Deskive ====================

  /**
   * Export a file from Deskive to Google Drive
   */
  async exportFile(workspaceId: string, params: ExportFileParams): Promise<ExportFileResponse> {
    const response = await api.post<{ data: ExportFileResponse }>(
      `/workspaces/${workspaceId}/google-drive/export`,
      params
    );
    return response.data;
  },
};

// ==================== Helper Functions ====================

/**
 * Get icon name for file type
 */
export function getFileTypeIcon(fileType: GoogleDriveFileType): string {
  const icons: Record<GoogleDriveFileType, string> = {
    folder: 'folder',
    document: 'file-text',
    spreadsheet: 'table',
    presentation: 'presentation',
    image: 'image',
    video: 'video',
    pdf: 'file-text',
    file: 'file',
  };
  return icons[fileType] || 'file';
}

/**
 * Get color for file type
 */
export function getFileTypeColor(fileType: GoogleDriveFileType): string {
  const colors: Record<GoogleDriveFileType, string> = {
    folder: 'text-yellow-500',
    document: 'text-blue-500',
    spreadsheet: 'text-green-500',
    presentation: 'text-orange-500',
    image: 'text-purple-500',
    video: 'text-red-500',
    pdf: 'text-red-600',
    file: 'text-gray-500',
  };
  return colors[fileType] || 'text-gray-500';
}

/**
 * Format file size
 */
export function formatFileSize(bytes?: number): string {
  if (!bytes) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format date
 */
export function formatDate(dateString?: string): string {
  if (!dateString) return '';

  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}
