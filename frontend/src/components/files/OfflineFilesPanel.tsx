import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import {
  CloudOff,
  RefreshCw,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  HardDrive,
  FileIcon,
  Image,
  FileText,
  Film,
  Music,
  Archive,
} from 'lucide-react';
import { useOfflineSync, useNetworkStatus } from '@/hooks/useOfflineSync';
import { useOfflineFiles, useOfflineStorageStats } from '@/lib/api/files-api';
import { offlineStorage } from '@/lib/offline-storage';
import type { OfflineFileMetadata } from '@/lib/offline-storage';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface OfflineFilesPanelProps {
  open: boolean;
  onClose: () => void;
  workspaceId: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(mimeType?: string) {
  if (!mimeType) return <FileIcon className="h-5 w-5" />;

  if (mimeType.startsWith('image/')) return <Image className="h-5 w-5 text-purple-500" />;
  if (mimeType.startsWith('video/')) return <Film className="h-5 w-5 text-pink-500" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return <Archive className="h-5 w-5 text-amber-500" />;
  if (mimeType.includes('document') || mimeType.includes('text'))
    return <FileText className="h-5 w-5 text-blue-500" />;

  return <FileIcon className="h-5 w-5 text-muted-foreground" />;
}

export function OfflineFilesPanel({ open, onClose, workspaceId }: OfflineFilesPanelProps) {
  const isOnline = useNetworkStatus();
  const [localFiles, setLocalFiles] = useState<OfflineFileMetadata[]>([]);
  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  const { data: serverFiles, isLoading: isLoadingServer } = useOfflineFiles(workspaceId);
  const { data: stats } = useOfflineStorageStats(workspaceId);

  const {
    syncAllFiles,
    removeFileOffline,
    clearOfflineData,
    isSyncing,
    syncProgress,
  } = useOfflineSync({ workspaceId, enableAutoSync: false });

  // Load local files from IndexedDB
  useEffect(() => {
    const loadLocalFiles = async () => {
      try {
        const files = await offlineStorage.getOfflineFiles(workspaceId);
        setLocalFiles(files);
      } catch (error) {
        console.error('Failed to load local files:', error);
      } finally {
        setIsLoadingLocal(false);
      }
    };

    if (open) {
      loadLocalFiles();
    }
  }, [open, workspaceId]);

  const handleRemoveFile = async (fileId: string) => {
    await removeFileOffline(fileId);
    setLocalFiles((prev) => prev.filter((f) => f.fileId !== fileId));
  };

  const handleSyncAll = async () => {
    await syncAllFiles();
    // Reload local files
    const files = await offlineStorage.getOfflineFiles(workspaceId);
    setLocalFiles(files);
  };

  const handleClearAll = async () => {
    if (confirm('Are you sure you want to remove all offline files? This cannot be undone.')) {
      await clearOfflineData();
      setLocalFiles([]);
    }
  };

  const isLoading = isLoadingLocal || isLoadingServer;
  const files = localFiles.length > 0 ? localFiles : [];

  const getSyncStatusBadge = (status: string, needsSync?: boolean) => {
    if (needsSync) {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
          Update available
        </Badge>
      );
    }

    switch (status) {
      case 'synced':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
            Synced
          </Badge>
        );
      case 'syncing':
        return (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
            Syncing
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">
            Pending
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">
            Error
          </Badge>
        );
      case 'outdated':
        return (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
            Outdated
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] h-[80vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <CloudOff className="h-6 w-6" />
            Offline Files
          </DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              isOnline ? 'bg-green-500' : 'bg-red-500'
            )} />
            <span className="text-sm text-muted-foreground">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </DialogHeader>

        {/* Stats Bar */}
        {stats && (
          <div className="px-6 py-3 bg-muted/30 border-b border-border">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span>{formatBytes(stats.totalSize)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{stats.syncedCount} synced</span>
                </div>
                {stats.outdatedCount > 0 && (
                  <div className="flex items-center gap-1">
                    <RefreshCw className="h-4 w-4 text-amber-500" />
                    <span>{stats.outdatedCount} need update</span>
                  </div>
                )}
                {stats.errorCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span>{stats.errorCount} errors</span>
                  </div>
                )}
              </div>
              <span className="text-muted-foreground">{stats.totalFiles} files</span>
            </div>
          </div>
        )}

        {/* Sync Progress */}
        {isSyncing && (
          <div className="px-6 py-3 bg-blue-500/10 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <span className="text-sm">
                  Syncing {syncProgress.current || '...'}
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {syncProgress.completed}/{syncProgress.total}
              </span>
            </div>
            <Progress
              value={(syncProgress.completed / syncProgress.total) * 100}
              className="h-1"
            />
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading offline files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-24 h-24 mb-6 flex items-center justify-center">
                <CloudOff className="w-16 h-16 text-muted-foreground/50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                No offline files
              </h3>
              <p className="text-muted-foreground max-w-md">
                Mark files as "Available offline" to access them without an internet connection.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.fileId}
                  className="p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {getFileIcon(file.mimeType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm truncate">
                            {file.fileName}
                          </span>
                          {getSyncStatusBadge(
                            file.syncStatus,
                            file.serverVersion > file.localVersion
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatBytes(file.size)}</span>
                          {file.lastSyncedAt && (
                            <span>
                              Synced {formatDistanceToNow(new Date(file.lastSyncedAt), { addSuffix: true })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground">Auto-sync</span>
                          <Switch
                            checked={file.autoSync}
                            disabled
                            className="h-4 w-7"
                          />
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(file.fileId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={files.length === 0 || isSyncing}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncAll}
                disabled={!isOnline || isSyncing || files.length === 0}
              >
                {isSyncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sync All
              </Button>
              <Button onClick={onClose}>Close</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
