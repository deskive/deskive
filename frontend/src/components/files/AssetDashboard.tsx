/**
 * Asset Dashboard Component
 * Overview dashboard for files with stats and quick actions
 */

import { useState, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  TrendingUp,
  Clock,
  Users,
  Target,
  Image,
  Video,
  Music,
  FileText,
  Plus,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  Download,
  Wand2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { DashboardStats } from '@/lib/api/files-api';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatRelativeTime = (date: string | Date): string => {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return then.toLocaleDateString();
};

interface AssetDashboardProps {
  files?: any[];
  stats?: DashboardStats | null;
  isLoading?: boolean;
  onCreateNew?: (type: 'image' | 'audio' | 'video' | 'document') => void;
}

export function AssetDashboard({ files = [], stats, isLoading, onCreateNew }: AssetDashboardProps) {
  const intl = useIntl();

  // Use API stats if available, otherwise calculate from files
  const metrics = useMemo(() => {
    if (stats) {
      return {
        totalFiles: stats.total_files,
        totalSize: stats.storage_used_bytes,
        recentFiles: stats.files_added_today,
        filesByType: stats.file_type_breakdown,
        storagePercentage: stats.storage_percentage_used,
        aiGenerations: stats.ai_generations_this_month,
        uniqueFileTypes: stats.unique_file_types,
        storageTotalBytes: stats.storage_total_bytes,
        storageUsedFormatted: stats.storage_used_formatted,
        storageTotalFormatted: stats.storage_total_formatted,
      };
    }

    // Fallback: calculate from files
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);

    const dayAgo = new Date();
    dayAgo.setDate(dayAgo.getDate() - 1);
    const recentFiles = files.filter(f => new Date(f.createdAt) > dayAgo).length;

    const filesByType = {
      images: files.filter(f => f.mimeType?.startsWith('image/')).length,
      videos: files.filter(f => f.mimeType?.startsWith('video/')).length,
      audio: files.filter(f => f.mimeType?.startsWith('audio/')).length,
      documents: files.filter(f =>
        f.mimeType?.includes('document') ||
        f.mimeType?.includes('text')
      ).length,
      spreadsheets: files.filter(f => f.mimeType?.includes('spreadsheet')).length,
      pdfs: files.filter(f => f.mimeType?.includes('pdf')).length,
    };

    const storageTotalBytes = 10 * 1024 * 1024 * 1024; // 10GB
    const storagePercentage = (totalSize / storageTotalBytes) * 100;

    return {
      totalFiles,
      totalSize,
      recentFiles,
      filesByType,
      storagePercentage,
      aiGenerations: 0,
      uniqueFileTypes: Object.values(filesByType).filter(count => count > 0).length,
      storageTotalBytes,
      storageUsedFormatted: formatFileSize(totalSize),
      storageTotalFormatted: '10 GB',
    };
  }, [files, stats]);

  const quickActions = [
    {
      id: 'image',
      name: intl.formatMessage({ id: 'modules.files.quickActions.aiImage', defaultMessage: 'AI Image' }),
      description: intl.formatMessage({ id: 'modules.files.quickActions.aiImageDesc', defaultMessage: 'Generate professional images' }),
      icon: Image,
      color: 'text-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200',
      onClick: () => onCreateNew?.('image'),
    },
    {
      id: 'video',
      name: intl.formatMessage({ id: 'modules.files.quickActions.aiVideo', defaultMessage: 'AI Video' }),
      description: intl.formatMessage({ id: 'modules.files.quickActions.aiVideoDesc', defaultMessage: 'Generate and edit video content' }),
      icon: Video,
      color: 'text-blue-600 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-blue-200',
      onClick: () => onCreateNew?.('video'),
    },
    {
      id: 'audio',
      name: intl.formatMessage({ id: 'modules.files.quickActions.aiAudio', defaultMessage: 'AI Audio' }),
      description: intl.formatMessage({ id: 'modules.files.quickActions.aiAudioDesc', defaultMessage: 'Create voice recordings' }),
      icon: Music,
      color: 'text-purple-600 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 border-purple-200',
      onClick: () => onCreateNew?.('audio'),
    },
    {
      id: 'document',
      name: intl.formatMessage({ id: 'modules.files.quickActions.aiDocument', defaultMessage: 'AI Document' }),
      description: intl.formatMessage({ id: 'modules.files.quickActions.aiDocumentDesc', defaultMessage: 'Generate documents from templates' }),
      icon: FileText,
      color: 'text-orange-600 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950 dark:to-amber-950 border-orange-200',
      onClick: () => onCreateNew?.('document'),
    },
  ];

  const recentActivity = useMemo(() => {
    return files
      .slice(0, 8)
      .map(file => ({
        id: file.id,
        type: 'file_upload' as 'file_upload' | 'ai_generation',
        title: `Uploaded ${file.name}`,
        time: file.createdAt,
        user: { name: 'You', imageUrl: undefined },
        icon: getFileIcon(file.mimeType || ''),
      }))
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [files]);

  function getFileIcon(mimetype: string) {
    if (mimetype.startsWith('image/')) return Image;
    if (mimetype.startsWith('video/')) return Video;
    if (mimetype.startsWith('audio/')) return Music;
    return FileText;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100%-1.5rem)] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-500">
      <div className="space-y-6 pr-2">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Files</p>
                  <p className="text-2xl font-bold">{metrics.totalFiles.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3 mr-1" />
                {metrics.recentFiles} added today
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
                  <p className="text-2xl font-bold">{metrics.storageUsedFormatted}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="mt-2">
                <Progress
                  value={metrics.storagePercentage}
                  className="h-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(metrics.storagePercentage)}% of {metrics.storageTotalFormatted} used
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">AI Generations</p>
                  <p className="text-2xl font-bold">{metrics.aiGenerations}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg">
                  <Zap className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="flex items-center mt-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 mr-1" />
                This month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Types</p>
                  <p className="text-2xl font-bold">{metrics.uniqueFileTypes}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="flex gap-1 mt-2 flex-wrap">
                {Object.entries(metrics.filesByType).filter(([_, count]) => count > 0).map(([type, count]) => (
                  <Badge key={type} variant="outline" className="text-xs">
                    {count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5" />
                {intl.formatMessage({ id: 'modules.files.quickActions.heading', defaultMessage: 'Quick Actions' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {quickActions.map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Card
                      key={action.id}
                      className="cursor-pointer transition-all hover:shadow-md hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-950 dark:hover:to-indigo-950"
                      onClick={action.onClick}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg border ${action.color}`}>
                            <IconComponent className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{action.name}</h3>
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {intl.formatMessage({ id: 'modules.files.recentActivity.heading', defaultMessage: 'Recent Activity' })}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => {
                  const IconComponent = activity.icon;
                  return (
                    <div key={activity.id} className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-full ${
                        activity.type === 'ai_generation'
                          ? 'bg-purple-50 text-purple-600'
                          : 'bg-blue-50 text-blue-600'
                      }`}>
                        <IconComponent className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Avatar className="h-4 w-4">
                            <AvatarImage src={activity.user.imageUrl} />
                            <AvatarFallback className="text-xs">
                              {activity.user.name?.charAt(0) || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeTime(activity.time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6">
                  <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {intl.formatMessage({ id: 'modules.files.recentActivity.noActivity', defaultMessage: 'No recent activity' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {intl.formatMessage({ id: 'modules.files.fileTypeBreakdown', defaultMessage: 'File Type Breakdown' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Images</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.images}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.images / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Videos</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.videos}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.videos / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium">Audio</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.audio}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.audio / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium">Documents</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.documents}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.documents / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-600" />
                    <span className="text-sm font-medium">Spreadsheets</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.spreadsheets}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.spreadsheets / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">PDFs</span>
                  </div>
                  <span className="text-sm font-bold">{metrics.filesByType.pdfs}</span>
                </div>
                <Progress
                  value={metrics.totalFiles > 0 ? (metrics.filesByType.pdfs / metrics.totalFiles) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
