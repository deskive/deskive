import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsNumber, IsEnum, IsArray } from 'class-validator';

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  SYNCED = 'synced',
  ERROR = 'error',
  OUTDATED = 'outdated',
}

export class MarkFileOfflineDto {
  @ApiProperty({
    description: 'Enable auto-sync for this file',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @ApiProperty({
    description: 'Sync priority (higher number = higher priority)',
    example: 0,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}

export class UpdateOfflineSettingsDto {
  @ApiProperty({
    description: 'Enable or disable auto-sync',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoSync?: boolean;

  @ApiProperty({
    description: 'Sync priority (higher number = higher priority)',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;

  @ApiProperty({
    description: 'Current sync status',
    enum: SyncStatus,
    example: SyncStatus.SYNCED,
    required: false,
  })
  @IsOptional()
  @IsEnum(SyncStatus)
  syncStatus?: SyncStatus;

  @ApiProperty({
    description: 'Synced file version',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  syncedVersion?: number;

  @ApiProperty({
    description: 'Error message if sync failed',
    example: 'Network error',
    required: false,
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;
}

export class BatchUpdateSyncStatusDto {
  @ApiProperty({
    description: 'Array of file sync status updates',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        fileId: { type: 'string' },
        syncStatus: { type: 'string', enum: Object.values(SyncStatus) },
        syncedVersion: { type: 'number' },
        errorMessage: { type: 'string' },
      },
    },
  })
  @IsArray()
  updates: {
    fileId: string;
    syncStatus: SyncStatus;
    syncedVersion?: number;
    errorMessage?: string;
  }[];
}

export class OfflineFileResponseDto {
  @ApiProperty({ description: 'Offline file record ID' })
  id: string;

  @ApiProperty({ description: 'File ID' })
  fileId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'Current sync status', enum: SyncStatus })
  syncStatus: SyncStatus;

  @ApiProperty({ description: 'Last synced timestamp', nullable: true })
  lastSyncedAt: string | null;

  @ApiProperty({ description: 'Synced file version' })
  syncedVersion: number;

  @ApiProperty({ description: 'Auto-sync enabled' })
  autoSync: boolean;

  @ApiProperty({ description: 'Sync priority' })
  priority: number;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'Error message if sync failed', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Updated timestamp' })
  updatedAt: string;

  // Joined file data (optional)
  @ApiProperty({ description: 'File name', required: false })
  fileName?: string;

  @ApiProperty({ description: 'File MIME type', required: false })
  mimeType?: string;

  @ApiProperty({ description: 'File URL', required: false })
  fileUrl?: string;

  @ApiProperty({ description: 'Current server file version', required: false })
  serverVersion?: number;

  @ApiProperty({
    description: 'Whether file needs sync (server version > synced version)',
    required: false,
  })
  needsSync?: boolean;
}

export class CheckUpdateResponseDto {
  @ApiProperty({ description: 'File ID' })
  fileId: string;

  @ApiProperty({ description: 'Current server version' })
  serverVersion: number;

  @ApiProperty({ description: 'Locally synced version' })
  syncedVersion: number;

  @ApiProperty({ description: 'Whether an update is available' })
  hasUpdate: boolean;

  @ApiProperty({ description: 'File size in bytes' })
  fileSize: number;

  @ApiProperty({ description: 'File updated timestamp' })
  updatedAt: string;
}

export class OfflineStorageStatsDto {
  @ApiProperty({ description: 'Total offline files count' })
  totalFiles: number;

  @ApiProperty({ description: 'Total offline storage used in bytes' })
  totalSize: number;

  @ApiProperty({ description: 'Files pending sync' })
  pendingCount: number;

  @ApiProperty({ description: 'Files synced' })
  syncedCount: number;

  @ApiProperty({ description: 'Files with sync errors' })
  errorCount: number;

  @ApiProperty({ description: 'Files needing update' })
  outdatedCount: number;
}
