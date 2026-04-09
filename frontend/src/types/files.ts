/**
 * File Management Types
 */

export interface FileItem {
  id: string;
  workspaceId?: string;
  workspace_id?: string; // Backend uses snake_case
  name: string;
  originalName?: string;
  type: 'file' | 'folder';
  mimeType?: string;
  mime_type?: string; // Backend uses snake_case
  size?: number;
  parentId?: string | null; // For folders (local state)
  parent_id?: string | null; // For folders (backend uses snake_case)
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
  uploadedBy?: string;
  uploadedAt?: string;
  isPublic?: boolean;
  downloadCount?: number;
  content?: string;
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
  // UI-specific fields
  uploader?: {
    id: string;
    name?: string;
    email: string;
    avatarUrl?: string;
  };
  sharePermissions?: SharePermission[];
  shareSettings?: ShareSettings;
}

export interface SharePermission {
  userId: string;
  userName: string;
  userEmail: string;
  permission: 'view' | 'edit';
  addedAt: string;
}

export interface ShareSettings {
  isPublic?: boolean;
  publicUrl?: string;
  allowDownload?: boolean;
  expiresAt?: string;
  password?: string;
}

export interface FileCategory {
  type: 'recent' | 'starred' | 'shared' | 'all' | 'trash';
  label: string;
}

export interface StorageStats {
  totalSize: number;
  maxStorage: number;
  usagePercentage: number;
  availableSpace: number;
  fileTypeCounts: {
    documents: number;
    images: number;
    videos: number;
    audio: number;
    others: number;
  };
}

export interface FilesSidebarContent {
  type: 'storage' | 'info' | 'preview' | 'activity' | 'comments';
  selectedFile: FileItem | null;
}

export type FilesSidebarContentType = 'storage' | 'info' | 'preview' | 'activity' | 'comments';
