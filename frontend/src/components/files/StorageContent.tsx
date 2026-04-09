/**
 * Storage Content Component
 * Displays storage statistics, recent files, and shared files
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import { Clock, Users, Folder, Download, Loader2 } from 'lucide-react';
import { useIntl } from 'react-intl';
import type { FileItem } from '../../types';
import { useRecentFiles, useDashboardStats, useSharedWithMeFiles } from '@/lib/api/files-api';
import { Skeleton } from '@/components/ui/skeleton';

interface StorageContentProps {
  files: FileItem[];
  onCreateFolder?: (name: string) => void;
  onUploadFiles?: () => void;
}

export const StorageContent: React.FC<StorageContentProps> = ({
  files,
  onCreateFolder,
  onUploadFiles,
}) => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const intl = useIntl();

  // Fetch dashboard stats from API (includes storage and file type breakdown)
  const { data: dashboardStats, isLoading: isLoadingStats } = useDashboardStats(workspaceId || '');

  // Fetch recent files from API
  const { data: recentFilesData = [], isLoading: isLoadingRecent } = useRecentFiles(
    workspaceId || '',
    5 // Limit to 5 recent files
  );

  // Fetch shared-with-me files from API
  const { data: sharedWithMeData = [], isLoading: isLoadingShared } = useSharedWithMeFiles(
    workspaceId || ''
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Use API data for recent files
  const recentFiles = recentFilesData;

  // Use API data for shared files (limit to 3)
  const sharedFiles = sharedWithMeData.slice(0, 3);

  const getFileIcon = (file: FileItem) => {
    // Support both mimeType and mime_type fields
    const mimeType = file.mimeType || (file as any).mime_type;

    if (mimeType?.includes('pdf'))
      return { bg: 'bg-red-500', text: 'PDF' };
    if (
      mimeType?.includes('document') ||
      mimeType?.includes('msword')
    )
      return { bg: 'bg-blue-500', text: 'DOC' };
    if (
      mimeType?.includes('spreadsheet') ||
      mimeType?.includes('excel')
    )
      return { bg: 'bg-green-500', text: 'XLS' };
    if (mimeType?.startsWith('image/'))
      return { bg: 'bg-purple-500', text: 'IMG' };
    if (mimeType?.startsWith('video/'))
      return { bg: 'bg-orange-500', text: 'VID' };
    if (mimeType?.startsWith('audio/'))
      return { bg: 'bg-pink-500', text: 'AUD' };
    return { bg: 'bg-gray-500', text: 'FILE' };
  };

  // Render file thumbnail or icon
  const renderFileThumbnail = (file: FileItem) => {
    // Support both mimeType and mime_type fields
    const mimeType = file.mimeType || (file as any).mime_type;

    // Handle URL field - can be string or object with publicUrl
    let imageUrl = file.url;
    if (typeof imageUrl === 'object' && imageUrl !== null && 'publicUrl' in imageUrl) {
      imageUrl = (imageUrl as any).publicUrl;
    }

    // For image files, show the actual image thumbnail
    if (mimeType?.startsWith('image/') && imageUrl) {
      return (
        <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
          <img
            src={imageUrl as string}
            alt={file.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to icon badge if image fails to load
              const target = e.currentTarget as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<div class="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-xs font-bold text-white">IMG</div>`;
              }
            }}
          />
        </div>
      );
    }

    // For other file types, show the colored icon badge
    const icon = getFileIcon(file);
    return (
      <div
        className={`w-10 h-10 ${icon.bg} rounded-lg flex items-center justify-center text-xs font-bold text-white`}
      >
        {icon.text}
      </div>
    );
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  // Get file type counts from dashboard stats
  const fileTypeCounts = {
    documents: (dashboardStats?.file_type_breakdown?.documents || 0) +
               (dashboardStats?.file_type_breakdown?.pdfs || 0) +
               (dashboardStats?.file_type_breakdown?.spreadsheets || 0),
    images: dashboardStats?.file_type_breakdown?.images || 0,
    videos: dashboardStats?.file_type_breakdown?.videos || 0,
    audio: dashboardStats?.file_type_breakdown?.audio || 0
  }

  const usedStorage = dashboardStats?.storage_used_bytes || 0
  const maxStorage = dashboardStats?.storage_total_bytes || (1 * 1024 * 1024 * 1024) // 1GB default (Free plan)
  const usagePercentage = dashboardStats?.storage_percentage_used || 0
  const availableSpace = maxStorage - usedStorage
  const planName = dashboardStats?.plan?.name || intl.formatMessage({ id: 'modules.files.storage.planFree', defaultMessage: 'Free' })

  return (
    <div className="space-y-6">
      {/* Storage Info */}
      <div>
        <div className="space-y-4">
          {isLoadingStats ? (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
                <Skeleton className="h-16 rounded-lg" />
              </div>
            </div>
          ) : (
            <>
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{intl.formatMessage({ id: 'modules.files.storage.usedStorage', defaultMessage: 'Used Storage' })}</span>
                    <span className="px-2 py-0.5 bg-secondary rounded text-xs font-medium">
                      {planName}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(usedStorage)} of{' '}
                    {formatFileSize(maxStorage)}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 mb-3">
                  <div
                    className="gradient-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.files.storage.available', defaultMessage: '{amount} available' }, { amount: formatFileSize(availableSpace) })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {fileTypeCounts.documents}
                  </div>
                  <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.files.views.documents', defaultMessage: 'Documents' })}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-600">
                    {fileTypeCounts.images}
                  </div>
                  <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.files.views.images', defaultMessage: 'Images' })}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {fileTypeCounts.videos}
                  </div>
                  <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.files.views.videos', defaultMessage: 'Videos' })}</div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-pink-600">
                    {fileTypeCounts.audio}
                  </div>
                  <div className="text-xs text-muted-foreground">{intl.formatMessage({ id: 'modules.files.views.audio', defaultMessage: 'Audio' })}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Files */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.files.sidebar.recentFiles', defaultMessage: 'Recent Files' })}
          </h3>
        </div>

        {isLoadingRecent ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Skeleton className="w-8 h-8 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentFiles.length > 0 ? (
          <div className="space-y-2">
            {recentFiles.map((file) => {
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 cursor-pointer transition-colors"
                >
                  {renderFileThumbnail(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Modified {file.updatedAt ? getTimeAgo(file.updatedAt) : 'Unknown'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{intl.formatMessage({ id: 'modules.files.empty.noRecent', defaultMessage: 'No recent files' })}</p>
          </div>
        )}
      </div>

      {/* Shared With Me */}
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Users className="h-5 w-5" />
          {intl.formatMessage({ id: 'modules.files.sidebar.sharedWithMe', defaultMessage: 'Shared With Me' })}
        </h3>

        {isLoadingShared ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : sharedFiles.length > 0 ? (
          <div className="space-y-2">
            {sharedFiles.map((file: any) => {
              return (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted/70 cursor-pointer transition-colors"
                >
                  {/* File thumbnail - shows actual image preview for images */}
                  {renderFileThumbnail(file)}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{file.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Shared by {file.shared_by_user?.name || 'Unknown'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>{intl.formatMessage({ id: 'modules.files.sidebar.noSharedFiles', defaultMessage: 'No shared files yet' })}</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-4">{intl.formatMessage({ id: 'modules.files.quickActions.heading', defaultMessage: 'Quick Actions' })}</h3>

        <div className="space-y-2">
          <button
            onClick={() => onCreateFolder?.('New Folder')}
            className="w-full flex items-center justify-start px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Folder className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.files.quickActions.createFolder', defaultMessage: 'Create Folder' })}
          </button>
          <button
            onClick={onUploadFiles}
            className="w-full flex items-center justify-start px-4 py-2 text-sm bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.files.quickActions.uploadFiles', defaultMessage: 'Upload Files' })}
          </button>
        </div>
      </div>
    </div>
  );
};
