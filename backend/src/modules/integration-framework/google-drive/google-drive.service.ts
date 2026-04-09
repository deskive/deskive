import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { GoogleDriveOAuthService } from './google-drive-oauth.service';
import axios, { AxiosRequestConfig } from 'axios';
import {
  GoogleDriveFileDto,
  GoogleDriveDriveDto,
  GoogleDriveFileType,
  GoogleDriveConnectionDto,
  ListFilesResponseDto,
  StorageQuotaDto,
} from './dto/google-drive.dto';

// MIME type mappings for Google Docs export
const GOOGLE_DOCS_EXPORT_FORMATS: Record<string, Record<string, string>> = {
  'application/vnd.google-apps.document': {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    html: 'text/html',
    txt: 'text/plain',
  },
  'application/vnd.google-apps.spreadsheet': {
    pdf: 'application/pdf',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv',
  },
  'application/vnd.google-apps.presentation': {
    pdf: 'application/pdf',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  },
};

// MIME type to file type mapping
const MIME_TO_FILE_TYPE: Record<string, GoogleDriveFileType> = {
  'application/vnd.google-apps.folder': GoogleDriveFileType.FOLDER,
  'application/vnd.google-apps.document': GoogleDriveFileType.DOCUMENT,
  'application/vnd.google-apps.spreadsheet': GoogleDriveFileType.SPREADSHEET,
  'application/vnd.google-apps.presentation': GoogleDriveFileType.PRESENTATION,
  'application/pdf': GoogleDriveFileType.PDF,
};

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private readonly DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
  private readonly DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: GoogleDriveOAuthService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Get OAuth URL for connecting Google Drive
   */
  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string) {
    return this.oauthService.getAuthorizationUrl(userId, workspaceId, returnUrl);
  }

  /**
   * Handle OAuth callback and store connection
   * User-specific: Each user in a workspace can connect their own Google Drive
   */
  async handleOAuthCallback(code: string, state: string): Promise<GoogleDriveConnectionDto> {
    // Decode and validate state
    const stateData = this.oauthService.decodeState(state);
    const { userId, workspaceId } = stateData;

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(code);

    // Get user info from Google
    const userInfo = await this.oauthService.getUserInfo(tokens.accessToken);

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('google_drive_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId, // User who connected this Google Drive

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
      await this.db.update('google_drive_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      // Create new user connection in this workspace
      connection = await this.db.insert('google_drive_connections', connectionData);
    }

    this.logger.log(`Google Drive connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Handle native mobile sign-in and store connection
   * Uses server auth code from native Google Sign-In SDK
   */
  async handleNativeSignIn(
    userId: string,
    workspaceId: string,
    serverAuthCode: string,
    userInfo: { email?: string; displayName?: string; photoUrl?: string }
  ): Promise<GoogleDriveConnectionDto> {
    // Exchange native auth code for tokens (no redirect_uri)
    const tokens = await this.oauthService.exchangeNativeCodeForTokens(serverAuthCode);

    // Get user info from tokens if not provided by client
    let email = userInfo.email;
    let name = userInfo.displayName;
    let picture = userInfo.photoUrl;

    if (!email) {
      const googleUserInfo = await this.oauthService.getUserInfo(tokens.accessToken);
      email = googleUserInfo.email;
      name = name || googleUserInfo.name;
      picture = picture || googleUserInfo.picture;
    }

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('google_drive_connections', {
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
      google_email: email,
      google_name: name,
      google_picture: picture,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('google_drive_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('google_drive_connections', connectionData);
    }

    this.logger.log(`Google Drive connected via native sign-in for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's Google Drive connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<GoogleDriveConnectionDto | null> {
    // User-specific connection
    const connection = await this.db.findOne('google_drive_connections', {
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
   * Disconnect user's Google Drive in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    // Get user's connection
    const connection = await this.db.findOne('google_drive_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Google Drive connection not found');
    }

    // Revoke token
    try {
      await this.oauthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    // Soft delete the connection
    await this.db.update('google_drive_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Google Drive disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get valid access token (refresh if needed) - user-specific
   */
  private async getValidAccessToken(userId: string, workspaceId: string): Promise<string> {
    // Get user's connection
    const connection = await this.db.findOne('google_drive_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Google Drive not connected. Please connect your Google Drive first.');
    }

    // Check if token is expired or about to expire
    if (connection.expires_at && this.oauthService.isTokenExpired(new Date(connection.expires_at))) {
      if (!connection.refresh_token) {
        throw new BadRequestException('Access token expired and no refresh token available. Please reconnect Google Drive.');
      }

      // Refresh the token
      const newTokens = await this.oauthService.refreshAccessToken(connection.refresh_token);

      // Update the connection with new tokens
      await this.db.update('google_drive_connections', connection.id, {
        access_token: newTokens.accessToken,
        expires_at: newTokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

      return newTokens.accessToken;
    }

    return connection.access_token;
  }

  // ==================== Drive API Operations ====================

  /**
   * List available drives (My Drive + Shared Drives)
   */
  async listDrives(userId: string, workspaceId: string): Promise<GoogleDriveDriveDto[]> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const drives: GoogleDriveDriveDto[] = [
      { id: 'root', name: 'My Drive', kind: 'drive#drive' },
    ];

    try {
      // Get shared drives
      const response = await this.makeRequest(accessToken, 'GET', '/drives', {
        params: { pageSize: 100 },
      });

      if (response.data.drives) {
        for (const drive of response.data.drives) {
          drives.push({
            id: drive.id,
            name: drive.name,
            kind: drive.kind,
          });
        }
      }
    } catch (error) {
      this.logger.warn('Could not fetch shared drives:', error.message);
    }

    return drives;
  }

  /**
   * Get storage quota information
   */
  async getStorageQuota(userId: string, workspaceId: string): Promise<StorageQuotaDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeRequest(accessToken, 'GET', '/about', {
        params: { fields: 'storageQuota' },
      });

      const quota = response.data.storageQuota;
      const limit = parseInt(quota.limit || '0', 10);
      const usage = parseInt(quota.usage || '0', 10);
      const usageInDrive = parseInt(quota.usageInDrive || '0', 10);
      const usageInDriveTrash = parseInt(quota.usageInDriveTrash || '0', 10);

      return {
        limit,
        usage,
        usageInDrive,
        usageInDriveTrash,
        limitFormatted: this.formatBytes(limit),
        usageFormatted: this.formatBytes(usage),
        usagePercent: limit > 0 ? Math.round((usage / limit) * 100) : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get storage quota:', error.message);
      throw new BadRequestException('Failed to get storage quota from Google Drive');
    }
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }

  /**
   * List files in a folder
   */
  async listFiles(
    userId: string,
    workspaceId: string,
    options: {
      folderId?: string;
      driveId?: string;
      query?: string;
      fileType?: string;
      pageToken?: string;
      pageSize?: number;
      includeTrashed?: boolean;
      view?: 'recent' | 'starred' | 'trash' | 'shared';
    } = {}
  ): Promise<ListFilesResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const {
      folderId = 'root',
      driveId,
      query,
      fileType,
      pageToken,
      pageSize = 50,
      includeTrashed = false,
      view,
    } = options;

    // Build query string
    const queryParts: string[] = [];
    let orderBy = 'folder, name';

    // Handle special views
    if (view === 'trash') {
      // Show only trashed files
      queryParts.push('trashed = true');
    } else if (view === 'starred') {
      // Show only starred files
      queryParts.push('starred = true');
      queryParts.push('trashed = false');
    } else if (view === 'recent') {
      // Show recently modified files (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      queryParts.push(`modifiedTime > '${thirtyDaysAgo.toISOString()}'`);
      queryParts.push('trashed = false');
      queryParts.push("mimeType != 'application/vnd.google-apps.folder'"); // Exclude folders from recent
      orderBy = 'modifiedTime desc';
    } else if (view === 'shared') {
      // Show files shared with me
      queryParts.push('sharedWithMe = true');
      queryParts.push('trashed = false');
      orderBy = 'sharedWithMeTime desc';
    } else {
      // Default folder view
      queryParts.push(`'${folderId}' in parents`);

      // Trashed filter
      if (!includeTrashed) {
        queryParts.push('trashed = false');
      }
    }

    // File type filter
    if (fileType) {
      const mimeTypeFilter = this.getFileTypeMimeFilter(fileType);
      if (mimeTypeFilter) {
        queryParts.push(mimeTypeFilter);
      }
    }

    // Search query
    if (query) {
      queryParts.push(`name contains '${query.replace(/'/g, "\\'")}'`);
    }

    const params: Record<string, any> = {
      q: queryParts.join(' and '),
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, parents, starred, shared)',
      pageSize: Math.min(pageSize, 100),
      orderBy,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    if (pageToken) {
      params.pageToken = pageToken;
    }

    if (driveId && driveId !== 'root') {
      params.driveId = driveId;
      params.corpora = 'drive';
    }

    const response = await this.makeRequest(accessToken, 'GET', '/files', { params });

    const files: GoogleDriveFileDto[] = (response.data.files || []).map((file: any) =>
      this.transformFile(file)
    );

    return {
      files,
      nextPageToken: response.data.nextPageToken,
    };
  }

  /**
   * Get file metadata
   */
  async getFile(userId: string, workspaceId: string, fileId: string): Promise<GoogleDriveFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const response = await this.makeRequest(accessToken, 'GET', `/files/${fileId}`, {
      params: {
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, iconLink, parents',
        supportsAllDrives: true,
      },
    });

    return this.transformFile(response.data);
  }

  /**
   * Download file content
   */
  async downloadFile(
    userId: string,
    workspaceId: string,
    fileId: string,
    convertTo?: string
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    // First get file metadata
    const file = await this.getFile(userId, workspaceId, fileId);

    let downloadUrl: string;
    let mimeType = file.mimeType;
    let fileName = file.name;

    // Check if it's a Google Docs file that needs export
    if (GOOGLE_DOCS_EXPORT_FORMATS[file.mimeType]) {
      const exportFormats = GOOGLE_DOCS_EXPORT_FORMATS[file.mimeType];
      const format = convertTo || 'pdf';

      if (!exportFormats[format]) {
        throw new BadRequestException(`Cannot export ${file.mimeType} to ${format}`);
      }

      mimeType = exportFormats[format];
      downloadUrl = `${this.DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(mimeType)}`;

      // Add extension to filename
      const ext = this.getExtensionForMimeType(mimeType);
      if (ext && !fileName.endsWith(`.${ext}`)) {
        fileName = `${fileName}.${ext}`;
      }
    } else {
      // Regular file download
      downloadUrl = `${this.DRIVE_API_BASE}/files/${fileId}?alt=media&supportsAllDrives=true`;
    }

    const response = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      responseType: 'arraybuffer',
    });

    return {
      buffer: Buffer.from(response.data),
      mimeType,
      fileName,
    };
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(
    userId: string,
    workspaceId: string,
    name: string,
    parentId?: string,
    driveId?: string
  ): Promise<GoogleDriveFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const metadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      metadata.parents = [parentId];
    } else if (driveId && driveId !== 'root') {
      metadata.parents = [driveId];
    }

    const response = await this.makeRequest(accessToken, 'POST', '/files', {
      data: metadata,
      params: {
        supportsAllDrives: true,
        fields: 'id, name, mimeType, createdTime, modifiedTime, webViewLink, parents',
      },
    });

    return this.transformFile(response.data);
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    userId: string,
    workspaceId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
    },
    options: {
      parentId?: string;
      driveId?: string;
      description?: string;
    } = {}
  ): Promise<GoogleDriveFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const { parentId, driveId, description } = options;

    // Prepare metadata
    const metadata: any = {
      name: file.originalname,
    };

    if (description) {
      metadata.description = description;
    }

    if (parentId) {
      metadata.parents = [parentId];
    } else if (driveId && driveId !== 'root') {
      metadata.parents = [driveId];
    }

    // Create multipart body
    const boundary = `boundary_${Date.now()}`;
    const metadataJson = JSON.stringify(metadata);

    const multipartBody = Buffer.concat([
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from('Content-Type: application/json; charset=UTF-8\r\n\r\n'),
      Buffer.from(metadataJson + '\r\n'),
      Buffer.from(`--${boundary}\r\n`),
      Buffer.from(`Content-Type: ${file.mimetype}\r\n\r\n`),
      file.buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const response = await axios.post(
      `${this.DRIVE_UPLOAD_URL}?uploadType=multipart&supportsAllDrives=true&fields=id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,parents`,
      multipartBody,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
      }
    );

    return this.transformFile(response.data);
  }

  /**
   * Delete a file (move to trash or permanently delete)
   */
  async deleteFile(
    userId: string,
    workspaceId: string,
    fileId: string,
    permanent: boolean = false
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    if (permanent) {
      await this.makeRequest(accessToken, 'DELETE', `/files/${fileId}`, {
        params: { supportsAllDrives: true },
      });
    } else {
      // Move to trash
      await this.makeRequest(accessToken, 'PATCH', `/files/${fileId}`, {
        data: { trashed: true },
        params: { supportsAllDrives: true },
      });
    }

    this.logger.log(`File ${fileId} ${permanent ? 'permanently deleted' : 'moved to trash'}`);
  }

  /**
   * Share a file
   */
  async shareFile(
    userId: string,
    workspaceId: string,
    fileId: string,
    email: string,
    role: 'reader' | 'commenter' | 'writer',
    sendNotification: boolean = true
  ): Promise<{ shareLink: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    // Create permission
    await this.makeRequest(accessToken, 'POST', `/files/${fileId}/permissions`, {
      data: {
        type: 'user',
        role,
        emailAddress: email,
      },
      params: {
        sendNotificationEmail: sendNotification,
        supportsAllDrives: true,
      },
    });

    // Get file to return share link
    const file = await this.getFile(userId, workspaceId, fileId);

    return { shareLink: file.webViewLink || '' };
  }

  /**
   * Import file from Google Drive to Deskive storage
   */
  async importFileToDeskive(
    userId: string,
    workspaceId: string,
    fileId: string,
    targetFolderId?: string,
    convertTo?: string
  ): Promise<{
    success: boolean;
    deskiveFileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
  }> {
    // Download the file from Google Drive
    const { buffer, mimeType, fileName } = await this.downloadFile(userId, workspaceId, fileId, convertTo);

    // Upload to Deskive storage via database
    const storagePath = `workspaces/${workspaceId}/files/${targetFolderId || 'imports'}/${Date.now()}_${fileName}`;
    const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile('deskive-files', buffer, storagePath, {
      contentType: mimeType,
      metadata: {
        originalName: fileName,
        importedFrom: 'google-drive',
        googleDriveFileId: fileId,
      },
    });

    // Create file record in Deskive
    const fileRecord = await this.db.insert('files', {
      workspace_id: workspaceId,
      folder_id: targetFolderId || null,
      parent_folder_ids: targetFolderId ? [targetFolderId] : [],
      name: fileName,
      mime_type: mimeType,
      size: buffer.length,
      storage_path: storagePath,
      url: uploadResult.url || uploadResult.path,
      uploaded_by: userId,
      is_deleted: false,
      metadata: {
        source: 'google-drive',
        sourceId: fileId,
        originalName: fileName,
        importedAt: new Date().toISOString(),
      },
    });

    return {
      success: true,
      deskiveFileId: fileRecord.id,
      fileName,
      fileSize: buffer.length,
      mimeType,
      url: uploadResult.url || uploadResult.path,
    };
  }

  /**
   * Export a Deskive file to Google Drive
   * Downloads file from Deskive storage and uploads to user's Google Drive
   */
  async exportFileToDrive(
    userId: string,
    workspaceId: string,
    deskiveFileId: string,
    targetFolderId?: string,
  ): Promise<{
    success: boolean;
    googleDriveFileId: string;
    fileName: string;
    webViewLink?: string;
    webContentLink?: string;
  }> {
    // 1. Get the Deskive file record
    const fileRecord = await this.db.findOne('files', {
      id: deskiveFileId,
      workspace_id: workspaceId,
    });

    if (!fileRecord) {
      throw new NotFoundException('File not found in Deskive');
    }

    // Get file URL - use stored URL or generate from storage_path
    let fileUrl = fileRecord.url;
    if (!fileUrl && fileRecord.storage_path) {
      const publicUrlResult = await /* TODO: use StorageService */ this.db.getPublicUrl('files', fileRecord.storage_path);
      fileUrl = typeof publicUrlResult === 'object' && publicUrlResult?.publicUrl
        ? publicUrlResult.publicUrl
        : publicUrlResult;
    }

    if (!fileUrl) {
      throw new BadRequestException('File has no accessible URL');
    }

    // 2. Download file from URL (same approach as files.service.ts)
    let fileBuffer: Buffer;
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer'
      });
      fileBuffer = Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file from Deskive storage: ${error.message}`);
      throw new BadRequestException('Failed to download file from storage');
    }

    // 3. Upload to Google Drive
    const uploadedFile = await this.uploadFile(
      userId,
      workspaceId,
      {
        buffer: fileBuffer,
        originalname: fileRecord.name,
        mimetype: fileRecord.mime_type || 'application/octet-stream',
      },
      {
        parentId: targetFolderId,
        description: `Exported from Deskive on ${new Date().toISOString()}`,
      }
    );

    this.logger.log(`Exported file "${fileRecord.name}" to Google Drive: ${uploadedFile.id}`);

    return {
      success: true,
      googleDriveFileId: uploadedFile.id,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
      webContentLink: uploadedFile.webContentLink,
    };
  }

  // ==================== Helper Methods ====================

  private async makeRequest(
    accessToken: string,
    method: string,
    endpoint: string,
    config: AxiosRequestConfig = {}
  ): Promise<any> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.DRIVE_API_BASE}${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...config.headers,
        },
        ...config,
      });

      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new BadRequestException('Google Drive access token is invalid. Please reconnect.');
      }
      if (error.response?.status === 404) {
        throw new NotFoundException('File not found in Google Drive');
      }
      this.logger.error('Google Drive API error:', error.response?.data || error.message);
      throw new BadRequestException(`Google Drive API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private transformConnection(connection: any): GoogleDriveConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id, // User who owns this connection
      googleEmail: connection.google_email,
      googleName: connection.google_name,
      googlePicture: connection.google_picture,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }

  private transformFile(file: any): GoogleDriveFileDto {
    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size ? parseInt(file.size, 10) : undefined,
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      thumbnailLink: file.thumbnailLink,
      iconLink: file.iconLink,
      fileType: this.getFileType(file.mimeType),
      parentId: file.parents?.[0],
    };
  }

  private getFileType(mimeType: string): GoogleDriveFileType {
    if (MIME_TO_FILE_TYPE[mimeType]) {
      return MIME_TO_FILE_TYPE[mimeType];
    }

    if (mimeType.startsWith('image/')) {
      return GoogleDriveFileType.IMAGE;
    }
    if (mimeType.startsWith('video/')) {
      return GoogleDriveFileType.VIDEO;
    }

    return GoogleDriveFileType.FILE;
  }

  private getFileTypeMimeFilter(fileType: string): string | null {
    const filters: Record<string, string> = {
      folder: "mimeType = 'application/vnd.google-apps.folder'",
      document: "mimeType = 'application/vnd.google-apps.document'",
      spreadsheet: "mimeType = 'application/vnd.google-apps.spreadsheet'",
      presentation: "mimeType = 'application/vnd.google-apps.presentation'",
      pdf: "mimeType = 'application/pdf'",
      image: "mimeType contains 'image/'",
      video: "mimeType contains 'video/'",
    };

    return filters[fileType] || null;
  }

  private getExtensionForMimeType(mimeType: string): string | null {
    const extensions: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/html': 'html',
      'text/plain': 'txt',
      'text/csv': 'csv',
    };

    return extensions[mimeType] || null;
  }
}
