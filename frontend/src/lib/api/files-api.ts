// src/lib/api/files-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface FileItem {
  id: string;
  workspaceId?: string;
  workspace_id?: string; // Backend uses snake_case
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  mime_type?: string; // Backend uses snake_case
  size?: number;
  parentId?: string | null; // For folders (local state) - can be null for root
  parent_id?: string | null; // For folders (backend uses snake_case, can be null)
  folderId?: string; // For files (local state)
  folder_id?: string | null; // For files (backend uses snake_case)
  path?: string;
  storage_path?: string; // Backend field
  url?: string | { publicUrl: string }; // Can be string or object with publicUrl
  thumbnailUrl?: string;
  sharedWith?: string[];
  tags?: string[];
  isStarred?: boolean;
  starred?: boolean; // Backend uses 'starred'
  createdBy?: string;
  uploaded_by?: string; // Backend uses snake_case
  created_by?: string; // Backend uses snake_case
  createdAt?: string;
  created_at?: string; // Backend uses snake_case
  updatedAt?: string;
  updated_at?: string; // Backend uses snake_case
  // Additional backend fields
  version?: number;
  previous_version_id?: string | null;
  file_hash?: string;
  virus_scan_status?: string;
  virus_scan_at?: string | null;
  extracted_text?: string | null;
  ocr_status?: string | null;
  metadata?: Record<string, any>;
  collaborative_data?: Record<string, any>;
  is_deleted?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  starred_at?: string | null;
  starred_by?: string | null;
  last_opened_at?: string | null;
  last_opened_by?: string | null;
  open_count?: number;
  parent_ids?: string[] | null;
  parent_folder_ids?: string[];
  shareSettings?: {
    isPublic?: boolean;
  };
}

// API Response types for files
export interface FileApiResponse {
  data: Array<{
    id: string;
    workspace_id: string;
    name: string;
    storage_path: string;
    url: string;
    mime_type: string;
    size: string;
    uploaded_by: string;
    folder_id: string | null;
    parent_folder_ids: string[];
    version: number;
    previous_version_id: string | null;
    file_hash: string;
    virus_scan_status: string;
    virus_scan_at: string;
    extracted_text: string | null;
    ocr_status: string | null;
    metadata: Record<string, any>;
    collaborative_data: Record<string, any>;
    is_deleted: boolean;
    deleted_at: string | null;
    starred: boolean;
    starred_at: string | null;
    starred_by: string | null;
    last_opened_at: string | null;
    last_opened_by: string | null;
    open_count: number;
    created_at: string;
    updated_at: string;
  }>;
  total: number;
  page: number;
  limit: number;
}

