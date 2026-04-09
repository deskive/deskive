/**
 * Google Drive Import Modal
 * Allows users to browse and import files from Google Drive
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import { Skeleton } from '../ui/skeleton';
import {
  Loader2,
  Search,
  Folder,
  File,
  FileText,
  Table,
  Presentation,
  Image,
  Video,
  FileType,
  ChevronRight,
  Home,
  AlertCircle,
  CloudDownload,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  googleDriveApi,
  type GoogleDriveFile,
  type GoogleDriveFileType,
  formatFileSize,
} from '@/lib/api/google-drive-api';
import { cn } from '@/lib/utils';

interface GoogleDriveImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  targetFolderId?: string | null;
}

// File type icon component
function DriveFileIcon({ fileType, className }: { fileType: GoogleDriveFileType; className?: string }) {
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

// Breadcrumb item
interface BreadcrumbItem {
  id: string;
  name: string;
}

export function GoogleDriveImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  targetFolderId,
}: GoogleDriveImportModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    if (isOpen && workspaceId) {
      checkConnection();
    }
  }, [isOpen, workspaceId]);

  // Load files when folder changes
  useEffect(() => {
    if (isOpen && workspaceId && isConnected) {
      loadFiles();
    }
  }, [isOpen, workspaceId, isConnected, currentFolder]);

  const checkConnection = async () => {
    if (!workspaceId) return;

    setIsCheckingConnection(true);
    try {
      const connection = await googleDriveApi.getConnection(workspaceId);
      setIsConnected(!!connection);
    } catch (error) {
      console.error('Failed to check Google Drive connection:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const loadFiles = async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolder,
        query: searchQuery || undefined,
        pageSize: 100,
      });
      setFiles(response.files);
    } catch (error) {
      console.error('Failed to load files:', error);
      toast.error('Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectDrive = async () => {
    if (!workspaceId) return;

    try {
      const returnUrl = window.location.href;
      const { authorizationUrl } = await googleDriveApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Google Drive auth URL:', error);
      toast.error('Failed to connect to Google Drive');
    }
  };

  const handleNavigateToFolder = useCallback(
    (folderId: string, folderName?: string) => {
      if (folderId === 'root') {
        setCurrentFolder('root');
        setBreadcrumbs([]);
      } else {
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
      setSelectedFiles(new Set());
    },
    [breadcrumbs]
  );

  const handleFileClick = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      handleNavigateToFolder(file.id, file.name);
    } else {
      // Toggle selection
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        newSelected.add(file.id);
      }
      setSelectedFiles(newSelected);
    }
  };

  const handleSelectAll = () => {
    const selectableFiles = files.filter((f) => f.fileType !== 'folder');
    if (selectedFiles.size === selectableFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(selectableFiles.map((f) => f.id)));
    }
  };

  const handleImport = async () => {
    if (!workspaceId || selectedFiles.size === 0) return;

    setIsImporting(true);
    const fileIds = Array.from(selectedFiles);
    let successCount = 0;
    let errorCount = 0;

    for (const fileId of fileIds) {
      try {
        await googleDriveApi.importFile(workspaceId, {
          fileId,
          targetFolderId: targetFolderId || undefined,
        });
        successCount++;
      } catch (error) {
        console.error(`Failed to import file ${fileId}:`, error);
        errorCount++;
      }
    }

    setIsImporting(false);

    if (successCount > 0) {
      toast.success(`Successfully imported ${successCount} file(s)`);
      onImportSuccess();
    }
    if (errorCount > 0) {
      toast.error(`Failed to import ${errorCount} file(s)`);
    }

    setSelectedFiles(new Set());
    onClose();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  // Sort files: folders first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    if (a.fileType === 'folder' && b.fileType !== 'folder') return -1;
    if (a.fileType !== 'folder' && b.fileType === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  const selectableFilesCount = files.filter((f) => f.fileType !== 'folder').length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg viewBox="0 0 87.3 78" className="w-6 h-6">
              <path d="M6.6 66.85L15.9 78h55.5l9.3-11.15z" fill="#0066da" />
              <path d="M57.6 0L29.4 0 0 48.1l14.8 18.9 28.8-48.2z" fill="#00ac47" />
              <path d="M29.4 0l28.2 0 29.7 48.1H29.1z" fill="#ea4335" />
              <path d="M29.1 48.1h58.2l-9.2 18.9H14.8z" fill="#00832d" />
              <path d="M57.6 0L29.1 48.1h58.2L57.6 0z" fill="#2684fc" />
              <path d="M0 48.1l14.8 18.9 14.3-18.9z" fill="#ffba00" />
            </svg>
            Import from Google Drive
          </DialogTitle>
        </DialogHeader>

        {isCheckingConnection ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">Google Drive Not Connected</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Connect your Google Drive account to import files into Deskive.
            </p>
            <Button onClick={handleConnectDrive}>
              Connect Google Drive
            </Button>
          </div>
        ) : (
          <>
            {/* Search and Navigation */}
            <div className="space-y-3">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </form>

              {/* Breadcrumbs */}
              <div className="flex items-center gap-1 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => handleNavigateToFolder('root')}
                >
                  <Home className="w-4 h-4" />
                </Button>
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={item.id}>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 px-2',
                        index === breadcrumbs.length - 1 && 'font-medium'
                      )}
                      onClick={() => handleNavigateToFolder(item.id, item.name)}
                    >
                      {item.name}
                    </Button>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* File List */}
            <ScrollArea className="flex-1 border rounded-lg">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="w-5 h-5" />
                      <Skeleton className="w-5 h-5" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              ) : sortedFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Folder className="w-12 h-12 mb-4 opacity-50" />
                  <p>No files found</p>
                </div>
              ) : (
                <div className="p-2">
                  {/* Select All Header */}
                  {selectableFilesCount > 0 && (
                    <div className="flex items-center gap-3 px-2 py-2 border-b mb-2">
                      <Checkbox
                        checked={selectedFiles.size === selectableFilesCount && selectableFilesCount > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedFiles.size > 0
                          ? `${selectedFiles.size} selected`
                          : `Select all (${selectableFilesCount} files)`}
                      </span>
                    </div>
                  )}

                  {/* File Items */}
                  {sortedFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedFiles.has(file.id) && 'bg-primary/10'
                      )}
                      onClick={() => handleFileClick(file)}
                    >
                      {file.fileType !== 'folder' && (
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onCheckedChange={() => handleFileClick(file)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      {file.fileType === 'folder' && <div className="w-4" />}
                      <DriveFileIcon fileType={file.fileType} className="w-5 h-5" />
                      <span className="flex-1 truncate text-sm">{file.name}</span>
                      {file.fileType !== 'folder' && file.size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      )}
                      {file.fileType === 'folder' && (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedFiles.size > 0
                  ? `${selectedFiles.size} file(s) selected for import`
                  : 'Select files to import'}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={selectedFiles.size === 0 || isImporting}
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <CloudDownload className="w-4 h-4 mr-2" />
                      Import {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default GoogleDriveImportModal;
