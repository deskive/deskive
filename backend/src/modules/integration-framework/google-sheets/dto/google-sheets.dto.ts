import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Connection DTOs ====================

export class GoogleSheetsConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
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

export class ConnectGoogleSheetsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  returnUrl?: string;
}

export class NativeConnectGoogleSheetsDto {
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

// ==================== Spreadsheet DTOs ====================

export class SpreadsheetDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  webViewLink?: string;

  @ApiPropertyOptional()
  iconLink?: string;

  @ApiPropertyOptional()
  modifiedTime?: string;
}

export class SheetDto {
  @ApiProperty()
  sheetId: number;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  index?: number;

  @ApiPropertyOptional()
  rowCount?: number;

  @ApiPropertyOptional()
  columnCount?: number;
}

export class SpreadsheetDetailDto extends SpreadsheetDto {
  @ApiProperty({ type: [SheetDto] })
  sheets: SheetDto[];
}

export class ListSpreadsheetsResponseDto {
  @ApiProperty({ type: [SpreadsheetDto] })
  spreadsheets: SpreadsheetDto[];

  @ApiPropertyOptional()
  nextPageToken?: string;
}

// ==================== Data Operation DTOs ====================

export class GetRowsDto {
  @ApiProperty({ description: 'The ID of the spreadsheet' })
  @IsString()
  spreadsheetId: string;

  @ApiProperty({ description: 'Name of the sheet tab' })
  @IsString()
  sheetName: string;

  @ApiPropertyOptional({
    description: 'Cell range in A1 notation (e.g., A1:D10). Leave empty for all rows.',
  })
  @IsString()
  @IsOptional()
  range?: string;

  @ApiPropertyOptional({ description: 'Include spreadsheet URL in response' })
  @IsBoolean()
  @IsOptional()
  returnLinkToSheet?: boolean;
}

export class GetRowsResponseDto {
  @ApiProperty()
  range: string;

  @ApiProperty({ description: 'Sheet values as 2D array' })
  values: any[][];

  @ApiPropertyOptional()
  spreadsheetUrl?: string;
}

export class AppendRowDto {
  @ApiProperty({ description: 'The ID of the spreadsheet' })
  @IsString()
  spreadsheetId: string;

  @ApiProperty({ description: 'Name of the sheet tab' })
  @IsString()
  sheetName: string;

  @ApiProperty({ description: 'Values to append as 2D array' })
  @IsArray()
  values: any[][];

  @ApiPropertyOptional({
    description: 'How input data should be interpreted',
    enum: ['RAW', 'USER_ENTERED'],
  })
  @IsString()
  @IsOptional()
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export class UpdateRowDto {
  @ApiProperty({ description: 'The ID of the spreadsheet' })
  @IsString()
  spreadsheetId: string;

  @ApiProperty({ description: 'Name of the sheet tab' })
  @IsString()
  sheetName: string;

  @ApiProperty({ description: 'Range to update (e.g., A1:B2)' })
  @IsString()
  range: string;

  @ApiProperty({ description: 'Values to update as 2D array' })
  @IsArray()
  values: any[][];

  @ApiPropertyOptional({
    description: 'How input data should be interpreted',
    enum: ['RAW', 'USER_ENTERED'],
  })
  @IsString()
  @IsOptional()
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}

export class AppendOrUpdateRowDto {
  @ApiProperty({ description: 'The ID of the spreadsheet' })
  @IsString()
  spreadsheetId: string;

  @ApiProperty({ description: 'Name of the sheet tab' })
  @IsString()
  sheetName: string;

  @ApiPropertyOptional({ description: 'Column name to match on for updates' })
  @IsString()
  @IsOptional()
  columnToMatchOn?: string;

  @ApiPropertyOptional({ description: 'Value to match in the column' })
  @IsString()
  @IsOptional()
  valueToMatch?: string;

  @ApiProperty({ description: 'Column values as key-value pairs' })
  @IsObject()
  columns: Record<string, any>;

  @ApiPropertyOptional({
    description: 'How input data should be interpreted',
    enum: ['RAW', 'USER_ENTERED'],
  })
  @IsString()
  @IsOptional()
  valueInputOption?: 'RAW' | 'USER_ENTERED';

  @ApiPropertyOptional({ description: 'Append new row if no match found', default: true })
  @IsBoolean()
  @IsOptional()
  appendIfNotFound?: boolean;
}

export class ClearRangeDto {
  @ApiProperty({ description: 'The ID of the spreadsheet' })
  @IsString()
  spreadsheetId: string;