// API Response type for folders
export interface FolderApiResponse {
  id: string;
  workspace_id: string;
  name: string;
  parent_id: string | null;
  parent_ids: string[] | null;
  created_by: string;
  collaborative_data: Record<string, any>;
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StorageStats {
  totalStorage: number;
  usedStorage: number;
  fileCount: number;
  folderCount: number;
  storageByType: Record<string, number>;
}

export interface DashboardStats {
  total_files: number;
  files_added_today: number;
  storage_used_bytes: number;
  storage_used_formatted: string;
  storage_total_bytes: number;
  storage_total_formatted: string;
  storage_percentage_used: number;
  ai_generations_this_month: number;
  unique_file_types: number;
  file_type_breakdown: {
    images: number;
    videos: number;
    audio: number;
    documents: number;
    spreadsheets: number;
    pdfs: number;
  };
  plan?: {
    id: string;
    name: string;
    max_storage_gb: number;
  };
}

// Trash API Response Types
export interface TrashFileItem {
  id: string;
  name: string;
  type: 'file';
  size: string;
  mime_type: string;
  deleted_at: string;
  deleted_by?: string;
  workspace_id?: string;
  folder_id?: string | null;
  parent_folder_ids?: string[];
  url?: string;
  storage_path?: string;
  uploaded_by?: string;
  version?: number;
  previous_version_id?: string | null;
  file_hash?: string;
  virus_scan_status?: string;
  virus_scan_at?: string | null;
  extracted_text?: string | null;
  ocr_status?: string | null;
  metadata?: Record<string, any>;
  collaborative_data?: Record<string, any>;
  is_deleted?: boolean;
  starred?: boolean;
  starred_at?: string | null;
  starred_by?: string | null;
  last_opened_at?: string | null;
  last_opened_by?: string | null;
  open_count?: number;
  created_at?: string;
  updated_at?: string;
  is_ai_generated?: boolean | null;
}

export interface TrashFolderItem {
  id: string;
  name: string;
  type: 'folder';
  deleted_at: string;
  deleted_by?: string;
  workspace_id?: string;
  parent_id?: string | null;
  parent_ids?: string[] | null;
  created_by?: string;
  collaborative_data?: Record<string, any>;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  children: TrashFolderItem[];
  files: TrashFileItem[];
}

export interface TrashStats {
  total_deleted_folders: number;
  total_deleted_files: number;
  total_deleted_items: number;
  total_size_bytes: number;
  total_size_formatted: string;
}

export interface TrashApiResponse {
  items: Array<TrashFolderItem | TrashFileItem>; // Can contain both folders and files
  stats: TrashStats;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: string;  // Backend uses snake_case
  description?: string;
}

export interface UploadFileRequest {
  file: File;
  workspace_id: string;  // Required in FormData body
  parent_folder_id?: string;
  description?: string;
  tags?: string | string[];
  is_public?: boolean;
}

export interface UpdateFileRequest {
  name?: string;
  tags?: string[];
  isStarred?: boolean;
}

export interface MoveFileRequest {
  fileIds: string[];
  targetFolderId?: string;
}

export interface ShareFileRequest {
  workspaceId: string;
  fileId: string;
  userIds: string[];
  expiresAt?: string;
  permissions?: {
    read?: boolean;
    download?: boolean;
    edit?: boolean;
  };
}

export interface ShareLinkResponse {
  id: string;
  fileId: string;
  shareToken: string;
  shareUrl: string;
  accessLevel: 'view' | 'download' | 'edit';
  hasPassword: boolean;
  expiresAt: string | null;
  maxDownloads: number | null;
  downloadCount: number;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface SharedFileResponse {
  requiresPassword: boolean;
  message?: string;
  file?: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    url: string | null;
    previewUrl: string;
    accessLevel: 'view' | 'download' | 'edit';
    canDownload: boolean;
    sharedBy?: {
      name: string;
      avatarUrl?: string;
    };
    sharedAt: string;
  };
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  comment?: string;
}

export interface FileComment {
  id: string;
  fileId: string;
  userId: string;
  content: string;
  parentId: string | null;
  isResolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  isEdited: boolean;
  editedAt: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  replies?: FileComment[];
}

export interface CreateCommentRequest {
  content: string;
  parent_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateCommentRequest {
  content: string;
  metadata?: Record<string, any>;
}

// Query Keys
export const fileKeys = {
  all: ['files'] as const,
  lists: () => [...fileKeys.all, 'list'] as const,
  list: (workspaceId: string, folderId?: string) => [...fileKeys.lists(), workspaceId, { folderId }] as const,
  details: () => [...fileKeys.all, 'detail'] as const,
  detail: (id: string) => [...fileKeys.details(), id] as const,
  versions: (fileId: string) => [...fileKeys.detail(fileId), 'versions'] as const,
  storage: (workspaceId: string) => [...fileKeys.all, 'storage', workspaceId] as const,
  shared: (workspaceId: string) => [...fileKeys.all, 'shared', workspaceId] as const,
  starred: (workspaceId: string) => [...fileKeys.all, 'starred', workspaceId] as const,
  recent: (workspaceId: string) => [...fileKeys.all, 'recent', workspaceId] as const,
  trash: (workspaceId: string) => [...fileKeys.all, 'trash', workspaceId] as const,
  comments: (fileId: string) => [...fileKeys.all, 'comments', fileId] as const,
};

// API Functions
export const fileApi = {
  // New: Fetch files only (from /api/v1/workspaces/{workspaceId}/files)
  async getFilesOnly(workspaceId: string, params?: {
    page?: number;
    limit?: number;
    folder_id?: string;
    is_deleted?: boolean;
  }): Promise<FileApiResponse> {
    // Defensive check: ensure folder_id is a string if provided
    if (params?.folder_id !== undefined && params?.folder_id !== null && typeof params.folder_id !== 'string') {
      console.error('❌ Invalid folder_id type:', typeof params.folder_id, params.folder_id);
      throw new Error(`Invalid folder_id: expected string but got ${typeof params.folder_id}`);
    }

    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.folder_id && typeof params.folder_id === 'string') {
      queryParams.append('folder_id', params.folder_id);
    }
    if (params?.is_deleted !== undefined) {
      queryParams.append('is_deleted', String(params.is_deleted));
    }

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/files${queryString ? `?${queryString}` : ''}`;
    console.log('📡 Calling files API:', url);

    return api.get<FileApiResponse>(url);
  },

  // New: Fetch folders only (from /api/v1/workspaces/{workspaceId}/files/folders)
  async getFoldersOnly(workspaceId: string, parentId?: string | null, isDeleted?: boolean): Promise<FolderApiResponse[]> {
    // If parentId is explicitly null or undefined, fetch root folders (no parent_id param)
    // If parentId is a string, fetch folders with that parent_id

    // Defensive check: ensure parentId is a string or null/undefined
    if (parentId !== null && parentId !== undefined && typeof parentId !== 'string') {
      console.error('❌ Invalid parentId type:', typeof parentId, parentId);
      throw new Error(`Invalid parentId: expected string but got ${typeof parentId}`);
    }

    const params = new URLSearchParams();
    if (parentId && typeof parentId === 'string') {
      params.append('parent_id', parentId);
    }
    if (isDeleted !== undefined) {
      params.append('is_deleted', String(isDeleted));
    }

    const queryString = params.toString();
    const url = `/workspaces/${workspaceId}/files/folders${queryString ? `?${queryString}` : ''}`;
    console.log('📡 Calling folders API:', url);

    return api.get<FolderApiResponse[]>(url);
  },

  // New: Fetch both files and folders and merge them
  async getFilesAndFolders(workspaceId: string, folderId?: string | null, isDeleted?: boolean): Promise<FileItem[]> {
    try {
      // Defensive check and logging
      console.log('🔄 Fetching files and folders for folder:', folderId, 'isDeleted:', isDeleted);
      console.log('   folderId type:', typeof folderId);
      console.log('   folderId value:', folderId);

      if (folderId !== null && folderId !== undefined && typeof folderId !== 'string') {
        console.error('❌ Invalid folderId type in getFilesAndFolders:', typeof folderId, folderId);
        throw new Error(`Invalid folderId: expected string but got ${typeof folderId}`);
      }

      const normalizedFolderId = folderId === null || folderId === undefined ? null : folderId;
      console.log('   Normalized folderId:', normalizedFolderId);

      // Fetch both files and folders in parallel for the current folder level
      const [filesResponse, foldersResponse] = await Promise.all([
        fileApi.getFilesOnly(workspaceId, {
          limit: 1000,
          folder_id: normalizedFolderId === null ? undefined : normalizedFolderId,
          is_deleted: isDeleted
        }),
        fileApi.getFoldersOnly(workspaceId, normalizedFolderId, isDeleted)
      ]);

      console.log('📁 Fetched folders:', foldersResponse.length, 'for parent:', folderId || 'ROOT');
      console.log('📄 Fetched files:', filesResponse.data.length, 'for folder:', folderId || 'ROOT');

      // Transform folders to FileItem format
      const folders: FileItem[] = foldersResponse.map(folder => ({
        id: folder.id,
        workspaceId: folder.workspace_id,
        workspace_id: folder.workspace_id,
        name: folder.name,
        type: 'folder' as const,
        size: 0,
        parentId: folder.parent_id || undefined, // Use undefined for root level
        parent_id: folder.parent_id || null,
        starred: false,
        createdBy: folder.created_by,
        created_by: folder.created_by,
        createdAt: folder.created_at,
        created_at: folder.created_at,
        updatedAt: folder.updated_at,
        updated_at: folder.updated_at,
        collaborative_data: folder.collaborative_data,
        is_deleted: folder.is_deleted,
        deleted_at: folder.deleted_at,
        deleted_by: folder.deleted_by,
        parent_ids: folder.parent_ids || undefined,
        shareSettings: { isPublic: false }
      }));

      // Transform files to FileItem format
      const files: FileItem[] = filesResponse.data.map(file => {
        const parentId = file.folder_id ? file.folder_id : undefined;
        console.log(`📄 File "${file.name}": folder_id=${file.folder_id}, parentId=${parentId}`);

        return {
          id: file.id,
          workspaceId: file.workspace_id,
          workspace_id: file.workspace_id,
          name: file.name,
          type: 'file' as const,
          mimeType: file.mime_type,
          mime_type: file.mime_type,
          size: parseInt(file.size, 10),
          folderId: file.folder_id || undefined,
          folder_id: file.folder_id,
          parentId: parentId, // Map folder_id to parentId, use undefined for root
        url: file.url,
        storage_path: file.storage_path,
        starred: file.starred,
        isStarred: file.starred,
        createdBy: file.uploaded_by,
        uploaded_by: file.uploaded_by,
        createdAt: file.created_at,
        created_at: file.created_at,
        updatedAt: file.updated_at,
        updated_at: file.updated_at,
        version: file.version,
        previous_version_id: file.previous_version_id,
        file_hash: file.file_hash,
        virus_scan_status: file.virus_scan_status,
        virus_scan_at: file.virus_scan_at,
        extracted_text: file.extracted_text,
        ocr_status: file.ocr_status,
        metadata: file.metadata,
        collaborative_data: file.collaborative_data,
        is_deleted: file.is_deleted,
        deleted_at: file.deleted_at,
        starred_at: file.starred_at,
        starred_by: file.starred_by,
        last_opened_at: file.last_opened_at,
        last_opened_by: file.last_opened_by,
        open_count: file.open_count,
        parent_folder_ids: file.parent_folder_ids,
        shareSettings: {
            isPublic: file.metadata?.is_public || false
          }
        };
      });

      console.log('✅ Transformed items:', { folders: folders.length, files: files.length });

      // Merge folders and files
      return [...folders, ...files];
    } catch (error) {
      console.error('Error fetching files and folders:', error);
      throw error;
    }
  },

  // Original: File operations (keep for backward compatibility)
  async getFiles(workspaceId: string, folderId?: string): Promise<FileItem[]> {
    // Use the new combined API with folder filtering
    return fileApi.getFilesAndFolders(workspaceId, folderId);
  },

  async getFile(workspaceId: string, fileId: string): Promise<FileItem> {
    return api.get<FileItem>(`/workspaces/${workspaceId}/files/${fileId}`);
  },

  async uploadFile(workspaceId: string, data: UploadFileRequest): Promise<FileItem> {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('workspace_id', data.workspace_id);  // Required in body

    if (data.parent_folder_id) {
      formData.append('parent_folder_id', data.parent_folder_id);
    }

    if (data.description) {
      formData.append('description', data.description);
    }

    if (data.tags) {
      // Handle both string (comma-separated) and array formats
      const tagsValue = Array.isArray(data.tags) ? data.tags.join(',') : data.tags;
      formData.append('tags', tagsValue);
    }

    if (data.is_public !== undefined) {
      formData.append('is_public', String(data.is_public));
    }

    return api.post<FileItem>(`/workspaces/${workspaceId}/files/upload`, formData);
  },

  async uploadMultipleFiles(workspaceId: string, files: File[], parentId?: string): Promise<FileItem[]> {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    if (parentId) formData.append('parentId', parentId);

    // Don't set Content-Type header - let axios auto-detect FormData and add boundary
    return api.post<FileItem[]>(`/workspaces/${workspaceId}/files/upload-multiple`, formData);
  },

  async createFolder(workspaceId: string, data: CreateFolderRequest): Promise<FileItem> {
    return api.post<FileItem>(`/workspaces/${workspaceId}/files/folders`, data);
  },

  async updateFile(fileId: string, data: UpdateFileRequest): Promise<FileItem> {
    return api.patch<FileItem>(`/files/${fileId}`, data);
  },

  async renameFile(workspaceId: string, fileId: string, name: string): Promise<FileItem> {
    console.log(`✏️ Renaming file: ${fileId} to "${name}" in workspace: ${workspaceId}`);
    return api.put<FileItem>(`/workspaces/${workspaceId}/files/${fileId}`, { name });
  },

  async renameFolder(workspaceId: string, folderId: string, name: string): Promise<FileItem> {
    console.log(`✏️ Renaming folder: ${folderId} to "${name}" in workspace: ${workspaceId}`);
    return api.put<FileItem>(`/workspaces/${workspaceId}/files/folders/${folderId}`, { name });
  },

  async markFileAsOpened(workspaceId: string, fileId: string): Promise<void> {
    console.log(`👁️ Marking file as opened: ${fileId} in workspace: ${workspaceId}`);
    await api.put(`/workspaces/${workspaceId}/files/${fileId}`, { mark_as_opened: true });
  },

  async toggleStarFile(workspaceId: string, fileId: string, starred: boolean): Promise<FileItem> {
    console.log(`⭐ ${starred ? 'Starring' : 'Unstarring'} file: ${fileId} in workspace: ${workspaceId}`);
    return api.put<FileItem>(`/workspaces/${workspaceId}/files/${fileId}`, { starred });
  },

  async deleteFile(workspaceId: string, fileId: string): Promise<void> {
    console.log(`🗑️ Deleting file: ${fileId} from workspace: ${workspaceId}`);
    await api.delete(`/workspaces/${workspaceId}/files/${fileId}`);
  },

  async deleteFolder(workspaceId: string, folderId: string): Promise<void> {
    console.log(`🗑️ Deleting folder recursively: ${folderId} from workspace: ${workspaceId}`);
    await api.delete(`/workspaces/${workspaceId}/files/folders/${folderId}/recursive`);
  },

  // New: Batch delete multiple folders with a single API call
  async deleteMultipleFolders(workspaceId: string, folderIds: string[]): Promise<{
    message: string;
    deleted_folders_count: number;
    deleted_files_count: number;
    deleted_at: string;
    success: Array<{ folderId: string; folders_deleted: number; files_deleted: number }>;
    failed: Array<{ folderId: string; reason: string }>;
  }> {
    console.log(`🗑️ Batch deleting ${folderIds.length} folders from workspace: ${workspaceId}`);
    return api.delete<{
      message: string;
      deleted_folders_count: number;
      deleted_files_count: number;
      deleted_at: string;
      success: Array<{ folderId: string; folders_deleted: number; files_deleted: number }>;
      failed: Array<{ folderId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files/folders`, {
      body: JSON.stringify({ folder_ids: folderIds })
    });
  },

