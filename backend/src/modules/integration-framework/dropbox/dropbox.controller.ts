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
import { DropboxService } from './dropbox.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../../common/guards/workspace.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  DropboxOAuthCallbackDto,
  ListFilesQueryDto,
  DropboxImportFileDto,
  DropboxCreateFolderDto,
  DropboxUploadFileDto,
  DropboxMoveFileDto,
  DropboxCopyFileDto,
  DropboxShareFileDto,
} from './dto/dropbox.dto';

@ApiTags('dropbox')
@Controller('workspaces/:workspaceId/dropbox')
export class DropboxController {
  constructor(private readonly dropboxService: DropboxService) {}

  // ==================== OAuth Endpoints ====================

  @Get('auth/url')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get Dropbox OAuth authorization URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  @ApiResponse({ status: 200, description: 'Returns OAuth URL and state' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    const result = this.dropboxService.getAuthUrl(userId, workspaceId, returnUrl);
    return {
      data: result,
      message: 'OAuth URL generated successfully',
    };
  }

  @Post('auth/callback')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Handle OAuth callback and store connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection established successfully' })
  async handleCallback(@Body() callbackDto: DropboxOAuthCallbackDto) {
    const connection = await this.dropboxService.handleOAuthCallback(
      callbackDto.code,
      callbackDto.state,
    );
    return {
      data: connection,
      message: 'Dropbox connected successfully',
    };
  }

  @Get('connection')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current Dropbox connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.dropboxService.getConnection(userId, workspaceId);
    return {
      data: connection,
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect your Dropbox connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  async disconnect(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    await this.dropboxService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'Dropbox disconnected successfully',
    };
  }

  // ==================== Storage & File Browsing ====================

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
    const quota = await this.dropboxService.getStorageQuota(userId, workspaceId);
    return {
      data: quota,
      message: 'Storage quota retrieved successfully',
    };
  }

  @Get('files')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List files in a folder or search' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of files with pagination' })
  async listFiles(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListFilesQueryDto,
  ) {
    const result = await this.dropboxService.listFiles(userId, workspaceId, {
      path: query.path,
      query: query.query,
      cursor: query.cursor,
      limit: query.limit,
      includeDeleted: query.includeDeleted,
      recursive: query.recursive,
    });
    return {
      data: result,
      message: 'Files retrieved successfully',
    };
  }

  @Get('files/metadata')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get file metadata' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'path', description: 'Dropbox file path' })
  @ApiResponse({ status: 200, description: 'File metadata' })
  async getFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('path') path: string,
  ) {
    const file = await this.dropboxService.getFile(userId, workspaceId, path);
    return {
      data: file,
      message: 'File retrieved successfully',
    };
  }

  @Get('files/download')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download a file from Dropbox' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'path', description: 'Dropbox file path' })
  @ApiResponse({ status: 200, description: 'File content' })
  async downloadFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('path') path: string,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, fileName } = await this.dropboxService.downloadFile(
      userId,
      workspaceId,
      path,
    );

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('files/temporary-link')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get temporary download link for a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'path', description: 'Dropbox file path' })
  @ApiResponse({ status: 200, description: 'Temporary download link' })
  async getTemporaryLink(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('path') path: string,
  ) {
    const link = await this.dropboxService.getTemporaryLink(userId, workspaceId, path);
    return {
      data: { link },
      message: 'Temporary link generated successfully',
    };
  }

  // ==================== File Operations ====================

  @Post('folders')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a folder in Dropbox' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Folder created' })
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: DropboxCreateFolderDto,
  ) {
    const folder = await this.dropboxService.createFolder(
      userId,
      workspaceId,
      dto.path,
      dto.autoRename,
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
  @ApiOperation({ summary: 'Upload a file to Dropbox' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async uploadFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: DropboxUploadFileDto,
  ) {
    const uploadedFile = await this.dropboxService.uploadFile(
      userId,
      workspaceId,
      {
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      },
      {
        path: dto.path,
        mode: dto.mode,
        autoRename: dto.autoRename,
        mute: dto.mute,
      },
    );
    return {
      data: uploadedFile,
      message: 'File uploaded successfully',
    };
  }

  @Delete('files')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a file or folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'path', description: 'Dropbox file/folder path' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('path') path: string,
  ) {
    await this.dropboxService.deleteFile(userId, workspaceId, path);
    return {
      data: null,
      message: 'File deleted successfully',
    };
  }

  @Post('files/move')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Move a file or folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'File moved' })
  async moveFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: DropboxMoveFileDto,
  ) {
    const file = await this.dropboxService.moveFile(
      userId,
      workspaceId,
      dto.fromPath,
      dto.toPath,
      dto.autoRename,
    );
    return {
      data: file,
      message: 'File moved successfully',
    };
  }

  @Post('files/copy')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Copy a file or folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'File copied' })
  async copyFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: DropboxCopyFileDto,
  ) {
    const file = await this.dropboxService.copyFile(
      userId,
      workspaceId,
      dto.fromPath,
      dto.toPath,
      dto.autoRename,
    );
    return {
      data: file,
      message: 'File copied successfully',
    };
  }

  @Post('files/share')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a shared link for a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Shared link created' })
  async shareFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: DropboxShareFileDto,
  ) {
    const result = await this.dropboxService.createSharedLink(userId, workspaceId, dto.path, {
      requestedVisibility: dto.requestedVisibility,
      expires: dto.expires,
      linkPassword: dto.linkPassword,
    });
    return {
      data: result,
      message: 'Shared link created successfully',
    };
  }

  // ==================== Import to Deskive ====================

  @Post('import')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import a file from Dropbox to Deskive storage' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'File imported to Deskive' })
  async importFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: DropboxImportFileDto,
  ) {
    const result = await this.dropboxService.importFileToDeskive(
      userId,
      workspaceId,
      dto.path,
      dto.targetFolderId,
    );
    return {
      data: result,
      message: 'File imported successfully',
    };
  }

  // ==================== Export to Dropbox ====================

  @Post('export')
  @UseGuards(AuthGuard, WorkspaceGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Export a Deskive file to Dropbox' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['fileId'],
      properties: {
        fileId: { type: 'string', description: 'Deskive file ID to export' },
        targetPath: {
          type: 'string',
          description: 'Dropbox path (optional, defaults to root with file name)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File exported to Dropbox' })
  @ApiResponse({ status: 404, description: 'File not found or Dropbox not connected' })
  async exportFile(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: { fileId: string; targetPath?: string },
  ) {
    const result = await this.dropboxService.exportFileToDropbox(
      userId,
      workspaceId,
      dto.fileId,
      dto.targetPath,
    );
    return {
      data: result,
      message: 'File exported to Dropbox successfully',
    };
  }
}

