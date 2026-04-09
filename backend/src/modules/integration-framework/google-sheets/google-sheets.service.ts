import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GoogleSheetsOAuthService } from './google-sheets-oauth.service';
import axios, { AxiosRequestConfig } from 'axios';
import {
  GoogleSheetsConnectionDto,
  SpreadsheetDto,
  SheetDto,
  SpreadsheetDetailDto,
  GetRowsResponseDto,
  RowOperationResponseDto,
  ColumnHeaderDto,
  CreateSpreadsheetResponseDto,
} from './dto/google-sheets.dto';

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly SHEETS_API_BASE = 'https://sheets.googleapis.com/v4';
  private readonly DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: GoogleSheetsOAuthService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Get OAuth URL for connecting Google Sheets
   */
  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string) {
    return this.oauthService.getAuthorizationUrl(userId, workspaceId, returnUrl);
  }

  /**
   * Handle OAuth callback and store connection
   * User-specific: Each user in a workspace can connect their own Google Sheets
   */
  async handleOAuthCallback(code: string, state: string): Promise<GoogleSheetsConnectionDto> {
    // Decode and validate state
    const stateData = this.oauthService.decodeState(state);
    const { userId, workspaceId } = stateData;

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(code);

    // Get user info from Google
    const userInfo = await this.oauthService.getUserInfo(tokens.accessToken);

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || existingConnection?.refresh_token,
      token_type: tokens.tokenType,
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      google_email: userInfo.email,
      google_name: userInfo.name,
      google_picture: userInfo.picture,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection (re-connect or refresh)
      await this.db.update('google_sheets_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new user connection in this workspace
      connection = await this.db.insert('google_sheets_connections', connectionData);
    }

    this.logger.log(`Google Sheets connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Handle native Google Sign-In from mobile app
   * Exchanges the server auth code for tokens and stores the connection
   */
  async handleNativeSignIn(
    userId: string,
    workspaceId: string,
    serverAuthCode: string,
    userInfo?: { email?: string; displayName?: string; photoUrl?: string }
  ): Promise<GoogleSheetsConnectionDto> {
    this.logger.log(`Handling native Google Sign-In for user ${userId} in workspace ${workspaceId}`);

    // Exchange the server auth code for tokens (using native method without redirect_uri)
    const tokens = await this.oauthService.exchangeNativeCodeForTokens(serverAuthCode);

    // Get user info from Google if not provided
    let googleUserInfo = userInfo;
    if (!googleUserInfo?.email) {
      const fetchedUserInfo = await this.oauthService.getUserInfo(tokens.accessToken);
      googleUserInfo = {
        email: fetchedUserInfo.email,
        displayName: fetchedUserInfo.name,
        photoUrl: fetchedUserInfo.picture,
      };
    }

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || existingConnection?.refresh_token,
      token_type: tokens.tokenType,
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      google_email: googleUserInfo?.email,
      google_name: googleUserInfo?.displayName,
      google_picture: googleUserInfo?.photoUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      // Update existing connection
      await this.db.update('google_sheets_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new connection
      connection = await this.db.insert('google_sheets_connections', connectionData);
    }

    this.logger.log(`Google Sheets connected via native sign-in for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's Google Sheets connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<GoogleSheetsConnectionDto | null> {
    const connection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Get any active Google Sheets connection for a workspace
   * Used for workspace-level operations like exporting approvals
   */
  async getWorkspaceConnection(workspaceId: string): Promise<{ connection: GoogleSheetsConnectionDto; userId: string } | null> {
    const result = await this.db
      .table('google_sheets_connections')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .orderBy('updated_at', 'DESC')
      .limit(1)
      .execute();

    const connection = result.data?.[0];
    if (!connection) {
      return null;
    }

    return {
      connection: this.transformConnection(connection),
      userId: connection.user_id,
    };
  }

  /**
   * Disconnect user's Google Sheets in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Google Sheets connection not found');
    }

    // Revoke token
    try {
      await this.oauthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    // Soft delete the connection
    await this.db.update('google_sheets_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Google Sheets disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get valid access token (refresh if needed) - user-specific
   */
  private async getValidAccessToken(userId: string, workspaceId: string): Promise<string> {
    const connection = await this.db.findOne('google_sheets_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Google Sheets not connected. Please connect your Google Sheets first.');
    }

    // Check if token is expired or about to expire
    if (connection.expires_at && this.oauthService.isTokenExpired(new Date(connection.expires_at))) {
      if (!connection.refresh_token) {
        throw new BadRequestException('Access token expired and no refresh token available. Please reconnect Google Sheets.');
      }

      // Refresh the token
      const newTokens = await this.oauthService.refreshAccessToken(connection.refresh_token);

      // Update the connection with new tokens
      await this.db.update('google_sheets_connections', connection.id, {
        access_token: newTokens.accessToken,
        expires_at: newTokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

      return newTokens.accessToken;
    }

    return connection.access_token;
  }

  // ==================== Spreadsheet Operations ====================

  /**
   * List all spreadsheets from user's Google Drive (including shared with me)
   */
  async listSpreadsheets(
    userId: string,
    workspaceId: string,
    options: { pageSize?: number; pageToken?: string } = {}
  ): Promise<{ spreadsheets: SpreadsheetDto[]; nextPageToken?: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);
    const pageSize = Math.min(options.pageSize || 100, 100);
    const baseFields = 'files(id, name, webViewLink, iconLink, modifiedTime), nextPageToken';

    const allFilesMap = new Map<string, any>();

    // Query 1: Files owned by user (My Drive)
    try {
      const myDriveParams: Record<string, any> = {
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and 'me' in owners",
        fields: baseFields,
        pageSize,
        orderBy: 'modifiedTime desc',
      };
      const myDriveResponse = await this.makeRequest(accessToken, 'GET', `${this.DRIVE_API_BASE}/files`, { params: myDriveParams });
      for (const file of myDriveResponse.data.files || []) {
        allFilesMap.set(file.id, file);
      }
      this.logger.debug(`Found ${myDriveResponse.data.files?.length || 0} owned spreadsheets`);
    } catch (error) {
      this.logger.error('Error fetching My Drive files:', error.message);
    }

    // Query 2: Files shared with user (Shared with me)
    try {
      const sharedWithMeParams: Record<string, any> = {
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and sharedWithMe=true",
        fields: baseFields,
        pageSize,
        orderBy: 'modifiedTime desc',
      };
      const sharedWithMeResponse = await this.makeRequest(accessToken, 'GET', `${this.DRIVE_API_BASE}/files`, { params: sharedWithMeParams });
      for (const file of sharedWithMeResponse.data.files || []) {
        if (!allFilesMap.has(file.id)) {
          allFilesMap.set(file.id, file);
        }
      }
      this.logger.debug(`Found ${sharedWithMeResponse.data.files?.length || 0} shared spreadsheets`);
    } catch (error) {
      this.logger.error('Error fetching Shared with me files:', error.message);
    }

    // Query 3: Files in shared drives (Team drives)
    try {
      const sharedDrivesParams: Record<string, any> = {
        q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
        fields: baseFields,
        pageSize,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'allDrives',
      };
      const sharedDrivesResponse = await this.makeRequest(accessToken, 'GET', `${this.DRIVE_API_BASE}/files`, { params: sharedDrivesParams });
      for (const file of sharedDrivesResponse.data.files || []) {
        if (!allFilesMap.has(file.id)) {
          allFilesMap.set(file.id, file);
        }
      }
      this.logger.debug(`Found ${sharedDrivesResponse.data.files?.length || 0} shared drive spreadsheets`);
    } catch (error) {
      this.logger.debug('No shared drives access or error:', error.message);
    }

    // Convert to array and sort by modifiedTime
    const allFiles = Array.from(allFilesMap.values()).sort((a, b) => {
      const dateA = new Date(a.modifiedTime || 0).getTime();
      const dateB = new Date(b.modifiedTime || 0).getTime();
      return dateB - dateA;
    });

    this.logger.log(`Total spreadsheets found: ${allFiles.length}`);

    const spreadsheets = allFiles.map((file: any) => ({
      id: file.id,
      name: file.name,
      webViewLink: file.webViewLink,
      iconLink: file.iconLink,
      modifiedTime: file.modifiedTime,
    }));

    return { spreadsheets };
  }

  /**
   * Get spreadsheet details including all sheets
   */
  async getSpreadsheet(userId: string, workspaceId: string, spreadsheetId: string): Promise<SpreadsheetDetailDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const response = await this.makeRequest(
      accessToken,
      'GET',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}`,
      { params: { fields: 'spreadsheetId,properties,sheets.properties' } }
    );

    const data = response.data;

    return {
      id: data.spreadsheetId,
      name: data.properties.title,
      webViewLink: `https://docs.google.com/spreadsheets/d/${data.spreadsheetId}`,
      sheets: (data.sheets || [])
        .filter((sheet: any) => sheet.properties.sheetType === 'GRID')
        .map((sheet: any) => ({
          sheetId: sheet.properties.sheetId,
          title: sheet.properties.title,
          index: sheet.properties.index,
          rowCount: sheet.properties.gridProperties?.rowCount,
          columnCount: sheet.properties.gridProperties?.columnCount,
        })),
    };
  }

  /**
   * Get sheets from a spreadsheet
   */
  async getSheets(userId: string, workspaceId: string, spreadsheetId: string): Promise<SheetDto[]> {
    const spreadsheet = await this.getSpreadsheet(userId, workspaceId, spreadsheetId);
    return spreadsheet.sheets;
  }

  /**
   * Create a new spreadsheet
   */
  async createSpreadsheet(
    userId: string,
    workspaceId: string,
    title: string,
    sheetNames?: string[]
  ): Promise<CreateSpreadsheetResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const body: any = {
      properties: { title },
    };

    if (sheetNames && sheetNames.length > 0) {
      body.sheets = sheetNames.map(name => ({
        properties: { title: name },
      }));
    }

    const response = await this.makeRequest(
      accessToken,
      'POST',
      `${this.SHEETS_API_BASE}/spreadsheets`,
      { data: body }
    );

    return {
      spreadsheetId: response.data.spreadsheetId,
      spreadsheetUrl: response.data.spreadsheetUrl,
      title: response.data.properties.title,
    };
  }

  /**
   * Add a new sheet to an existing spreadsheet
   */
  async addSheet(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<{ sheetId: number; title: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const response = await this.makeRequest(
      accessToken,
      'POST',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        data: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      }
    );

    const addSheetResponse = response.data.replies?.[0]?.addSheet;
    return {
      sheetId: addSheetResponse?.properties?.sheetId,
      title: addSheetResponse?.properties?.title || sheetName,
    };
  }

  /**
   * Check if a sheet exists in a spreadsheet
   */
  async sheetExists(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<boolean> {
    try {
      const spreadsheet = await this.getSpreadsheet(userId, workspaceId, spreadsheetId);
      return spreadsheet.sheets.some(sheet => sheet.title.toLowerCase() === sheetName.toLowerCase());
    } catch {
      return false;
    }
  }

  /**
   * Get or create a sheet in a spreadsheet
   */
  async getOrCreateSheet(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    headers?: string[]
  ): Promise<{ sheetId: number; title: string; isNew: boolean }> {
    // Check if sheet exists
    const exists = await this.sheetExists(userId, workspaceId, spreadsheetId, sheetName);

    if (exists) {
      const spreadsheet = await this.getSpreadsheet(userId, workspaceId, spreadsheetId);
      const sheet = spreadsheet.sheets.find(s => s.title.toLowerCase() === sheetName.toLowerCase());
      return { sheetId: sheet!.sheetId, title: sheet!.title, isNew: false };
    }

    // Create new sheet
    const newSheet = await this.addSheet(userId, workspaceId, spreadsheetId, sheetName);

    // Add headers if provided
    if (headers && headers.length > 0) {
      await this.appendRow(userId, workspaceId, spreadsheetId, sheetName, [headers]);
    }

    return { ...newSheet, isNew: true };
  }

  // ==================== Row Operations ====================

  /**
   * Get rows from a sheet
   */
  async getRows(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    options: { range?: string; returnLinkToSheet?: boolean } = {}
  ): Promise<GetRowsResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const fullRange = options.range ? `${sheetName}!${options.range}` : sheetName;

    const response = await this.makeRequest(
      accessToken,
      'GET',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`
    );

    const result: GetRowsResponseDto = {
      range: response.data.range,
      values: response.data.values || [],
    };

    if (options.returnLinkToSheet) {
      result.spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
    }

    return result;
  }

  /**
   * Append rows to a sheet
   */
  async appendRow(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<RowOperationResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);
    const range = `${sheetName}!A:ZZ`;

    const response = await this.makeRequest(
      accessToken,
      'POST',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`,
      {
        params: {
          valueInputOption,
          insertDataOption: 'INSERT_ROWS',
        },
        data: { values },
      }
    );

    return {
      success: true,
      spreadsheetId,
      updatedRange: response.data.updates?.updatedRange,
      updatedRows: response.data.updates?.updatedRows,
      updatedColumns: response.data.updates?.updatedColumns,
      updatedCells: response.data.updates?.updatedCells,
    };
  }

  /**
   * Update rows in a sheet
   */
  async updateRow(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string,
    range: string,
    values: any[][],
    valueInputOption: 'RAW' | 'USER_ENTERED' = 'USER_ENTERED'
  ): Promise<RowOperationResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);
    const fullRange = `${sheetName}!${range}`;

    const response = await this.makeRequest(
      accessToken,
      'PUT',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}`,
      {
        params: { valueInputOption },
        data: { values },
      }
    );

    return {
      success: true,
      spreadsheetId,
      updatedRange: response.data.updatedRange,
      updatedRows: response.data.updatedRows,
      updatedColumns: response.data.updatedColumns,
      updatedCells: response.data.updatedCells,
    };
  }

  /**
   * Append or update a row based on matching column value
   */
  async appendOrUpdateRow(
    userId: string,
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
  ): Promise<RowOperationResponseDto> {
    const {
      columnToMatchOn,
      valueToMatch,
      valueInputOption = 'USER_ENTERED',
      appendIfNotFound = true,
    } = options;

    // Step 1: Fetch all sheet data including headers
    const getResponse = await this.getRows(userId, workspaceId, spreadsheetId, sheetName);

    if (!getResponse.values || getResponse.values.length === 0) {
      // No data in sheet, append as first row with headers
      const headers = Object.keys(columns);
      const rowValues = headers.map(header => columns[header]);

      const appendResponse = await this.appendRow(
        userId, workspaceId, spreadsheetId, sheetName,
        [headers, rowValues], valueInputOption
      );

      return {
        ...appendResponse,
        operation: 'appended',
        rowIndex: 2,
      };
    }

    const sheetData = getResponse.values;
    const headers = sheetData[0] as string[];

    // If no columnToMatchOn specified, just append
    if (!columnToMatchOn) {
      const rowArray = headers.map(header => {
        const headerKey = Object.keys(columns).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        return headerKey !== undefined ? columns[headerKey] : '';
      });

      const appendResponse = await this.appendRow(
        userId, workspaceId, spreadsheetId, sheetName,
        [rowArray], valueInputOption
      );

      return {
        ...appendResponse,
        operation: 'appended',
      };
    }

    // Step 2: Find the column index for the matching column
    const matchColumnIndex = headers.findIndex(
      header => header && header.toString().toLowerCase() === columnToMatchOn.toLowerCase()
    );

    if (matchColumnIndex === -1) {
      throw new BadRequestException(`Column "${columnToMatchOn}" not found in sheet headers`);
    }

    // Step 3: Search for a row where that column contains the target value
    let matchedRowIndex = -1;
    if (valueToMatch !== undefined && valueToMatch !== null) {
      for (let i = 1; i < sheetData.length; i++) {
        const row = sheetData[i];
        const cellValue = row[matchColumnIndex];

        if (cellValue !== undefined && cellValue !== null &&
            cellValue.toString() === valueToMatch.toString()) {
          matchedRowIndex = i;
          break;
        }
      }
    }

    // Step 4: Either update or append
    if (matchedRowIndex !== -1) {
      // Update the existing row - preserve existing values for columns not being updated
      const existingRow = sheetData[matchedRowIndex] || [];
      const rowArray = headers.map((header, index) => {
        const headerKey = Object.keys(columns).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        // If we have a new value for this column, use it; otherwise keep existing value
        if (headerKey !== undefined) {
          return columns[headerKey];
        }
        // Preserve existing value
        return existingRow[index] !== undefined ? existingRow[index] : '';
      });

      const rowNumber = matchedRowIndex + 1; // Convert to 1-based index
      const range = `A${rowNumber}:${this.columnIndexToLetter(headers.length - 1)}${rowNumber}`;

      const updateResponse = await this.updateRow(
        userId, workspaceId, spreadsheetId, sheetName,
        range, [rowArray], valueInputOption
      );

      return {
        ...updateResponse,
        operation: 'updated',
        rowIndex: rowNumber,
      };
    } else {
      // For appending new rows, use empty strings for missing columns
      const rowArray = headers.map(header => {
        const headerKey = Object.keys(columns).find(
          key => key.toLowerCase() === header.toLowerCase()
        );
        return headerKey !== undefined ? columns[headerKey] : '';
      });
      // Append new row
      if (!appendIfNotFound) {
        throw new BadRequestException('No matching row found and appendIfNotFound is false');
      }

      const appendResponse = await this.appendRow(
        userId, workspaceId, spreadsheetId, sheetName,
        [rowArray], valueInputOption
      );

      return {
        ...appendResponse,
        operation: 'appended',
        rowIndex: sheetData.length + 1,
      };
    }
  }

  /**
   * Clear a range in a sheet
   */
  async clearRange(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string | undefined,
    range: string
  ): Promise<RowOperationResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);
    const fullRange = sheetName && range ? `${sheetName}!${range}` : (range || sheetName);

    const response = await this.makeRequest(
      accessToken,
      'POST',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}:clear`,
      { data: {} }
    );

    return {
      success: true,
      spreadsheetId,
      clearedRange: response.data.clearedRange,
    };
  }

  /**
   * Get column headers from a sheet
   */
  async getColumnHeaders(
    userId: string,
    workspaceId: string,
    spreadsheetId: string,
    sheetName: string
  ): Promise<ColumnHeaderDto[]> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);
    const range = `${sheetName}!1:1`;

    const response = await this.makeRequest(
      accessToken,
      'GET',
      `${this.SHEETS_API_BASE}/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      { params: { valueRenderOption: 'FORMATTED_VALUE' } }
    );

    if (!response.data.values || response.data.values.length === 0 || !response.data.values[0]) {
      return [];
    }

    const headers = response.data.values[0];

    return headers
      .filter((header: any) => header && header.toString().trim() !== '')
      .map((header: any) => ({
        label: header.toString(),
        value: header.toString(),
      }));
  }

  // ==================== Helper Methods ====================

  /**
   * Convert column index to letter (0 -> A, 1 -> B, 26 -> AA, etc.)
   */
  private columnIndexToLetter(index: number): string {
    let letter = '';
    while (index >= 0) {
      letter = String.fromCharCode((index % 26) + 65) + letter;
      index = Math.floor(index / 26) - 1;
    }
    return letter;
  }

  private async makeRequest(
    accessToken: string,
    method: string,
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<any> {
    try {
      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          ...config.headers,
        },
        ...config,
      });

      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new BadRequestException('Google Sheets access token is invalid. Please reconnect.');
      }
      if (error.response?.status === 404) {
        throw new NotFoundException('Spreadsheet or sheet not found');
      }
      this.logger.error('Google Sheets API error:', error.response?.data || error.message);
      throw new BadRequestException(`Google Sheets API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private transformConnection(connection: any): GoogleSheetsConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      googleEmail: connection.google_email,
      googleName: connection.google_name,
      googlePicture: connection.google_picture,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }
}
