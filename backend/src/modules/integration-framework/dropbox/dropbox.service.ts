import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { DropboxOAuthService } from './dropbox-oauth.service';
import axios, { AxiosRequestConfig } from 'axios';
import {
  DropboxFileDto,
  DropboxFileType,
  DropboxConnectionDto,
  ListFilesResponseDto,
  StorageQuotaDto,
  DropboxShareLinkResponseDto,
} from './dto/dropbox.dto';
import * as mime from 'mime-types';

// MIME type to file type mapping
const MIME_TO_FILE_TYPE: Record<string, DropboxFileType> = {
  'application/pdf': DropboxFileType.PDF,
};

@Injectable()
export class DropboxService {
  private readonly logger = new Logger(DropboxService.name);
  private readonly DROPBOX_API_BASE = 'https://api.dropboxapi.com/2';
  private readonly DROPBOX_CONTENT_BASE = 'https://content.dropboxapi.com/2';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: DropboxOAuthService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Get OAuth URL for connecting Dropbox
   */
  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string) {
    return this.oauthService.getAuthorizationUrl(userId, workspaceId, returnUrl);
  }

  /**
   * Handle OAuth callback and store connection
   */
  async handleOAuthCallback(code: string, state: string): Promise<DropboxConnectionDto> {
    const stateData = this.oauthService.decodeState(state);
    const { userId, workspaceId } = stateData;

    // Exchange code for tokens
    const tokens = await this.oauthService.exchangeCodeForTokens(code);

    // Get user info from Dropbox
    const userInfo = await this.oauthService.getUserInfo(tokens.accessToken);

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('dropbox_connections', {
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
      expires_at: tokens.expiresAt?.toISOString(),
      account_id: userInfo.accountId,
      dropbox_email: userInfo.email,
      dropbox_name: userInfo.name.displayName,
      dropbox_picture: userInfo.profilePhotoUrl,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('dropbox_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('dropbox_connections', connectionData);
    }

    this.logger.log(`Dropbox connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's Dropbox connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<DropboxConnectionDto | null> {
    const connection = await this.db.findOne('dropbox_connections', {
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
   * Disconnect user's Dropbox in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('dropbox_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Dropbox connection not found');
    }

    // Revoke token
    try {
      await this.oauthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    // Soft delete the connection
    await this.db.update('dropbox_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Dropbox disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get valid access token (refresh if needed)
   */
  private async getValidAccessToken(userId: string, workspaceId: string): Promise<string> {
    const connection = await this.db.findOne('dropbox_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('Dropbox not connected. Please connect your Dropbox first.');
    }

    // Check if token is expired or about to expire
    if (
      connection.expires_at &&
      this.oauthService.isTokenExpired(new Date(connection.expires_at))
    ) {
      if (!connection.refresh_token) {
        throw new BadRequestException(
          'Access token expired and no refresh token available. Please reconnect Dropbox.',
        );
      }

      // Refresh the token
      const newTokens = await this.oauthService.refreshAccessToken(connection.refresh_token);

      // Update the connection with new tokens
      await this.db.update('dropbox_connections', connection.id, {
        access_token: newTokens.accessToken,
        expires_at: newTokens.expiresAt?.toISOString(),
        updated_at: new Date().toISOString(),
      });

      return newTokens.accessToken;
    }

    return connection.access_token;
  }

  // ==================== Dropbox API Operations ====================

  /**
   * Get storage quota information
   */
  async getStorageQuota(userId: string, workspaceId: string): Promise<StorageQuotaDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/users/get_space_usage', {});

      const allocated = response.data.allocation?.allocated || 0;
      const used = response.data.used || 0;

      return {
        allocated,
        used,
        allocatedFormatted: this.formatBytes(allocated),
        usedFormatted: this.formatBytes(used),
        usagePercent: allocated > 0 ? Math.round((used / allocated) * 100) : 0,
      };
    } catch (error) {
      this.logger.error('Failed to get storage quota:', error.message);
      throw new BadRequestException('Failed to get storage quota from Dropbox');
    }
  }

  /**
   * List files in a folder
   */
  async listFiles(
    userId: string,
    workspaceId: string,
    options: {
      path?: string;
      query?: string;
      cursor?: string;
      limit?: number;
      includeDeleted?: boolean;
      recursive?: boolean;
    } = {},
  ): Promise<ListFilesResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const {
      path = '',
      query,
      cursor,
      limit = 50,
      includeDeleted = false,
      recursive = false,
    } = options;

    try {
      let response;

      if (query) {
        // Search mode
        if (cursor) {
          response = await this.makeApiRequest(accessToken, '/files/search/continue_v2', {
            cursor,
          });
        } else {
          response = await this.makeApiRequest(accessToken, '/files/search_v2', {
            query,
            options: {
              path: path || '',
              max_results: Math.min(limit, 100),
              file_status: includeDeleted ? 'active' : 'active',
            },
          });
        }

        const matches = response.data.matches || [];
        const files: DropboxFileDto[] = matches
          .filter((match: any) => match.metadata?.metadata?.['.tag'] !== 'deleted')
          .map((match: any) => this.transformFile(match.metadata?.metadata));

        return {
          files,
          cursor: response.data.cursor,
          hasMore: response.data.has_more || false,
        };
      } else {
        // List folder mode
        if (cursor) {
          response = await this.makeApiRequest(accessToken, '/files/list_folder/continue', {
            cursor,
          });
        } else {
          response = await this.makeApiRequest(accessToken, '/files/list_folder', {
            path: path || '',
            recursive,
            include_deleted: includeDeleted,
            include_mounted_folders: true,
            limit: Math.min(limit, 2000),
          });
        }

        const entries = response.data.entries || [];
        const files: DropboxFileDto[] = entries
          .filter((entry: any) => entry['.tag'] !== 'deleted')
          .map((entry: any) => this.transformFile(entry));

        return {
          files,
          cursor: response.data.cursor,
          hasMore: response.data.has_more || false,
        };
      }
    } catch (error) {
      this.logger.error('Failed to list files:', error.response?.data || error.message);
      throw new BadRequestException('Failed to list files from Dropbox');
    }
  }

  /**
   * Get file metadata
   */
  async getFile(userId: string, workspaceId: string, path: string): Promise<DropboxFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/files/get_metadata', {
        path,
        include_media_info: true,
      });

      return this.transformFile(response.data);
    } catch (error) {
      this.logger.error('Failed to get file metadata:', error.response?.data || error.message);
      throw new NotFoundException('File not found in Dropbox');
    }
  }

  /**
   * Get temporary download link
   */
  async getTemporaryLink(userId: string, workspaceId: string, path: string): Promise<string> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/files/get_temporary_link', {
        path,
      });

      return response.data.link;
    } catch (error) {
      this.logger.error('Failed to get temporary link:', error.response?.data || error.message);
      throw new BadRequestException('Failed to get download link from Dropbox');
    }
  }

  /**
   * Download file content
   */
  async downloadFile(
    userId: string,
    workspaceId: string,
    path: string,
  ): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await axios.post(`${this.DROPBOX_CONTENT_BASE}/files/download`, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Dropbox-API-Arg': JSON.stringify({ path }),
          'Content-Type': '', // Dropbox requires empty or no Content-Type
        },
        responseType: 'arraybuffer',
      });

      // Parse metadata from header
      const metadata = JSON.parse(response.headers['dropbox-api-result'] || '{}');
      const fileName = metadata.name || path.split('/').pop() || 'file';
      const mimeType = mime.lookup(fileName) || 'application/octet-stream';

      return {
        buffer: Buffer.from(response.data),
        mimeType,
        fileName,
      };
    } catch (error) {
      const errorMessage = error.response?.data
        ? Buffer.from(error.response.data).toString('utf-8')
        : error.message;
      this.logger.error('Failed to download file:', errorMessage);
      throw new BadRequestException(`Failed to download file from Dropbox: ${errorMessage}`);
    }
  }

  /**
   * Create a folder in Dropbox
   */
  async createFolder(
    userId: string,
    workspaceId: string,
    path: string,
    autoRename: boolean = false,
  ): Promise<DropboxFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/files/create_folder_v2', {
        path,
        autorename: autoRename,
      });

      return this.transformFile(response.data.metadata);
    } catch (error) {
      this.logger.error('Failed to create folder:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create folder in Dropbox');
    }
  }

  /**
   * Upload a file to Dropbox
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
      path: string;
      mode?: 'add' | 'overwrite' | 'update';
      autoRename?: boolean;
      mute?: boolean;
    },
  ): Promise<DropboxFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const { path, mode = 'add', autoRename = true, mute = false } = options;

    try {
      const response = await axios.post(`${this.DROPBOX_CONTENT_BASE}/files/upload`, file.buffer, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode,
            autorename: autoRename,
            mute,
          }),
        },
      });

      return this.transformFile(response.data);
    } catch (error) {
      this.logger.error('Failed to upload file:', error.response?.data || error.message);
      throw new BadRequestException('Failed to upload file to Dropbox');
    }
  }

  /**
   * Delete a file or folder
   */
  async deleteFile(userId: string, workspaceId: string, path: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      await this.makeApiRequest(accessToken, '/files/delete_v2', {
        path,
      });

      this.logger.log(`File/folder deleted: ${path}`);
    } catch (error) {
      this.logger.error('Failed to delete file:', error.response?.data || error.message);
      throw new BadRequestException('Failed to delete file from Dropbox');
    }
  }

  /**
   * Move a file or folder
   */
  async moveFile(
    userId: string,
    workspaceId: string,
    fromPath: string,
    toPath: string,
    autoRename: boolean = false,
  ): Promise<DropboxFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/files/move_v2', {
        from_path: fromPath,
        to_path: toPath,
        autorename: autoRename,
      });

      return this.transformFile(response.data.metadata);
    } catch (error) {
      this.logger.error('Failed to move file:', error.response?.data || error.message);
      throw new BadRequestException('Failed to move file in Dropbox');
    }
  }

  /**
   * Copy a file or folder
   */
  async copyFile(
    userId: string,
    workspaceId: string,
    fromPath: string,
    toPath: string,
    autoRename: boolean = false,
  ): Promise<DropboxFileDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(accessToken, '/files/copy_v2', {
        from_path: fromPath,
        to_path: toPath,
        autorename: autoRename,
      });

      return this.transformFile(response.data.metadata);
    } catch (error) {
      this.logger.error('Failed to copy file:', error.response?.data || error.message);
      throw new BadRequestException('Failed to copy file in Dropbox');
    }
  }

  /**
   * Create a shared link for a file
   */
  async createSharedLink(
    userId: string,
    workspaceId: string,
    path: string,
    options: {
      requestedVisibility?: 'public' | 'team_only' | 'password';
      expires?: string;
      linkPassword?: string;
    } = {},
  ): Promise<DropboxShareLinkResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const { requestedVisibility = 'public', expires, linkPassword } = options;

    try {
      // First try to get existing shared link
      const existingLinks = await this.makeApiRequest(accessToken, '/sharing/list_shared_links', {
        path,
        direct_only: true,
      });

      if (existingLinks.data.links && existingLinks.data.links.length > 0) {
        const link = existingLinks.data.links[0];
        return {
          url: link.url,
          name: link.name,
          pathLower: link.path_lower,
          expires: link.expires,
        };
      }

      // Create new shared link
      const settings: any = {
        requested_visibility: requestedVisibility,
      };

      if (expires) {
        settings.expires = expires;
      }

      if (linkPassword && requestedVisibility === 'password') {
        settings.link_password = linkPassword;
      }

      const response = await this.makeApiRequest(
        accessToken,
        '/sharing/create_shared_link_with_settings',
        {
          path,
          settings,
        },
      );

      return {
        url: response.data.url,
        name: response.data.name,
        pathLower: response.data.path_lower,
        expires: response.data.expires,
      };
    } catch (error) {
      // Handle case where link already exists
      if (error.response?.data?.error?.['.tag'] === 'shared_link_already_exists') {
        const existingLink = error.response.data.error.shared_link_already_exists?.metadata;
        if (existingLink) {
          return {
            url: existingLink.url,
            name: existingLink.name,
            pathLower: existingLink.path_lower,
            expires: existingLink.expires,
          };
        }
      }
      this.logger.error('Failed to create shared link:', error.response?.data || error.message);
      throw new BadRequestException('Failed to create shared link in Dropbox');
    }
  }

  /**
   * Import file from Dropbox to Deskive storage
   */
  async importFileToDeskive(
    userId: string,
    workspaceId: string,
    path: string,
    targetFolderId?: string,
  ): Promise<{
    success: boolean;
    deskiveFileId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    url: string;
  }> {
    // Download the file from Dropbox
    const { buffer, mimeType, fileName } = await this.downloadFile(userId, workspaceId, path);

    // Upload to Deskive storage via database
    const storagePath = `workspaces/${workspaceId}/files/${targetFolderId || 'imports'}/${Date.now()}_${fileName}`;
    const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
      'deskive-files',
      buffer,
      storagePath,
      {
        contentType: mimeType,
        metadata: {
          originalName: fileName,
          importedFrom: 'dropbox',
          dropboxPath: path,
        },
      },
    );

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
        source: 'dropbox',
        sourcePath: path,
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
   * Export a Deskive file to Dropbox
   */
  async exportFileToDropbox(
    userId: string,
    workspaceId: string,
    deskiveFileId: string,
    targetPath?: string,
  ): Promise<{
    success: boolean;
    dropboxPath: string;
    fileName: string;
  }> {
    // Get the Deskive file record
    const fileRecord = await this.db.findOne('files', {
      id: deskiveFileId,
      workspace_id: workspaceId,
    });

    if (!fileRecord) {
      throw new NotFoundException('File not found in Deskive');
    }

    // Get file URL
    let fileUrl = fileRecord.url;
    if (!fileUrl && fileRecord.storage_path) {
      const publicUrlResult = await /* TODO: use StorageService */ this.db.getPublicUrl(
        'files',
        fileRecord.storage_path,
      );
      fileUrl =
        typeof publicUrlResult === 'object' && publicUrlResult?.publicUrl
          ? publicUrlResult.publicUrl
          : publicUrlResult;
    }

    if (!fileUrl) {
      throw new BadRequestException('File has no accessible URL');
    }

    // Download file from URL
    let fileBuffer: Buffer;
    try {
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });
      fileBuffer = Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`Failed to download file from Deskive storage: ${error.message}`);
      throw new BadRequestException('Failed to download file from storage');
    }

    // Determine target path
    const dropboxPath = targetPath || `/${fileRecord.name}`;

    // Upload to Dropbox
    const uploadedFile = await this.uploadFile(
      userId,
      workspaceId,
      {
        buffer: fileBuffer,
        originalname: fileRecord.name,
        mimetype: fileRecord.mime_type || 'application/octet-stream',
      },
      {
        path: dropboxPath,
        mode: 'add',
        autoRename: true,
      },
    );

    this.logger.log(`Exported file "${fileRecord.name}" to Dropbox: ${uploadedFile.pathDisplay}`);

    return {
      success: true,
      dropboxPath: uploadedFile.pathDisplay,
      fileName: uploadedFile.name,
    };
  }

  // ==================== Helper Methods ====================

  private async makeApiRequest(accessToken: string, endpoint: string, data: any): Promise<any> {
    try {
      const response = await axios.post(`${this.DROPBOX_API_BASE}${endpoint}`, data, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new BadRequestException('Dropbox access token is invalid. Please reconnect.');
      }
      throw error;
    }
  }

  private transformConnection(connection: any): DropboxConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      accountId: connection.account_id,
      dropboxEmail: connection.dropbox_email,
      dropboxName: connection.dropbox_name,
      dropboxPicture: connection.dropbox_picture,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }

  private transformFile(file: any): DropboxFileDto {
    const isFolder = file['.tag'] === 'folder';
    const name = file.name || '';
    const mimeType = isFolder ? 'folder' : mime.lookup(name) || 'application/octet-stream';

    return {
      id: file.id || file.path_lower,
      name,
      pathLower: file.path_lower || '',
      pathDisplay: file.path_display || file.path_lower || '',
      size: file.size,
      clientModified: file.client_modified,
      serverModified: file.server_modified,
      rev: file.rev,
      contentHash: file.content_hash,
      fileType: this.getFileType(mimeType, isFolder),
      isFolder,
      isDownloadable: !isFolder && file.is_downloadable !== false,
    };
  }

  private getFileType(mimeType: string, isFolder: boolean): DropboxFileType {
    if (isFolder) {
      return DropboxFileType.FOLDER;
    }

    if (MIME_TO_FILE_TYPE[mimeType]) {
      return MIME_TO_FILE_TYPE[mimeType];
    }

    if (mimeType.startsWith('image/')) {
      return DropboxFileType.IMAGE;
    }
    if (mimeType.startsWith('video/')) {
      return DropboxFileType.VIDEO;
    }
    if (mimeType.startsWith('audio/')) {
      return DropboxFileType.AUDIO;
    }
    if (mimeType.includes('document') || mimeType.includes('text/')) {
      return DropboxFileType.DOCUMENT;
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('tar') ||
      mimeType.includes('rar') ||
      mimeType.includes('7z')
    ) {
      return DropboxFileType.ARCHIVE;
    }

    return DropboxFileType.FILE;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  }
}
