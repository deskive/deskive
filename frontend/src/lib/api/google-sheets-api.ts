// src/lib/api/google-sheets-api.ts
import { api } from '@/lib/fetch';

// ==================== Types ====================

export interface GoogleSheetsConnection {
  id: string;
  workspaceId: string;
  userId: string;
  googleEmail?: string;
  googleName?: string;
  googlePicture?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface Spreadsheet {
  id: string;
  name: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
}

export interface Sheet {
  sheetId: number;
  title: string;
  index?: number;
  rowCount?: number;
  columnCount?: number;
}

export interface SpreadsheetDetail extends Spreadsheet {
  sheets: Sheet[];
}

export interface ColumnHeader {
  label: string;
  value: string;
}

export interface GetRowsResponse {
  range: string;
  values: any[][];
  spreadsheetUrl?: string;
}

export interface RowOperationResponse {
  success: boolean;
  spreadsheetId?: string;
  updatedRange?: string;
  updatedRows?: number;
  updatedColumns?: number;
  updatedCells?: number;
  operation?: 'appended' | 'updated';
  rowIndex?: number;
  clearedRange?: string;
}

export interface CreateSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
}

// ==================== Sync Types ====================

export type SyncType = 'import' | 'export' | 'bidirectional';
export type SyncFrequency = 'manual' | 'hourly' | 'daily';
export type DeskiveEntity = 'tasks' | 'contacts' | 'custom';

export interface SyncConfig {
  id: string;
  workspaceId: string;
  userId: string;
  connectionId: string;
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  syncType: SyncType;
  deskiveEntity: DeskiveEntity;
  columnMapping: Record<string, string>;
  syncFrequency: SyncFrequency;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
  lastRowCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSyncConfigParams {
  spreadsheetId: string;
  spreadsheetName: string;
  sheetName: string;
  syncType: SyncType;
  deskiveEntity: DeskiveEntity;
  columnMapping?: Record<string, string>;
  syncFrequency?: SyncFrequency;
}

export interface UpdateSyncConfigParams {
  columnMapping?: Record<string, string>;
  syncFrequency?: SyncFrequency;
  isActive?: boolean;
}

export interface SyncResult {
  success: boolean;
  syncId: string;
  rowsProcessed: number;
  rowsCreated?: number;
  rowsUpdated?: number;
  rowsSkipped?: number;
  errors?: string[];
}

// ==================== API Functions ====================

export const googleSheetsApi = {
  // ==================== OAuth & Connection ====================

  /**
   * Get OAuth authorization URL
   */
  async connect(workspaceId: string, returnUrl?: string): Promise<{ authorizationUrl: string }> {
    const response = await api.post<{ data: { authorizationUrl: string } }>(
      `/workspaces/${workspaceId}/google-sheets/connect`,
      { returnUrl }
    );
    return response.data;
  },

  /**
   * Get current connection status
   */
  async getConnection(workspaceId: string): Promise<GoogleSheetsConnection | null> {
    const response = await api.get<{ data: GoogleSheetsConnection | null }>(
      `/workspaces/${workspaceId}/google-sheets/connection`
    );
    return response.data;
  },

  /**
   * Disconnect Google Sheets
   */
  async disconnect(workspaceId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/google-sheets/disconnect`);
  },

  // ==================== Spreadsheet Browsing ====================

  /**
   * List all spreadsheets
   */
  async listSpreadsheets(
    workspaceId: string,
    params: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ spreadsheets: Spreadsheet[]; nextPageToken?: string }> {
    const queryParams = new URLSearchParams();
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.pageToken) queryParams.append('pageToken', params.pageToken);

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/google-sheets/spreadsheets${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: { spreadsheets: Spreadsheet[]; nextPageToken?: string } }>(url);
    return response.data;
  },

  /**
   * Get spreadsheet details including sheets
   */
  async getSpreadsheet(workspaceId: string, spreadsheetId: string): Promise<SpreadsheetDetail> {
    const response = await api.get<{ data: SpreadsheetDetail }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}`
    );
    return response.data;
  },

