/**
 * Files Page - Complete Implementation
 * Based on workspace-suite-frontend/src/components/workspace/views/files-view.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useIntl } from 'react-intl';
import { Input } from '../../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { StorageStats } from '../../components/files/StorageStats';
import { FileExplorer } from '../../components/files/FileExplorer';
import { AssetDashboard } from '../../components/files/AssetDashboard';
import { useFilesAndFolders, useRecentFiles, useStarredFiles, useSharedWithMeFiles, useFilesByType, useDashboardStats, useTrashItems, useSearchFiles, useCreateFolder, useDeleteFile, useDeleteFolder, useRestoreFile, useRestoreFolder, useRenameFile, useRenameFolder, useToggleStarFile, useCopyFile, useCopyFolder, useMoveFile, useMoveFolder, filesService, fileApi } from '@/lib/api/files-api';
import type { FileItem } from '@/lib/api/files-api';
import { useFilesSidebar } from '../../contexts/FilesSidebarContext';

const FilesPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setSelectedFile } = useFilesSidebar();
  const intl = useIntl();

  // Parse URL path to get current view and folder
  const parseUrlPath = (): { view: 'all-files' | 'recent' | 'starred' | 'shared-with-me' | 'trash' | 'documents' | 'pdfs' | 'images' | 'spreadsheets' | 'videos' | 'audio', folderId: string | null, folderPath: string[] } => {
    const pathParts = location.pathname.split('/files/').pop()?.split('/') || [];

    if (pathParts.length === 0 || pathParts[0] === '') {
      return { view: 'all-files', folderId: null, folderPath: [] };
    }

    const view = pathParts[0] as 'all-files' | 'recent' | 'starred' | 'shared-with-me' | 'trash' | 'documents' | 'pdfs' | 'images' | 'spreadsheets' | 'videos' | 'audio';

    // For folder navigation in all-files view
    if (view === 'all-files' && pathParts.length > 1) {
      const folderParts = pathParts.slice(1);
      const folderId = folderParts[folderParts.length - 1];
      return { view, folderId, folderPath: folderParts };
    }

    // For other views (trash, recent, starred, shared-with-me, etc.) - no folder navigation
    return { view, folderId: null, folderPath: [] };
  };

  const { view: urlView, folderId: urlFolderId, folderPath: urlFolderPath } = parseUrlPath();

  // State management - initialize from URL
  const [currentView, setCurrentView] = useState<
    'all-files' | 'recent' | 'starred' | 'shared-with-me' | 'trash' | 'documents' | 'pdfs' | 'images' | 'spreadsheets' | 'videos' | 'audio'
  >(urlView);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(urlFolderId);
  const [breadcrumbTrail, setBreadcrumbTrail] = useState<Array<{ id: string | null; name: string; }>>([
    { id: null, name: 'All Files' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTab, setSelectedTab] = useState<'all-files' | 'dashboard' | 'messages' | 'projects' | 'calendar' | 'notes'>(urlView === 'all-files' || urlView === 'recent' || urlView === 'starred' || urlView === 'shared-with-me' || urlView === 'trash' || urlView === 'documents' || urlView === 'pdfs' || urlView === 'images' || urlView === 'spreadsheets' || urlView === 'videos' || urlView === 'audio' ? 'all-files' : 'dashboard');

  // Clipboard state - lifted to FilesPage to persist across folder navigation
  const [clipboard, setClipboard] = useState<{
    itemId: string;
    itemName: string;
    itemType: 'file' | 'folder';
    operation: 'copy' | 'cut';
  } | null>(null);

  // Redirect to all-files if no specific view is in URL
  useEffect(() => {
    const pathParts = location.pathname.split('/files/').pop()?.split('/') || [];
    const validViews = ['all-files', 'recent', 'starred', 'shared-with-me', 'trash', 'documents', 'pdfs', 'images', 'spreadsheets', 'videos', 'audio'];

    if (pathParts.length === 0 || pathParts[0] === '' || !validViews.includes(pathParts[0])) {
      // Redirect to all-files as default
      navigate(`/workspaces/${workspaceId}/files/all-files`, { replace: true });
      return;
    }
  }, [location.pathname, navigate, workspaceId]);


  // Sync state with URL changes
  useEffect(() => {
    const { view, folderId } = parseUrlPath();
    setCurrentView(view);
    setCurrentFolderId(folderId);

    // Map file views to the appropriate tab
    if (['all-files', 'recent', 'starred', 'shared-with-me', 'trash', 'documents', 'pdfs', 'images', 'spreadsheets', 'videos', 'audio'].includes(view)) {
      setSelectedTab('all-files'); // All file-related views use the all-files tab
    } else {
      setSelectedTab('dashboard'); // Fallback to dashboard for non-file views
    }
  }, [location.pathname]);

  // Navigation helper functions
  const navigateToView = (view: typeof currentView, folderId: string | null = null) => {
    let path = `/workspaces/${workspaceId}/files/${view}`;
    if (view === 'all-files' && folderId) {
      path += `/${folderId}`;
    }
    navigate(path);
  };

  const navigateToFolder = (folderId: string | null, folderName?: string) => {
    if (currentView === 'all-files') {
      let path = `/workspaces/${workspaceId}/files/all-files`;
      if (folderId) {
        path += `/${folderId}`;
      }
      navigate(path);
    }
  };

  // TanStack Query hooks - fetches files based on current view
  // For all-files view, use useFilesAndFolders
  const {
    data: allFiles = [],
    isLoading: isLoadingAll,
    isFetching: isFetchingAll,
    error: errorAll,
  } = useFilesAndFolders(workspaceId || '', currentFolderId, {
    enabled: !!workspaceId && currentView === 'all-files',
    staleTime: 60000, // Cache for 1 minute
  });

  // For trash view, use the new trash API
  const {
    data: trashData,
    isLoading: isLoadingTrash,
    isFetching: isFetchingTrash,
    error: errorTrash,
  } = useTrashItems(workspaceId || '', {
    enabled: !!workspaceId && currentView === 'trash',
  });

  // For recent view, use useRecentFiles
  const {
    data: recentFiles = [],
    isLoading: isLoadingRecent,
    isFetching: isFetchingRecent,
    error: errorRecent,
  } = useRecentFiles(workspaceId || '', 50, {
    enabled: !!workspaceId && currentView === 'recent',
  });

  // For starred view, use useStarredFiles
  const {
    data: starredFiles = [],
    isLoading: isLoadingStarred,
    isFetching: isFetchingStarred,
    error: errorStarred,
  } = useStarredFiles(workspaceId || '', {
    enabled: !!workspaceId && currentView === 'starred',
  });

  // For shared-with-me view, use useSharedWithMeFiles
  const {
    data: sharedWithMeFiles = [],
    isLoading: isLoadingSharedWithMe,
    isFetching: isFetchingSharedWithMe,
    error: errorSharedWithMe,
  } = useSharedWithMeFiles(workspaceId || '', {
    enabled: !!workspaceId && currentView === 'shared-with-me',
  });

  // For file type views, use useFilesByType
  const {
    data: documentFiles = [],
    isLoading: isLoadingDocuments,
    isFetching: isFetchingDocuments,
    error: errorDocuments,
  } = useFilesByType(workspaceId || '', 'documents', {
    enabled: !!workspaceId && currentView === 'documents',
  });

  const {
    data: pdfFiles = [],
    isLoading: isLoadingPdfs,
    isFetching: isFetchingPdfs,
    error: errorPdfs,
  } = useFilesByType(workspaceId || '', 'pdfs', {
    enabled: !!workspaceId && currentView === 'pdfs',
  });

  const {
    data: imageFiles = [],
    isLoading: isLoadingImages,
    isFetching: isFetchingImages,
    error: errorImages,
  } = useFilesByType(workspaceId || '', 'images', {
    enabled: !!workspaceId && currentView === 'images',
  });

  const {
    data: spreadsheetFiles = [],
    isLoading: isLoadingSpreadsheets,
    isFetching: isFetchingSpreadsheets,
    error: errorSpreadsheets,
  } = useFilesByType(workspaceId || '', 'spreadsheets', {
    enabled: !!workspaceId && currentView === 'spreadsheets',
  });

  const {
    data: videoFiles = [],
    isLoading: isLoadingVideos,
    isFetching: isFetchingVideos,
    error: errorVideos,
  } = useFilesByType(workspaceId || '', 'videos', {
    enabled: !!workspaceId && currentView === 'videos',
  });

  const {
    data: audioFiles = [],
    isLoading: isLoadingAudio,
    isFetching: isFetchingAudio,
    error: errorAudio,
  } = useFilesByType(workspaceId || '', 'audio', {
    enabled: !!workspaceId && currentView === 'audio',
  });

  // Search files - enabled when search query is not empty
  const {
    data: searchResults = [],
    isLoading: isLoadingSearch,
    isFetching: isFetchingSearch,
    error: errorSearch,
  } = useSearchFiles(workspaceId || '', searchQuery, {
    enabled: !!workspaceId && searchQuery.trim().length > 0,
  });

  // Fetch dashboard stats (always fetch on page load for storage displays)
  const {
    data: dashboardStats,
    isLoading: isLoadingDashboard,
  } = useDashboardStats(workspaceId || '', {
    enabled: !!workspaceId,
  });

  // Function to build breadcrumb trail for a folder
  const buildBreadcrumbTrail = useCallback(async (view: typeof currentView, folderId: string | null) => {
    const categoryNames: Record<string, string> = {
      'all-files': intl.formatMessage({ id: 'modules.files.views.allFiles', defaultMessage: 'All Files' }),
      'recent': intl.formatMessage({ id: 'modules.files.views.recent', defaultMessage: 'Recent' }),
      'starred': intl.formatMessage({ id: 'modules.files.views.starred', defaultMessage: 'Starred' }),
      'shared-with-me': intl.formatMessage({ id: 'modules.files.views.sharedWithMe', defaultMessage: 'Shared with Me' }),
      'trash': intl.formatMessage({ id: 'modules.files.views.trash', defaultMessage: 'Trash' }),
      'documents': intl.formatMessage({ id: 'modules.files.views.documents', defaultMessage: 'Documents' }),
      'pdfs': intl.formatMessage({ id: 'modules.files.views.pdfs', defaultMessage: 'PDFs' }),
      'images': intl.formatMessage({ id: 'modules.files.views.images', defaultMessage: 'Images' }),
      'spreadsheets': intl.formatMessage({ id: 'modules.files.views.spreadsheets', defaultMessage: 'Spreadsheets' }),
      'videos': intl.formatMessage({ id: 'modules.files.views.videos', defaultMessage: 'Videos' }),
      'audio': intl.formatMessage({ id: 'modules.files.views.audio', defaultMessage: 'Audio' }),
    };

    const rootName = categoryNames[view] || intl.formatMessage({ id: 'modules.files.views.allFiles', defaultMessage: 'All Files' });
    
    if (!folderId || !workspaceId) {
      setBreadcrumbTrail([{ id: null, name: rootName }]);
      return;
    }

    // For now, let's use a simpler approach that doesn't require new API endpoints
    // When navigating via URL, we'll fetch the parent folder to get the folder name
    try {
      console.log('🔍 Fetching folder info for breadcrumb:', folderId);
      // Try to get all folders in workspace to find the target folder name
      const foldersResponse = await fileApi.getFoldersOnly(workspaceId);
      console.log('📁 Folders response:', foldersResponse);
      const targetFolder = foldersResponse.find(folder => folder.id === folderId);
      console.log('🎯 Target folder found:', targetFolder);
      
      if (targetFolder) {
        setBreadcrumbTrail([
          { id: null, name: rootName },
          { id: folderId, name: targetFolder.name }
        ]);
        console.log('✅ Breadcrumb updated with folder name:', targetFolder.name);
      } else {
        // Fallback if folder not found
        console.log('❌ Folder not found, using fallback');
        setBreadcrumbTrail([
          { id: null, name: rootName },
          { id: folderId, name: `Folder ${folderId}` }
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch folder info:', error);
      
      // Final fallback
      setBreadcrumbTrail([
        { id: null, name: rootName },
        { id: folderId, name: `Folder ${folderId}` }
      ]);
    }
  }, [workspaceId, intl]);

  // Update breadcrumb when view or folder changes
  useEffect(() => {
    buildBreadcrumbTrail(currentView, currentFolderId);
  }, [currentView, currentFolderId, buildBreadcrumbTrail]);

  // Select the appropriate data based on current view or search query
  const files = React.useMemo(() => {
    // If there's a search query, prioritize search results
    if (searchQuery.trim().length > 0) {
      return Array.isArray(searchResults) ? searchResults : [];
    }

    // Otherwise, use the view-based logic
    let result: FileItem[];
    switch (currentView) {
      case 'recent':
        result = recentFiles;
        break;
      case 'starred':
        result = starredFiles;
        break;
      case 'shared-with-me':
        result = sharedWithMeFiles;
        break;
      case 'documents':
        result = documentFiles;
        break;
      case 'pdfs':
        result = pdfFiles;
        break;
      case 'images':
        result = imageFiles;
        break;
      case 'spreadsheets':
        result = spreadsheetFiles;
        break;
      case 'videos':
        result = videoFiles;
        break;
      case 'audio':
        result = audioFiles;
        break;
      case 'trash':
        // Filter trash items based on current folder
        if (trashData?.items) {
          // If we're at root level (currentFolderId is null), show only top-level items
          // Otherwise, show items in the current folder
          result = trashData.items.filter(item => {
            if (currentFolderId === null) {
              // Root level: show items with no parent or parent_id is null
              return !item.parentId && !item.parent_id;
            } else {
              // In a folder: show items with matching parent
              return item.parentId === currentFolderId || item.parent_id === currentFolderId;
            }
          });
        } else {
          result = [];
        }
        break;
      case 'all-files':
      default:
        result = allFiles;
        break;
    }
    // Ensure we always return an array
    return Array.isArray(result) ? result : [];
  }, [searchQuery, searchResults, currentView, allFiles, trashData, currentFolderId, recentFiles, starredFiles, sharedWithMeFiles, documentFiles, pdfFiles, imageFiles, spreadsheetFiles, videoFiles, audioFiles]);

  // Handle fileId query param for deep linking to file preview (e.g., from chat linked content)
  useEffect(() => {
    const fileIdParam = searchParams.get('fileId');

    if (fileIdParam && files.length > 0) {
      // Wait a bit for the UI to be ready
      setTimeout(() => {
        const targetFile = files.find(f => f.id === fileIdParam);

        if (targetFile) {
          // Open the file in preview sidebar
          setSelectedFile(targetFile);
        } else {
          // File not found in current view, try to fetch it
          console.log('File not found in current view:', fileIdParam);
        }

        // Clear the URL param after handling
        setSearchParams({});
      }, 300);
    }
  }, [searchParams, files, setSelectedFile, setSearchParams]);

  // Only show full-page loader for initial view loading, NOT for search
  const isLoading = searchQuery.trim().length > 0 ? false : // Never show full-page loader during search
                    currentView === 'recent' ? isLoadingRecent :
                    currentView === 'starred' ? isLoadingStarred :
                    currentView === 'shared-with-me' ? isLoadingSharedWithMe :
                    currentView === 'documents' ? isLoadingDocuments :
                    currentView === 'pdfs' ? isLoadingPdfs :
                    currentView === 'images' ? isLoadingImages :
                    currentView === 'spreadsheets' ? isLoadingSpreadsheets :
                    currentView === 'videos' ? isLoadingVideos :
                    currentView === 'audio' ? isLoadingAudio :
                    currentView === 'trash' ? isLoadingTrash :
                    isLoadingAll;

  const isFetching = searchQuery.trim().length > 0 ? isFetchingSearch :
                     currentView === 'recent' ? isFetchingRecent :
                     currentView === 'starred' ? isFetchingStarred :
                     currentView === 'shared-with-me' ? isFetchingSharedWithMe :
                     currentView === 'documents' ? isFetchingDocuments :
                     currentView === 'pdfs' ? isFetchingPdfs :
                     currentView === 'images' ? isFetchingImages :
                     currentView === 'spreadsheets' ? isFetchingSpreadsheets :
                     currentView === 'videos' ? isFetchingVideos :
                     currentView === 'audio' ? isFetchingAudio :
                     currentView === 'trash' ? isFetchingTrash :
                     isFetchingAll;

  const error = searchQuery.trim().length > 0 ? errorSearch :
                currentView === 'recent' ? errorRecent :
                currentView === 'starred' ? errorStarred :
                currentView === 'shared-with-me' ? errorSharedWithMe :
                currentView === 'documents' ? errorDocuments :
                currentView === 'pdfs' ? errorPdfs :
                currentView === 'images' ? errorImages :
                currentView === 'spreadsheets' ? errorSpreadsheets :
                currentView === 'videos' ? errorVideos :
                currentView === 'audio' ? errorAudio :
                currentView === 'trash' ? errorTrash :
                errorAll;

  const createFolderMutation = useCreateFolder();
  const deleteFileMutation = useDeleteFile();
  const deleteFolderMutation = useDeleteFolder();
  const restoreFileMutation = useRestoreFile();
  const restoreFolderMutation = useRestoreFolder();
  const renameFileMutation = useRenameFile();
  const renameFolderMutation = useRenameFolder();
  const toggleStarMutation = useToggleStarFile();
  const copyFileMutation = useCopyFile();
  const copyFolderMutation = useCopyFolder();
  const moveFileMutation = useMoveFile();
  const moveFolderMutation = useMoveFolder();

  // Debug effect to log state changes
  React.useEffect(() => {
    console.log('🔍 Debug - currentView:', currentView, 'workspaceId:', workspaceId, 'selectedTab:', selectedTab);
    console.log('🔍 Query enabled conditions:');
    console.log('  - documents enabled:', !!workspaceId && currentView === 'documents');
    console.log('  - pdfs enabled:', !!workspaceId && currentView === 'pdfs');
    console.log('  - images enabled:', !!workspaceId && currentView === 'images');
    console.log('  - dashboard stats enabled:', !!workspaceId && selectedTab === 'dashboard');
  }, [currentView, workspaceId, selectedTab]);

  // Listen for sidebar category change events
  React.useEffect(() => {
    const handleCategoryChange = (event: any) => {
      const category = event.detail?.category;
      console.log('📂 Files category changed to:', category);

      // Map category to view type
      const validCategories = [
        'all-files', 'recent', 'starred', 'shared-with-me', 'trash',
        'documents', 'pdfs', 'images', 'spreadsheets', 'videos', 'audio'
      ];

      if (validCategories.includes(category)) {
        console.log('✅ Navigating to view:', category);
        // Use navigation instead of setting state directly
        navigateToView(category);
      }
    };

    window.addEventListener('filesCategoryChanged', handleCategoryChange);
    return () => {
      window.removeEventListener('filesCategoryChanged', handleCategoryChange);
    };
  }, []);

  // Handle folder change from FileExplorer - updates state and breadcrumbs
  // TanStack Query will handle the fetching and caching automatically
  const handleFolderChange = React.useCallback((
    folderId: string | null,
    folderName?: string,
    navigationType?: 'enter' | 'back'
  ) => {
    console.log('📂 Navigating to folder:', folderId || 'ROOT', 'type:', navigationType);

    // Use navigation instead of setting state directly
    navigateToFolder(folderId, folderName);

    // Update breadcrumb trail based on navigation type
    if (navigationType === 'enter' && folderId && folderName) {
      // Entering a folder - add to trail
      setBreadcrumbTrail(prev => [...prev, { id: folderId, name: folderName }]);
      console.log('📍 Breadcrumb: Adding folder to trail');
    } else if (navigationType === 'back') {
      // Going back - slice trail
      if (folderId === null) {
        // Get the appropriate root name based on current view
        const categoryNames: Record<string, string> = {
          'all-files': intl.formatMessage({ id: 'modules.files.views.allFiles', defaultMessage: 'All Files' }),
          'recent': intl.formatMessage({ id: 'modules.files.views.recent', defaultMessage: 'Recent' }),
          'starred': intl.formatMessage({ id: 'modules.files.views.starred', defaultMessage: 'Starred' }),
          'shared-with-me': intl.formatMessage({ id: 'modules.files.views.sharedWithMe', defaultMessage: 'Shared with Me' }),
          'trash': intl.formatMessage({ id: 'modules.files.views.trash', defaultMessage: 'Trash' }),
          'documents': intl.formatMessage({ id: 'modules.files.views.documents', defaultMessage: 'Documents' }),
          'pdfs': intl.formatMessage({ id: 'modules.files.views.pdfs', defaultMessage: 'PDFs' }),
          'images': intl.formatMessage({ id: 'modules.files.views.images', defaultMessage: 'Images' }),
          'spreadsheets': intl.formatMessage({ id: 'modules.files.views.spreadsheets', defaultMessage: 'Spreadsheets' }),
          'videos': intl.formatMessage({ id: 'modules.files.views.videos', defaultMessage: 'Videos' }),
          'audio': intl.formatMessage({ id: 'modules.files.views.audio', defaultMessage: 'Audio' }),
        };
        const rootName = categoryNames[currentView] || intl.formatMessage({ id: 'modules.files.views.allFiles', defaultMessage: 'All Files' });
        setBreadcrumbTrail([{ id: null, name: rootName }]);
        console.log('📍 Breadcrumb: Reset to root with name:', rootName);
      } else {
        setBreadcrumbTrail(prev => {
          const targetIndex = prev.findIndex(item => item.id === folderId);
          if (targetIndex !== -1) {
            return prev.slice(0, targetIndex + 1);
          }
          return prev;
        });
        console.log('📍 Breadcrumb: Sliced to target');
      }
    }
  }, [currentView, intl]);

  // Delete file or folder
  const deleteFile = async (fileId: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      // Find the item in the files array to determine if it's a file or folder
      const item = files.find(f => f.id === fileId);

      if (!item) {
        toast.error(intl.formatMessage({ id: 'modules.files.errors.itemNotFound', defaultMessage: 'Item not found' }));
        return;
      }

      if (item.type === 'folder') {
        await deleteFolderMutation.mutateAsync({ workspaceId, folderId: fileId });
        toast.success(intl.formatMessage({ id: 'modules.files.success.folderDeleted', defaultMessage: 'Folder deleted successfully' }));
      } else {
        await deleteFileMutation.mutateAsync({ workspaceId, fileId });
        toast.success(intl.formatMessage({ id: 'modules.files.success.deleted', defaultMessage: 'File deleted successfully' }));
      }
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.deleteFailed', defaultMessage: 'Failed to delete item' });
      toast.error(errorMessage);
      console.error('Error deleting item:', err);
    }
  };

  // Restore file or folder
  const handleRestore = async (fileId: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      // Find the item in the files array to determine if it's a file or folder
      const item = files.find(f => f.id === fileId);

      if (!item) {
        toast.error(intl.formatMessage({ id: 'modules.files.errors.itemNotFound', defaultMessage: 'Item not found' }));
        return;
      }

      if (item.type === 'folder') {
        const result = await restoreFolderMutation.mutateAsync({ workspaceId, folderId: fileId });
        toast.success(intl.formatMessage(
          { id: 'modules.files.success.restoreFolder', defaultMessage: 'Restored {folderCount} folder(s) and {fileCount} file(s)' },
          { folderCount: result.restored_folders_count, fileCount: result.restored_files_count }
        ));
      } else {
        const result = await restoreFileMutation.mutateAsync({ workspaceId, fileId });
        toast.success(intl.formatMessage(
          { id: 'modules.files.success.restoreFile', defaultMessage: 'File "{fileName}" restored successfully' },
          { fileName: result.file.name }
        ));
      }
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.restoreFailed', defaultMessage: 'Failed to restore item' });
      toast.error(errorMessage);
      console.error('Error restoring item:', err);
    }
  };

  // Download file
  const downloadFile = async (fileId: string, fileName: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      toast.info(intl.formatMessage({ id: 'modules.files.messages.downloading', defaultMessage: 'Downloading file...' }));

      const blob = await filesService.downloadFile(workspaceId, fileId);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(intl.formatMessage({ id: 'modules.files.success.downloaded', defaultMessage: 'File downloaded successfully' }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.downloadFailed', defaultMessage: 'Failed to download file' });
      toast.error(errorMessage);
      console.error('Error downloading file:', err);
    }
  };

  // Handle file click for sidebar
  const handleFileClick = (file: FileItem) => {
    setSelectedFile(file);
  };

  // Handle create folder
  const handleCreateFolder = async (name: string, parentId: string | null, description?: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      await createFolderMutation.mutateAsync({
        workspaceId,
        data: {
          name,
          parent_id: parentId || undefined,
          description,
        },
      });

      toast.success(intl.formatMessage(
        { id: 'modules.files.success.folderCreated', defaultMessage: 'Folder "{name}" created successfully' },
        { name }
      ));
      // TanStack Query will automatically refetch due to cache invalidation in the mutation
    } catch (error) {
      console.error('❌ Failed to create folder:', error);
      toast.error(error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.files.errors.createFolderFailed', defaultMessage: 'Failed to create folder' }));
    }
  };

  // Handle upload files success
  const handleUploadFiles = () => {
    console.log('Files uploaded successfully - cache will auto-refresh');
    // TanStack Query will automatically refetch due to cache invalidation in the upload mutation
  };

  // Handle rename file or folder
  const handleRename = async (fileId: string, newName: string, itemType: 'file' | 'folder') => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      if (itemType === 'folder') {
        await renameFolderMutation.mutateAsync({ workspaceId, folderId: fileId, name: newName });
        toast.success(intl.formatMessage(
          { id: 'modules.files.success.folderRenamed', defaultMessage: 'Folder renamed to "{name}"' },
          { name: newName }
        ));
      } else {
        await renameFileMutation.mutateAsync({ workspaceId, fileId, name: newName });
        toast.success(intl.formatMessage(
          { id: 'modules.files.success.fileRenamed', defaultMessage: 'File renamed to "{name}"' },
          { name: newName }
        ));
      }
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.renameFailed', defaultMessage: 'Failed to rename item' });
      toast.error(errorMessage);
      console.error('Error renaming item:', err);
    }
  };

  // Handle toggle star
  const handleToggleStar = async (fileId: string, currentStarred: boolean) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      const newStarred = !currentStarred;
      await toggleStarMutation.mutateAsync({ workspaceId, fileId, starred: newStarred });
      toast.success(newStarred
        ? intl.formatMessage({ id: 'modules.files.success.starred', defaultMessage: 'File starred' })
        : intl.formatMessage({ id: 'modules.files.success.unstarred', defaultMessage: 'File unstarred' })
      );
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.toggleStarFailed', defaultMessage: 'Failed to toggle star' });
      toast.error(errorMessage);
      console.error('Error toggling star:', err);
    }
  };

  // Handle file copy
  const handleFileCopy = async (fileId: string, targetFolderId: string | null, newName: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      await copyFileMutation.mutateAsync({
        workspaceId,
        fileId,
        targetFolderId,
        newName,
      });
      // Success toast is handled in FileExplorer
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.copyFileFailed', defaultMessage: 'Failed to copy file' });
      toast.error(errorMessage);
      console.error('Error copying file:', err);
      throw err; // Re-throw to let FileExplorer handle it
    }
  };

  // Handle folder copy
  const handleFolderCopy = async (folderId: string, targetParentId: string | null, newName: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      await copyFolderMutation.mutateAsync({
        workspaceId,
        folderId,
        targetParentId,
        newName,
      });
      // Success toast is handled in FileExplorer
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.copyFolderFailed', defaultMessage: 'Failed to copy folder' });
      toast.error(errorMessage);
      console.error('Error copying folder:', err);
      throw err; // Re-throw to let FileExplorer handle it
    }
  };

  // Handle file move (for cut/paste)
  const handleFileMove = async (fileId: string, targetFolderId: string | null, newName?: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      await moveFileMutation.mutateAsync({
        workspaceId,
        fileId,
        targetFolderId,
        newName,
      });
      // Success toast is handled in FileExplorer
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.moveFileFailed', defaultMessage: 'Failed to move file' });
      toast.error(errorMessage);
      console.error('Error moving file:', err);
      throw err; // Re-throw to let FileExplorer handle it
    }
  };

  // Handle folder move (for cut/paste)
  const handleFolderMove = async (folderId: string, targetParentId: string | null, newName?: string) => {
    if (!workspaceId) {
      toast.error(intl.formatMessage({ id: 'common.errors.workspaceRequired', defaultMessage: 'Workspace ID is required' }));
      return;
    }

    try {
      await moveFolderMutation.mutateAsync({
        workspaceId,
        folderId,
        targetParentId,
        newName,
      });
      // Success toast is handled in FileExplorer
      // Cache invalidation happens automatically in the mutation's onSuccess
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : intl.formatMessage({ id: 'modules.files.errors.moveFolderFailed', defaultMessage: 'Failed to move folder' });
      toast.error(errorMessage);
      console.error('Error moving folder:', err);
      throw err; // Re-throw to let FileExplorer handle it
    }
  };

  // Show error if query failed
  if (error) {
    toast.error(error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.files.errors.loadFailed', defaultMessage: 'Failed to load files' }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">{intl.formatMessage({ id: 'modules.files.page.loading', defaultMessage: 'Loading files...' })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-semibold">{intl.formatMessage({ id: 'modules.files.page.title', defaultMessage: 'Files' })}</h1>
            <StorageStats files={files} stats={dashboardStats || null} />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={intl.formatMessage({ id: 'modules.files.page.searchPlaceholder', defaultMessage: 'Search files, content, tags...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-80"
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={selectedTab} onValueChange={(tab) => {
          // Handle navigation for different tabs
          if (tab === 'all-files') {
            setSelectedTab('all-files');
            navigateToView('all-files');
          } else {
            setSelectedTab(tab as 'dashboard' | 'messages' | 'projects' | 'calendar' | 'notes');
          }
        }} className="px-4">
          <TabsList className="grid w-full max-w-2xl grid-cols-2 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <TabsTrigger
              value="all-files"
              className="data-[state=active]:gradient-primary-active"
            >
              {intl.formatMessage({ id: 'modules.files.tabs.allFiles', defaultMessage: 'All Files' })}
            </TabsTrigger>
            <TabsTrigger
              value="dashboard"
              className="data-[state=active]:gradient-primary-active"
            >
              {intl.formatMessage({ id: 'modules.files.tabs.dashboard', defaultMessage: 'Dashboard' })}
            </TabsTrigger>
            {/* <TabsTrigger
              value="messages"
              className="data-[state=active]:gradient-primary-active"
            >
              Messages
            </TabsTrigger>
            <TabsTrigger
              value="projects"
              className="data-[state=active]:gradient-primary-active"
            >
              Projects
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="data-[state=active]:gradient-primary-active"
            >
              Calendar
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="data-[state=active]:gradient-primary-active"
            >
              Notes
            </TabsTrigger> */}
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={selectedTab} className="h-full">
          <TabsContent value="all-files" className="h-full m-0">
            <FileExplorer
              key={workspaceId} // Stable key - only remount if workspace changes
              files={files}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchQuery={searchQuery}
              onFileClick={handleFileClick}
              onFileDelete={deleteFile}
              onFileDownload={downloadFile}
              onFileRename={handleRename}
              onToggleStar={handleToggleStar}
              onFileRestore={handleRestore}
              onCreateFolder={handleCreateFolder}
              onUploadFiles={handleUploadFiles}
              onFolderChange={handleFolderChange}
              onFileCopy={handleFileCopy}
              onFolderCopy={handleFolderCopy}
              onFileMove={handleFileMove}
              onFolderMove={handleFolderMove}
              workspaceId={workspaceId || ''}
              currentFolderId={currentFolderId}
              isFetching={isFetching}
              breadcrumbTrail={breadcrumbTrail}
              isTrashView={currentView === 'trash'}
              isSearchView={searchQuery.trim().length > 0}
              isSharedWithMeView={currentView === 'shared-with-me'}
              allowCutCopyPaste={currentView === 'all-files'}
            />
          </TabsContent>

          <TabsContent value="dashboard" className="h-full m-0 p-6">
            <AssetDashboard
              files={files}
              stats={dashboardStats || null}
              isLoading={isLoadingDashboard}
              onCreateNew={(type) => {
                console.log('Create new:', type);
                // TODO: Implement AI creation modal
                window.dispatchEvent(new CustomEvent('openAICreation', { detail: { type } }));
              }}
            />
          </TabsContent>

          <TabsContent value="messages" className="h-full m-0 p-6">
            <div className="text-center py-12">
              <h2 className="text-lg font-semibold mb-4">Message Attachments</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="projects" className="h-full m-0 p-6">
            <div className="text-center py-12">
              <h2 className="text-lg font-semibold mb-4">Project Assets</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="h-full m-0 p-6">
            <div className="text-center py-12">
              <h2 className="text-lg font-semibold mb-4">Calendar Documents</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="h-full m-0 p-6">
            <div className="text-center py-12">
              <h2 className="text-lg font-semibold mb-4">Note Attachments</h2>
              <p className="text-muted-foreground">Coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default FilesPage;