  // New: Batch delete multiple files with a single API call
  async deleteMultipleFiles(workspaceId: string, fileIds: string[]): Promise<{
    message: string;
    deleted_count: number;
    failed_count: number;
    deleted_at: string;
    success: string[];
    failed: Array<{ fileId: string; reason: string }>;
  }> {
    console.log(`🗑️ Batch deleting ${fileIds.length} files from workspace: ${workspaceId}`);
    return api.delete<{
      message: string;
      deleted_count: number;
      failed_count: number;
      deleted_at: string;
      success: string[];
      failed: Array<{ fileId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files`, {
      body: JSON.stringify({ file_ids: fileIds })
    });
  },

  async restoreFile(workspaceId: string, fileId: string): Promise<{ message: string; file: FileItem }> {
    console.log(`♻️ Restoring file: ${fileId} in workspace: ${workspaceId}`);
    return api.post<{ message: string; file: FileItem }>(`/workspaces/${workspaceId}/files/${fileId}/restore`, {});
  },

  async restoreFolder(workspaceId: string, folderId: string): Promise<{ message: string; restored_folders_count: number; restored_files_count: number }> {
    console.log(`♻️ Restoring folder recursively: ${folderId} in workspace: ${workspaceId}`);
    return api.post<{ message: string; restored_folders_count: number; restored_files_count: number }>(`/workspaces/${workspaceId}/files/folders/${folderId}/restore`, {});
  },

  // Legacy batch delete method (now uses the new batch API)
  async deleteFiles(workspaceId: string, fileIds: string[]): Promise<void> {
    console.log(`🗑️ Batch deleting ${fileIds.length} files (using batch API)`);
    const result = await fileApi.deleteMultipleFiles(workspaceId, fileIds);

    // Throw error if there were any failures
    if (result.failed_count > 0) {
      const failedNames = result.failed.map(f => f.reason).join(', ');
      throw new Error(`Failed to delete ${result.failed_count} file(s): ${failedNames}`);
    }
  },

  async moveFiles(data: MoveFileRequest): Promise<void> {
    await api.post('/files/move', data);
  },

  // Legacy batch copy method
  async copyFiles(fileIds: string[], targetFolderId?: string): Promise<FileItem[]> {
    return api.post<FileItem[]>('/files/copy', { fileIds, targetFolderId });
  },

  // New: Copy a single file to a target folder
  async copyFile(workspaceId: string, fileId: string, targetFolderId: string | null, newName: string): Promise<FileItem> {
    console.log(`📋 Copying file: ${fileId} to folder: ${targetFolderId || 'ROOT'} with name: ${newName}`);
    return api.post<FileItem>(`/workspaces/${workspaceId}/files/${fileId}/copy`, {
      target_folder_id: targetFolderId,
      new_name: newName,
    });
  },

  // New: Batch copy multiple files to a target folder
  async copyMultipleFiles(workspaceId: string, fileIds: string[], targetFolderId: string | null): Promise<{
    message: string;
    copied_count: number;
    failed_count: number;
    success: Array<{ fileId: string; newFileId: string; name: string }>;
    failed: Array<{ fileId: string; reason: string }>;
  }> {
    console.log(`📋 Batch copying ${fileIds.length} files to folder: ${targetFolderId || 'ROOT'}`);
    return api.post<{
      message: string;
      copied_count: number;
      failed_count: number;
      success: Array<{ fileId: string; newFileId: string; name: string }>;
      failed: Array<{ fileId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files/copy`, {
      file_ids: fileIds,
      target_folder_id: targetFolderId,
    });
  },

  // New: Copy a folder to a target parent folder
  async copyFolder(workspaceId: string, folderId: string, targetParentId: string | null, newName: string): Promise<FileItem> {
    console.log(`📋 Copying folder: ${folderId} to parent: ${targetParentId || 'ROOT'} with name: ${newName}`);
    return api.post<FileItem>(`/workspaces/${workspaceId}/files/folders/${folderId}/copy`, {
      target_parent_id: targetParentId,
      new_name: newName,
    });
  },

  // New: Batch copy multiple folders to a target parent folder
  async copyMultipleFolders(workspaceId: string, folderIds: string[], targetParentId: string | null): Promise<{
    message: string;
    copied_count: number;
    failed_count: number;
    success: Array<{ folderId: string; newFolderId: string; name: string }>;
    failed: Array<{ folderId: string; reason: string }>;
  }> {
    console.log(`📋 Batch copying ${folderIds.length} folders to parent: ${targetParentId || 'ROOT'}`);
    return api.post<{
      message: string;
      copied_count: number;
      failed_count: number;
      success: Array<{ folderId: string; newFolderId: string; name: string }>;
      failed: Array<{ folderId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files/folders/batch-copy`, {
      folder_ids: folderIds,
      target_parent_id: targetParentId,
    });
  },

  // New: Move a single file to a target folder
  async moveFile(workspaceId: string, fileId: string, targetFolderId: string | null, newName?: string): Promise<FileItem> {
    console.log(`✂️ Moving file: ${fileId} to folder: ${targetFolderId || 'ROOT'}${newName ? ` with name: ${newName}` : ''}`);
    const body: { target_folder_id: string | null; new_name?: string } = {
      target_folder_id: targetFolderId,
    };
    if (newName) {
      body.new_name = newName;
    }
    return api.put<FileItem>(`/workspaces/${workspaceId}/files/${fileId}/move`, body);
  },

  // New: Batch move multiple files to a target folder
  async moveMultipleFiles(workspaceId: string, fileIds: string[], targetFolderId: string | null): Promise<{
    message: string;
    moved_count: number;
    failed_count: number;
    success: Array<{ fileId: string; name: string }>;
    failed: Array<{ fileId: string; reason: string }>;
  }> {
    console.log(`✂️ Batch moving ${fileIds.length} files to folder: ${targetFolderId || 'ROOT'}`);
    return api.put<{
      message: string;
      moved_count: number;
      failed_count: number;
      success: Array<{ fileId: string; name: string }>;
      failed: Array<{ fileId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files/batch-move`, {
      file_ids: fileIds,
      target_folder_id: targetFolderId,
    });
  },

  // New: Move a folder to a target parent folder
  async moveFolder(workspaceId: string, folderId: string, targetParentId: string | null, newName?: string): Promise<FileItem> {
    console.log(`✂️ Moving folder: ${folderId} to parent: ${targetParentId || 'ROOT'}${newName ? ` with name: ${newName}` : ''}`);
    const body: { target_parent_id: string | null; new_name?: string } = {
      target_parent_id: targetParentId,
    };
    if (newName) {
      body.new_name = newName;
    }
    return api.put<FileItem>(`/workspaces/${workspaceId}/files/folders/${folderId}/move`, body);
  },

  // New: Batch move multiple folders to a target parent folder
  async moveMultipleFolders(workspaceId: string, folderIds: string[], targetParentId: string | null): Promise<{
    message: string;
    moved_count: number;
    failed_count: number;
    success: Array<{ folderId: string; name: string }>;
    failed: Array<{ folderId: string; reason: string }>;
  }> {
    console.log(`✂️ Batch moving ${folderIds.length} folders to parent: ${targetParentId || 'ROOT'}`);
    return api.put<{
      message: string;
      moved_count: number;
      failed_count: number;
      success: Array<{ folderId: string; name: string }>;
      failed: Array<{ folderId: string; reason: string }>;
    }>(`/workspaces/${workspaceId}/files/batch-move-folders`, {
      folder_ids: folderIds,
      target_parent_id: targetParentId,
    });
  },

  // File sharing
  async shareFile(data: ShareFileRequest): Promise<{ success: boolean; shared_count: number }> {
    return api.post<{ success: boolean; shared_count: number }>(
      `/workspaces/${data.workspaceId}/files/${data.fileId}/share`,
      {
        user_ids: data.userIds,
        expires_at: data.expiresAt,
        permissions: data.permissions || { read: true, download: true },
      }
    );
  },

  async getSharedFiles(workspaceId: string): Promise<FileItem[]> {
    return api.get<FileItem[]>(`/workspaces/${workspaceId}/files/shared`);
  },

  async getSharedWithMe(workspaceId: string): Promise<FileItem[]> {
    return api.get<FileItem[]>(`/workspaces/${workspaceId}/files/shared-with-me`);
  },

  async removeShare(fileId: string, userId?: string): Promise<void> {
    const endpoint = userId
      ? `/files/${fileId}/share/${userId}`
      : `/files/${fileId}/share`;
    await api.delete(endpoint);
  },

  // Public link sharing (Google Drive style)
  async createShareLink(
    workspaceId: string,
    fileId: string,
    options?: {
      accessLevel?: 'view' | 'download' | 'edit';
      password?: string;
      expiresAt?: string;
      maxDownloads?: number;
    }
  ): Promise<ShareLinkResponse> {
    return api.post<ShareLinkResponse>(
      `/workspaces/${workspaceId}/files/${fileId}/share-link`,
      {
        accessLevel: options?.accessLevel || 'view',
        password: options?.password,
        expiresAt: options?.expiresAt,
        maxDownloads: options?.maxDownloads,
      }
    );
  },

  async getFileShareLinks(workspaceId: string, fileId: string): Promise<ShareLinkResponse[]> {
    return api.get<ShareLinkResponse[]>(`/workspaces/${workspaceId}/files/${fileId}/share-links`);
  },

  async updateShareLink(
    workspaceId: string,
    shareId: string,
    options: {
      accessLevel?: 'view' | 'download' | 'edit';
      password?: string;
      expiresAt?: string;
      maxDownloads?: number;
      isActive?: boolean;
    }
  ): Promise<ShareLinkResponse> {
    return api.put<ShareLinkResponse>(`/workspaces/${workspaceId}/files/share-links/${shareId}`, options);
  },

  async deleteShareLink(workspaceId: string, shareId: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/workspaces/${workspaceId}/files/share-links/${shareId}`);
  },

  // Public shared file access (no auth required)
  async accessSharedFile(shareToken: string, password?: string): Promise<SharedFileResponse> {
    const params = password ? `?password=${encodeURIComponent(password)}` : '';
    return api.get<SharedFileResponse>(`/shared/${shareToken}${params}`, { requireAuth: false });
  },

  async verifySharePassword(shareToken: string, password: string): Promise<SharedFileResponse> {
    return api.post<SharedFileResponse>(`/shared/${shareToken}/verify-password`, { password }, { requireAuth: false });
  },

  // File comments
  async getFileComments(workspaceId: string, fileId: string): Promise<FileComment[]> {
    return api.get<FileComment[]>(`/workspaces/${workspaceId}/files/${fileId}/comments`);
  },

  async createComment(workspaceId: string, fileId: string, data: CreateCommentRequest): Promise<FileComment> {
    return api.post<FileComment>(`/workspaces/${workspaceId}/files/${fileId}/comments`, data);
  },

  async getComment(workspaceId: string, fileId: string, commentId: string): Promise<FileComment> {
    return api.get<FileComment>(`/workspaces/${workspaceId}/files/${fileId}/comments/${commentId}`);
  },

  async updateComment(workspaceId: string, fileId: string, commentId: string, data: UpdateCommentRequest): Promise<FileComment> {
    return api.put<FileComment>(`/workspaces/${workspaceId}/files/${fileId}/comments/${commentId}`, data);
  },

  async deleteComment(workspaceId: string, fileId: string, commentId: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/files/${fileId}/comments/${commentId}`);
  },

  async resolveComment(workspaceId: string, fileId: string, commentId: string, isResolved: boolean): Promise<FileComment> {
    return api.put<FileComment>(`/workspaces/${workspaceId}/files/${fileId}/comments/${commentId}/resolve`, { is_resolved: isResolved });
  },

  // File versions
  async getFileVersions(fileId: string): Promise<FileVersion[]> {
    return api.get<FileVersion[]>(`/files/${fileId}/versions`);
  },

  async uploadNewVersion(fileId: string, file: File, comment?: string): Promise<FileVersion> {
    const formData = new FormData();
    formData.append('file', file);
    if (comment) formData.append('comment', comment);

    // Don't set Content-Type header - let axios auto-detect FormData and add boundary
    return api.post<FileVersion>(`/files/${fileId}/versions`, formData);
  },

  async restoreVersion(fileId: string, versionId: string): Promise<FileItem> {
    return api.post<FileItem>(`/files/${fileId}/versions/${versionId}/restore`, null);
  },

  // Storage and stats
  async getStorageStats(workspaceId: string): Promise<StorageStats> {
    return api.get<StorageStats>(`/workspaces/${workspaceId}/files/storage`);
  },

  // Special queries
  async getStarredFiles(workspaceId: string): Promise<FileItem[]> {
    const response = await api.get<{ data: any[]; total: number; page: number; limit: number }>(`/workspaces/${workspaceId}/files/starred`);
    console.log('📡 Starred files API response:', response);

    // Transform the response data to FileItem format
    const files: FileItem[] = response.data.map(file => ({
      id: file.id,
      workspaceId: file.workspace_id,
      workspace_id: file.workspace_id,
      name: file.name,
      type: 'file' as const,
      mimeType: file.mime_type,
      mime_type: file.mime_type,
      size: parseInt(file.size, 10),
      folderId: file.folder_id || undefined,
      folder_id: file.folder_id,
      url: file.url,
      storage_path: file.storage_path,
      starred: file.starred,
      isStarred: file.starred,
      createdBy: file.uploaded_by,
      uploaded_by: file.uploaded_by,
      createdAt: file.created_at,
      created_at: file.created_at,
      updatedAt: file.updated_at,
      updated_at: file.updated_at,
      version: file.version,
      previous_version_id: file.previous_version_id,
      file_hash: file.file_hash,
      virus_scan_status: file.virus_scan_status,
      virus_scan_at: file.virus_scan_at,
      extracted_text: file.extracted_text,
      ocr_status: file.ocr_status,
      metadata: file.metadata,
      collaborative_data: file.collaborative_data,
      is_deleted: file.is_deleted,
      deleted_at: file.deleted_at,
      starred_at: file.starred_at,
      starred_by: file.starred_by,
      last_opened_at: file.last_opened_at,
      last_opened_by: file.last_opened_by,
      open_count: file.open_count,
      parent_folder_ids: file.parent_folder_ids,
      shareSettings: {
        isPublic: file.metadata?.is_public || false
      }
    }));

    console.log('✅ Transformed starred files:', files.length);
    return files;
  },

  async getRecentFiles(workspaceId: string, limit = 20): Promise<FileItem[]> {
    const response = await api.get<{ data: any[]; total: number }>(`/workspaces/${workspaceId}/files/recent?limit=${limit}`);
    console.log('📡 Recent files API response:', response);

    // Transform the response data to FileItem format
    const files: FileItem[] = response.data.map(file => ({
      id: file.id,
      workspaceId: file.workspace_id,
      workspace_id: file.workspace_id,
      name: file.name,
      type: 'file' as const,
      mimeType: file.mime_type,
      mime_type: file.mime_type,
      size: parseInt(file.size, 10),
      folderId: file.folder_id || undefined,
      folder_id: file.folder_id,
      url: file.url,
      storage_path: file.storage_path,
      starred: file.starred,
      isStarred: file.starred,
      createdBy: file.uploaded_by,
      uploaded_by: file.uploaded_by,
      createdAt: file.created_at,
      created_at: file.created_at,
      updatedAt: file.updated_at,
      updated_at: file.updated_at,
      version: file.version,
      previous_version_id: file.previous_version_id,
      file_hash: file.file_hash,
      virus_scan_status: file.virus_scan_status,
      virus_scan_at: file.virus_scan_at,
      extracted_text: file.extracted_text,
      ocr_status: file.ocr_status,
      metadata: file.metadata,
      collaborative_data: file.collaborative_data,
      is_deleted: file.is_deleted,
      deleted_at: file.deleted_at,
      starred_at: file.starred_at,
      starred_by: file.starred_by,
      last_opened_at: file.last_opened_at,
      last_opened_by: file.last_opened_by,
      open_count: file.open_count,
      parent_folder_ids: file.parent_folder_ids,
      shareSettings: {
        isPublic: file.metadata?.is_public || false
      }
    }));

    console.log('✅ Transformed recent files:', files.length);
    return files;
  },

  async getFilesByType(
    workspaceId: string,
    category: 'documents' | 'pdfs' | 'images' | 'spreadsheets' | 'videos' | 'audio'
  ): Promise<FileItem[]> {
    const response = await api.get<{ data: any[]; total: number; page: number; limit: number }>(
      `/workspaces/${workspaceId}/files/by-type?category=${category}`
    );
    console.log(`📡 Files by type (${category}) API response:`, response);

    // Transform the response data to FileItem format
    const files: FileItem[] = response.data.map(file => ({
      id: file.id,
      workspaceId: file.workspace_id,
      workspace_id: file.workspace_id,
      name: file.name,
      type: 'file' as const,
      mimeType: file.mime_type,
      mime_type: file.mime_type,
      size: parseInt(file.size, 10),
      folderId: file.folder_id || undefined,
      folder_id: file.folder_id,
      url: file.url,
      storage_path: file.storage_path,
      starred: file.starred,
      isStarred: file.starred,
      createdBy: file.uploaded_by,
      uploaded_by: file.uploaded_by,
      createdAt: file.created_at,
      created_at: file.created_at,
      updatedAt: file.updated_at,
      updated_at: file.updated_at,
      version: file.version,
      previous_version_id: file.previous_version_id,
      file_hash: file.file_hash,
      virus_scan_status: file.virus_scan_status,
      virus_scan_at: file.virus_scan_at,
      extracted_text: file.extracted_text,
      ocr_status: file.ocr_status,
      metadata: file.metadata,
      collaborative_data: file.collaborative_data,
      is_deleted: file.is_deleted,
      deleted_at: file.deleted_at,
      starred_at: file.starred_at,
      starred_by: file.starred_by,
      last_opened_at: file.last_opened_at,
      last_opened_by: file.last_opened_by,
      open_count: file.open_count,
      parent_folder_ids: file.parent_folder_ids,
      shareSettings: {
        isPublic: file.metadata?.is_public || false
      }
    }));

    console.log(`✅ Transformed ${category} files:`, files.length);
    return files;
  },

  async searchFiles(workspaceId: string, query: string, params?: {
    page?: number;
    limit?: number;
    mime_type?: string;
    uploaded_by?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<FileApiResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', query);

    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));
    if (params?.mime_type) queryParams.append('mime_type', params.mime_type);
    if (params?.uploaded_by) queryParams.append('uploaded_by', params.uploaded_by);
    if (params?.date_from) queryParams.append('date_from', params.date_from);
    if (params?.date_to) queryParams.append('date_to', params.date_to);

    const url = `/workspaces/${workspaceId}/files/search?${queryParams.toString()}`;
    console.log('🔍 Searching files:', url);

    return api.get<FileApiResponse>(url);
  },

