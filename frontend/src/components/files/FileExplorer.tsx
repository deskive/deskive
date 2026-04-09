/**
 * File Explorer Component
 * Main file browser with breadcrumbs, filters, and grid/list views
 */

import React, { useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import {
  FolderPlus,
  LayoutGrid,
  List,
  Star,
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  FileCode,
  FileSpreadsheet,
  MoreVertical,
  Filter,
  Calendar,
  ChevronDown,
  X,
  Share2,
  CheckCircle2,
  Circle,
  Loader2,
  FileVideo,
  FileType,
  Copy,
  Move,
  Trash2,
  CloudDownload,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { FileBreadcrumbs } from './FileBreadcrumbs';
import { FileActionsDropdown } from './FileActionsDropdown';
import { FolderContextMenu } from './FolderContextMenu';
import { ShareModal } from './ShareModal';
import { FileUploadModal } from './FileUploadModal';
import { AICreationPanel } from './AICreationPanel';
import {
  CreateFolderDialog,
  RenameDialog,
  DeleteConfirmDialog,
  FilePreviewDialog,
  FilePropertiesDialog,
} from './FileOperationDialogs';
import { GoogleDriveImportModal } from './GoogleDriveImportModal';
import { GoogleDriveExportModal } from './GoogleDriveExportModal';
import { DropboxImportModal } from './DropboxImportModal';
import { DropboxExportModal } from './DropboxExportModal';
import { FileCommentsModal } from './FileCommentsModal';
import { googleDriveApi } from '../../lib/api/google-drive-api';
import dropboxApi from '../../lib/api/dropbox-api';
import { useFilesSidebar } from '../../contexts/FilesSidebarContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { OfflineStatusBadge } from './OfflineStatusBadge';
import type { FileItem } from '../../types';

interface FileExplorerProps {
  files?: FileItem[];
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  searchQuery?: string;
  onFileClick?: (file: FileItem) => void;
  onFileDelete?: (fileId: string) => void;
  onFileDownload?: (fileId: string, fileName: string) => void;
  onFileRename?: (fileId: string, newName: string, itemType: 'file' | 'folder') => void;
  onToggleStar?: (fileId: string, currentStarred: boolean) => void;
  onFileRestore?: (fileId: string) => void;
  onCreateFolder?: (name: string, parentId: string | null, description?: string) => void;
  onUploadFiles?: () => void;
  onFolderChange?: (folderId: string | null, folderName?: string, navigationType?: 'enter' | 'back') => void;
  onFileCopy?: (fileId: string, targetFolderId: string | null, newName: string) => Promise<void>;
  onFolderCopy?: (folderId: string, targetParentId: string | null, newName: string) => Promise<void>;
  onFileMove?: (fileId: string, targetFolderId: string | null, newName?: string) => Promise<void>;
  onFolderMove?: (folderId: string, targetParentId: string | null, newName?: string) => Promise<void>;
  workspaceId: string;
  isFetching?: boolean; // Loading state for folder navigation
  currentFolderId?: string | null; // Current folder ID from parent
  breadcrumbTrail?: Array<{ id: string | null; name: string; }>; // Breadcrumb trail from parent
  isTrashView?: boolean; // Whether we're in trash view
  isSearchView?: boolean; // Whether we're in search view
  isSharedWithMeView?: boolean; // Whether we're in shared-with-me view
  allowCutCopyPaste?: boolean; // Whether cut/copy/paste operations are allowed
}

interface FileFilters {
  type: string[];
  dateModified: string | null;
}

// Helper function to determine file type
const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('document') || mimeType.includes('msword')) return 'document';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  return 'other';
};

