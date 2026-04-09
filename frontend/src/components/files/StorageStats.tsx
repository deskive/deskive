/**
 * Storage Stats Component
 * Displays storage usage information with tooltip details
 */

import React from 'react';
import { HardDrive, TrendingUp } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Card, CardContent } from '../ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { useStorageStats } from '../../hooks/files/useStorageStats';
import type { DashboardStats } from '../../lib/api/files-api';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

interface StorageStatsProps {
  files?: any[];
  stats?: DashboardStats | null;
}

export function StorageStats({ files = [], stats }: StorageStatsProps) {
  const intl = useIntl();
  const storageStats = useStorageStats(files);

  // Prefer API stats, fallback to client-side calculation
  const totalSize = stats?.storage_used_bytes ?? storageStats.totalSize;
  const maxStorage = stats?.storage_total_bytes ?? storageStats.maxStorage;
  const usagePercentage = stats?.storage_percentage_used ?? storageStats.usagePercentage;
  const availableSpace = maxStorage - totalSize;
  const totalFiles = stats?.total_files ?? files.length;

  // File type counts from API or client-side
  const fileTypeCounts = stats?.file_type_breakdown ?? storageStats.fileTypeCounts;

  // Plan information from API
  const planName = stats?.plan?.name ?? 'Free';
  const planMaxStorageGb = stats?.plan?.max_storage_gb ?? 1;

  const getUsageColor = (percentage: number) => {
    if (percentage < 60) return 'text-green-600';
    if (percentage < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const fileTypeBreakdown = [
    { mimetype: 'documents', count: fileTypeCounts.documents || 0 },
    { mimetype: 'images', count: fileTypeCounts.images || 0 },
    { mimetype: 'videos', count: fileTypeCounts.videos || 0 },
    { mimetype: 'audio', count: fileTypeCounts.audio || 0 },
    { mimetype: 'spreadsheets', count: fileTypeCounts.spreadsheets || 0 },
    { mimetype: 'pdfs', count: fileTypeCounts.pdfs || 0 },
  ].filter(item => item.count > 0);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  {planName}
                </Badge>
                <span className="text-sm font-medium">
                  {formatFileSize(totalSize)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatFileSize(maxStorage)}
                </span>
                <Badge variant="outline" className={getUsageColor(usagePercentage)}>
                  {usagePercentage.toFixed(0)}%
                </Badge>
              </div>
            </div>

            <div className="w-20">
              <Progress
                value={usagePercentage}
                className="h-2"
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="w-80">
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{intl.formatMessage({ id: 'modules.files.storage.heading', defaultMessage: 'Storage Usage' })}</h4>
                  <Badge variant="outline" className={getUsageColor(usagePercentage)}>
                    {intl.formatMessage({ id: 'modules.files.storage.percentUsed', defaultMessage: '{percent}% used' }, { percent: usagePercentage.toFixed(0) })}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'modules.files.storage.plan', defaultMessage: 'Plan:' })}</span>
                    <span className="font-medium">{intl.formatMessage({ id: 'modules.files.storage.planDetails', defaultMessage: '{planName} ({size} GB)' }, { planName, size: planMaxStorageGb })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'modules.files.storage.usedStorage', defaultMessage: 'Used:' })}</span>
                    <span className="font-medium">{formatFileSize(totalSize)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'modules.files.storage.total', defaultMessage: 'Total:' })}</span>
                    <span className="font-medium">{formatFileSize(maxStorage)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'modules.files.storage.available', defaultMessage: 'Available:' }).replace(':', '')}</span>
                    <span className="font-medium text-green-600">
                      {formatFileSize(availableSpace)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'modules.files.storage.filesCount', defaultMessage: 'Files:' })}</span>
                    <span className="font-medium">{totalFiles.toLocaleString()}</span>
                  </div>
                </div>

                {fileTypeBreakdown.length > 0 && (
                  <>
                    <div className="border-t pt-3">
                      <h5 className="font-medium text-sm mb-2 flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {intl.formatMessage({ id: 'modules.files.storage.fileTypesHeading', defaultMessage: 'File Types' })}
                      </h5>
                      <div className="space-y-2">
                        {fileTypeBreakdown.map((fileType) => {
                          const typeLabel = fileType.mimetype.toUpperCase();

                          return (
                            <div key={fileType.mimetype} className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {typeLabel}
                                </Badge>
                                <span>{intl.formatMessage({ id: 'modules.files.storage.filesLabel', defaultMessage: '{count} files' }, { count: fileType.count })}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {usagePercentage > 80 && (
                  <div className="border-t pt-3">
                    <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>{intl.formatMessage({ id: 'modules.files.storage.warningTitle', defaultMessage: 'Storage Warning:' })}</strong> {intl.formatMessage({ id: 'modules.files.storage.warningMessage', defaultMessage: 'You\'re using {percent}% of your {planName} plan storage ({size} GB). Consider organizing files or upgrading your plan.' }, { percent: usagePercentage.toFixed(0), planName, size: planMaxStorageGb })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