  // File preview
  async getFilePreview(fileId: string): Promise<{ url: string; type: string }> {
    return api.get<{ url: string; type: string }>(`/files/${fileId}/preview`);
  },

  // File download
  async downloadFile(workspaceId: string, fileId: string): Promise<Blob> {
    // Use the base API URL (already includes /api/v1)
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const token = localStorage.getItem('auth_token');

    if (!token) {
      throw new Error('Authentication token not found');
    }

    const response = await fetch(`${baseURL}/api/v1/workspaces/${workspaceId}/files/${fileId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    return response.blob();
  },

  // Dashboard stats
  async getDashboardStats(workspaceId: string): Promise<DashboardStats> {
    console.log('📊 Fetching dashboard stats for workspace:', workspaceId);
    return api.get<DashboardStats>(`/workspaces/${workspaceId}/files/dashboard-stats`);
  },

  // Trash operations
  async getTrashItems(workspaceId: string): Promise<{ items: FileItem[]; stats: TrashStats }> {
    console.log('🗑️ Fetching trash items for workspace:', workspaceId);
    const response = await api.get<TrashApiResponse>(`/workspaces/${workspaceId}/files/trash`);

    // Flatten the hierarchical structure into a flat array of FileItem objects
    const flattenTrashItems = (items: Array<TrashFolderItem | TrashFileItem>): FileItem[] => {
      const result: FileItem[] = [];

      for (const item of items) {
        // Check if item is a folder or file
        if (item.type === 'folder') {
          // It's a folder - cast it properly
          const folder = item as TrashFolderItem;

          // Add the folder itself
          result.push({
            id: folder.id,
            name: folder.name,
            type: 'folder',
            workspaceId: folder.workspace_id,
            workspace_id: folder.workspace_id,
            size: 0,
            parentId: folder.parent_id || undefined,
            parent_id: folder.parent_id || null,
            deleted_at: folder.deleted_at,
            deleted_by: folder.deleted_by,
            is_deleted: true,
            createdAt: folder.created_at,
            created_at: folder.created_at,
            updatedAt: folder.updated_at,
            updated_at: folder.updated_at,
          });

          // Add files within this folder
          if (folder.files && folder.files.length > 0) {
            for (const file of folder.files) {
              result.push({
                id: file.id,
                name: file.name,
                type: 'file',
                workspaceId: file.workspace_id,
                workspace_id: file.workspace_id,
                size: parseInt(file.size, 10),
                mimeType: file.mime_type,
                mime_type: file.mime_type,
                folderId: folder.id, // Files belong to this folder
                folder_id: folder.id,
                parentId: folder.id || undefined,
                url: file.url,
                storage_path: file.storage_path,
                deleted_at: file.deleted_at,
                deleted_by: file.deleted_by,
                is_deleted: true,
                createdAt: file.created_at || file.deleted_at,
                created_at: file.created_at || file.deleted_at,
                updatedAt: file.updated_at,
                updated_at: file.updated_at,
                uploaded_by: file.uploaded_by,
                createdBy: file.uploaded_by,
                created_by: file.uploaded_by,
                version: file.version,
                previous_version_id: file.previous_version_id,
                file_hash: file.file_hash,
                virus_scan_status: file.virus_scan_status,
                virus_scan_at: file.virus_scan_at,
                extracted_text: file.extracted_text,
                ocr_status: file.ocr_status,
                metadata: file.metadata,
                collaborative_data: file.collaborative_data,
                starred: file.starred,
                isStarred: file.starred,
                starred_at: file.starred_at,
                starred_by: file.starred_by,
                last_opened_at: file.last_opened_at,
                last_opened_by: file.last_opened_by,
                open_count: file.open_count,
                parent_folder_ids: file.parent_folder_ids,
              });
            }
          }

          // Recursively add children folders and their contents
          if (folder.children && folder.children.length > 0) {
            result.push(...flattenTrashItems(folder.children));
          }
        } else if (item.type === 'file') {
          // It's a standalone file (not in a folder)
          const file = item as TrashFileItem;
          result.push({
            id: file.id,
            name: file.name,
            type: 'file',
            workspaceId: file.workspace_id,
            workspace_id: file.workspace_id,
            size: parseInt(file.size, 10),
            mimeType: file.mime_type,
            mime_type: file.mime_type,
            folderId: file.folder_id || undefined,
            folder_id: file.folder_id,
            parentId: file.folder_id || undefined,
            url: file.url,
            storage_path: file.storage_path,
            deleted_at: file.deleted_at,
            deleted_by: file.deleted_by,
            is_deleted: true,
            createdAt: file.created_at || file.deleted_at,
            created_at: file.created_at || file.deleted_at,
            updatedAt: file.updated_at,
            updated_at: file.updated_at,
            uploaded_by: file.uploaded_by,
            createdBy: file.uploaded_by,
            created_by: file.uploaded_by,
            version: file.version,
            previous_version_id: file.previous_version_id,
            file_hash: file.file_hash,
            virus_scan_status: file.virus_scan_status,
            virus_scan_at: file.virus_scan_at,
            extracted_text: file.extracted_text,
            ocr_status: file.ocr_status,
            metadata: file.metadata,
            collaborative_data: file.collaborative_data,
            starred: file.starred,
            isStarred: file.starred,
            starred_at: file.starred_at,
            starred_by: file.starred_by,
            last_opened_at: file.last_opened_at,
            last_opened_by: file.last_opened_by,
            open_count: file.open_count,
            parent_folder_ids: file.parent_folder_ids,
          });
        }
      }

      return result;
    };

    const flattenedItems = flattenTrashItems(response.items);
    console.log('✅ Flattened trash items:', flattenedItems.length);

    return {
      items: flattenedItems,
      stats: response.stats,
    };
  },


  // Add file by URL
  async addFileByUrl(workspaceId: string, data: {
    url: string;
    name: string;
    workspace_id: string;
    storage_path?: string;
    mime_type?: string;
    size?: number;
    folder_id?: string;
    description?: string;
    tags?: string | string[];
    is_public?: boolean;
    is_ai_generated?: boolean;
    file_hash?: string;
    metadata?: any;
  }): Promise<FileItem> {
    console.log('📎 Adding file by URL:', {
      workspaceId,
      url: data.url,
      name: data.name,
      folder_id: data.folder_id,
      is_ai_generated: data.is_ai_generated,
    });

    return api.post<FileItem>(`/workspaces/${workspaceId}/files/add-by-url`, data);
  },

  // AI operations
  async generateFileWithAI(workspaceId: string, prompt: string, type: 'document' | 'image' | 'audio' | 'video'): Promise<FileItem> {
    return api.post<FileItem>(`/workspaces/${workspaceId}/files/ai-generate`, {
      prompt,
      type,
    });
  },
};

// React Query Hooks

/**
 * Hook to fetch files and folders for a specific folder with caching
 * @param workspaceId - The workspace ID
 * @param folderId - The folder ID (null for root)
 * @param options - Additional query options
 */
export const useFilesAndFolders = (
  workspaceId: string,
  folderId?: string | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    isDeleted?: boolean;
  }
) => {
  return useQuery({
    queryKey: options?.isDeleted
      ? [...fileKeys.list(workspaceId, folderId || undefined), 'deleted']
      : fileKeys.list(workspaceId, folderId || undefined),
    queryFn: () => fileApi.getFilesAndFolders(workspaceId, folderId || null, options?.isDeleted),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: options?.staleTime ?? 60000, // Default 1 minute cache
  });
};

// Legacy hook - kept for backward compatibility
export const useFiles = (workspaceId: string, folderId?: string) => {
  return useQuery({
    queryKey: fileKeys.list(workspaceId, folderId),
    queryFn: () => fileApi.getFiles(workspaceId, folderId),
    enabled: !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useFile = (workspaceId: string, fileId: string) => {
  return useQuery({
    queryKey: fileKeys.detail(fileId),
    queryFn: () => fileApi.getFile(workspaceId, fileId),
    enabled: !!workspaceId && !!fileId,
  });
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UploadFileRequest }) =>
      fileApi.uploadFile(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (matches all folderId variations)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after file upload');
    },
  });
};

export const useUploadMultipleFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, files, parentId }: {
      workspaceId: string;
      files: File[];
      parentId?: string;
    }) => fileApi.uploadMultipleFiles(workspaceId, files, parentId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after multiple file upload');
    },
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateFolderRequest }) =>
      fileApi.createFolder(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after folder creation');
    },
  });
};

export const useUpdateFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, data }: { fileId: string; data: UpdateFileRequest }) =>
      fileApi.updateFile(fileId, data),
    onSuccess: (updatedFile) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(updatedFile.id) });
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      if (updatedFile.isStarred !== undefined) {
        queryClient.invalidateQueries({
          predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'starred'
        });
      }
    },
  });
};

export const useDeleteFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileIds }: { workspaceId: string; fileIds: string[] }) =>
      fileApi.deleteFiles(workspaceId, fileIds),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after file deletion');
    },
  });
};

export const useDeleteFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId }: { workspaceId: string; fileId: string }) =>
      fileApi.deleteFile(workspaceId, fileId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      // Invalidate all file-related views
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash(workspaceId) });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'starred'
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'recent'
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'shared'
      });
      // Invalidate file type queries (images, documents, videos, etc.)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' && queryKey[1] === 'by-type';
        }
      });
      console.log('✅ Cache invalidated after file deletion (all views)');
    },
  });
};

export const useDeleteFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, folderId }: { workspaceId: string; folderId: string }) =>
      fileApi.deleteFolder(workspaceId, folderId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      // Invalidate all file-related views
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash(workspaceId) });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'starred'
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'recent'
      });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'shared'
      });
      // Invalidate file type queries (images, documents, videos, etc.)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' && queryKey[1] === 'by-type';
        }
      });
      console.log('✅ Cache invalidated after folder deletion (all views)');
    },
  });
};

export const useRestoreFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId }: { workspaceId: string; fileId: string }) =>
      fileApi.restoreFile(workspaceId, fileId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (file is restored to its original location)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash(workspaceId) });
      console.log('✅ Cache invalidated after file restoration');
    },
  });
};

export const useRestoreFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, folderId }: { workspaceId: string; folderId: string }) =>
      fileApi.restoreFolder(workspaceId, folderId),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (folder is restored with all contents)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.trash(workspaceId) });
      console.log('✅ Cache invalidated after folder restoration');
    },
  });
};

export const useRenameFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, name }: { workspaceId: string; fileId: string; name: string }) =>
      fileApi.renameFile(workspaceId, fileId, name),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      console.log('✅ Cache invalidated after file rename');
    },
  });
};

export const useRenameFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, folderId, name }: { workspaceId: string; folderId: string; name: string }) =>
      fileApi.renameFolder(workspaceId, folderId, name),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      console.log('✅ Cache invalidated after folder rename');
    },
  });
};

export const useMarkFileAsOpened = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId }: { workspaceId: string; fileId: string }) =>
      fileApi.markFileAsOpened(workspaceId, fileId),
    onSuccess: () => {
      // Invalidate recent files query to refresh the list
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'recent'
      });
      console.log('✅ Cache invalidated after marking file as opened');
    },
  });
};

export const useToggleStarFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, starred }: { workspaceId: string; fileId: string; starred: boolean }) =>
      fileApi.toggleStarFile(workspaceId, fileId, starred),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate all folder queries to update star status in current view
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      // Invalidate starred files query
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'starred'
      });
      // Invalidate recent files query
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'recent'
      });
      console.log('✅ Cache invalidated after toggling star (all views updated)');
    },
  });
};

export const useMoveFiles = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: fileApi.moveFiles,
    onSuccess: () => {
      // Invalidate ALL folder queries (file moved from one folder to another)
      queryClient.invalidateQueries({ queryKey: fileKeys.lists() });
      console.log('✅ Cache invalidated after file move');
    },
  });
};

export const useCopyFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, targetFolderId, newName }: {
      workspaceId: string;
      fileId: string;
      targetFolderId: string | null;
      newName: string;
    }) => fileApi.copyFile(workspaceId, fileId, targetFolderId, newName),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (file copied to a folder)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after file copy');
    },
  });
};

export const useCopyFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, folderId, targetParentId, newName }: {
      workspaceId: string;
      folderId: string;
      targetParentId: string | null;
      newName: string;
    }) => fileApi.copyFolder(workspaceId, folderId, targetParentId, newName),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (folder copied to a parent)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after folder copy');
    },
  });
};

export const useMoveFile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, targetFolderId, newName }: {
      workspaceId: string;
      fileId: string;
      targetFolderId: string | null;
      newName?: string;
    }) => fileApi.moveFile(workspaceId, fileId, targetFolderId, newName),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (file moved from one folder to another)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after file move');
    },
  });
};

export const useMoveFolder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, folderId, targetParentId, newName }: {
      workspaceId: string;
      folderId: string;
      targetParentId: string | null;
      newName?: string;
    }) => fileApi.moveFolder(workspaceId, folderId, targetParentId, newName),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace (folder moved to a new parent)
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after folder move');
    },
  });
};

export const useShareFile = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: fileApi.shareFile,
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(fileId) });
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'files' && query.queryKey[1] === 'shared'
      });
    },
  });
};

export const useStorageStats = (workspaceId: string) => {
  return useQuery({
    queryKey: fileKeys.storage(workspaceId),
    queryFn: () => fileApi.getStorageStats(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useStarredFiles = (workspaceId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: fileKeys.starred(workspaceId),
    queryFn: () => fileApi.getStarredFiles(workspaceId),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useSharedWithMeFiles = (workspaceId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...fileKeys.shared(workspaceId), 'with-me'],
    queryFn: () => fileApi.getSharedWithMe(workspaceId),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useRecentFiles = (workspaceId: string, limit?: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: fileKeys.recent(workspaceId),
    queryFn: () => fileApi.getRecentFiles(workspaceId, limit),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useFilesByType = (
  workspaceId: string,
  category: 'documents' | 'pdfs' | 'images' | 'spreadsheets' | 'videos' | 'audio',
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...fileKeys.all, 'by-type', category],
    queryFn: () => fileApi.getFilesByType(workspaceId, category),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useDashboardStats = (workspaceId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...fileKeys.all, 'dashboard-stats', workspaceId],
    queryFn: () => fileApi.getDashboardStats(workspaceId),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useTrashItems = (workspaceId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: fileKeys.trash(workspaceId),
    queryFn: () => fileApi.getTrashItems(workspaceId),
    enabled: options?.enabled ?? !!workspaceId,
    staleTime: 60000, // 1 minute cache
  });
};

export const useFileVersions = (fileId: string) => {
  return useQuery({
    queryKey: fileKeys.versions(fileId),
    queryFn: () => fileApi.getFileVersions(fileId),
    enabled: !!fileId,
  });
};

// File Comments Hooks
export const useFileComments = (workspaceId: string, fileId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: fileKeys.comments(fileId),
    queryFn: () => fileApi.getFileComments(workspaceId, fileId),
    enabled: options?.enabled ?? (!!workspaceId && !!fileId),
    staleTime: 30000, // 30 seconds cache
  });
};

export const useCreateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, data }: {
      workspaceId: string;
      fileId: string;
      data: CreateCommentRequest;
    }) => fileApi.createComment(workspaceId, fileId, data),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.comments(fileId) });
    },
  });
};

export const useUpdateComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, commentId, data }: {
      workspaceId: string;
      fileId: string;
      commentId: string;
      data: UpdateCommentRequest;
    }) => fileApi.updateComment(workspaceId, fileId, commentId, data),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.comments(fileId) });
    },
  });
};

export const useDeleteComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, commentId }: {
      workspaceId: string;
      fileId: string;
      commentId: string;
    }) => fileApi.deleteComment(workspaceId, fileId, commentId),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.comments(fileId) });
    },
  });
};

export const useResolveComment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, commentId, isResolved }: {
      workspaceId: string;
      fileId: string;
      commentId: string;
      isResolved: boolean;
    }) => fileApi.resolveComment(workspaceId, fileId, commentId, isResolved),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.comments(fileId) });
    },
  });
};

export const useUploadNewVersion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ fileId, file, comment }: { 
      fileId: string; 
      file: File; 
      comment?: string;
    }) => fileApi.uploadNewVersion(fileId, file, comment),
    onSuccess: (_, { fileId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.versions(fileId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.detail(fileId) });
    },
  });
};

export const useAddFileByUrl = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, data }: {
      workspaceId: string;
      data: Parameters<typeof fileApi.addFileByUrl>[1];
    }) => fileApi.addFileByUrl(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate ALL folder queries for this workspace
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey as string[];
          return queryKey[0] === 'files' &&
                 queryKey[1] === 'list' &&
                 queryKey[2] === workspaceId;
        }
      });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
      console.log('✅ Cache invalidated after adding file by URL');
    },
  });
};

export const useGenerateFileWithAI = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, prompt, type }: {
      workspaceId: string;
      prompt: string;
      type: 'document' | 'image' | 'audio' | 'video';
    }) => fileApi.generateFileWithAI(workspaceId, prompt, type),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: fileKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: fileKeys.storage(workspaceId) });
    },
  });
};

export const useSearchFiles = (workspaceId: string, query: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...fileKeys.all, 'search', workspaceId, query],
    queryFn: async () => {
      const response = await fileApi.searchFiles(workspaceId, query, { limit: 100 });

      // Transform the response data to FileItem format
      const files: FileItem[] = response.data.map(file => ({
        id: file.id,
        workspaceId: file.workspace_id,
        workspace_id: file.workspace_id,
        name: file.name,
        type: 'file' as const,
        mimeType: file.mime_type,
        mime_type: file.mime_type,
        size: parseInt(file.size, 10),
        folderId: file.folder_id || undefined,
        folder_id: file.folder_id,
        url: file.url,
        storage_path: file.storage_path,
        starred: file.starred,
        isStarred: file.starred,
        createdBy: file.uploaded_by,
        uploaded_by: file.uploaded_by,
        createdAt: file.created_at,
        created_at: file.created_at,
        updatedAt: file.updated_at,
        updated_at: file.updated_at,
        version: file.version,
        previous_version_id: file.previous_version_id,
        file_hash: file.file_hash,
        virus_scan_status: file.virus_scan_status,
        virus_scan_at: file.virus_scan_at,
        extracted_text: file.extracted_text,
        ocr_status: file.ocr_status,
        metadata: file.metadata,
        collaborative_data: file.collaborative_data,
        is_deleted: file.is_deleted,
        deleted_at: file.deleted_at,
        starred_at: file.starred_at,
        starred_by: file.starred_by,
        last_opened_at: file.last_opened_at,
        last_opened_by: file.last_opened_by,
        open_count: file.open_count,
        parent_folder_ids: file.parent_folder_ids,
        shareSettings: {
          isPublic: file.metadata?.is_public || false
        }
      }));

      return files;
    },
    enabled: options?.enabled ?? (!!workspaceId && query.trim().length > 0),
    staleTime: 30000, // 30 seconds cache for search results
  });
};

// Backward compatibility: export as filesService
export const filesService = fileApi;

// ============================================
// FILES AI AGENT API
// ============================================

export interface FileAgentResponse {
  success: boolean;
  action:
    | 'create_folder'
    | 'rename_folder'
    | 'rename_file'
    | 'delete_folder'
    | 'delete_file'
    | 'move_file'
    | 'move_folder'
    | 'copy_file'
    | 'copy_folder'
    | 'share_file'
    | 'star_file'
    | 'unstar_file'
    | 'search'
    | 'batch_create_folders'
    | 'batch_delete_files'
    | 'batch_delete_folders'
    | 'batch_move_files'
    | 'batch_move_folders'
    | 'unknown';
  message: string;
  data?: {
    folder?: FileItem;
    file?: FileItem;
    deletedFileId?: string;
    deletedFileName?: string;
    deletedFolderId?: string;
    deletedFolderName?: string;
    results?: any[];
    successful?: number;
    failed?: number;
    query?: string;
    count?: number;
    files?: FileItem[];
  };
  error?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: string;
  success?: boolean;
}

export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  actionCounts: Record<string, number>;
  entityTypes: Record<string, number>;
}

// AI Agent API Functions
export const filesAgentApi = {
  /**
   * Process a natural language command for files management
   */
  async processCommand(workspaceId: string, prompt: string): Promise<FileAgentResponse> {
    return api.post<FileAgentResponse>(`/workspaces/${workspaceId}/files/ai`, { prompt });
  },

  /**
   * Get conversation history for the files AI agent
   */
  async getConversationHistory(workspaceId: string, limit?: number): Promise<ConversationMessage[]> {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<ConversationMessage[]>(`/workspaces/${workspaceId}/files/ai/history${params}`);
  },

  /**
   * Clear conversation history for the files AI agent
   */
  async clearConversationHistory(workspaceId: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/files/ai/history`);
  },

