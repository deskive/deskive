import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsDateString, IsInt, IsEnum, Min, Max } from 'class-validator';

export enum AccessLevel {
  VIEW = 'view',
  DOWNLOAD = 'download',
  EDIT = 'edit'
}

export class CreateShareLinkDto {
  @ApiProperty({
    description: 'Access level for the share link',
    enum: AccessLevel,
    default: AccessLevel.VIEW,
    required: false
  })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel = AccessLevel.VIEW;

  @ApiProperty({
    description: 'Password protection for the link (optional)',
    example: 'secret123',
    required: false
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'Expiration date for the link',
    example: '2024-12-31T23:59:59.000Z',
    required: false
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Maximum number of downloads allowed (null for unlimited)',
    example: 10,
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxDownloads?: number;
}

export class UpdateShareLinkDto {
  @ApiProperty({
    description: 'Access level for the share link',
    enum: AccessLevel,
    required: false
  })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiProperty({
    description: 'Password protection for the link (set to empty string to remove)',
    required: false
  })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({
    description: 'Expiration date for the link (set to null to remove)',
    required: false
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({
    description: 'Maximum number of downloads allowed',
    required: false
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10000)
  maxDownloads?: number;

  @ApiProperty({
    description: 'Whether the link is active',
    required: false
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class VerifySharePasswordDto {
  @ApiProperty({
    description: 'Password to verify',
    example: 'secret123'
  })
  @IsString()
  password: string;
}

export class ShareLinkResponseDto {
  @ApiProperty({ description: 'Share ID' })
  id: string;

  @ApiProperty({ description: 'File ID' })
  fileId: string;

  @ApiProperty({ description: 'Share token for URL' })
  shareToken: string;

  @ApiProperty({ description: 'Full share URL' })
  shareUrl: string;

  @ApiProperty({ description: 'Access level', enum: AccessLevel })
  accessLevel: AccessLevel;

  @ApiProperty({ description: 'Whether password protected' })
  hasPassword: boolean;

  @ApiProperty({ description: 'Expiration date', nullable: true })
  expiresAt: string | null;

  @ApiProperty({ description: 'Max downloads', nullable: true })
  maxDownloads: number | null;

  @ApiProperty({ description: 'Current download count' })
  downloadCount: number;

  @ApiProperty({ description: 'Current view count' })
  viewCount: number;

  @ApiProperty({ description: 'Whether the link is active' })
  isActive: boolean;

  @ApiProperty({ description: 'When the link was created' })
  createdAt: string;
}

export class PublicFileResponseDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiProperty({ description: 'MIME type' })
  mimeType: string;

  @ApiProperty({ description: 'File URL (only if access allows)' })
  url?: string;

  @ApiProperty({ description: 'Access level granted' })
  accessLevel: AccessLevel;

  @ApiProperty({ description: 'Whether download is allowed' })
  canDownload: boolean;

  @ApiProperty({ description: 'Shared by user info' })
  sharedBy?: {
    name: string;
    avatarUrl?: string;
  };

  @ApiProperty({ description: 'When the file was shared' })
  sharedAt: string;
}