// ==================== Public OAuth Callback Controller ====================

@ApiTags('dropbox')
@Controller('integrations/dropbox')
export class DropboxCallbackController {
  constructor(private readonly dropboxService: DropboxService) {}

  @Get('callback')
  @ApiOperation({ summary: 'OAuth callback endpoint (called by Dropbox)' })
  @ApiQuery({ name: 'code', description: 'Authorization code from Dropbox' })
  @ApiQuery({ name: 'state', description: 'State parameter for CSRF validation' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend with result' })
  async handleOAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const isCustomScheme = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        return !['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    };

    const sendDeepLinkPage = (deepLinkUrl: string, title: string, errorMessage?: string) => {
      const isError = title.toLowerCase().includes('failed');
      const bgGradient = isError
        ? 'linear-gradient(135deg, #e53935 0%, #c62828 100%)'
        : 'linear-gradient(135deg, #0061FF 0%, #0052CC 100%)';
      const buttonColor = isError ? '#e53935' : '#0061FF';

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
    window.location.href = "${deepLinkUrl}";
    setTimeout(function() {
      window.location.href = "${deepLinkUrl}";
    }, 500);
  </script>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    };

    const handleRedirect = (
      stateParam: string,
      success: boolean,
      errorMsg?: string,
      email?: string,
    ) => {
      try {
        const decoded = Buffer.from(stateParam, 'base64url').toString('utf-8');
        const stateData = JSON.parse(decoded);

        if (stateData.returnUrl && isCustomScheme(stateData.returnUrl)) {
          const separator = stateData.returnUrl.includes('?') ? '&' : '?';
          const params = success
            ? `success=true&dropbox_connected=true&email=${encodeURIComponent(email || '')}`
            : `error=${encodeURIComponent(errorMsg || 'unknown_error')}`;
          const deepLinkUrl = `${stateData.returnUrl}${separator}${params}`;

          const title = success ? 'Dropbox Connected Successfully' : 'Dropbox Connection Failed';
          return sendDeepLinkPage(deepLinkUrl, title, success ? undefined : errorMsg);
        }

        if (success) {
          return res.redirect(
            `${frontendUrl}/workspaces/${stateData.workspaceId}/settings/integrations?dropbox_success=true`,
          );
        }
        return res.redirect(
          `${frontendUrl}/settings/integrations?dropbox_error=${encodeURIComponent(errorMsg || 'unknown_error')}`,
        );
      } catch {
        if (success) {
          return res.redirect(`${frontendUrl}/settings/integrations?dropbox_success=true`);
        }
        return res.redirect(
          `${frontendUrl}/settings/integrations?dropbox_error=${encodeURIComponent(errorMsg || 'unknown_error')}`,
        );
      }
    };

    try {
      if (error) {
        return handleRedirect(state, false, errorDescription || error);
      }

      if (!code || !state) {
        return handleRedirect(state, false, 'missing_params');
      }

      const connection = await this.dropboxService.handleOAuthCallback(code, state);

      return handleRedirect(state, true, undefined, connection.dropboxEmail);
    } catch (err) {
      console.error('Dropbox OAuth callback error:', err);
      return handleRedirect(state, false, err.message || 'unknown_error');
    }
  }
}
