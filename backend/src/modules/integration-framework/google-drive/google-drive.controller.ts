import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../../common/guards/workspace.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  GoogleDriveOAuthCallbackDto,
  NativeConnectGoogleDriveDto,
  ListFilesQueryDto,
  ImportFileDto,
  GoogleDriveCreateFolderDto,
  GoogleDriveUploadFileDto,
  GoogleDriveShareFileDto,
  DeleteFileDto,
} from './dto/google-drive.dto';

@ApiTags('google-drive')
@Controller('workspaces/:workspaceId/google-drive')
export class GoogleDriveController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  // ==================== OAuth Endpoints ====================

  @Get('auth/url')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Google OAuth authorization URL (user-specific)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  @ApiResponse({ status: 200, description: 'Returns OAuth URL and state' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const result = this.googleDriveService.getAuthUrl(userId, workspaceId, returnUrl);
    return {
      data: result,
      message: 'OAuth URL generated successfully',
    };
  }

  @Post('auth/callback')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle OAuth callback and store connection (user-specific)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection established successfully' })
  async handleCallback(@Body() callbackDto: GoogleDriveOAuthCallbackDto) {
    const connection = await this.googleDriveService.handleOAuthCallback(
      callbackDto.code,
      callbackDto.state,
    );
    return {
      data: connection,
      message: 'Google Drive connected successfully',
    };
  }

  @Post('connect-native')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Connect Google Drive using native mobile sign-in' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Google Drive connected via native sign-in' })
  async connectNative(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: NativeConnectGoogleDriveDto,
  ) {
    const connection = await this.googleDriveService.handleNativeSignIn(
      userId,
      workspaceId,
      dto.serverAuthCode,
      {
        email: dto.email,
        displayName: dto.displayName,
        photoUrl: dto.photoUrl,
      },
    );
    return {
      data: connection,
      message: 'Google Drive connected successfully via native sign-in',
    };
  }

  @Get('connection')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current Google Drive connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.googleDriveService.getConnection(userId, workspaceId);
    return {
      data: connection,
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect your Google Drive connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  async disconnect(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    await this.googleDriveService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'Google Drive disconnected successfully',
    };
  }

  // ==================== Drive & File Browsing ====================

  @Get('drives')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List available drives (My Drive + Shared Drives)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of drives' })
  async listDrives(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    const drives = await this.googleDriveService.listDrives(userId, workspaceId);
    return {
      data: drives,
      message: 'Drives retrieved successfully',
    };
  }

  @Get('storage-quota')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get storage quota information' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Storage quota information' })
  async getStorageQuota(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const quota = await this.googleDriveService.getStorageQuota(userId, workspaceId);
    return {
      data: quota,
      message: 'Storage quota retrieved successfully',
    };
  }

  @Get('files')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List files in a folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of files with pagination' })
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListFilesQueryDto,
  ) {
    const result = await this.googleDriveService.listFiles(userId, workspaceId, {
      folderId: query.folderId,
      driveId: query.driveId,
      query: query.query,
      fileType: query.fileType,
      pageToken: query.pageToken,
      pageSize: query.pageSize,
      includeTrashed: query.includeTrashed,
      view: query.view,
    });
    return {
      data: result,
      message: 'Files retrieved successfully',
    };
  }

  @Get('files/:fileId')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'Google Drive file ID' })
  @ApiResponse({ status: 200, description: 'File metadata' })
  async getFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const file = await this.googleDriveService.getFile(userId, workspaceId, fileId);
    return {
      data: file,
      message: 'File retrieved successfully',
    };
  }

  @Get('files/:fileId/download')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a file from Google Drive' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'Google Drive file ID' })
  @ApiQuery({
    name: 'convertTo',
    required: false,
    description: 'Convert Google Docs to format (pdf, docx, xlsx, pptx, html, txt)',
  })
  @ApiResponse({ status: 200, description: 'File content' })
  async downloadFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
    @Query('convertTo') convertTo: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, fileName } = await this.googleDriveService.downloadFile(
      userId,
      workspaceId,
      fileId,
      convertTo,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ==================== File Operations ====================

  @Post('folders')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a folder in Google Drive' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: GoogleDriveCreateFolderDto,
  ) {
    const folder = await this.googleDriveService.createFolder(
      userId,
      workspaceId,
      dto.name,
      dto.parentId,
      dto.driveId,
    );
    return {
      data: folder,
      message: 'Folder created successfully',
    };
  }

  @Post('upload')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file to Google Drive' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async uploadFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GoogleDriveUploadFileDto,
  ) {
    const uploadedFile = await this.googleDriveService.uploadFile(
      userId,
      workspaceId,
      {
        buffer: file.buffer,
        originalname: dto.name || file.originalname,
        mimetype: file.mimetype,
      },
      {
        parentId: dto.parentId,
        driveId: dto.driveId,
        description: dto.description,
      },
    );
    return {
      data: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Delete('files/:fileId')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file (move to trash or permanently delete)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'Google Drive file ID' })
  @ApiQuery({
    name: 'permanent',
    required: false,
    description: 'Permanently delete instead of trash',
  })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
    @Query('permanent') permanent: string,
  ) {
    await this.googleDriveService.deleteFile(userId, workspaceId, fileId, permanent === 'true');
    return {
      data: null,
      message: permanent === 'true' ? 'File permanently deleted' : 'File moved to trash',
    };
  }

  @Post('files/:fileId/share')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Share a file with someone' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'Google Drive file ID' })
  @ApiResponse({ status: 200, description: 'File shared' })
  async shareFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: GoogleDriveShareFileDto,
  ) {
    const result = await this.googleDriveService.shareFile(
      userId,
      workspaceId,
      fileId,
      dto.email,
      dto.role,
      dto.sendNotification ?? true,
    );
    return {
      data: result,
      message: 'File shared successfully',
    };
  }

  // ==================== Import to Deskive ====================

  @Post('import')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import a file from Google Drive to Deskive storage' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'File imported to Deskive' })
  async importFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ImportFileDto,
  ) {
    const result = await this.googleDriveService.importFileToDeskive(
      userId,
      workspaceId,
      dto.fileId,
      dto.targetFolderId,
      dto.convertTo,
    );
    return {
      data: result,
      message: 'File imported successfully',
    };
  }

  // ==================== Export to Google Drive ====================

  @Post('export')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export a Deskive file to Google Drive' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileId'],
      properties: {
        fileId: { type: 'string', description: 'Deskive file ID to export' },
        targetFolderId: {
          type: 'string',
          description: 'Google Drive folder ID (optional, defaults to root)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File exported to Google Drive' })
  @ApiResponse({ status: 404, description: 'File not found or Google Drive not connected' })
  async exportFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { fileId: string; targetFolderId?: string },
  ) {
    const result = await this.googleDriveService.exportFileToDrive(
      userId,
      workspaceId,
      dto.fileId,
      dto.targetFolderId,
    );
    return {
      data: result,
      message: 'File exported to Google Drive successfully',
    };
  }
}

