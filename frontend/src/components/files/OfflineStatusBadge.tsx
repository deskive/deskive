import React, { useState, useEffect } from 'react';
import { CloudOff, RefreshCw, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { offlineStorage } from '@/lib/offline-storage';
import type { SyncStatus } from '@/lib/offline-storage';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface OfflineStatusBadgeProps {
  fileId: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showBackground?: boolean;
}

const sizeClasses = {
  sm: 'h-2.5 w-2.5',
  md: 'h-3 w-3',
  lg: 'h-4 w-4',
};

export function OfflineStatusBadge({
  fileId,
  className,
  size = 'sm',
  showTooltip = true,
  showBackground = false,
}: OfflineStatusBadgeProps) {
  const [status, setStatus] = useState<{
    isOffline: boolean;
    syncStatus?: SyncStatus;
    needsSync?: boolean;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const metadata = await offlineStorage.getFileMetadata(fileId);
        if (metadata) {
          setStatus({
            isOffline: true,
            syncStatus: metadata.syncStatus,
            needsSync: metadata.serverVersion > metadata.localVersion,
          });
        } else {
          setStatus({ isOffline: false });
        }
      } catch (error) {
        console.error('Failed to check offline status:', error);
        setStatus({ isOffline: false });
      }
    };

    checkStatus();
  }, [fileId]);

  if (!status || !status.isOffline) {
    return null;
  }

  const getIcon = () => {
    const iconClass = cn(sizeClasses[size], className);

    switch (status.syncStatus) {
      case 'syncing':
        return <Loader2 className={cn(iconClass, 'animate-spin text-blue-300')} />;
      case 'error':
        return <AlertCircle className={cn(iconClass, 'text-red-400')} />;
      case 'outdated':
        return <RefreshCw className={cn(iconClass, 'text-amber-300')} />;
      case 'synced':
        if (status.needsSync) {
          return <RefreshCw className={cn(iconClass, 'text-amber-300')} />;
        }
        return <CloudOff className={cn(iconClass, 'text-green-400')} />;
      case 'pending':
        return <Loader2 className={cn(iconClass, 'animate-spin text-gray-300')} />;
      default:
        return <CloudOff className={cn(iconClass, 'text-white')} />;
    }
  };

  const getTooltipText = () => {
    switch (status.syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'error':
        return 'Sync error - click to retry';
      case 'outdated':
        return 'Update available';
      case 'synced':
        if (status.needsSync) {
          return 'Update available';
        }
        return 'Available offline';
      case 'pending':
        return 'Downloading...';
      default:
        return 'Available offline';
    }
  };

  const icon = getIcon();

  const badgeContent = showBackground ? (
    <span className="inline-flex items-center justify-center w-4 h-4 bg-slate-700 rounded-full shadow-sm">
      {icon}
    </span>
  ) : (
    icon
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">{badgeContent}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltipText()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Global sync status indicator for the header/toolbar
 */
interface GlobalSyncStatusProps {
  workspaceId: string;
  className?: string;
}

export function GlobalSyncStatus({ workspaceId, className }: GlobalSyncStatusProps) {
  const [stats, setStats] = useState<{
    totalFiles: number;
    pendingCount: number;
    errorCount: number;
    outdatedCount: number;
  } | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const s = await offlineStorage.getStorageStats(workspaceId);
        setStats(s);
      } catch (error) {
        console.error('Failed to load storage stats:', error);
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  if (!stats || stats.totalFiles === 0) {
    return null;
  }

  const hasIssues = stats.pendingCount > 0 || stats.errorCount > 0 || stats.outdatedCount > 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 cursor-pointer', className)}>
            {hasIssues ? (
              stats.errorCount > 0 ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : stats.pendingCount > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              ) : (
                <RefreshCw className="h-4 w-4 text-amber-500" />
              )
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
            <span className="text-xs text-muted-foreground">{stats.totalFiles}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <p>{stats.totalFiles} file(s) available offline</p>
            {stats.pendingCount > 0 && (
              <p className="text-blue-500">{stats.pendingCount} syncing</p>
            )}
            {stats.outdatedCount > 0 && (
              <p className="text-amber-500">{stats.outdatedCount} need update</p>
            )}
            {stats.errorCount > 0 && (
              <p className="text-red-500">{stats.errorCount} with errors</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
