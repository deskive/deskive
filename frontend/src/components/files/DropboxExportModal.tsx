/**
 * Dropbox Export Modal
 * Allows users to select a folder in Dropbox to export files to
 */

import React, { useState, useEffect } from 'react';
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
import dropboxApi, { type DropboxFile } from '@/lib/api/dropbox-api';
import { cn } from '@/lib/utils';

interface DropboxExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  fileUrl: string;
}

export function DropboxExportModal({
  isOpen,
  onClose,
  fileId,
  fileName,
  fileUrl,
}: DropboxExportModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [folders, setFolders] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Check connection status
  useEffect(() => {
    if (isOpen && workspaceId) {
      checkConnection();
    }
  }, [isOpen, workspaceId]);

  // Load folders when path changes
  useEffect(() => {
    if (isOpen && workspaceId && isConnected) {
      loadFolders();
    }
  }, [isOpen, workspaceId, isConnected, currentPath]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentPath('');
      setFolders([]);
    }
  }, [isOpen]);

  const checkConnection = async () => {
    if (!workspaceId) return;
    try {
      setIsCheckingConnection(true);
      const connection = await dropboxApi.getConnection(workspaceId);
      setIsConnected(!!connection);
    } catch (error) {
      setIsConnected(false);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const loadFolders = async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const dropboxFiles = await dropboxApi.listFiles(workspaceId, currentPath);
      // Filter to only show folders
      const foldersOnly = dropboxFiles.filter(f => f.isFolder);
      setFolders(foldersOnly);
    } catch (error) {
      console.error('Failed to load Dropbox folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderClick = (folder: DropboxFile) => {
    setCurrentPath(folder.pathDisplay);
  };

  const handleGoToRoot = () => {
    setCurrentPath('');
  };

  const handleExport = async () => {
    if (!workspaceId) return;

    try {
      setIsExporting(true);

      // Download file from Deskive
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const file = new (window as any).File([blob], fileName) as File;

      // Upload to Dropbox
      const targetPath = currentPath ? `${currentPath}/${fileName}` : `/${fileName}`;
      await dropboxApi.uploadFile(workspaceId, targetPath, file);

      toast.success(`Exported ${fileName} to Dropbox`);
      onClose();
    } catch (error) {
      console.error('Failed to export file:', error);
      toast.error('Failed to export to Dropbox');
    } finally {
      setIsExporting(false);
    }
  };

  const handleConnectDropbox = async () => {
    if (!workspaceId) return;
    try {
      const returnUrl = window.location.href;
      const { authorizationUrl } = await dropboxApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      toast.error('Failed to connect Dropbox');
    }
  };

  const getCurrentFolderName = () => {
    return currentPath || 'Dropbox';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Export to Dropbox
          </DialogTitle>
        </DialogHeader>

        {isCheckingConnection ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !isConnected ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Dropbox Not Connected</h3>
            <p className="text-muted-foreground mb-4">
              Connect your Dropbox account to export files
            </p>
            <Button onClick={handleConnectDropbox}>
              Connect Dropbox
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Choose a folder in Dropbox to export: <span className="font-medium text-foreground">{fileName}</span>
            </p>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
              <Button variant="ghost" size="sm" onClick={handleGoToRoot} className="gap-1 h-8 px-2">
                <Home className="w-4 h-4" />
                Dropbox
              </Button>
              {currentPath && (
                <>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium truncate">{currentPath.split('/').pop()}</span>
                </>
              )}
            </div>

            {/* Folder List */}
            <ScrollArea className="h-[300px] border rounded-lg">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : folders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-50" />
                  <p>No folders in this location</p>
                  <p className="text-xs mt-1">You can still export to the current folder</p>
                </div>
              ) : (
                <div className="p-2">
                  {folders.map((folder) => (
                    <div
                      key={folder.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleFolderClick(folder)}
                    >
                      <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{folder.name}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Selected location */}
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Export location:</p>
              <p className="font-medium">{getCurrentFolderName()}/{fileName}</p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={!isConnected || isExporting}
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Export to Dropbox
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
