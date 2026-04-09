/**
 * Hook for managing offline file sync
 * Combines IndexedDB local storage with backend API for offline file access
 */

import { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { offlineStorage } from '@/lib/offline-storage';
import type { OfflineFileMetadata, SyncStatus } from '@/lib/offline-storage';
import {
  offlineFilesApi,
  useMarkFileOffline,
  useRemoveFileOffline,
  useUpdateOfflineSettings,
  useBatchUpdateSyncStatus,
} from '@/lib/api/files-api';
import type { OfflineFile } from '@/lib/api/files-api';
import { fileApi } from '@/lib/api/files-api';

interface UseOfflineSyncOptions {
  workspaceId: string;
  autoSyncInterval?: number; // in milliseconds, default 5 minutes
  enableAutoSync?: boolean;
}

interface SyncProgress {
  total: number;
  completed: number;
  current: string | null;
  status: 'idle' | 'syncing' | 'completed' | 'error';
}

export function useOfflineSync({
  workspaceId,
  autoSyncInterval = 5 * 60 * 1000, // 5 minutes
  enableAutoSync = true,
}: UseOfflineSyncOptions) {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({
    total: 0,
    completed: 0,
    current: null,
    status: 'idle',
  });

  const markOfflineMutation = useMarkFileOffline();
  const removeOfflineMutation = useRemoveFileOffline();
  const updateSettingsMutation = useUpdateOfflineSettings();
  const batchUpdateMutation = useBatchUpdateSyncStatus();

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online');
      // Trigger sync when coming back online
      if (enableAutoSync) {
        syncAllFiles();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Files marked for offline access are still available.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enableAutoSync]);

  // Auto-sync interval
  useEffect(() => {
    if (!enableAutoSync || !isOnline) return;

    const interval = setInterval(() => {
      checkForUpdates();
    }, autoSyncInterval);

    return () => clearInterval(interval);
  }, [enableAutoSync, isOnline, autoSyncInterval]);

  /**
   * Mark a file for offline access
   * Downloads the file and stores it in IndexedDB
   */
  const markFileOffline = useCallback(async (
    fileId: string,
    fileData: {
      fileName: string;
      mimeType: string;
      size: number;
      version: number;
      url?: string;
    },
    options?: { autoSync?: boolean; priority?: number }
  ) => {
    try {
      // Register with backend
      const offlineRecord = await markOfflineMutation.mutateAsync({
        workspaceId,
        fileId,
        options,
      });

      // Download the file
      setSyncProgress({
        total: 1,
        completed: 0,
        current: fileData.fileName,
        status: 'syncing',
      });

      const blob = await fileApi.downloadFile(workspaceId, fileId);

      // Store in IndexedDB
      await offlineStorage.cacheFile(
        fileId,
        workspaceId,
        fileData,
        blob,
        options?.autoSync ?? true
      );

      // Update backend sync status
      await updateSettingsMutation.mutateAsync({
        workspaceId,
        fileId,
        options: {
          syncStatus: 'synced',
          syncedVersion: fileData.version,
        },
      });

      setSyncProgress({
        total: 1,
        completed: 1,
        current: null,
        status: 'completed',
      });

      toast.success(`"${fileData.fileName}" is now available offline`);
      return offlineRecord;
    } catch (error) {
      console.error('Failed to mark file offline:', error);
      toast.error('Failed to make file available offline');
      setSyncProgress((prev) => ({ ...prev, status: 'error' }));
      throw error;
    }
  }, [workspaceId, markOfflineMutation, updateSettingsMutation]);

  /**
   * Remove a file from offline access
   */
  const removeFileOffline = useCallback(async (fileId: string) => {
    try {
      // Remove from backend
      await removeOfflineMutation.mutateAsync({ workspaceId, fileId });

      // Remove from IndexedDB
      await offlineStorage.removeFile(fileId);

      toast.success('File removed from offline access');
    } catch (error) {
      console.error('Failed to remove file offline:', error);
      toast.error('Failed to remove file from offline access');
      throw error;
    }
  }, [workspaceId, removeOfflineMutation]);

  /**
   * Get file blob from local cache
   * Falls back to network if online and not cached
   */
  const getFileBlob = useCallback(async (fileId: string): Promise<Blob | null> => {
    // Try local cache first
    const cachedBlob = await offlineStorage.getFileBlob(fileId);
    if (cachedBlob) {
      return cachedBlob;
    }

    // If online, try to download
    if (isOnline) {
      try {
        const blob = await fileApi.downloadFile(workspaceId, fileId);
        return blob;
      } catch (error) {
        console.error('Failed to download file:', error);
        return null;
      }
    }

    return null;
  }, [workspaceId, isOnline]);

  /**
   * Check if a file is available offline
   */
  const isFileAvailableOffline = useCallback(async (fileId: string): Promise<boolean> => {
    return offlineStorage.isFileAvailableOffline(fileId);
  }, []);

  /**
   * Get local offline files
   */
  const getLocalOfflineFiles = useCallback(async (): Promise<OfflineFileMetadata[]> => {
    return offlineStorage.getOfflineFiles(workspaceId);
  }, [workspaceId]);

  /**
   * Check for updates on all offline files
   */
  const checkForUpdates = useCallback(async () => {
    if (!isOnline) return;

    try {
      // Get files needing sync from backend
      const filesNeedingSync = await offlineFilesApi.getFilesNeedingSync(workspaceId);

      // Mark local files as outdated
      for (const file of filesNeedingSync) {
        if (file.serverVersion && file.syncedVersion) {
          await offlineStorage.markAsOutdated(file.fileId, file.serverVersion);
        }
      }

      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['offline-files', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['files-needing-sync', workspaceId] });

      return filesNeedingSync;
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return [];
    }
  }, [workspaceId, isOnline, queryClient]);

  /**
   * Sync a single file
   */
  const syncFile = useCallback(async (fileId: string) => {
    if (!isOnline) {
      toast.warning('Cannot sync while offline');
      return;
    }

    try {
      const metadata = await offlineStorage.getFileMetadata(fileId);
      if (!metadata) return;

      // Update status to syncing
      await offlineStorage.updateSyncStatus(fileId, 'syncing');

      // Download latest version
      const blob = await fileApi.downloadFile(workspaceId, fileId);

      // Check for update info
      const updateInfo = await offlineFilesApi.checkFileUpdate(workspaceId, fileId);

      // Update local cache
      await offlineStorage.saveFileBlob(fileId, blob);
      await offlineStorage.updateSyncStatus(fileId, 'synced', updateInfo.serverVersion);

      // Update backend
      await updateSettingsMutation.mutateAsync({
        workspaceId,
        fileId,
        options: {
          syncStatus: 'synced',
          syncedVersion: updateInfo.serverVersion,
        },
      });

      toast.success(`"${metadata.fileName}" synced successfully`);
    } catch (error) {
      console.error('Failed to sync file:', error);
      await offlineStorage.updateSyncStatus(fileId, 'error');
      toast.error('Failed to sync file');
      throw error;
    }
  }, [workspaceId, isOnline, updateSettingsMutation]);

  /**
   * Sync all offline files that need updating
   */
  const syncAllFiles = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    try {
      setIsSyncing(true);

      // Get files needing sync
      const filesNeedingSync = await offlineStorage.getFilesNeedingSync(workspaceId);

      if (filesNeedingSync.length === 0) {
        setSyncProgress({ total: 0, completed: 0, current: null, status: 'completed' });
        return;
      }

      setSyncProgress({
        total: filesNeedingSync.length,
        completed: 0,
        current: null,
        status: 'syncing',
      });

      const updates: Array<{
        fileId: string;
        syncStatus: SyncStatus;
        syncedVersion?: number;
        errorMessage?: string;
      }> = [];

      for (let i = 0; i < filesNeedingSync.length; i++) {
        const file = filesNeedingSync[i];
        setSyncProgress((prev) => ({
          ...prev,
          current: file.fileName,
        }));

        try {
          // Download and update local cache
          const blob = await fileApi.downloadFile(workspaceId, file.fileId);
          const updateInfo = await offlineFilesApi.checkFileUpdate(workspaceId, file.fileId);

          await offlineStorage.saveFileBlob(file.fileId, blob);
          await offlineStorage.updateSyncStatus(file.fileId, 'synced', updateInfo.serverVersion);

          updates.push({
            fileId: file.fileId,
            syncStatus: 'synced',
            syncedVersion: updateInfo.serverVersion,
          });
        } catch (error) {
          console.error(`Failed to sync ${file.fileName}:`, error);
          await offlineStorage.updateSyncStatus(file.fileId, 'error');
          updates.push({
            fileId: file.fileId,
            syncStatus: 'error',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          });
        }

        setSyncProgress((prev) => ({
          ...prev,
          completed: i + 1,
        }));
      }

      // Batch update backend
      if (updates.length > 0) {
        await batchUpdateMutation.mutateAsync({ workspaceId, updates });
      }

      const successCount = updates.filter((u) => u.syncStatus === 'synced').length;
      const errorCount = updates.filter((u) => u.syncStatus === 'error').length;

      if (errorCount === 0) {
        toast.success(`Synced ${successCount} file(s) successfully`);
      } else {
        toast.warning(`Synced ${successCount} file(s), ${errorCount} failed`);
      }

      setSyncProgress({
        total: filesNeedingSync.length,
        completed: filesNeedingSync.length,
        current: null,
        status: errorCount > 0 ? 'error' : 'completed',
      });
    } catch (error) {
      console.error('Failed to sync files:', error);
      toast.error('Failed to sync offline files');
      setSyncProgress((prev) => ({ ...prev, status: 'error' }));
    } finally {
      setIsSyncing(false);
    }
  }, [workspaceId, isOnline, isSyncing, batchUpdateMutation]);

  /**
   * Get storage statistics
   */
  const getStorageStats = useCallback(async () => {
    return offlineStorage.getStorageStats(workspaceId);
  }, [workspaceId]);

  /**
   * Clear all offline data for this workspace
   */
  const clearOfflineData = useCallback(async () => {
    try {
      // Get all offline files
      const files = await offlineStorage.getOfflineFiles(workspaceId);

      // Remove from backend
      for (const file of files) {
        await removeOfflineMutation.mutateAsync({ workspaceId, fileId: file.fileId });
      }

      // Clear local storage
      await offlineStorage.clearWorkspaceData(workspaceId);

      queryClient.invalidateQueries({ queryKey: ['offline-files', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['offline-storage-stats', workspaceId] });

      toast.success('Cleared all offline files');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast.error('Failed to clear offline files');
    }
  }, [workspaceId, removeOfflineMutation, queryClient]);

  return {
    // State
    isOnline,
    isSyncing,
    syncProgress,

    // Actions
    markFileOffline,
    removeFileOffline,
    syncFile,
    syncAllFiles,
    checkForUpdates,
    clearOfflineData,

    // Queries
    getFileBlob,
    isFileAvailableOffline,
    getLocalOfflineFiles,
    getStorageStats,

    // Mutation states
    isMarkingOffline: markOfflineMutation.isPending,
    isRemovingOffline: removeOfflineMutation.isPending,
  };
}

/**
 * Hook to get network status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