  /**
   * Get conversation statistics for the files AI agent
   */
  async getConversationStats(workspaceId: string): Promise<ConversationStats> {
    return api.get<ConversationStats>(`/workspaces/${workspaceId}/files/ai/stats`);
  },
};

// ============================================
// OFFLINE FILES API
// ============================================

export type OfflineSyncStatus = 'pending' | 'syncing' | 'synced' | 'error' | 'outdated';

export interface OfflineFile {
  id: string;
  fileId: string;
  userId: string;
  workspaceId: string;
  syncStatus: OfflineSyncStatus;
  lastSyncedAt: string | null;
  syncedVersion: number;
  autoSync: boolean;
  priority: number;
  fileSize: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  // Joined file data
  fileName?: string;
  mimeType?: string;
  fileUrl?: string;
  serverVersion?: number;
  needsSync?: boolean;
}

export interface MarkOfflineOptions {
  autoSync?: boolean;
  priority?: number;
}

export interface UpdateOfflineOptions {
  autoSync?: boolean;
  priority?: number;
  syncStatus?: OfflineSyncStatus;
  syncedVersion?: number;
  errorMessage?: string;
}

export interface OfflineStorageStats {
  totalFiles: number;
  totalSize: number;
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
  outdatedCount: number;
}

export interface CheckUpdateResult {
  fileId: string;
  serverVersion: number;
  syncedVersion: number;
  hasUpdate: boolean;
  fileSize: number;
  updatedAt: string;
}

