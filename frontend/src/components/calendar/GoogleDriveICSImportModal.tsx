/**
 * Google Drive ICS Import Modal
 * Allows users to browse Google Drive and select an ICS file to import calendar events
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import {
  Loader2,
  Search,
  Folder,
  FileText,
  ChevronRight,
  Home,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  googleDriveApi,
  type GoogleDriveFile,
} from '@/lib/api/google-drive-api';
import { fetchWithAuth } from '@/lib/fetch';
import { cn } from '@/lib/utils';

interface GoogleDriveICSImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (content: string, fileName: string) => void;
  workspaceId: string;
  isImporting?: boolean;
}

// Breadcrumb item
interface BreadcrumbItem {
  id: string;
  name: string;
}

export function GoogleDriveICSImportModal({
  isOpen,
  onClose,
  onImport,
  workspaceId,
  isImporting = false,
}: GoogleDriveICSImportModalProps) {
  const intl = useIntl();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentFolder('root');
      setBreadcrumbs([]);
      setFiles([]);
      setSearchQuery('');
      setSelectedFile(null);
    }
  }, [isOpen]);

  const checkConnection = async () => {
    if (!workspaceId) return;

    setIsCheckingConnection(true);
    try {
      const connection = await googleDriveApi.getConnection(workspaceId);
      setIsConnected(connection?.isActive || false);
    } catch (error) {
      console.error('Failed to check Google Drive connection:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const loadFiles = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolder === 'root' ? undefined : currentFolder,
        query: searchQuery || undefined,
        pageSize: 100,
      });

      // Filter to show only folders and .ics files
      const filteredFiles = response.files.filter(
        (f) => f.fileType === 'folder' || f.name.toLowerCase().endsWith('.ics')
      );
      setFiles(filteredFiles);
    } catch (error) {
      console.error('Failed to load Google Drive files:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.import.loadFailed', defaultMessage: 'Failed to load files' }));
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, currentFolder, searchQuery, intl]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadFiles();
  };

  const navigateToFolder = (folder: GoogleDriveFile) => {
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolder(folder.id);
    setSelectedFile(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      // Navigate to root
      setCurrentFolder('root');
      setBreadcrumbs([]);
    } else {
      // Navigate to specific folder
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      setCurrentFolder(newBreadcrumbs[index].id);
    }
    setSelectedFile(null);
  };

  const handleFileClick = (file: GoogleDriveFile) => {
    if (file.fileType === 'folder') {
      navigateToFolder(file);
    } else {
      // Select/deselect ICS file
      setSelectedFile((prev) => (prev?.id === file.id ? null : file));
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !workspaceId) return;

    setIsDownloading(true);
    try {
      // Get the download URL and fetch the file content
      const downloadUrl = googleDriveApi.getDownloadUrl(workspaceId, selectedFile.id);

      const response = await fetchWithAuth(downloadUrl, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      // Get the file content as text
      const content = await response.text();

      // Pass content to parent for parsing
      onImport(content, selectedFile.name);
    } catch (error) {
      console.error('Failed to download ICS file:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.import.downloadFailed', defaultMessage: 'Failed to download file from Google Drive' }));
    } finally {
      setIsDownloading(false);
    }
  };

  // Sort files: folders first, then by name
  const sortedFiles = [...files].sort((a, b) => {
    if (a.fileType === 'folder' && b.fileType !== 'folder') return -1;
    if (a.fileType !== 'folder' && b.fileType === 'folder') return 1;
    return a.name.localeCompare(b.name);
  });

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 flex-1" />
        </div>
      ))}
    </div>
  );

  // Render not connected state
  const renderNotConnected = () => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">
        {intl.formatMessage({ id: 'modules.calendar.import.driveNotConnected', defaultMessage: 'Google Drive Not Connected' })}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {intl.formatMessage({ id: 'modules.calendar.import.connectDrive', defaultMessage: 'Connect your Google Drive to import calendar files.' })}
      </p>
      <Button onClick={onClose}>
        {intl.formatMessage({ id: 'common.close', defaultMessage: 'Close' })}
      </Button>
    </div>
  );

  // Render breadcrumbs
  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-1 text-sm overflow-x-auto pb-2">
      <button
        onClick={() => navigateToBreadcrumb(-1)}
        className="flex items-center gap-1 px-2 py-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
      >
        <Home className="h-4 w-4" />
        <span>{intl.formatMessage({ id: 'modules.calendar.import.myDrive', defaultMessage: 'My Drive' })}</span>
      </button>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => navigateToBreadcrumb(index)}
            className={cn(
              'px-2 py-1 rounded hover:bg-muted transition-colors truncate max-w-[150px]',
              index === breadcrumbs.length - 1
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  // Render file list
  const renderFiles = () => {
    const icsFiles = sortedFiles.filter((f) => f.fileType !== 'folder');

    if (sortedFiles.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'modules.calendar.import.noICSFiles', defaultMessage: 'No .ics files found here' })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {intl.formatMessage({ id: 'modules.calendar.import.navigateHint', defaultMessage: 'Navigate to a folder containing calendar files' })}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {sortedFiles.map((file) => {
          const isFolder = file.fileType === 'folder';
          const isSelected = selectedFile?.id === file.id;

          return (
            <button
              key={file.id}
              onClick={() => handleFileClick(file)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left',
                isSelected && 'bg-primary/10 border border-primary'
              )}
            >
              {isFolder ? (
                <Folder className="h-8 w-8 text-yellow-500 flex-shrink-0" />
              ) : (
                <FileText className="h-8 w-8 text-blue-500 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                {!isFolder && file.modifiedTime && (
                  <p className="text-xs text-muted-foreground">
                    {new Date(file.modifiedTime).toLocaleDateString()}
                  </p>
                )}
              </div>
              {isFolder && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.calendar.import.fromDriveTitle', defaultMessage: 'Import from Google Drive' })}
          </DialogTitle>
        </DialogHeader>

        {isCheckingConnection ? (
          renderSkeleton()
        ) : !isConnected ? (
          renderNotConnected()
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search */}
            <form onSubmit={handleSearch} className="relative mb-3 flex-shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={intl.formatMessage({ id: 'modules.calendar.import.searchPlaceholder', defaultMessage: 'Search for .ics files...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </form>

            {/* Breadcrumbs */}
            <div className="border-b pb-2 mb-2 flex-shrink-0">{renderBreadcrumbs()}</div>

            {/* File list */}
            <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
              {isLoading ? renderSkeleton() : renderFiles()}
            </ScrollArea>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 mt-4 border-t flex-shrink-0">
              <div className="flex-1 text-sm text-muted-foreground">
                {selectedFile ? (
                  <>
                    {intl.formatMessage({ id: 'modules.calendar.import.selected', defaultMessage: 'Selected:' })}{' '}
                    <span className="font-medium text-foreground">{selectedFile.name}</span>
                  </>
                ) : (
                  intl.formatMessage({ id: 'modules.calendar.import.selectFile', defaultMessage: 'Select an .ics file to import' })
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isDownloading || isImporting}>
                  {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={!selectedFile || isDownloading || isImporting}
                >
                  {isDownloading || isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {intl.formatMessage({ id: 'modules.calendar.import.importing', defaultMessage: 'Importing...' })}
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      {intl.formatMessage({ id: 'modules.calendar.import.importButton', defaultMessage: 'Import' })}
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
