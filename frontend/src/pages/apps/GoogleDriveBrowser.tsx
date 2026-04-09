import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  googleDriveApi,
  type GoogleDriveFile,
  type GoogleDriveDrive,
  type GoogleDriveFileType,
  type StorageQuota,
  formatFileSize,
  formatDate,
} from '@/lib/api/google-drive-api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Folder,
  File,
  FileText,
  Table,
  Presentation,
  Image,
  Video,
  FileType,
  MoreVertical,
  Download,
  Share2,
  Trash2,
  RefreshCw,
  Grid3X3,
  List,
  Home,
  FolderPlus,
  Upload,
  ExternalLink,
  Plus,
  HardDrive,
  Clock,
  Star,
  Users,
  Trash,
} from 'lucide-react';

// File type icon component
function FileIcon({ fileType, className }: { fileType: GoogleDriveFileType; className?: string }) {
  const iconMap: Record<GoogleDriveFileType, React.ReactNode> = {
    folder: <Folder className={cn('text-yellow-500', className)} />,
    document: <FileText className={cn('text-blue-500', className)} />,
    spreadsheet: <Table className={cn('text-green-500', className)} />,
    presentation: <Presentation className={cn('text-orange-500', className)} />,
    image: <Image className={cn('text-purple-500', className)} />,
    video: <Video className={cn('text-red-500', className)} />,
    pdf: <FileType className={cn('text-red-600', className)} />,
    file: <File className={cn('text-gray-500', className)} />,
  };

  return <>{iconMap[fileType] || iconMap.file}</>;
}

// Breadcrumb navigation
interface BreadcrumbItem {
  id: string;
  name: string;
}

function Breadcrumbs({
  items,
  onNavigate,
}: {
  items: BreadcrumbItem[];
  onNavigate: (folderId: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2"
        onClick={() => onNavigate('root')}
      >
        <Home className="w-4 h-4" />
      </Button>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 px-2',
              index === items.length - 1 && 'font-medium'
            )}
            onClick={() => onNavigate(item.id)}
          >
            {item.name}
          </Button>
        </React.Fragment>
      ))}
    </div>
  );
}