  @ApiPropertyOptional({ description: 'Name of the sheet tab' })
  @IsString()
  @IsOptional()
  sheetName?: string;

  @ApiProperty({ description: 'Range to clear' })
  @IsString()
  range: string;
}

export class CreateSpreadsheetDto {
  @ApiProperty({ description: 'Title for the new spreadsheet' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Initial sheets to create', type: [String] })
  @IsArray()
  @IsOptional()
  sheets?: string[];
}

export class CreateSpreadsheetResponseDto {
  @ApiProperty()
  spreadsheetId: string;

  @ApiProperty()
  spreadsheetUrl: string;

  @ApiProperty()
  title: string;
}

export class RowOperationResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiPropertyOptional()
  spreadsheetId?: string;

  @ApiPropertyOptional()
  updatedRange?: string;

  @ApiPropertyOptional()
  updatedRows?: number;

  @ApiPropertyOptional()
  updatedColumns?: number;

  @ApiPropertyOptional()
  updatedCells?: number;

  @ApiPropertyOptional()
  operation?: 'appended' | 'updated';

  @ApiPropertyOptional()
  rowIndex?: number;

  @ApiPropertyOptional()
  clearedRange?: string;
}

// ==================== Column Headers DTOs ====================

export class ColumnHeaderDto {
  @ApiProperty()
  label: string;

  @ApiProperty()
  value: string;
}

// ==================== Sync Configuration DTOs ====================

export enum SyncType {
  IMPORT = 'import',
  EXPORT = 'export',
  BIDIRECTIONAL = 'bidirectional',
}

export enum SyncFrequency {
  MANUAL = 'manual',
  HOURLY = 'hourly',
  DAILY = 'daily',
}

export enum DeskiveEntity {
  TASKS = 'tasks',
  CONTACTS = 'contacts',
  CUSTOM = 'custom',
}

export class CreateSyncConfigDto {
  @ApiProperty({ description: 'Google Spreadsheet ID' })
  @IsString()
  spreadsheetId: string;

  @ApiProperty({ description: 'Spreadsheet name for display' })
  @IsString()
  spreadsheetName: string;

  @ApiProperty({ description: 'Sheet tab name' })
  @IsString()
  sheetName: string;

  @ApiProperty({ enum: SyncType })
  @IsEnum(SyncType)
  syncType: SyncType;

  @ApiProperty({ enum: DeskiveEntity })
  @IsEnum(DeskiveEntity)
  deskiveEntity: DeskiveEntity;

  @ApiPropertyOptional({ description: 'Column mapping configuration' })
  @IsObject()
  @IsOptional()
  columnMapping?: Record<string, string>;

  @ApiPropertyOptional({ enum: SyncFrequency })
  @IsEnum(SyncFrequency)
  @IsOptional()
  syncFrequency?: SyncFrequency;
}

export class UpdateSyncConfigDto {
  @ApiPropertyOptional({ description: 'Column mapping configuration' })
  @IsObject()
  @IsOptional()
  columnMapping?: Record<string, string>;

  @ApiPropertyOptional({ enum: SyncFrequency })
  @IsEnum(SyncFrequency)
  @IsOptional()
  syncFrequency?: SyncFrequency;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class SyncConfigDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  connectionId: string;

  @ApiProperty()
  spreadsheetId: string;

  @ApiProperty()
  spreadsheetName: string;

  @ApiProperty()
  sheetName: string;

  @ApiProperty({ enum: SyncType })
  syncType: SyncType;

  @ApiProperty({ enum: DeskiveEntity })
  deskiveEntity: DeskiveEntity;

  @ApiProperty()
  columnMapping: Record<string, string>;

  @ApiProperty({ enum: SyncFrequency })
  syncFrequency: SyncFrequency;

  @ApiPropertyOptional()
  lastSyncAt?: string;

  @ApiPropertyOptional()
  lastSyncStatus?: string;

  @ApiPropertyOptional()
  lastSyncError?: string;

  @ApiProperty()
  lastRowCount: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class SyncResultDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  syncId: string;

  @ApiProperty()
  rowsProcessed: number;

  @ApiPropertyOptional()
  rowsCreated?: number;

  @ApiPropertyOptional()
  rowsUpdated?: number;

  @ApiPropertyOptional()
  rowsSkipped?: number;

  @ApiPropertyOptional()
  errors?: string[];
}
