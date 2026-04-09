/**
 * Google Drive Export Modal
 * Allows users to select a folder in Google Drive to export files to
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import {
  Loader2,
  Folder,
  ChevronRight,
  Home,
  AlertCircle,
  Upload,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  googleDriveApi,
  type GoogleDriveFile,
} from '@/lib/api/google-drive-api';
import { cn } from '@/lib/utils';

interface GoogleDriveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (targetFolderId?: string) => void;
  fileName: string;
  isExporting?: boolean;
}

// Breadcrumb item
interface BreadcrumbItem {
  id: string;
  name: string;
}

export function GoogleDriveExportModal({
  isOpen,
  onClose,
  onExport,
  fileName,
  isExporting = false,
}: GoogleDriveExportModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Check connection status on mount
  useEffect(() => {
    if (isOpen && workspaceId) {
      checkConnection();
    }
  }, [isOpen, workspaceId]);

  // Load folders when folder changes
  useEffect(() => {
    if (isOpen && workspaceId && isConnected) {
      loadFolders();
    }
  }, [isOpen, workspaceId, isConnected, currentFolder]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentFolder('root');
      setBreadcrumbs([]);
      setFolders([]);
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

  const loadFolders = useCallback(async () => {
    if (!workspaceId) return;

    setIsLoading(true);
    try {
      const response = await googleDriveApi.listFiles(workspaceId, {
        folderId: currentFolder === 'root' ? undefined : currentFolder,
        fileType: 'folder', // Only show folders
      });
      // Filter to only show folders
      const foldersOnly = response.files.filter(f => f.fileType === 'folder');
      setFolders(foldersOnly);
    } catch (error) {
      console.error('Failed to load Google Drive folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, currentFolder]);

  const navigateToFolder = (folder: GoogleDriveFile) => {
    setBreadcrumbs(prev => [...prev, { id: folder.id, name: folder.name }]);
    setCurrentFolder(folder.id);
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
  };

  const handleExport = () => {
    // Pass the current folder ID (undefined for root)
    onExport(currentFolder === 'root' ? undefined : currentFolder);
  };

  const getCurrentFolderName = () => {
    if (breadcrumbs.length === 0) return 'My Drive';
    return breadcrumbs[breadcrumbs.length - 1].name;
  };

  // Render loading skeleton
  const renderSkeleton = () => (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map(i => (
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
      <h3 className="text-lg font-medium mb-2">Google Drive Not Connected</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Connect your Google Drive to export files.
      </p>
      <Button onClick={onClose}>Close</Button>
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
        <span>My Drive</span>
      </button>
      {breadcrumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <button
            onClick={() => navigateToBreadcrumb(index)}
            className={cn(
              "px-2 py-1 rounded hover:bg-muted transition-colors truncate max-w-[150px]",
              index === breadcrumbs.length - 1
                ? "text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {crumb.name}
          </button>
        </React.Fragment>
      ))}
    </div>
  );

  // Render folder list
  const renderFolders = () => {
    if (folders.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No folders here</p>
          <p className="text-xs text-muted-foreground mt-1">
            You can export to this location or navigate to another folder
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {folders.map(folder => (
          <button
            key={folder.id}
            onClick={() => navigateToFolder(folder)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
          >
            <Folder className="h-8 w-8 text-yellow-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{folder.name}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Export to Google Drive
          </DialogTitle>
        </DialogHeader>

        {isCheckingConnection ? (
          renderSkeleton()
        ) : !isConnected ? (
          renderNotConnected()
        ) : (
          <div className="flex flex-col flex-1 min-h-0">
            {/* File being exported */}
            <div className="bg-muted/50 rounded-lg p-3 mb-4 flex-shrink-0">
              <p className="text-sm text-muted-foreground">Exporting:</p>
              <p className="font-medium truncate">{fileName}</p>
            </div>

            {/* Breadcrumbs */}
            <div className="border-b pb-2 mb-2 flex-shrink-0">
              {renderBreadcrumbs()}
            </div>

            {/* Folder list */}
            <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
              {isLoading ? renderSkeleton() : renderFolders()}
            </ScrollArea>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-4 mt-4 border-t flex-shrink-0">
              <div className="flex-1 text-sm text-muted-foreground">
                Export to: <span className="font-medium text-foreground">{getCurrentFolderName()}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isExporting}>
                  Cancel
                </Button>
                <Button onClick={handleExport} disabled={isExporting}>
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Export Here
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
