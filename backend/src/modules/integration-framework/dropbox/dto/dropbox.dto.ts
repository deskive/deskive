import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== OAuth DTOs ====================

export class DropboxOAuthUrlResponseDto {
  @ApiProperty({ description: 'Dropbox OAuth authorization URL' })
  authorizationUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

export class DropboxOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Dropbox' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state: string;
}

export class DropboxConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiPropertyOptional()
  accountId?: string;

  @ApiPropertyOptional()
  dropboxEmail?: string;

  @ApiPropertyOptional()
  dropboxName?: string;

  @ApiPropertyOptional()
  dropboxPicture?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiProperty()
  createdAt: string;
}

// ==================== File Operation DTOs ====================

export enum DropboxFileType {
  FILE = 'file',
  FOLDER = 'folder',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  PDF = 'pdf',
  ARCHIVE = 'archive',
}

export class DropboxFileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ description: 'Full path in Dropbox' })
  pathLower: string;

  @ApiProperty({ description: 'Display path in Dropbox' })
  pathDisplay: string;

  @ApiPropertyOptional()
  size?: number;

  @ApiPropertyOptional()
  clientModified?: string;

  @ApiPropertyOptional()
  serverModified?: string;

  @ApiPropertyOptional()
  rev?: string;

  @ApiPropertyOptional()
  contentHash?: string;

  @ApiPropertyOptional({ description: 'Temporary link for viewing/downloading' })
  temporaryLink?: string;

  @ApiPropertyOptional({ description: 'Thumbnail link if available' })
  thumbnailLink?: string;

  @ApiProperty({ enum: DropboxFileType })
  fileType: DropboxFileType;

  @ApiProperty({ description: 'Whether this is a folder' })
  isFolder: boolean;

  @ApiProperty()
  isDownloadable: boolean;
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({ description: 'Folder path to list files from (empty for root)' })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Number of results per page', default: 50 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Include deleted files', default: false })
  @IsOptional()
  @IsBoolean()
  includeDeleted?: boolean;

  @ApiPropertyOptional({ description: 'Recursive listing', default: false })
  @IsOptional()
  @IsBoolean()
  recursive?: boolean;
}

export class ListFilesResponseDto {
  @ApiProperty({ type: [DropboxFileDto] })
  files: DropboxFileDto[];

  @ApiPropertyOptional({ description: 'Cursor for next page' })
  cursor?: string;

  @ApiProperty({ description: 'Whether there are more results' })
  hasMore: boolean;
}

export class DropboxImportFileDto {
  @ApiProperty({ description: 'Dropbox file path to import' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Target folder ID in Deskive (optional)' })
  @IsOptional()
  @IsString()
  targetFolderId?: string;
}

export class ImportFileResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  deskiveFileId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  mimeType: string;

  @ApiPropertyOptional()
  url?: string;
}

export class DropboxCreateFolderDto {
  @ApiProperty({ description: 'Full path for the new folder (e.g., /Documents/NewFolder)' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Whether to auto-rename if folder exists', default: false })
  @IsOptional()
  @IsBoolean()
  autoRename?: boolean;
}

export class DropboxUploadFileDto {
  @ApiProperty({ description: 'Path where file will be uploaded (including filename)' })
  @IsString()
  path: string;

  @ApiPropertyOptional({ description: 'Overwrite mode: add, overwrite, or update', default: 'add' })
  @IsOptional()
  @IsString()
  mode?: 'add' | 'overwrite' | 'update';

  @ApiPropertyOptional({ description: 'Whether to auto-rename if file exists', default: true })
  @IsOptional()
  @IsBoolean()
  autoRename?: boolean;

  @ApiPropertyOptional({ description: 'Mute notifications', default: false })
  @IsOptional()
  @IsBoolean()
  mute?: boolean;
}

export class DropboxMoveFileDto {
  @ApiProperty({ description: 'Current file path' })
  @IsString()
  fromPath: string;

  @ApiProperty({ description: 'Destination path' })
  @IsString()
  toPath: string;

  @ApiPropertyOptional({ description: 'Whether to auto-rename if target exists', default: false })
  @IsOptional()
  @IsBoolean()
  autoRename?: boolean;
}

export class DropboxCopyFileDto {
  @ApiProperty({ description: 'Source file path' })
  @IsString()
  fromPath: string;

  @ApiProperty({ description: 'Destination path' })
  @IsString()
  toPath: string;

  @ApiPropertyOptional({ description: 'Whether to auto-rename if target exists', default: false })
  @IsOptional()
  @IsBoolean()
  autoRename?: boolean;
}

export class DropboxShareFileDto {
  @ApiProperty({ description: 'File path to share' })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: 'Requested visibility (public or team_only)',
    default: 'public',
  })
  @IsOptional()
  @IsString()
  requestedVisibility?: 'public' | 'team_only' | 'password';

  @ApiPropertyOptional({ description: 'Link expiry date (ISO string)' })
  @IsOptional()
  @IsString()
  expires?: string;

  @ApiPropertyOptional({ description: 'Password for the shared link' })
  @IsOptional()
  @IsString()
  linkPassword?: string;
}

export class DropboxShareLinkResponseDto {
  @ApiProperty({ description: 'Shared link URL' })
  url: string;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiProperty({ description: 'File path' })
  pathLower: string;

  @ApiPropertyOptional({ description: 'Link expiry date' })
  expires?: string;
}

export class StorageQuotaDto {
  @ApiProperty({ description: 'Total storage quota in bytes' })
  allocated: number;

  @ApiProperty({ description: 'Used storage in bytes' })
  used: number;

  @ApiProperty({ description: 'Formatted allocated (e.g., "2 TB")' })
  allocatedFormatted: string;

  @ApiProperty({ description: 'Formatted used (e.g., "134.3 GB")' })
  usedFormatted: string;

  @ApiProperty({ description: 'Usage percentage (0-100)' })
  usagePercent: number;
}

export class DeleteFileDto {
  @ApiProperty({ description: 'Dropbox file/folder path to delete' })
  @IsString()
  path: string;
}