// ==================== Public OAuth Callback Controller ====================
// This is a separate controller for the OAuth callback that doesn't require auth
// because it's called by Google's redirect

@ApiTags('google-drive')
@Controller('integrations/google-drive')
export class GoogleDriveCallbackController {
  constructor(private readonly googleDriveService: GoogleDriveService) {}

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback endpoint (called by Google)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Google' })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF validation' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with result' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    // Get frontend URL from environment or use default
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    // Helper to check if URL uses a custom scheme (not http/https)
    const isCustomScheme = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return !['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    };

    // Helper to send an HTML page that triggers a deep link
    const sendDeepLinkPage = (deepLinkUrl: string, title: string, errorMessage?: string) => {
      const isError = title.toLowerCase().includes('failed');
      const bgGradient = isError
        ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      const buttonColor = isError ? '#e53935' : '#667eea';

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: ${bgGradient};
      color: white;
      text-align: center;
      padding: 20px;
    }
    .container {
      background: rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
    }
    h1 { margin-bottom: 10px; font-size: 24px; }
    p { opacity: 0.9; margin-bottom: 20px; }
    .error-msg {
      background: rgba(0,0,0,0.2);
      padding: 10px 15px;
      border-radius: 8px;
      font-size: 14px;
      margin-bottom: 20px;
      word-break: break-word;
    }
    .button {
      display: inline-block;
      background: white;
      color: ${buttonColor};
      padding: 15px 40px;
      border-radius: 30px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s;
    }
    .button:hover { transform: scale(1.05); }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    .icon { font-size: 48px; margin-bottom: 20px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="container">
    ${isError ? '<div class="icon">❌</div>' : '<div class="spinner"></div>'}
    <h1>${title}</h1>
    ${errorMessage ? `<div class="error-msg">${errorMessage}</div>` : ''}
    <p>Redirecting you back to the app...</p>
    <a href="${deepLinkUrl}" class="button">Open App</a>
  </div>
  <script>
    // Try to open the deep link automatically
    window.location.href = "${deepLinkUrl}";

    // Fallback: try again after a short delay
    setTimeout(function() {
      window.location.href = "${deepLinkUrl}";
    }, 500);
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    };

    // Helper to handle redirect (either deep link page or direct redirect)
    const handleRedirect = (
      stateParam: string,
      success: boolean,
      errorMsg?: string,
      email?: string,
    ) => {
      try {
        const decoded = Buffer.from(stateParam, 'base64url').toString('utf-8');
        const stateData = JSON.parse(decoded);

        // If returnUrl is provided and is a mobile deep link (deskive://), use it
        if (stateData.returnUrl && isCustomScheme(stateData.returnUrl)) {
          const separator = stateData.returnUrl.includes('?') ? '&' : '?';
          const params = success
            ? `success=true&google_drive_connected=true&email=${encodeURIComponent(email || '')}`
            : `error=${encodeURIComponent(errorMsg || 'unknown_error')}`;
          const deepLinkUrl = `${stateData.returnUrl}${separator}${params}`;

          const title = success
            ? 'Google Drive Connected Successfully'
            : 'Google Drive Connection Failed';
          return sendDeepLinkPage(deepLinkUrl, title, success ? undefined : errorMsg);
        }

        // Otherwise use web frontend
        if (success) {
          return res.redirect(
            `${frontendUrl}/workspaces/${stateData.workspaceId}/settings/integrations?google_drive_success=true`,
          );
        }
        return res.redirect(
          `${frontendUrl}/settings/integrations?google_drive_error=${encodeURIComponent(errorMsg || 'unknown_error')}`,
        );
      } catch {
        // Fallback to frontend on decode error
        if (success) {
          return res.redirect(`${frontendUrl}/settings/integrations?google_drive_success=true`);
        }
        return res.redirect(
          `${frontendUrl}/settings/integrations?google_drive_error=${encodeURIComponent(errorMsg || 'unknown_error')}`,
        );
      }
    };

    try {
      if (error) {
        // User denied access or other error
        return handleRedirect(state, false, error);
      }

      if (!code || !state) {
        return handleRedirect(state, false, 'missing_params');
      }

      // Exchange code for tokens and store connection
      const connection = await this.googleDriveService.handleOAuthCallback(code, state);

      // Redirect to appropriate URL (mobile deep link page or web frontend)
      return handleRedirect(state, true, undefined, connection.googleEmail);
    } catch (err) {
      console.error('Google Drive OAuth callback error:', err);
      return handleRedirect(state, false, err.message || 'unknown_error');
    }
  }
}