// File/folder item component
function FileItem({
  file,
  viewMode,
  onOpen,
  onDownload,
  onShare,
  onDelete,
}: {
  file: GoogleDriveFile;
  viewMode: 'grid' | 'list';
  onOpen: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
}) {
  const isFolder = file.fileType === 'folder';

  if (viewMode === 'grid') {
    return (
      <div
        className="group relative p-4 rounded-lg border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer"
        onClick={onOpen}
        onDoubleClick={isFolder ? onOpen : undefined}
      >
        <div className="flex flex-col items-center gap-3">
          {file.thumbnailLink && !isFolder ? (
            <div className="w-16 h-16 rounded overflow-hidden bg-muted flex items-center justify-center">
              <img
                src={file.thumbnailLink}
                alt={file.name}
                className="max-w-full max-h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = '';
                  // Fallback to icon would need to be handled differently
                }}
              />
            </div>
          ) : (
            <FileIcon fileType={file.fileType} className="w-12 h-12" />
          )}
          <div className="text-center w-full">
            <p className="text-sm font-medium truncate" title={file.name}>
              {file.name}
            </p>
            {!isFolder && file.size && (
              <p className="text-xs text-muted-foreground mt-1">
                {formatFileSize(file.size)}
              </p>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {file.webViewLink && (
              <DropdownMenuItem onClick={() => window.open(file.webViewLink, '_blank')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Google Drive
              </DropdownMenuItem>
            )}
            {!isFolder && (
              <DropdownMenuItem onClick={onDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // List view
  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={onOpen}
    >
      <FileIcon fileType={file.fileType} className="w-5 h-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{file.name}</p>
      </div>
      {!isFolder && (
        <>
          <p className="text-xs text-muted-foreground w-20 text-right">
            {formatFileSize(file.size)}
          </p>
          <p className="text-xs text-muted-foreground w-24 text-right">
            {formatDate(file.modifiedTime)}
          </p>
        </>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {file.webViewLink && (
            <DropdownMenuItem onClick={() => window.open(file.webViewLink, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Google Drive
            </DropdownMenuItem>
          )}
          {!isFolder && (
            <DropdownMenuItem onClick={onDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Move to Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton({ viewMode }: { viewMode: 'grid' | 'list' }) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="w-12 h-12 rounded" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3">
          <Skeleton className="w-5 h-5 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

// Navigation view type
type NavigationView = 'my-drive' | 'shared-drives' | 'recent' | 'starred' | 'shared' | 'trash';

// View labels for display
const VIEW_LABELS: Record<NavigationView, string> = {
  'my-drive': 'My Drive',
  'shared-drives': 'Shared Drives',
  'recent': 'Recent',
  'starred': 'Starred',
  'shared': 'Shared with me',
  'trash': 'Trash',
};

// Map navigation views to API views
const VIEW_TO_API: Record<NavigationView, 'recent' | 'starred' | 'trash' | 'shared' | undefined> = {
  'my-drive': undefined,
  'shared-drives': undefined,
  'recent': 'recent',
  'starred': 'starred',
  'shared': 'shared',
  'trash': 'trash',
};

// Navigation items configuration
const NAVIGATION_ITEMS: { id: NavigationView; label: string; icon: React.ReactNode }[] = [
  { id: 'my-drive', label: 'My Drive', icon: <HardDrive className="w-4 h-4" /> },
  { id: 'shared-drives', label: 'Shared Drives', icon: <Users className="w-4 h-4" /> },
  { id: 'recent', label: 'Recent', icon: <Clock className="w-4 h-4" /> },
  { id: 'starred', label: 'Starred', icon: <Star className="w-4 h-4" /> },
  { id: 'shared', label: 'Shared with me', icon: <Share2 className="w-4 h-4" /> },
  { id: 'trash', label: 'Trash', icon: <Trash className="w-4 h-4" /> },
];

// Main browser component
export function GoogleDriveBrowser() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [drives, setDrives] = useState<GoogleDriveDrive[]>([]);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [currentDrive, setCurrentDrive] = useState<string>('root');
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [currentView, setCurrentView] = useState<NavigationView>('my-drive');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  // Modal states
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [newFolderName, setNewFolderName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [storageQuota, setStorageQuota] = useState<StorageQuota | null>(null);

  // Load storage quota on mount
  useEffect(() => {
    loadStorageQuota();
  }, [workspaceId]);

  const loadStorageQuota = async () => {
    if (!workspaceId) return;

    try {
      const quota = await googleDriveApi.getStorageQuota(workspaceId);
      setStorageQuota(quota);
    } catch (error) {
      console.error('Failed to load storage quota:', error);
    }
  };

  // Handle query params from sidebar quick actions and navigation
  useEffect(() => {
    const action = searchParams.get('action');
    const viewParam = searchParams.get('view') as NavigationView | null;

    if (action === 'upload') {
      setShowUploadModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    } else if (action === 'new-folder') {
      setShowCreateFolderModal(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }

    // Handle view parameter from sidebar navigation
    if (viewParam && viewParam !== currentView) {
      setCurrentView(viewParam);
      setCurrentFolder('root');
      setBreadcrumbs([]);
      setSearchQuery('');

      // Reset to My Drive for shared-drives view
      if (viewParam === 'shared-drives') {
        if (drives.length > 1) {
          setCurrentDrive(drives[1].id);
        }
      } else {
        setCurrentDrive('root');
      }
    }
  }, [searchParams, setSearchParams, currentView, drives]);

  // Load drives on mount
  useEffect(() => {
    loadDrives();
  }, [workspaceId]);

  // Load files when folder or view changes
  useEffect(() => {
    loadFiles();
  }, [workspaceId, currentFolder, currentDrive, currentView]);

  const loadDrives = async () => {
    if (!workspaceId) return;

    try {
      const drivesList = await googleDriveApi.listDrives(workspaceId);
      setDrives(drivesList);
    } catch (error) {
      console.error('Failed to load drives:', error);
    }
  };

  const loadFiles = async (pageToken?: string) => {
    if (!workspaceId) return;

    try {
      if (!pageToken) {
        setIsLoading(true);
        setFiles([]);
      } else {
        setIsLoadingMore(true);
      }

      // Determine the API view based on current navigation view
      const apiView = VIEW_TO_API[currentView];

      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: apiView ? undefined : currentFolder,
        driveId: currentDrive !== 'root' ? currentDrive : undefined,
        query: searchQuery || undefined,
        pageToken,
        pageSize: 50,
        view: apiView,
      });

      if (pageToken) {
        setFiles((prev) => [...prev, ...response.files]);
      } else {
        setFiles(response.files);
      }

      setNextPageToken(response.nextPageToken);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast({
        title: 'Error',
        description: 'Failed to load files from Google Drive',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleNavigateToFolder = useCallback(
    async (folderId: string, folderName?: string) => {
      if (folderId === 'root') {
        setCurrentFolder('root');
        setBreadcrumbs([]);
      } else {
        // Update breadcrumbs
        if (folderName) {
          const existingIndex = breadcrumbs.findIndex((b) => b.id === folderId);
          if (existingIndex >= 0) {
            setBreadcrumbs(breadcrumbs.slice(0, existingIndex + 1));
          } else {
            setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
          }
        }
        setCurrentFolder(folderId);
      }
    },
    [breadcrumbs]
  );

  const handleNavigationChange = useCallback((viewId: NavigationView) => {
    setCurrentView(viewId);
    setCurrentFolder('root');
    setBreadcrumbs([]);
    setSearchQuery('');

    // Reset to My Drive for shared-drives view
    if (viewId === 'shared-drives') {
      // If there are shared drives, select the first one, otherwise stay on root
      if (drives.length > 1) {
        setCurrentDrive(drives[1].id); // First shared drive (index 0 is My Drive)
      }
    } else {
      setCurrentDrive('root');
    }
  }, [drives]);

  const handleOpenFile = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      handleNavigateToFolder(file.id, file.name);
    } else if (file.webViewLink) {
      window.open(file.webViewLink, '_blank');
    }
  };

  const handleDownloadFile = async (file: GoogleDriveFile) => {
    if (!workspaceId) return;

    try {
      toast({
        title: 'Downloading',
        description: `Starting download of ${file.name}...`,
      });

      await googleDriveApi.downloadFile(workspaceId, file.id, file.name);

      toast({
        title: 'Success',
        description: `${file.name} downloaded successfully`,
      });
    } catch (error) {
      console.error('Failed to download file:', error);
      toast({
        title: 'Error',
        description: 'Failed to download file',
        variant: 'destructive',
      });
    }
  };

  const handleShareFile = async (file: GoogleDriveFile) => {
    // TODO: Implement share dialog
    toast({
      title: 'Coming Soon',
      description: 'Share functionality will be available soon',
    });
  };

  const handleDeleteFile = async (file: GoogleDriveFile) => {
    if (!workspaceId) return;

    try {
      await googleDriveApi.deleteFile(workspaceId, file.id);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
      toast({
        title: 'Success',
        description: `${file.name} moved to trash`,
      });
    } catch (error) {
      console.error('Failed to delete file:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete file',
        variant: 'destructive',
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  const handleGoBack = () => {
    navigate(`/workspaces/${workspaceId}/apps`);
  };

  // Handle file selection for upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(files);
  };

  // Handle file upload to Google Drive
  const handleUploadFiles = async () => {
    if (!workspaceId || selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const totalFiles = selectedFiles.length;
      let uploadedCount = 0;

      for (const file of selectedFiles) {
        await googleDriveApi.uploadFile(workspaceId, file, {
          parentId: currentFolder !== 'root' ? currentFolder : undefined,
          driveId: currentDrive !== 'root' ? currentDrive : undefined,
        });
        uploadedCount++;
        setUploadProgress(Math.round((uploadedCount / totalFiles) * 100));
      }

      toast({
        title: 'Upload Complete',
        description: `Successfully uploaded ${totalFiles} file(s) to Google Drive`,
      });

      // Refresh file list
      loadFiles();
      setShowUploadModal(false);
      setSelectedFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Failed to upload files:', error);
      toast({
        title: 'Upload Failed',
        description: 'Failed to upload files to Google Drive',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!workspaceId || !newFolderName.trim()) return;

    setIsCreatingFolder(true);

    try {
      await googleDriveApi.createFolder(
        workspaceId,
        newFolderName.trim(),
        currentFolder !== 'root' ? currentFolder : undefined,
        currentDrive !== 'root' ? currentDrive : undefined
      );

      toast({
        title: 'Folder Created',
        description: `Successfully created folder "${newFolderName}"`,
      });

      // Refresh file list
      loadFiles();
      setShowCreateFolderModal(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Failed to create folder:', error);
      toast({
        title: 'Error',
        description: 'Failed to create folder',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Sort files: folders first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    if (a.fileType === 'folder' && b.fileType !== 'folder') return -1;
    if (a.fileType !== 'folder' && b.fileType === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  // Get current view title
  const getCurrentViewTitle = () => {
    return VIEW_LABELS[currentView] || 'My Drive';
  };

  return (
    <div className="h-full flex">
      {/* Left Sidebar Navigation */}
      <div className="w-56 border-r bg-muted/30 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleGoBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <img src="/icons/drive.png" alt="Google Drive" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-sm">Google Drive</span>
          </div>
        </div>

        {/* Navigation Items */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {NAVIGATION_ITEMS.map((item) => (
              <Button
                key={item.id}
                variant={currentView === item.id ? 'secondary' : 'ghost'}
                className={cn(
                  'w-full justify-start gap-3 h-9',
                  currentView === item.id && 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                )}
                onClick={() => handleNavigationChange(item.id)}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </Button>
            ))}
          </div>

          {/* Storage Info */}
          {storageQuota && (
            <div className="p-4 mt-4 border-t">
              <div className="text-xs text-muted-foreground mb-2">Storage</div>
              <Progress value={storageQuota.usagePercent} className="h-1.5" />
              <p className="text-xs text-muted-foreground mt-1">
                {storageQuota.usageFormatted} of {storageQuota.limitFormatted} used
              </p>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold">{getCurrentViewTitle()}</h1>
            </div>

          <div className="flex items-center gap-2">
            {/* Upload button - only show for My Drive and Shared Drives */}
            {(currentView === 'my-drive' || currentView === 'shared-drives') && (
              <>
                <Button onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>

                {/* Create folder button */}
                <Button variant="outline" onClick={() => setShowCreateFolderModal(true)}>
                  <FolderPlus className="w-4 h-4 mr-2" />
                  New Folder
                </Button>
              </>
            )}

            {/* Drive selector - only for shared-drives view */}
            {currentView === 'shared-drives' && drives.length > 1 && (
              <Select value={currentDrive} onValueChange={setCurrentDrive}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {drives.filter(d => d.id !== 'root').map((drive) => (
                    <SelectItem key={drive.id} value={drive.id}>
                      {drive.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Search */}
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </form>

            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            {/* Refresh */}
            <Button variant="outline" size="icon" onClick={() => loadFiles()}>
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumbs - only show for folder views */}
        {(currentView === 'my-drive' || currentView === 'shared-drives') && breadcrumbs.length > 0 && (
          <div className="px-4 py-2 border-b bg-muted/20">
            <Breadcrumbs items={breadcrumbs} onNavigate={(id) => handleNavigateToFolder(id)} />
          </div>
        )}

        {/* View title for special views */}
        {currentView !== 'my-drive' && currentView !== 'shared-drives' && (
          <div className="px-4 py-3 border-b bg-muted/20">
            <h2 className="text-lg font-medium">{getCurrentViewTitle()}</h2>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-4">
          {isLoading ? (
            <LoadingSkeleton viewMode={viewMode} />
          ) : sortedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Folder className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">This folder is empty</p>
              <p className="text-sm">Upload files or create folders to get started</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {sortedFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  viewMode="grid"
                  onOpen={() => handleOpenFile(file)}
                  onDownload={() => handleDownloadFile(file)}
                  onShare={() => handleShareFile(file)}
                  onDelete={() => handleDeleteFile(file)}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {/* List header */}
              <div className="flex items-center gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase">
                <div className="w-5" />
                <div className="flex-1">Name</div>
                <div className="w-20 text-right">Size</div>
                <div className="w-24 text-right">Modified</div>
                <div className="w-7" />
              </div>
              {sortedFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  viewMode="list"
                  onOpen={() => handleOpenFile(file)}
                  onDownload={() => handleDownloadFile(file)}
                  onShare={() => handleShareFile(file)}
                  onDelete={() => handleDeleteFile(file)}
                />
              ))}
            </div>
          )}

          {/* Load more */}
          {nextPageToken && !isLoading && (
            <div className="flex justify-center mt-6">
              <Button
                variant="outline"
                onClick={() => loadFiles(nextPageToken)}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More'
                )}
              </Button>
            </div>
          )}
          </div>
        </ScrollArea>
      </div>
      </div>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload to Google Drive
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file-upload">Select Files</Label>
              <Input
                id="file-upload"
                type="file"
                multiple
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="mt-2"
              />
            </div>

            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({selectedFiles.length})</Label>
                <div className="max-h-40 overflow-y-auto space-y-1 border rounded-lg p-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between text-sm py-1">
                      <span className="truncate flex-1">{file.name}</span>
                      <span className="text-muted-foreground ml-2">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {currentFolder !== 'root' && breadcrumbs.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Uploading to: {breadcrumbs[breadcrumbs.length - 1]?.name || 'Current folder'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUploadModal(false);
                setSelectedFiles([]);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadFiles}
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Modal */}
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-5 h-5" />
              Create New Folder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                placeholder="Enter folder name..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="mt-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName.trim()) {
                    handleCreateFolder();
                  }
                }}
              />
            </div>

            {currentFolder !== 'root' && breadcrumbs.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Creating in: {breadcrumbs[breadcrumbs.length - 1]?.name || 'Current folder'}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolderModal(false);
                setNewFolderName('');
              }}
              disabled={isCreatingFolder}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreatingFolder}
            >
              {isCreatingFolder ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Folder
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default GoogleDriveBrowser;