export function FileExplorer({
  files = [],
  viewMode = 'grid',
  onViewModeChange,
  searchQuery = '',
  onFileClick,
  onFileDelete,
  onFileDownload,
  onFileRename,
  onToggleStar,
  onFileRestore,
  onCreateFolder,
  onUploadFiles,
  onFolderChange,
  onFileCopy,
  onFolderCopy,
  onFileMove,
  onFolderMove,
  workspaceId,
  isFetching = false,
  currentFolderId: parentFolderId = null,
  breadcrumbTrail: parentBreadcrumbs = [{ id: null, name: 'All Files' }],
  isTrashView = false,
  isSearchView = false,
  isSharedWithMeView = false,
  allowCutCopyPaste = true,
}: FileExplorerProps) {
  const intl = useIntl();

  // Use parent's state
  const currentFolderId = parentFolderId;
  const breadcrumbs = parentBreadcrumbs;

  // TanStack Query client for cache invalidation
  const queryClient = useQueryClient();

  // Sidebar context for file info/comments panel
  const { setSelectedFile, setContent } = useFilesSidebar();

  // Offline sync hook
  const { markFileOffline, removeFileOffline, isMarkingOffline } = useOfflineSync({
    workspaceId,
    enableAutoSync: true,
  });

  // Debug logging
  React.useEffect(() => {
    console.log('🔄 FileExplorer render:', {
      currentFolderId: currentFolderId || 'ROOT',
      breadcrumbTrail: breadcrumbs.map(b => b.name).join(' > '),
      filesCount: files.length,
    });
  });

  const [filters, setFilters] = useState<FileFilters>({
    type: [],
    dateModified: null,
  });

  // Selection state - support multiple selection
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  // Clipboard state for copy/paste - store file/folder info for copy operation
  // Initialize from localStorage to persist across folder navigation
  // Supports both single and multiple items
  const [clipboard, setClipboard] = useState<{
    itemId: string;
    itemName: string;
    itemType: 'file' | 'folder';
    operation: 'copy' | 'cut';
    // For bulk operations
    itemIds?: string[];
    items?: Array<{ id: string; name: string; type: 'file' | 'folder' }>;
  } | null>(() => {
    try {
      const stored = localStorage.getItem('fileExplorer_clipboard');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('📋 Restored clipboard from localStorage:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('Failed to restore clipboard from localStorage:', error);
    }
    return null;
  });

  // Save clipboard to localStorage whenever it changes
  React.useEffect(() => {
    if (clipboard) {
      localStorage.setItem('fileExplorer_clipboard', JSON.stringify(clipboard));
      console.log('💾 Saved clipboard to localStorage:', clipboard);
    } else {
      localStorage.removeItem('fileExplorer_clipboard');
      console.log('🗑️ Cleared clipboard from localStorage');
    }
  }, [clipboard]);

  // Debug clipboard state
  React.useEffect(() => {
    console.log('📋 Clipboard state:', {
      hasClipboard: !!clipboard,
      clipboard,
      isFetching,
      canPaste: !!clipboard && !isFetching,
      currentFolderId: currentFolderId || 'ROOT'
    });
  }, [clipboard, isFetching, currentFolderId]);

  // Dialog states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDriveImport, setShowDriveImport] = useState(false);
  const [showDropboxImport, setShowDropboxImport] = useState(false);
  const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
  const [isDropboxConnected, setIsDropboxConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [aiCreationPanel, setAICreationPanel] = useState<{ isOpen: boolean; type: 'image' | 'audio' | 'video' | 'document' }>({ isOpen: false, type: 'image' });
  const [renameDialog, setRenameDialog] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ ids: string[]; names?: string[]; isMultiple?: boolean } | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [propertiesFile, setPropertiesFile] = useState<FileItem | null>(null);
  const [shareFile, setShareFile] = useState<{ id: string; name: string } | null>(null);
  const [commentsFile, setCommentsFile] = useState<{ id: string; name: string } | null>(null);
  const [exportToDriveFile, setExportToDriveFile] = useState<FileItem | null>(null);
  const [exportToDropboxFile, setExportToDropboxFile] = useState<FileItem | null>(null);

  const getFileIcon = (file: FileItem, size: 'small' | 'large' = 'small') => {
    if (file.type === 'folder') return <Folder className={size === 'large' ? 'h-12 w-12' : 'h-5 w-5'} style={{ color: '#3b82f6' }} />;

    // Support both mimeType and mime_type fields
    const mimeType = file.mimeType || (file as any).mime_type;

    // For image files, show the actual image as thumbnail
    // Check multiple possible URL fields - handle both string and object formats
    let imageUrl: string | undefined;
    if (typeof file.url === 'object' && file.url !== null && 'publicUrl' in file.url) {
      imageUrl = (file.url as any).publicUrl;
    } else {
      imageUrl = file.url as string | undefined;
    }
    imageUrl = imageUrl || (file as any).storage_path;

    if (mimeType?.startsWith('image/') && imageUrl) {
      console.log('🖼️ Rendering image thumbnail:', { name: file.name, url: imageUrl, mimeType });
      return (
        <div className={`${size === 'large' ? 'w-16 h-16' : 'w-12 h-12'} rounded-lg overflow-hidden bg-muted flex items-center justify-center`}>
          <img
            src={imageUrl as string}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              console.warn('❌ Failed to load image thumbnail:', imageUrl);
              e.currentTarget.style.display = 'none';
              const parent = e.currentTarget.parentElement;
              if (parent) {
                parent.innerHTML = '<svg class="h-8 w-8 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>';
              }
            }}
            onLoad={() => {
              console.log('✅ Image thumbnail loaded successfully:', file.name);
            }}
          />
        </div>
      );
    } else if (mimeType?.startsWith('image/')) {
      console.warn('⚠️ Image file but no URL:', { name: file.name, url: file.url, storage_path: (file as any).storage_path, mimeType });
    }

    // Other file types use icons
    const iconSize = size === 'large' ? 'h-12 w-12' : 'h-5 w-5';

    // PDF files
    if (mimeType?.includes('pdf') || file.name.endsWith('.pdf')) {
      return <FileType className={`${iconSize} text-red-600`} />;
    }

    // Video files
    if (mimeType?.startsWith('video/') || file.name.match(/\.(mp4|mov|avi|mkv|webm)$/i)) {
      return <FileVideo className={`${iconSize} text-purple-600`} />;
    }

    // Code files
    if (mimeType?.includes('json') || file.name.endsWith('.json')) {
      return <FileCode className={`${iconSize} text-gray-600`} />;
    }

    // Spreadsheet files
    if (mimeType?.includes('sheet') || file.name.endsWith('.xlsx')) {
      return <FileSpreadsheet className={`${iconSize} text-green-600`} />;
    }

    // Text files
    if (mimeType?.startsWith('text/') || file.name.endsWith('.txt')) {
      return <FileText className={`${iconSize} text-gray-600`} />;
    }

    return <File className={`${iconSize} text-gray-600`} />;
  };

  const handleFileClick = (file: FileItem, event?: React.MouseEvent) => {
    if (event?.ctrlKey || event?.metaKey) {
      // Ctrl/Cmd + click: toggle selection
      setSelectedFileIds(prev => {
        const newSelection = prev.includes(file.id)
          ? prev.filter(id => id !== file.id)
          : [...prev, file.id];
        // Update sidebar: show file info if exactly one file selected
        if (newSelection.length === 1) {
          const selectedFile = filteredFiles.find(f => f.id === newSelection[0]);
          if (selectedFile && selectedFile.type !== 'folder') {
            setSelectedFile(selectedFile);
            setContent('info');
          }
        } else {
          setSelectedFile(null);
        }
        return newSelection;
      });
    } else if (event?.shiftKey && selectedFileIds.length > 0) {
      // Shift + click: select range
      const lastSelectedIndex = filteredFiles.findIndex(f => f.id === selectedFileIds[selectedFileIds.length - 1]);
      const currentIndex = filteredFiles.findIndex(f => f.id === file.id);
      const start = Math.min(lastSelectedIndex, currentIndex);
      const end = Math.max(lastSelectedIndex, currentIndex);
      const rangeIds = filteredFiles.slice(start, end + 1).map(f => f.id);
      setSelectedFileIds(rangeIds);
      // Clear sidebar selection for multi-select
      setSelectedFile(null);
    } else {
      // Normal click: toggle selection if already selected, otherwise select
      if (selectedFileIds.length === 1 && selectedFileIds.includes(file.id)) {
        // Clicking on the only selected item - unselect it
        setSelectedFileIds([]);
        setSelectedFile(null);
      } else {
        // Select this item (replacing any previous selection)
        setSelectedFileIds([file.id]);
        // Update sidebar to show file info (only for files, not folders)
        if (file.type !== 'folder') {
          setSelectedFile(file);
          setContent('info');
        } else {
          setSelectedFile(null);
        }
      }
    }
    onFileClick?.(file);
  };

  const handleFileDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
      console.log('👆 Double-clicked folder:', file.name, 'id:', file.id);

      // Only update if it's actually different
      if (currentFolderId !== file.id) {
        // Notify parent to fetch new folder data and update breadcrumbs
        console.log('📞 Calling onFolderChange (enter):', file.id, file.name);
        onFolderChange?.(file.id, file.name, 'enter');
      }

      setSelectedFileIds([]); // Clear selection when navigating
    } else {
      setPreviewFile(file);
    }
  };

  // Handle toggle offline for a file
  const handleToggleOffline = async (file: FileItem) => {
    if (file.type !== 'file') return;

    try {
      // For now, we'll just mark it for offline - the hook handles the logic
      await markFileOffline(file.id, {
        fileName: file.name,
        mimeType: file.mime_type || file.mimeType || 'application/octet-stream',
        size: file.size || 0,
        version: file.version || 1,
        url: typeof file.url === 'string' ? file.url : file.url?.publicUrl,
      });
    } catch (error) {
      console.error('Failed to toggle offline:', error);
    }
  };

  const handleNavigate = (folderId: string | null) => {
    console.log('🧭 Navigating to folderId:', folderId || 'ROOT');

    // Only update if it's actually different
    if (currentFolderId !== folderId) {
      // Notify parent to fetch new folder data and update breadcrumbs
      console.log('📞 Calling onFolderChange (back):', folderId || 'ROOT');
      onFolderChange?.(folderId, undefined, 'back');
    }

    setSelectedFileIds([]); // Clear selection when navigating
  };

  const handleClearSelection = () => {
    setSelectedFileIds([]);
    setSelectedFile(null);
  };

  // Bulk operations handlers
  const handleBulkDelete = () => {
    if (selectedFileIds.length === 0) return;

    setDeleteDialog({
      ids: selectedFileIds,
      names: files.filter(f => selectedFileIds.includes(f.id)).map(f => f.name),
      isMultiple: true
    });
  };

  const handleBulkCopy = async () => {
    if (selectedFileIds.length === 0) return;

    const selectedItems = files.filter(f => selectedFileIds.includes(f.id));

    // Store selected items in clipboard for later pasting
    const clipboardData = {
      itemId: selectedItems[0].id, // For backwards compatibility
      itemName: selectedItems[0].name,
      itemType: selectedItems[0].type as 'file' | 'folder',
      operation: 'copy' as const,
      // Bulk operation data
      itemIds: selectedItems.map(item => item.id),
      items: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type as 'file' | 'folder'
      }))
    };

    console.log('📋 Setting clipboard (BULK COPY):', clipboardData);
    setClipboard(clipboardData);
    toast.success(intl.formatMessage(
      { id: 'modules.files.success.copiedToClipboard', defaultMessage: 'Copied {count} item{plural} to clipboard' },
      { count: selectedFileIds.length, plural: selectedFileIds.length > 1 ? 's' : '' }
    ));
    setSelectedFileIds([]); // Clear selection after copying to clipboard
  };

  const handleBulkMove = async () => {
    if (selectedFileIds.length === 0) return;

    const selectedItems = files.filter(f => selectedFileIds.includes(f.id));

    // Store selected items in clipboard for later pasting
    const clipboardData = {
      itemId: selectedItems[0].id, // For backwards compatibility
      itemName: selectedItems[0].name,
      itemType: selectedItems[0].type as 'file' | 'folder',
      operation: 'cut' as const,
      // Bulk operation data
      itemIds: selectedItems.map(item => item.id),
      items: selectedItems.map(item => ({
        id: item.id,
        name: item.name,
        type: item.type as 'file' | 'folder'
      }))
    };

    console.log('✂️ Setting clipboard (BULK CUT):', clipboardData);
    setClipboard(clipboardData);
    toast.success(`Cut ${selectedFileIds.length} item${selectedFileIds.length > 1 ? 's' : ''} to clipboard`);
    setSelectedFileIds([]); // Clear selection after cutting to clipboard
  };

  const handleCreateFolder = (name: string, description?: string) => {
    onCreateFolder?.(name, currentFolderId || null, description);
    setShowCreateFolder(false);
  };

  const handleDelete = async () => {
    if (!deleteDialog || deleteDialog.ids.length === 0) return;

    try {
      if (deleteDialog.ids.length === 1) {
        // Single item deletion - use the prop function
        await onFileDelete?.(deleteDialog.ids[0]);
        toast.success('Deleted 1 item');
      } else {
        // Multiple items deletion - separate files and folders
        const selectedItems = deleteDialog.ids.map(id => files.find(f => f.id === id)).filter(Boolean);
        const fileIds = selectedItems.filter(item => item?.type === 'file').map(item => item!.id);
        const folderIds = selectedItems.filter(item => item?.type === 'folder').map(item => item!.id);

        const { fileApi } = await import('../../lib/api/files-api');

        let totalDeleted = 0;
        let totalFailed = 0;
        const allFailedMessages: string[] = [];

        // Batch delete folders if any
        if (folderIds.length > 0) {
          const folderResult = await fileApi.deleteMultipleFolders(workspaceId, folderIds);
          totalDeleted += folderResult.success.length;
          totalFailed += folderResult.failed.length;

          if (folderResult.failed.length > 0) {
            allFailedMessages.push(...folderResult.failed.map(f => f.reason));
          }

          console.log(`🗑️ Deleted ${folderResult.success.length} folders (${folderResult.deleted_folders_count} total folders, ${folderResult.deleted_files_count} files)`);
        }

        // Batch delete files if any
        if (fileIds.length > 0) {
          const fileResult = await fileApi.deleteMultipleFiles(workspaceId, fileIds);
          totalDeleted += fileResult.deleted_count;
          totalFailed += fileResult.failed_count;

          if (fileResult.failed_count > 0) {
            allFailedMessages.push(...fileResult.failed.map(f => f.reason));
          }

          console.log(`🗑️ Deleted ${fileResult.deleted_count} files`);
        }

        // Show combined results
        if (totalDeleted > 0) {
          toast.success(`Successfully deleted ${totalDeleted} item${totalDeleted > 1 ? 's' : ''}`);
        }

        if (totalFailed > 0) {
          const failedMessages = allFailedMessages.join(', ');
          toast.error(`Failed to delete ${totalFailed} item${totalFailed > 1 ? 's' : ''}: ${failedMessages}`);
        }

        // Manually invalidate cache after batch delete
        if (totalDeleted > 0) {
          // Invalidate all file-related queries for this workspace
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey as string[];
              return queryKey[0] === 'files' &&
                     queryKey[1] === 'list' &&
                     queryKey[2] === workspaceId;
            }
          });
          // Also invalidate trash, starred, recent, and other related views
          queryClient.invalidateQueries({ queryKey: ['files', 'trash', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['files', 'starred', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['files', 'recent', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] });
          console.log('✅ Cache invalidated after batch delete');
        }
      }

      // Clear selection after delete
      setSelectedFileIds([]);
    } catch (error) {
      console.error('Failed to delete items:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete items');
    }

    setDeleteDialog(null);
  };

  const handleCopy = (file: FileItem) => {
    const clipboardData = {
      itemId: file.id,
      itemName: file.name,
      itemType: file.type || 'file',
      operation: 'copy' as const
    };
    console.log('📋 Setting clipboard (COPY):', clipboardData);
    setClipboard(clipboardData);
    toast.success(`Copied "${file.name}"`);
  };

  const handleCut = (file: FileItem) => {
    const clipboardData = {
      itemId: file.id,
      itemName: file.name,
      itemType: file.type || 'file',
      operation: 'cut' as const
    };
    console.log('📋 Setting clipboard (CUT):', clipboardData);
    setClipboard(clipboardData);
    toast.success(`Cut "${file.name}"`);
  };

  const handleExportToDrive = async (file: FileItem, targetFolderId?: string) => {
    if (!workspaceId || !isGoogleDriveConnected) return;

    setIsExporting(true);
    try {
      const result = await googleDriveApi.exportFile(workspaceId, {
        fileId: file.id,
        targetFolderId
      });
      if (result.success) {
        toast.success(`"${file.name}" exported to Google Drive`, {
          action: result.webViewLink ? {
            label: 'Open in Drive',
            onClick: () => window.open(result.webViewLink, '_blank')
          } : undefined
        });
      }
    } catch (error) {
      console.error('Failed to export file to Google Drive:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to export file to Google Drive');
    } finally {
      setIsExporting(false);
      setExportToDriveFile(null);
    }
  };

  const handlePaste = async () => {
    if (!clipboard || !workspaceId) return;

    if (clipboard.operation === 'copy') {
      try {
        // Check if this is a bulk operation
        if (clipboard.items && clipboard.items.length > 1) {
          // BULK PASTE - multiple items
          console.log(`📋 Pasting ${clipboard.items.length} items to folder:`, currentFolderId || 'ROOT');

          const filesToCopy = clipboard.items.filter(item => item.type === 'file');
          const foldersToCopy = clipboard.items.filter(item => item.type === 'folder');

          let totalCopied = 0;
          let totalFailed = 0;

          // Batch copy files if any
          if (filesToCopy.length > 0) {
            const { fileApi } = await import('../../lib/api/files-api');
            const fileIds = filesToCopy.map(f => f.id);
            const result = await fileApi.copyMultipleFiles(workspaceId, fileIds, currentFolderId);

            totalCopied += result.copied_count;
            totalFailed += result.failed_count;

            if (result.failed_count > 0) {
              const failedMessages = result.failed.map(f => f.reason).join(', ');
              toast.error(`Failed to copy ${result.failed_count} file(s): ${failedMessages}`);
            }

            console.log(`📋 Batch pasted ${result.copied_count} files`);
          }

          // Batch copy folders if any
          if (foldersToCopy.length > 0) {
            const { fileApi } = await import('../../lib/api/files-api');
            const folderIds = foldersToCopy.map(f => f.id);
            const folderResult = await fileApi.copyMultipleFolders(workspaceId, folderIds, currentFolderId);

            totalCopied += folderResult.copied_count;
            totalFailed += folderResult.failed_count;

            if (folderResult.failed_count > 0) {
              const failedMessages = folderResult.failed.map(f => f.reason).join(', ');
              toast.error(`Failed to copy ${folderResult.failed_count} folder(s): ${failedMessages}`);
            }

            console.log(`📋 Batch pasted ${folderResult.copied_count} folders`);
          }

          // Manually invalidate cache after batch paste
          if (totalCopied > 0) {
            queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKey = query.queryKey as string[];
                return queryKey[0] === 'files' &&
                       queryKey[1] === 'list' &&
                       queryKey[2] === workspaceId;
              }
            });
            queryClient.invalidateQueries({ queryKey: ['files', 'trash', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'starred', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'recent', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] });
            console.log('✅ Cache invalidated after batch paste');
          }

          if (totalCopied > 0) {
            toast.success(`Pasted ${totalCopied} item${totalCopied > 1 ? 's' : ''}`);
          }

          setClipboard(null); // Clear clipboard after paste
        } else {
          // SINGLE ITEM PASTE - original logic
          let newName: string;

          if (clipboard.itemType === 'file') {
            // For files: "filename-copy.ext"
            const fileNameParts = clipboard.itemName.split('.');

            if (fileNameParts.length > 1) {
              // File has extension
              const extension = fileNameParts.pop();
              const baseName = fileNameParts.join('.');
              newName = `${baseName}-copy.${extension}`;
            } else {
              // File has no extension
              newName = `${clipboard.itemName}-copy`;
            }

            // Call the file copy API through the parent component
            if (onFileCopy) {
              await onFileCopy(clipboard.itemId, currentFolderId, newName);
              toast.success(`Pasted "${newName}"`);
              setClipboard(null);
            }
          } else {
            // For folders: "Folder Name (Copy)"
            newName = `${clipboard.itemName} (Copy)`;

            // Call the folder copy API through the parent component
            if (onFolderCopy) {
              await onFolderCopy(clipboard.itemId, currentFolderId, newName);
              toast.success(`Pasted "${newName}"`);
              setClipboard(null);
            }
          }
        }
      } catch (error) {
        console.error('Failed to paste:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to paste');
      }
    } else if (clipboard.operation === 'cut') {
      try {
        // Check if this is a bulk move operation
        if (clipboard.items && clipboard.items.length > 1) {
          // BULK MOVE - multiple items
          console.log(`✂️ Moving ${clipboard.items.length} items to folder:`, currentFolderId || 'ROOT');

          const filesToMove = clipboard.items.filter(item => item.type === 'file');
          const foldersToMove = clipboard.items.filter(item => item.type === 'folder');

          let totalMoved = 0;
          let totalFailed = 0;

          // Batch move files if any
          if (filesToMove.length > 0) {
            const { fileApi } = await import('../../lib/api/files-api');
            const fileIds = filesToMove.map(f => f.id);
            const result = await fileApi.moveMultipleFiles(workspaceId, fileIds, currentFolderId);

            totalMoved += result.moved_count;
            totalFailed += result.failed_count;

            if (result.failed_count > 0) {
              const failedMessages = result.failed.map(f => f.reason).join(', ');
              toast.error(`Failed to move ${result.failed_count} file(s): ${failedMessages}`);
            }

            console.log(`✂️ Batch moved ${result.moved_count} files`);
          }

          // Batch move folders if any
          if (foldersToMove.length > 0) {
            const { fileApi } = await import('../../lib/api/files-api');
            const folderIds = foldersToMove.map(f => f.id);
            const folderResult = await fileApi.moveMultipleFolders(workspaceId, folderIds, currentFolderId);

            totalMoved += folderResult.moved_count;
            totalFailed += folderResult.failed_count;

            if (folderResult.failed_count > 0) {
              const failedMessages = folderResult.failed.map(f => f.reason).join(', ');
              toast.error(`Failed to move ${folderResult.failed_count} folder(s): ${failedMessages}`);
            }

            console.log(`✂️ Batch moved ${folderResult.moved_count} folders`);
          }

          // Manually invalidate cache after batch move
          if (totalMoved > 0) {
            queryClient.invalidateQueries({
              predicate: (query) => {
                const queryKey = query.queryKey as string[];
                return queryKey[0] === 'files' &&
                       queryKey[1] === 'list' &&
                       queryKey[2] === workspaceId;
              }
            });
            queryClient.invalidateQueries({ queryKey: ['files', 'trash', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'starred', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'recent', workspaceId] });
            queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] });
            console.log('✅ Cache invalidated after batch move');
          }

          if (totalMoved > 0) {
            toast.success(`Moved ${totalMoved} item${totalMoved > 1 ? 's' : ''}`);
          }

          setClipboard(null); // Clear clipboard after move
        } else {
          // SINGLE ITEM MOVE - original logic
          if (clipboard.itemType === 'file') {
            // Call the file move API through the parent component
            if (onFileMove) {
              await onFileMove(clipboard.itemId, currentFolderId);
              toast.success(`Moved "${clipboard.itemName}"`);
              setClipboard(null);
            }
          } else {
            // Call the folder move API through the parent component
            if (onFolderMove) {
              await onFolderMove(clipboard.itemId, currentFolderId);
              toast.success(`Moved "${clipboard.itemName}"`);
              setClipboard(null);
            }
          }
        }
      } catch (error) {
        console.error('Failed to move:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to move');
      }
    }
  };

  // Filter logic - simplified since backend now filters by folder
  const filteredFiles = React.useMemo(() => {
    console.log('🔍 Applying client-side filters to', files.length, 'files');

    return files.filter(file => {
      // Type filter
      if (filters.type.length > 0) {
        if (file.type === 'folder' && !filters.type.includes('folder')) return false;
        if (file.type === 'file') {
          const fileType = getFileType(file.mimeType || (file as any).mime_type || '');
          if (!filters.type.includes(fileType)) return false;
        }
      }

      // Date filter (client-side only)
      if (typeof window !== 'undefined' && filters.dateModified && file.updatedAt) {
        const fileTimestamp = new Date(file.updatedAt).getTime();
        const nowTimestamp = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        switch (filters.dateModified) {
          case 'today':
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            if (fileTimestamp < todayStart.getTime()) return false;
            break;
          case 'yesterday':
            const yesterdayStart = new Date();
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            yesterdayStart.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(yesterdayStart);
            yesterdayEnd.setDate(yesterdayEnd.getDate() + 1);
            if (fileTimestamp < yesterdayStart.getTime() || fileTimestamp >= yesterdayEnd.getTime()) return false;
            break;
          case 'lastWeek':
            if (fileTimestamp < (nowTimestamp - 7 * oneDayMs)) return false;
            break;
          case 'lastMonth':
            if (fileTimestamp < (nowTimestamp - 30 * oneDayMs)) return false;
            break;
        }
      }

      return true;
    });
  }, [files, filters]);

  const hasActiveFilters = filters.type.length > 0 || filters.dateModified !== null;

  const clearFilters = () => {
    setFilters({
      type: [],
      dateModified: null,
    });
  };

  const toggleTypeFilter = (type: string) => {
    setFilters(prev => ({
      ...prev,
      type: prev.type.includes(type)
        ? prev.type.filter(t => t !== type)
        : [...prev.type, type]
    }));
  };

  const setDateFilter = (date: string | null) => {
    setFilters(prev => ({
      ...prev,
      dateModified: date
    }));
  };

  // Listen for upload events from sidebar
  React.useEffect(() => {
    const handleOpenFileUpload = () => {
      setShowUploadModal(true);
    };

    window.addEventListener('openFileUpload', handleOpenFileUpload);
    return () => {
      window.removeEventListener('openFileUpload', handleOpenFileUpload);
    };
  }, []);

  // Listen for AI creation events
  React.useEffect(() => {
    const handleOpenAICreation = (event: any) => {
      const type = event.detail?.type || 'image';
      setAICreationPanel({ isOpen: true, type });
    };

    window.addEventListener('openAICreation', handleOpenAICreation);
    return () => {
      window.removeEventListener('openAICreation', handleOpenAICreation);
    };
  }, []);

  // Check Google Drive connection status
  React.useEffect(() => {
    const checkDriveConnection = async () => {
      if (!workspaceId) return;
      try {
        const connection = await googleDriveApi.getConnection(workspaceId);
        setIsGoogleDriveConnected(connection?.isActive || false);
      } catch (error) {
        console.warn('Failed to check Google Drive connection:', error);
        setIsGoogleDriveConnected(false);
      }
    };
    checkDriveConnection();
  }, [workspaceId]);

  // Check Dropbox connection status
  React.useEffect(() => {
    const checkDropboxConnection = async () => {
      if (!workspaceId) return;
      try {
        const connection = await dropboxApi.getConnection(workspaceId);
        setIsDropboxConnected(connection?.isActive || false);
      } catch (error) {
        console.warn('Failed to check Dropbox connection:', error);
        setIsDropboxConnected(false);
      }
    };
    checkDropboxConnection();
  }, [workspaceId]);

  return (
    <div className="flex flex-col h-full">
      {/* Selection Bar with Bulk Actions */}
      {selectedFileIds.length > 0 && (
        <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">{selectedFileIds.length} selected</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkCopy}
                className="h-8 gap-2"
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkMove}
                className="h-8 gap-2"
              >
                <Move className="h-4 w-4" />
                Move
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            className="h-8"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between mb-3">
          {searchQuery.trim() ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                Search results for "{searchQuery}"
              </span>
              {filteredFiles.length > 0 && (
                <span className="ml-2 text-xs">
                  ({filteredFiles.length} {filteredFiles.length === 1 ? 'item' : 'items'})
                </span>
              )}
            </div>
          ) : (
            <FileBreadcrumbs
              breadcrumbs={breadcrumbs}
              onNavigate={handleNavigate}
            />
          )}

          <div className="flex items-center gap-2">
            {/* Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 ${filters.type.length > 0 ? 'border-blue-500 text-blue-600' : ''}`}
                >
                  <Filter className="h-3 w-3 mr-2" />
                  {intl.formatMessage({ id: 'modules.files.filters.type', defaultMessage: 'Type' })}
                  {filters.type.length > 0 && (
                    <Badge variant="secondary" className="ml-2 h-4 px-1 text-xs">
                      {filters.type.length}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>{intl.formatMessage({ id: 'modules.files.filters.fileType', defaultMessage: 'File type' })}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.type.includes('folder')}
                  onCheckedChange={() => toggleTypeFilter('folder')}
                >
                  <Folder className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.files.filters.folders', defaultMessage: 'Folders' })}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.type.includes('document')}
                  onCheckedChange={() => toggleTypeFilter('document')}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.files.filters.documents', defaultMessage: 'Documents' })}
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.type.includes('image')}
                  onCheckedChange={() => toggleTypeFilter('image')}
                >
                  <ImageIcon className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.files.filters.images', defaultMessage: 'Images' })}
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Date Modified Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`h-8 ${filters.dateModified ? 'border-blue-500 text-blue-600' : ''}`}
                >
                  <Calendar className="h-3 w-3 mr-2" />
                  {intl.formatMessage({ id: 'modules.files.filters.dateModifiedButton', defaultMessage: 'Date modified' })}
                  <ChevronDown className="h-3 w-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>{intl.formatMessage({ id: 'modules.files.filters.dateModified', defaultMessage: 'Date modified' })}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDateFilter(filters.dateModified === 'today' ? null : 'today')}
                  className={filters.dateModified === 'today' ? 'bg-accent' : ''}
                >
                  {intl.formatMessage({ id: 'modules.files.dates.today', defaultMessage: 'Today' })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDateFilter(filters.dateModified === 'yesterday' ? null : 'yesterday')}
                  className={filters.dateModified === 'yesterday' ? 'bg-accent' : ''}
                >
                  {intl.formatMessage({ id: 'modules.files.dates.yesterday', defaultMessage: 'Yesterday' })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDateFilter(filters.dateModified === 'lastWeek' ? null : 'lastWeek')}
                  className={filters.dateModified === 'lastWeek' ? 'bg-accent' : ''}
                >
                  {intl.formatMessage({ id: 'modules.files.dates.lastWeek', defaultMessage: 'Last 7 days' })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDateFilter(filters.dateModified === 'lastMonth' ? null : 'lastMonth')}
                  className={filters.dateModified === 'lastMonth' ? 'bg-accent' : ''}
                >
                  {intl.formatMessage({ id: 'modules.files.dates.lastMonth', defaultMessage: 'Last 30 days' })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear filters
                </Button>
                <div className="h-6 w-px bg-border" />
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreateFolder(true)}
              className="btn-gradient-primary border-0 h-8"
            >
              <FolderPlus className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.files.buttons.newFolder', defaultMessage: 'New Folder' })}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDriveImport(true)}
              className="h-8"
            >
              <CloudDownload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.files.buttons.importFromDrive', defaultMessage: 'Import from Drive' })}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDropboxImport(true)}
              className="h-8"
            >
              <CloudDownload className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.files.buttons.importFromDropbox', defaultMessage: 'Import from Dropbox' })}
            </Button>

            <div className="flex items-center border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                className={`rounded-r-none h-8 ${viewMode === 'grid' ? 'gradient-primary text-white' : ''}`}
                onClick={() => onViewModeChange?.('grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                className={`rounded-l-none h-8 ${viewMode === 'list' ? 'gradient-primary text-white' : ''}`}
                onClick={() => onViewModeChange?.('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* File Grid/List */}
      <FolderContextMenu
        onCreateFolder={() => setShowCreateFolder(true)}
        onUploadFiles={() => setShowUploadModal(true)}
        onCreateFile={(type) => {
          console.log('Create file:', type);
          // TODO: Implement file creation
        }}
        onPaste={clipboard && !isFetching ? handlePaste : undefined}
        canPaste={!!clipboard && !isFetching}
      >
        <div className="flex-1 overflow-auto p-4 relative">
          {/* Loading Overlay for folder navigation */}
          {isFetching && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading...</p>
              </div>
            </div>
          )}

          {filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Folder className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">{intl.formatMessage({ id: 'modules.files.empty.noFiles', defaultMessage: 'No files found' })}</p>
              <p className="text-sm">{intl.formatMessage({ id: 'modules.files.empty.uploadOrCreate', defaultMessage: 'Upload files or create a folder to get started' })}</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group relative flex flex-col items-center p-4 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedFileIds.includes(file.id)
                      ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 ring-inset'
                      : ''
                  }`}
                  onClick={(e) => handleFileClick(file, e)}
                  onDoubleClick={() => handleFileDoubleClick(file)}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    {selectedFileIds.includes(file.id) ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 fill-current" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  <div
                    className="absolute top-2 right-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <FileActionsDropdown
                      fileId={file.id}
                      fileType={file.type || 'file'}
                      fileName={file.name}
                      isStarred={file.starred}
                      isShared={false}
                      onOpen={() => handleFileDoubleClick(file)}
                      onRename={() => setRenameDialog({ id: file.id, name: file.name, type: file.type || 'file' })}
                      onDelete={() => setDeleteDialog({ ids: [file.id], names: [file.name], isMultiple: false })}
                      onCopy={() => handleCopy(file)}
                      onCut={() => handleCut(file)}
                      onPaste={file.type === 'folder' ? handlePaste : undefined}
                      canPaste={file.type === 'folder' && !!clipboard}
                      onToggleStar={file.type === 'file' ? () => onToggleStar?.(file.id, file.starred || false) : undefined}
                      onRestore={isTrashView ? () => onFileRestore?.(file.id) : undefined}
                      onShare={() => setShareFile({ id: file.id, name: file.name })}
                      onComments={() => setCommentsFile({ id: file.id, name: file.name })}
                      isSharedWithMeView={isSharedWithMeView}
                      onDownload={file.type === 'file' ? () => onFileDownload?.(file.id, file.name) : undefined}
                      onInfo={() => setPropertiesFile(file)}
                      onExportToDrive={file.type === 'file' ? () => setExportToDriveFile(file) : undefined}
                      onExportToDropbox={file.type === 'file' ? () => setExportToDropboxFile(file) : undefined}
                      onToggleOffline={file.type === 'file' ? () => handleToggleOffline(file) : undefined}
                      isTrashView={isTrashView}
                      isSearchView={isSearchView}
                      allowCutCopyPaste={allowCutCopyPaste}
                      isGoogleDriveConnected={isGoogleDriveConnected}
                      isDropboxConnected={isDropboxConnected}
                    />
                  </div>
                  <div className="mb-2 relative">
                    {getFileIcon(file, 'large')}
                    {file.type === 'file' && (
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <OfflineStatusBadge fileId={file.id} size="sm" showBackground />
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-center line-clamp-2 break-words w-full px-1">
                    {file.name}
                  </span>
                  <div className="flex items-center gap-1 mt-1">
                    {file.starred && (
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                    )}
                    {file.shareSettings?.isPublic && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Share2 className="h-3 w-3" />
                        <span>Public</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredFiles.map((file) => (
                <div
                  key={file.id}
                  className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedFileIds.includes(file.id)
                      ? 'bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500 ring-inset'
                      : ''
                  }`}
                  onClick={(e) => handleFileClick(file, e)}
                  onDoubleClick={() => handleFileDoubleClick(file)}
                >
                  {/* Selection Checkbox */}
                  <div className="flex-shrink-0">
                    {selectedFileIds.includes(file.id) ? (
                      <CheckCircle2 className="h-5 w-5 text-blue-600 fill-current" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>

                  <div>
                    {getFileIcon(file)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">
                        {file.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {file.starred && (
                          <Star className="h-3 w-3 fill-current text-yellow-500" />
                        )}
                        {file.shareSettings?.isPublic && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Share2 className="h-3 w-3" />
                            <span>Public</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {file.type === 'file' && file.size && (
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                      )}
                      <span>{file.updatedAt ? new Date(file.updatedAt).toLocaleDateString() : 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {file.type === 'file' && (
                      <OfflineStatusBadge fileId={file.id} size="sm" />
                    )}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <FileActionsDropdown
                        fileId={file.id}
                        fileType={file.type || 'file'}
                        fileName={file.name}
                        isStarred={file.starred}
                        isShared={false}
                        onOpen={() => handleFileDoubleClick(file)}
                        onRename={() => setRenameDialog({ id: file.id, name: file.name, type: file.type || 'file' })}
                        onDelete={() => setDeleteDialog({ ids: [file.id], names: [file.name], isMultiple: false })}
                        onCopy={() => handleCopy(file)}
                        onCut={() => handleCut(file)}
                        onPaste={file.type === 'folder' ? handlePaste : undefined}
                        canPaste={file.type === 'folder' && !!clipboard}
                        onToggleStar={file.type === 'file' ? () => onToggleStar?.(file.id, file.starred || false) : undefined}
                        onRestore={isTrashView ? () => onFileRestore?.(file.id) : undefined}
                        onShare={() => setShareFile({ id: file.id, name: file.name })}
                        onComments={() => setCommentsFile({ id: file.id, name: file.name })}
                        isSharedWithMeView={isSharedWithMeView}
                        onDownload={file.type === 'file' ? () => onFileDownload?.(file.id, file.name) : undefined}
                        onInfo={() => setPropertiesFile(file)}
                        onExportToDrive={file.type === 'file' ? () => setExportToDriveFile(file) : undefined}
                        onExportToDropbox={file.type === 'file' ? () => setExportToDropboxFile(file) : undefined}
                        onToggleOffline={file.type === 'file' ? () => handleToggleOffline(file) : undefined}
                        isTrashView={isTrashView}
                        isSearchView={isSearchView}
                        allowCutCopyPaste={allowCutCopyPaste}
                        isGoogleDriveConnected={isGoogleDriveConnected}
                        isDropboxConnected={isDropboxConnected}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FolderContextMenu>

      {/* Dialogs */}
      <CreateFolderDialog
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        onCreate={handleCreateFolder}
      />

      <RenameDialog
        isOpen={!!renameDialog}
        onClose={() => setRenameDialog(null)}
        onRename={(newName) => {
          if (renameDialog) {
            onFileRename?.(renameDialog.id, newName, renameDialog.type);
            setRenameDialog(null);
          }
        }}
        currentName={renameDialog?.name || ''}
        itemType={renameDialog?.type || 'file'}
      />

      <DeleteConfirmDialog
        isOpen={!!deleteDialog}
        onClose={() => setDeleteDialog(null)}
        onConfirm={handleDelete}
        itemCount={deleteDialog?.ids.length || 0}
        itemName={deleteDialog?.isMultiple
          ? `${deleteDialog?.ids.length} items`
          : deleteDialog?.names?.[0]
        }
      />

      <FilePreviewDialog
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        file={previewFile}
      />

      <FilePropertiesDialog
        isOpen={!!propertiesFile}
        onClose={() => setPropertiesFile(null)}
        file={propertiesFile}
      />

      <ShareModal
        isOpen={!!shareFile}
        onClose={() => setShareFile(null)}
        fileId={shareFile?.id || ''}
        fileName={shareFile?.name || ''}
      />

      <FileCommentsModal
        isOpen={!!commentsFile}
        onClose={() => setCommentsFile(null)}
        fileId={commentsFile?.id || ''}
        fileName={commentsFile?.name || ''}
      />

      <FileUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        workspaceId={workspaceId || ''}
        parentFolderId={currentFolderId}
        onUploadSuccess={() => {
          console.log('Files uploaded successfully');
          // Trigger parent component to refresh files
          onUploadFiles?.();
        }}
      />

      <AICreationPanel
        isOpen={aiCreationPanel.isOpen}
        onClose={() => setAICreationPanel({ isOpen: false, type: 'image' })}
        initialType={aiCreationPanel.type}
        workspaceId={workspaceId || ''}
        currentFolderId={parentFolderId}
      />

      <GoogleDriveImportModal
        isOpen={showDriveImport}
        onClose={() => setShowDriveImport(false)}
        onImportSuccess={() => {
          console.log('Files imported from Google Drive');
          // Invalidate all file-related queries for this workspace
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey as string[];
              return queryKey[0] === 'files' &&
                     queryKey[1] === 'list' &&
                     queryKey[2] === workspaceId;
            }
          });
          // Also invalidate recent and storage views
          queryClient.invalidateQueries({ queryKey: ['files', 'recent', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] });
          console.log('✅ Cache invalidated after Google Drive import');
          onUploadFiles?.();
        }}
        targetFolderId={currentFolderId}
      />

      <GoogleDriveExportModal
        isOpen={!!exportToDriveFile}
        onClose={() => setExportToDriveFile(null)}
        onExport={(targetFolderId) => {
          if (exportToDriveFile) {
            handleExportToDrive(exportToDriveFile, targetFolderId);
          }
        }}
        fileName={exportToDriveFile?.name || ''}
        isExporting={isExporting}
      />

      <DropboxImportModal
        isOpen={showDropboxImport}
        onClose={() => setShowDropboxImport(false)}
        onImportSuccess={() => {
          console.log('Files imported from Dropbox');
          queryClient.invalidateQueries({
            predicate: (query) => {
              const queryKey = query.queryKey as string[];
              return queryKey[0] === 'files' &&
                     queryKey[1] === 'list' &&
                     queryKey[2] === workspaceId;
            }
          });
          queryClient.invalidateQueries({ queryKey: ['files', 'recent', workspaceId] });
          queryClient.invalidateQueries({ queryKey: ['files', 'storage', workspaceId] });
          console.log('✅ Cache invalidated after Dropbox import');
          onUploadFiles?.();
        }}
        targetFolderId={currentFolderId}
      />

      <DropboxExportModal
        isOpen={!!exportToDropboxFile}
        onClose={() => setExportToDropboxFile(null)}
        fileId={exportToDropboxFile?.id || ''}
        fileName={exportToDropboxFile?.name || ''}
        fileUrl={exportToDropboxFile?.url as string || ''}
      />
    </div>
  );
}
