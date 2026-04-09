import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== OAuth DTOs ====================

export class GoogleDriveOAuthUrlResponseDto {
  @ApiProperty({ description: 'Google OAuth authorization URL' })
  authorizationUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

export class GoogleDriveOAuthCallbackDto {
  @ApiProperty({ description: 'Authorization code from Google' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state: string;
}

export class NativeConnectGoogleDriveDto {
  @ApiProperty({ description: 'Server auth code from native Google Sign-In' })
  @IsString()
  serverAuthCode: string;

  @ApiPropertyOptional({ description: 'User email from Google Sign-In' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User display name from Google Sign-In' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'User photo URL from Google Sign-In' })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}

export class GoogleDriveConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiPropertyOptional()
  googleEmail?: string;

  @ApiPropertyOptional()
  googleName?: string;

  @ApiPropertyOptional()
  googlePicture?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiProperty()
  createdAt: string;
}

// ==================== File Operation DTOs ====================

export enum GoogleDriveFileType {
  FILE = 'file',
  FOLDER = 'folder',
  DOCUMENT = 'document',
  SPREADSHEET = 'spreadsheet',
  PRESENTATION = 'presentation',
  IMAGE = 'image',
  VIDEO = 'video',
  PDF = 'pdf',
}

export class GoogleDriveFileDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  mimeType: string;

  @ApiPropertyOptional()
  size?: number;

  @ApiPropertyOptional()
  createdTime?: string;

  @ApiPropertyOptional()
  modifiedTime?: string;

  @ApiPropertyOptional()
  webViewLink?: string;

  @ApiPropertyOptional()
  webContentLink?: string;

  @ApiPropertyOptional()
  thumbnailLink?: string;

  @ApiPropertyOptional()
  iconLink?: string;

  @ApiProperty({ enum: GoogleDriveFileType })
  fileType: GoogleDriveFileType;

  @ApiPropertyOptional()
  parentId?: string;
}

export class GoogleDriveDriveDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  kind?: string;
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({ description: 'Folder ID to list files from (root if not specified)' })
  @IsOptional()
  @IsString()
  folderId?: string;

  @ApiPropertyOptional({ description: 'Drive ID (My Drive if not specified)' })
  @IsOptional()
  @IsString()
  driveId?: string;

  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'Filter by file type' })
  @IsOptional()
  @IsString()
  fileType?: string;

  @ApiPropertyOptional({ description: 'Page token for pagination' })
  @IsOptional()
  @IsString()
  pageToken?: string;

  @ApiPropertyOptional({ description: 'Number of results per page', default: 50 })
  @IsOptional()
  pageSize?: number;

  @ApiPropertyOptional({ description: 'Include trashed files', default: false })
  @IsOptional()
  @IsBoolean()
  includeTrashed?: boolean;

  @ApiPropertyOptional({ description: 'Special view: recent, starred, trash, shared' })
  @IsOptional()
  @IsString()
  view?: 'recent' | 'starred' | 'trash' | 'shared';
}

export class ListFilesResponseDto {
  @ApiProperty({ type: [GoogleDriveFileDto] })
  files: GoogleDriveFileDto[];

  @ApiPropertyOptional({ description: 'Token for next page' })
  nextPageToken?: string;
}

export class ImportFileDto {
  @ApiProperty({ description: 'Google Drive file ID to import' })
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Target folder ID in Deskive (optional)' })
  @IsOptional()
  @IsString()
  targetFolderId?: string;

  @ApiPropertyOptional({ description: 'Convert Google Docs to specific format' })
  @IsOptional()
  @IsString()
  convertTo?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';
}

export class ImportFileResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  fileId: string;

  @ApiProperty()
  fileName: string;

  @ApiProperty()
  fileSize: number;

  @ApiProperty()
  mimeType: string;

  @ApiPropertyOptional()
  deskiveFileId?: string;

  @ApiPropertyOptional()
  url?: string;
}

export class DownloadFileDto {
  @ApiProperty({ description: 'Google Drive file ID' })
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Convert Google Docs to specific format' })
  @IsOptional()
  @IsString()
  convertTo?: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt';
}

export class GoogleDriveCreateFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Parent folder ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Drive ID' })
  @IsOptional()
  @IsString()
  driveId?: string;
}

export class GoogleDriveUploadFileDto {
  @ApiPropertyOptional({ description: 'File name (uses original filename if not provided)' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Parent folder ID' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Drive ID' })
  @IsOptional()
  @IsString()
  driveId?: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class GoogleDriveShareFileDto {
  @ApiProperty({ description: 'Google Drive file ID' })
  @IsString()
  fileId: string;

  @ApiProperty({ description: 'Email address to share with' })
  @IsString()
  email: string;

  @ApiProperty({ description: 'Permission role', enum: ['reader', 'commenter', 'writer'] })
  @IsEnum(['reader', 'commenter', 'writer'])
  role: 'reader' | 'commenter' | 'writer';

  @ApiPropertyOptional({ description: 'Send notification email', default: true })
  @IsOptional()
  @IsBoolean()
  sendNotification?: boolean;
}

export class DeleteFileDto {
  @ApiProperty({ description: 'Google Drive file ID' })
  @IsString()
  fileId: string;

  @ApiPropertyOptional({ description: 'Permanently delete (skip trash)', default: false })
  @IsOptional()
  @IsBoolean()
  permanent?: boolean;
}

export class StorageQuotaDto {
  @ApiProperty({ description: 'Total storage limit in bytes' })
  limit: number;

  @ApiProperty({ description: 'Total usage in bytes' })
  usage: number;

  @ApiProperty({ description: 'Usage in Drive (excluding trash) in bytes' })
  usageInDrive: number;

  @ApiProperty({ description: 'Usage in Drive trash in bytes' })
  usageInDriveTrash: number;

  @ApiProperty({ description: 'Formatted limit (e.g., "15 GB")' })
  limitFormatted: string;

  @ApiProperty({ description: 'Formatted usage (e.g., "134.3 MB")' })
  usageFormatted: string;

  @ApiProperty({ description: 'Usage percentage (0-100)' })
  usagePercent: number;
}