export interface BatchSyncUpdate {
  fileId: string;
  syncStatus: OfflineSyncStatus;
  syncedVersion?: number;
  errorMessage?: string;
}

export const offlineFilesApi = {
  /**
   * Mark a file for offline access
   */
  async markFileOffline(workspaceId: string, fileId: string, options?: MarkOfflineOptions): Promise<OfflineFile> {
    return api.post<OfflineFile>(`/workspaces/${workspaceId}/files/${fileId}/offline`, options || {});
  },

  /**
   * Remove file from offline access
   */
  async removeFileOffline(workspaceId: string, fileId: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/files/${fileId}/offline`);
  },

  /**
   * Get all offline files for a workspace
   */
  async getOfflineFiles(workspaceId: string): Promise<OfflineFile[]> {
    return api.get<OfflineFile[]>(`/workspaces/${workspaceId}/files/offline`);
  },

  /**
   * Get offline status for a specific file
   */
  async getOfflineStatus(workspaceId: string, fileId: string): Promise<{ isOffline: boolean } & Partial<OfflineFile>> {
    return api.get<{ isOffline: boolean } & Partial<OfflineFile>>(`/workspaces/${workspaceId}/files/${fileId}/offline`);
  },

  /**
   * Update offline file settings
   */
  async updateOfflineSettings(workspaceId: string, fileId: string, options: UpdateOfflineOptions): Promise<OfflineFile> {
    return api.put<OfflineFile>(`/workspaces/${workspaceId}/files/${fileId}/offline`, options);
  },

  /**
   * Check if file has updates available
   */
  async checkFileUpdate(workspaceId: string, fileId: string): Promise<CheckUpdateResult> {
    return api.get<CheckUpdateResult>(`/workspaces/${workspaceId}/files/${fileId}/offline/check-update`);
  },

  /**
   * Get offline storage statistics
   */
  async getOfflineStorageStats(workspaceId: string): Promise<OfflineStorageStats> {
    return api.get<OfflineStorageStats>(`/workspaces/${workspaceId}/files/offline/stats`);
  },

  /**
   * Get files that need syncing
   */
  async getFilesNeedingSync(workspaceId: string): Promise<OfflineFile[]> {
    return api.get<OfflineFile[]>(`/workspaces/${workspaceId}/files/offline/needs-sync`);
  },

  /**
   * Batch update sync status for multiple files
   */
  async batchUpdateSyncStatus(workspaceId: string, updates: BatchSyncUpdate[]): Promise<Array<{ fileId: string; success: boolean; error?: string }>> {
    return api.post<Array<{ fileId: string; success: boolean; error?: string }>>(`/workspaces/${workspaceId}/files/offline/sync-status`, { updates });
  },
};

// ============================================
// OFFLINE FILES REACT QUERY HOOKS
// ============================================

/**
 * Hook to get all offline files for a workspace
 */
export function useOfflineFiles(workspaceId: string) {
  return useQuery({
    queryKey: ['offline-files', workspaceId],
    queryFn: () => offlineFilesApi.getOfflineFiles(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}

/**
 * Hook to get offline status for a specific file
 */
export function useOfflineStatus(workspaceId: string, fileId: string) {
  return useQuery({
    queryKey: ['offline-status', workspaceId, fileId],
    queryFn: () => offlineFilesApi.getOfflineStatus(workspaceId, fileId),
    enabled: !!workspaceId && !!fileId,
    staleTime: 30000,
  });
}

/**
 * Hook to get offline storage statistics
 */
export function useOfflineStorageStats(workspaceId: string) {
  return useQuery({
    queryKey: ['offline-storage-stats', workspaceId],
    queryFn: () => offlineFilesApi.getOfflineStorageStats(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60000,
  });
}

/**
 * Hook to get files needing sync
 */
export function useFilesNeedingSync(workspaceId: string) {
  return useQuery({
    queryKey: ['files-needing-sync', workspaceId],
    queryFn: () => offlineFilesApi.getFilesNeedingSync(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
  });
}

/**
 * Hook to mark a file for offline access
 */
export function useMarkFileOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, options }: { workspaceId: string; fileId: string; options?: MarkOfflineOptions }) =>
      offlineFilesApi.markFileOffline(workspaceId, fileId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offline-files', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['offline-status', variables.workspaceId, variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['offline-storage-stats', variables.workspaceId] });
    },
  });
}

/**
 * Hook to remove file from offline access
 */
export function useRemoveFileOffline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId }: { workspaceId: string; fileId: string }) =>
      offlineFilesApi.removeFileOffline(workspaceId, fileId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offline-files', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['offline-status', variables.workspaceId, variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['offline-storage-stats', variables.workspaceId] });
    },
  });
}

/**
 * Hook to update offline file settings
 */
export function useUpdateOfflineSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, fileId, options }: { workspaceId: string; fileId: string; options: UpdateOfflineOptions }) =>
      offlineFilesApi.updateOfflineSettings(workspaceId, fileId, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offline-files', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['offline-status', variables.workspaceId, variables.fileId] });
      queryClient.invalidateQueries({ queryKey: ['offline-storage-stats', variables.workspaceId] });
    },
  });
}

/**
 * Hook to batch update sync status
 */
export function useBatchUpdateSyncStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, updates }: { workspaceId: string; updates: BatchSyncUpdate[] }) =>
      offlineFilesApi.batchUpdateSyncStatus(workspaceId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['offline-files', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['offline-storage-stats', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['files-needing-sync', variables.workspaceId] });
    },
  });
}