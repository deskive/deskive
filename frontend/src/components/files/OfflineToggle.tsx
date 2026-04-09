import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, CloudOff, Cloud, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { offlineStorage } from '@/lib/offline-storage';
import { toast } from 'sonner';

interface OfflineToggleProps {
  workspaceId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  version: number;
  url?: string;
  className?: string;
  showLabel?: boolean;
  onStatusChange?: (isOffline: boolean) => void;
}

export function OfflineToggle({
  workspaceId,
  fileId,
  fileName,
  mimeType,
  size,
  version,
  url,
  className,
  showLabel = true,
  onStatusChange,
}: OfflineToggleProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [needsSync, setNeedsSync] = useState(false);

  const {
    markFileOffline,
    removeFileOffline,
    syncFile,
    isMarkingOffline,
    isRemovingOffline,
  } = useOfflineSync({ workspaceId });

  // Check initial offline status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const metadata = await offlineStorage.getFileMetadata(fileId);
        setIsOffline(!!metadata);
        if (metadata) {
          setNeedsSync(metadata.serverVersion > metadata.localVersion || metadata.syncStatus === 'outdated');
        }
      } catch (error) {
        console.error('Failed to check offline status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [fileId]);

  const handleToggle = async () => {
    try {
      if (isOffline) {
        await removeFileOffline(fileId);
        setIsOffline(false);
        onStatusChange?.(false);
      } else {
        await markFileOffline(fileId, {
          fileName,
          mimeType,
          size,
          version,
          url,
        });
        setIsOffline(true);
        setNeedsSync(false);
        onStatusChange?.(true);
      }
    } catch (error) {
      console.error('Failed to toggle offline status:', error);
    }
  };

  const handleSync = async () => {
    try {
      await syncFile(fileId);
      setNeedsSync(false);
      toast.success(`"${fileName}" synced successfully`);
    } catch (error) {
      console.error('Failed to sync file:', error);
    }
  };

  const isPending = isMarkingOffline || isRemovingOffline;

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {showLabel && <span className="text-sm text-muted-foreground">Checking...</span>}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex items-center gap-2">
        {isOffline ? (
          <CloudOff className="h-4 w-4 text-primary" />
        ) : (
          <Cloud className="h-4 w-4 text-muted-foreground" />
        )}
        {showLabel && (
          <Label htmlFor={`offline-toggle-${fileId}`} className="text-sm cursor-pointer">
            Available offline
          </Label>
        )}
      </div>

      <Switch
        id={`offline-toggle-${fileId}`}
        checked={isOffline}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />

      {isPending && <Loader2 className="h-4 w-4 animate-spin" />}

      {isOffline && needsSync && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={handleSync}
          title="Sync file"
        >
          <RefreshCw className="h-3.5 w-3.5 text-amber-500" />
        </Button>
      )}
    </div>
  );
}

/**
 * Simple button variant for context menus
 */
interface OfflineButtonProps {
  workspaceId: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  version: number;
  url?: string;
  className?: string;
  onComplete?: () => void;
}

export function OfflineButton({
  workspaceId,
  fileId,
  fileName,
  mimeType,
  size,
  version,
  url,
  className,
  onComplete,
}: OfflineButtonProps) {
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    markFileOffline,
    removeFileOffline,
    isMarkingOffline,
    isRemovingOffline,
  } = useOfflineSync({ workspaceId });

  // Check initial offline status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const metadata = await offlineStorage.getFileMetadata(fileId);
        setIsOffline(!!metadata);
      } catch (error) {
        console.error('Failed to check offline status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [fileId]);

  const handleClick = async () => {
    try {
      if (isOffline) {
        await removeFileOffline(fileId);
        setIsOffline(false);
      } else {
        await markFileOffline(fileId, {
          fileName,
          mimeType,
          size,
          version,
          url,
        });
        setIsOffline(true);
      }
      onComplete?.();
    } catch (error) {
      console.error('Failed to toggle offline status:', error);
    }
  };

  const isPending = isMarkingOffline || isRemovingOffline || isLoading;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('w-full justify-start', className)}
      onClick={handleClick}
      disabled={isPending}
    >
      {isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : isOffline ? (
        <CloudOff className="h-4 w-4 mr-2" />
      ) : (
        <Cloud className="h-4 w-4 mr-2" />
      )}
      {isOffline ? 'Remove from offline' : 'Make available offline'}
    </Button>
  );
}
