/**
 * Dropbox Import Modal
 * Allows users to browse and import files from Dropbox
 */

import React, { useState, useEffect } from 'react';
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
  ChevronRight,
  Home,
  AlertCircle,
  CloudDownload,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import dropboxApi, { type DropboxFile } from '@/lib/api/dropbox-api';
import { fileApi } from '@/lib/api/files-api';
import { cn } from '@/lib/utils';

interface DropboxImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
  targetFolderId?: string | null;
}

export function DropboxImportModal({
  isOpen,
  onClose,
  onImportSuccess,
  targetFolderId,
}: DropboxImportModalProps) {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [files, setFiles] = useState<DropboxFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);

  // Check connection status
  useEffect(() => {
    if (isOpen && workspaceId) {
      checkConnection();
    }
  }, [isOpen, workspaceId]);

  // Load files when path changes
  useEffect(() => {
    if (isOpen && workspaceId && isConnected) {
      loadFiles();
    }
  }, [isOpen, workspaceId, isConnected, currentPath]);

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

  const loadFiles = async () => {
    if (!workspaceId) return;
    try {
      setIsLoading(true);
      const dropboxFiles = await dropboxApi.listFiles(workspaceId, currentPath);
      setFiles(dropboxFiles);
    } catch (error) {
      console.error('Failed to load Dropbox files:', error);
      toast.error('Failed to load files from Dropbox');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(fileId)) {
      newSelected.delete(fileId);
    } else {
      newSelected.add(fileId);
    }
    setSelectedFiles(newSelected);
  };

  const handleFolderClick = (file: DropboxFile) => {
    if (file.isFolder) {
      setCurrentPath(file.pathDisplay);
      setSelectedFiles(new Set());
    }
  };

  const handleGoToRoot = () => {
    setCurrentPath('');
    setSelectedFiles(new Set());
  };

  const handleImport = async () => {
    if (!workspaceId || selectedFiles.size === 0) return;

    try {
      setIsImporting(true);
      const filesToImport = files.filter(f => selectedFiles.has(f.id) && !f.isFolder);

      for (const file of filesToImport) {
        // Download from Dropbox
        const blob = await dropboxApi.downloadFile(workspaceId, file.pathDisplay);

        // Create File object from Blob
        const fileObj = new (window as any).File([blob], file.name, {
          type: 'application/octet-stream'
        }) as File;

        // Upload to Deskive
        await fileApi.uploadFile(workspaceId, {
          file: fileObj,
          workspace_id: workspaceId,
          parent_folder_id: targetFolderId || undefined,
        });
      }

      toast.success(`Imported ${filesToImport.length} file(s) from Dropbox`);
      onImportSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to import files:', error);
      toast.error('Failed to import files from Dropbox');
    } finally {
      setIsImporting(false);
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

  // Filter files by search
  const filteredFiles = searchQuery.trim()
    ? files.filter(file => file.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : files;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudDownload className="w-5 h-5" />
            Import from Dropbox
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
              Connect your Dropbox account to import files
            </p>
            <Button onClick={handleConnectDropbox}>
              Connect Dropbox
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Button variant="ghost" size="sm" onClick={handleGoToRoot} className="gap-1 h-8 px-2">
                <Home className="w-4 h-4" />
              </Button>
              {currentPath && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="truncate">{currentPath}</span>
                </>
              )}
            </div>

            {/* File List */}
            <ScrollArea className="h-[400px] border rounded-lg">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-50" />
                  <p>No files found</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredFiles.map((file) => (
                    <div
                      key={file.id}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors',
                        selectedFiles.has(file.id) && 'bg-muted'
                      )}
                      onClick={() => file.isFolder ? handleFolderClick(file) : handleFileSelect(file.id)}
                    >
                      {!file.isFolder && (
                        <Checkbox
                          checked={selectedFiles.has(file.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFileSelect(file.id);
                          }}
                        />
                      )}
                      {file.isFolder ? (
                        <Folder className="w-5 h-5 text-yellow-500 shrink-0" />
                      ) : (
                        <File className="w-5 h-5 text-blue-500 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        {!file.isFolder && (
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                      {file.isFolder && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Actions */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {selectedFiles.size} file(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isImporting}>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