  /**
   * Get sheets from a spreadsheet
   */
  async getSheets(workspaceId: string, spreadsheetId: string): Promise<Sheet[]> {
    const response = await api.get<{ data: Sheet[] }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets`
    );
    return response.data;
  },

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(
    workspaceId: string,
    title: string,
    sheets?: string[]
  ): Promise<CreateSpreadsheetResponse> {
    const response = await api.post<{ data: CreateSpreadsheetResponse }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets`,
      { title, sheets }
    );
    return response.data;
  },

  // ==================== Data Operations ====================

  /**
   * Get rows from a sheet
   */
  async getRows(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    options: { range?: string; returnLinkToSheet?: boolean } = {}
  ): Promise<GetRowsResponse> {
    const queryParams = new URLSearchParams();
    if (options.range) queryParams.append('range', options.range);
    if (options.returnLinkToSheet) queryParams.append('returnLinkToSheet', 'true');

    const queryString = queryParams.toString();
    const url = `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/rows${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ data: GetRowsResponse }>(url);
    return response.data;
  },

  /**
   * Append rows to a sheet
   */
  async appendRows(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<RowOperationResponse> {
    const response = await api.post<{ data: RowOperationResponse }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/rows`,
      { values, valueInputOption }
    );
    return response.data;
  },

  /**
   * Update rows in a sheet
   */
  async updateRows(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    range: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<RowOperationResponse> {
    const response = await api.put<{ data: RowOperationResponse }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/rows`,
      { range, values, valueInputOption }
    );
    return response.data;
  },

  /**
   * Append or update a row based on matching column value
   */
  async upsertRow(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    columns: Record<string, any>,
    options: {
      columnToMatchOn?: string;
      valueToMatch?: string;
      valueInputOption?: 'RAW' | 'USER_ENTERED';
      appendIfNotFound?: boolean;
    } = {}
  ): Promise<RowOperationResponse> {
    const response = await api.post<{ data: RowOperationResponse }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/upsert`,
      { columns, ...options }
    );
    return response.data;
  },

  /**
   * Clear a range in a sheet
   */
  async clearRange(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    range: string
  ): Promise<RowOperationResponse> {
    const response = await api.delete<{ data: RowOperationResponse }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/clear?range=${encodeURIComponent(range)}`
    );
    return response.data;
  },

  /**
   * Get column headers from a sheet
   */
  async getColumnHeaders(
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<ColumnHeader[]> {
    const response = await api.get<{ data: ColumnHeader[] }>(
      `/workspaces/${workspaceId}/google-sheets/spreadsheets/${spreadsheetId}/sheets/${encodeURIComponent(sheetName)}/columns`
    );
    return response.data;
  },

  // ==================== Sync Configuration ====================

  /**
   * Get all sync configurations
   */
  async getSyncConfigs(workspaceId: string): Promise<SyncConfig[]> {
    const response = await api.get<{ data: SyncConfig[] }>(
      `/workspaces/${workspaceId}/google-sheets/syncs`
    );
    return response.data;
  },

  /**
   * Get a single sync configuration
   */
  async getSyncConfig(workspaceId: string, syncId: string): Promise<SyncConfig> {
    const response = await api.get<{ data: SyncConfig }>(
      `/workspaces/${workspaceId}/google-sheets/syncs/${syncId}`
    );
    return response.data;
  },

  /**
   * Create a sync configuration
   */
  async createSyncConfig(workspaceId: string, params: CreateSyncConfigParams): Promise<SyncConfig> {
    const response = await api.post<{ data: SyncConfig }>(
      `/workspaces/${workspaceId}/google-sheets/syncs`,
      params
    );
    return response.data;
  },

  /**
   * Update a sync configuration
   */
  async updateSyncConfig(
    workspaceId: string,
    syncId: string,
    params: UpdateSyncConfigParams
  ): Promise<SyncConfig> {
    const response = await api.put<{ data: SyncConfig }>(
      `/workspaces/${workspaceId}/google-sheets/syncs/${syncId}`,
      params
    );
    return response.data;
  },

  /**
   * Delete a sync configuration
   */
  async deleteSyncConfig(workspaceId: string, syncId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/google-sheets/syncs/${syncId}`);
  },

  /**
   * Execute a sync
   */
  async executeSync(workspaceId: string, syncId: string): Promise<SyncResult> {
    const response = await api.post<{ data: SyncResult }>(
      `/workspaces/${workspaceId}/google-sheets/syncs/${syncId}/execute`,
      {}
    );
    return response.data;
  },
};

// ==================== Helper Functions ====================

/**
 * Get Google Sheets icon URL
 */
export function getSheetsIconUrl(): string {
  return 'https://ssl.gstatic.com/docs/spreadsheets/favicon3.ico';
}

/**
 * Format sync status
 */
export function formatSyncStatus(status?: string): { label: string; color: string } {
  const statuses: Record<string, { label: string; color: string }> = {
    success: { label: 'Success', color: 'text-green-500' },
    error: { label: 'Failed', color: 'text-red-500' },
    pending: { label: 'Pending', color: 'text-yellow-500' },
    running: { label: 'Running', color: 'text-blue-500' },
  };
  return statuses[status || ''] || { label: 'Never synced', color: 'text-gray-500' };
}

/**
 * Format sync frequency
 */
export function formatSyncFrequency(frequency: SyncFrequency): string {
  const labels: Record<SyncFrequency, string> = {
    manual: 'Manual',
    hourly: 'Every hour',
    daily: 'Daily',
  };
  return labels[frequency] || frequency;
}

/**
 * Format last sync time
 */
export function formatLastSync(dateString?: string): string {
  if (!dateString) return 'Never';

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
