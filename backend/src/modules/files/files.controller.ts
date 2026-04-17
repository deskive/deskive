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
  UploadedFiles,
  Res,
  StreamableFile,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { FilesService } from './files.service';
import { FilesAgentService, FileAgentRequest, FileAgentResponse } from './files-agent.service';
import {
  UploadFileDto,
  AddFileByUrlDto,
  CreateFolderDto,
  ShareFileDto,
  MoveFileDto,
  MoveFolderDto,
  UpdateFileDto,
  UpdateFolderDto,
  CopyFileDto,
  CopyFolderDto,
  FilterFilesByTypeDto,
  FileCategory,
  DashboardStatsResponseDto,
  DeleteFilesDto,
  DeleteFoldersDto,
  CopyFilesDto,
  CopyFoldersDto,
  MoveFilesDto,
  MoveFoldersDto,
  CreateShareLinkDto,
  UpdateShareLinkDto,
  VerifySharePasswordDto,
  CreateFileCommentDto,
  UpdateFileCommentDto,
  ResolveCommentDto,
  FileCommentResponseDto,
  MarkFileOfflineDto,
  UpdateOfflineSettingsDto,
  BatchUpdateSyncStatusDto,
  OfflineFileResponseDto,
  CheckUpdateResponseDto,
  OfflineStorageStatsDto,
} from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../common/decorators/current-workspace.decorator';
import { MAX_UPLOAD_SIZE } from '@/constants/upload';

@ApiTags('files')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/files')
@UseGuards(AuthGuard, WorkspaceGuard)
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly filesAgentService: FilesAgentService,
  ) {}

  // ============================================
  // FILES AI AGENT ENDPOINTS
  // ============================================

  @Post('ai')
  @ApiOperation({
    summary: 'Files AI assistant for natural language file management',
    description:
      'Process natural language commands to create folders, rename, delete, move, copy, share, or search files. ' +
      'Examples: "Create a folder called Documents", "Move report.pdf to Archive", "Delete the old backups"',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'AI agent response with action result',
    schema: {
      example: {
        success: true,
        action: 'create_folder',
        message: 'Created folder "Documents" in root.',
        data: { folder: { id: 'uuid', name: 'Documents' } },
      },
    },
  })
  async processAICommand(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { prompt: string },
    @CurrentUser('sub') userId: string,
  ): Promise<FileAgentResponse> {
    const request: FileAgentRequest = {
      prompt: body.prompt,
      workspaceId,
    };
    return this.filesAgentService.processCommand(request, userId);
  }

  @Get('ai/history')
  @ApiOperation({
    summary: 'Get conversation history for the Files AI agent',
    description: 'Retrieves the conversation history between the user and the Files AI agent.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Maximum number of messages to return' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history',
  })
  async getAIConversationHistory(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit: string,
    @CurrentUser('sub') userId: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.filesAgentService.getConversationHistory(workspaceId, userId, limitNum);
  }

  @Delete('ai/history')
  @ApiOperation({
    summary: 'Clear conversation history for the Files AI agent',
    description: 'Deletes all conversation history between the user and the Files AI agent.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation history cleared',
  })
  async clearAIConversationHistory(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesAgentService.clearConversationHistory(workspaceId, userId);
  }

  @Get('ai/stats')
  @ApiOperation({
    summary: 'Get conversation statistics for the Files AI agent',
    description:
      'Returns statistics about the conversation between the user and the Files AI agent.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Conversation statistics',
  })
  async getAIConversationStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesAgentService.getConversationStats(workspaceId, userId);
  }

  // ============================================
  // FOLDER OPERATIONS
  // ============================================

  @Post('folders')
  @ApiOperation({ summary: 'Create a new folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Folder created successfully' })
  @ApiResponse({ status: 409, description: 'Folder name already exists' })
  async createFolder(
    @Param('workspaceId') workspaceId: string,
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.createFolder(workspaceId, createFolderDto, userId);
  }

  @Get('folders')
  @ApiOperation({ summary: 'Get folders in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'parent_id', required: false, description: 'Parent folder ID' })
  @ApiQuery({
    name: 'is_deleted',
    required: false,
    description: 'Filter by deleted status (true/false)',
    type: Boolean,
  })
  @ApiResponse({ status: 200, description: 'List of folders' })
  async getFolders(
    @Param('workspaceId') workspaceId: string,
    @Query('parent_id') parentId?: string,
    @Query('is_deleted') isDeleted?: string,
    @CurrentUser('sub') userId?: string,
  ) {
    const isDeletedBool = isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
    return this.filesService.getFolders(workspaceId, parentId, isDeletedBool, userId);
  }

  @Get('trash')
  @ApiOperation({
    summary: 'Get deleted items tree structure',
    description:
      'Returns a hierarchical tree structure of all deleted folders and files for rendering in trash view. Includes nested folders and files with their relationships preserved.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Hierarchical tree of deleted items with statistics',
    schema: {
      example: {
        items: [
          {
            id: 'folder-uuid',
            name: 'Deleted Folder',
            type: 'folder',
            deleted_at: '2025-10-15T08:00:00.000Z',
            deleted_by: 'user-id',
            children: [
              {
                id: 'subfolder-uuid',
                name: 'Subfolder',
                type: 'folder',
                children: [],
                files: [],
              },
            ],
            files: [
              {
                id: 'file-uuid',
                name: 'document.pdf',
                type: 'file',
                size: '1024',
                mime_type: 'application/pdf',
                deleted_at: '2025-10-15T08:00:00.000Z',
              },
            ],
          },
        ],
        stats: {
          total_deleted_folders: 5,
          total_deleted_files: 12,
          total_deleted_items: 17,
          total_size_bytes: 1048576,
          total_size_formatted: '1 MB',
        },
      },
    },
  })
  async getDeletedItemsTree(@Param('workspaceId') workspaceId: string) {
    return this.filesService.getDeletedItemsTree(workspaceId);
  }

  @Put('folders/:folderId')
  @ApiOperation({ summary: 'Update folder details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder updated successfully' })
  @ApiResponse({ status: 400, description: 'Folder name already exists' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async updateFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.updateFolder(folderId, workspaceId, updateFolderDto, userId);
  }

  @Put('batch-move-folders')
  @ApiOperation({
    summary: 'Move multiple folders',
    description:
      'Moves multiple folders to a target parent folder. Returns a detailed report of successful and failed move operations.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Multiple folders move report',
    schema: {
      example: {
        message: 'Successfully moved 3 folder(s)',
        moved_count: 3,
        failed_count: 0,
        success: [
          {
            folderId: 'folder-uuid-1',
            name: 'Project A',
          },
          {
            folderId: 'folder-uuid-2',
            name: 'Documents',
          },
        ],
        failed: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or cannot move into descendants' })
  async moveMultipleFolders(
    @Param('workspaceId') workspaceId: string,
    @Body() moveFoldersDto: MoveFoldersDto,
    @CurrentUser('sub') userId: string,
  ) {
    console.log('🔥 BATCH MOVE FOLDERS ENDPOINT HIT');
    return this.filesService.moveMultipleFolders(
      moveFoldersDto.folder_ids,
      workspaceId,
      moveFoldersDto.target_parent_id,
      userId,
    );
  }

  @Put('folders/:folderId/move')
  @ApiOperation({
    summary: 'Move or rename a folder',
    description:
      'Moves a folder to a different parent folder or to root (null parent_id). Can optionally rename the folder during the move.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({
    status: 200,
    description: 'Folder moved successfully',
    schema: {
      example: {
        id: 'folder-uuid',
        name: 'My Folder',
        parent_id: 'new-parent-uuid',
        updated_at: '2025-10-15T08:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot move folder into itself or its descendants, or folder name already exists',
  })
  @ApiResponse({ status: 404, description: 'Folder or target parent folder not found' })
  async moveFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Body() moveFolderDto: MoveFolderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.moveFolder(folderId, workspaceId, moveFolderDto, userId);
  }

  @Delete('folders/:folderId')
  @ApiOperation({ summary: 'Delete a folder' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder deleted successfully' })
  @ApiResponse({ status: 400, description: 'Folder contains files or subfolders' })
  async deleteFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteFolder(folderId, workspaceId, userId);
  }

  @Delete('folders/:folderId/recursive')
  @ApiOperation({
    summary: 'Delete a folder recursively',
    description:
      'Soft deletes a folder and all its contents including subfolders and files. Sets is_deleted=true for all affected records.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID' })
  @ApiResponse({ status: 200, description: 'Folder and all contents deleted successfully' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async deleteFolderRecursive(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteFolderRecursive(folderId, workspaceId, userId);
  }

  @Post('folders/:folderId/restore')
  @ApiOperation({
    summary: 'Restore a deleted folder recursively',
    description:
      'Restores a deleted folder and all its contents including subfolders and files. Sets is_deleted=false for all affected records.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Deleted folder ID' })
  @ApiResponse({
    status: 200,
    description: 'Folder and all contents restored successfully',
    schema: {
      example: {
        message: 'Folder and all contents restored successfully',
        restored_folders_count: 5,
        restored_files_count: 12,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Deleted folder not found' })
  async restoreFolderRecursive(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.restoreFolderRecursive(folderId, workspaceId, userId);
  }

  @Delete('folders')
  @ApiOperation({
    summary: 'Delete multiple folders recursively',
    description:
      'Soft deletes multiple folders and all their contents. Returns a detailed report of successful and failed deletions.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Multiple folders deletion report',
    schema: {
      example: {
        message: 'Successfully deleted 3 folder(s) and their contents',
        deleted_folders_count: 8,
        deleted_files_count: 24,
        deleted_at: '2025-11-04T10:30:00.000Z',
        success: [
          {
            folderId: 'folder-uuid-1',
            folders_deleted: 3,
            files_deleted: 10,
          },
          {
            folderId: 'folder-uuid-2',
            folders_deleted: 5,
            files_deleted: 14,
          },
        ],
        failed: [
          {
            folderId: 'folder-uuid-3',
            reason: 'You do not have permission to delete this folder',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async deleteMultipleFolders(
    @Param('workspaceId') workspaceId: string,
    @Body() deleteFoldersDto: DeleteFoldersDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteMultipleFolders(
      deleteFoldersDto.folder_ids,
      workspaceId,
      userId,
    );
  }

  // ============================================
  // FILE UPLOAD & MANAGEMENT
  // ============================================

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Storage quota exceeded or invalid file' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_UPLOAD_SIZE,
      },
    })
  )
  async uploadFile(
    @Param('workspaceId') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }
    return this.filesService.uploadFile(workspaceId, file, uploadFileDto, userId);
  }

  @Post('upload/multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Storage quota exceeded or invalid files' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Allow up to 10 files
  async uploadMultipleFiles(
    @Param('workspaceId') workspaceId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }
    return this.filesService.uploadMultipleFiles(workspaceId, files, uploadFileDto, userId);
  }

  @Post('add-by-url')
  @ApiOperation({
    summary: 'Add file by URL',
    description:
      'Add a file to the workspace using a direct URL instead of uploading. Useful for AI-generated files or external file references.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'File added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid URL or file data' })
  @ApiResponse({ status: 404, description: 'Folder not found' })
  async addFileByUrl(
    @Param('workspaceId') workspaceId: string,
    @Body() addFileByUrlDto: AddFileByUrlDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.addFileByUrl(workspaceId, addFileByUrlDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get files in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'folder_id', required: false, description: 'Folder ID to filter by' })
  @ApiQuery({
    name: 'is_deleted',
    required: false,
    description: 'Filter by deleted status (true/false)',
    type: Boolean,
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 50 })
  @ApiResponse({ status: 200, description: 'List of files' })
  async getFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('folder_id') folderId?: string,
    @Query('is_deleted') isDeleted?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    const isDeletedBool = isDeleted === 'true' ? true : isDeleted === 'false' ? false : undefined;
    return this.filesService.getFiles(
      workspaceId,
      folderId,
      page || 1,
      limit || 50,
      isDeletedBool,
      userId,
    );
  }

  @Get('shared-with-me')
  @ApiOperation({ summary: 'Get files shared with current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of files shared with the user' })
  async getSharedWithMe(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getSharedWithMe(workspaceId, userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search files in workspace uploaded by current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiQuery({ name: 'mime_type', required: false, description: 'Filter by MIME type' })
  @ApiQuery({ name: 'uploaded_by', required: false, description: 'Filter by uploader user ID' })
  @ApiQuery({ name: 'date_from', required: false, description: 'Filter by date from' })
  @ApiQuery({ name: 'date_to', required: false, description: 'Filter by date to' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Search results for files uploaded by current user' })
  async searchFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('q') query: string,
    @Query('mime_type') mimeType?: string,
    @Query('uploaded_by') uploadedBy?: string,
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    const filters = {
      mime_type: mimeType,
      uploaded_by: uploadedBy,
      date_from: dateFrom,
      date_to: dateTo,
    };
    return this.filesService.searchFiles(
      workspaceId,
      query,
      filters,
      page || 1,
      limit || 50,
      userId,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get workspace storage statistics' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Storage statistics' })
  async getStorageStats(@Param('workspaceId') workspaceId: string) {
    return this.filesService.getStorageStats(workspaceId);
  }

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Get comprehensive dashboard statistics',
    description:
      'Returns hybrid statistics: workspace-wide storage (all users see same total) + user-specific file counts (images, documents, etc. uploaded by current user)',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics with workspace storage and user file counts',
    type: DashboardStatsResponseDto,
  })
  async getDashboardStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId?: string,
  ) {
    // Storage: workspace-wide, File counts: user-specific
    return this.filesService.getDashboardStats(workspaceId, userId);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recently accessed files uploaded by current user' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of recent files to return',
    example: 100,
  })
  @ApiResponse({
    status: 200,
    description: 'List of recently accessed files uploaded by current user',
  })
  async getRecentFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    return this.filesService.getRecentFiles(workspaceId, userId, limit || 100);
  }

  @Get('starred')
  @ApiOperation({ summary: 'Get starred files in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 50 })
  @ApiResponse({ status: 200, description: 'List of starred files' })
  async getStarredFiles(
    @Param('workspaceId') workspaceId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.filesService.getStarredFiles(workspaceId, page || 1, limit || 50);
  }

  @Get('by-type')
  @ApiOperation({
    summary: 'Get files filtered by type (uploaded by current user)',
    description:
      'Filter files by category (documents, images, videos, etc.), MIME type, or file extension. Returns only files uploaded by the current user.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: FileCategory,
    description: 'File category to filter by',
  })
  @ApiQuery({ name: 'mime_type', required: false, description: 'Specific MIME type to filter by' })
  @ApiQuery({
    name: 'extension',
    required: false,
    description: 'File extension to filter by (e.g., pdf, jpg)',
  })
  @ApiQuery({ name: 'folder_id', required: false, description: 'Folder ID to filter within' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number', example: 1 })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page', example: 50 })
  @ApiResponse({
    status: 200,
    description: 'Filtered list of files by type uploaded by current user',
  })
  async getFilesByType(
    @Param('workspaceId') workspaceId: string,
    @Query('category') category?: FileCategory,
    @Query('mime_type') mime_type?: string,
    @Query('extension') extension?: string,
    @Query('folder_id') folder_id?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    const filterDto: FilterFilesByTypeDto = {
      category,
      mime_type,
      extension,
      folder_id,
      page: page || 1,
      limit: limit || 50,
    };
    return this.filesService.getFilesByType(workspaceId, filterDto, userId);
  }

  @Get(':fileId/download')
  @ApiOperation({ summary: 'Download a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const fileData = await this.filesService.downloadFile(fileId, workspaceId, userId);

    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
    });

    return new StreamableFile(fileData.content);
  }

  @Get(':fileId/shares')
  @ApiOperation({ summary: 'Get all share links for a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'List of share links' })
  async getFileShares(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getFileShares(fileId, workspaceId, userId);
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File details' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getFile(fileId, workspaceId, userId);
  }

  @Put('batch-move')
  @ApiOperation({
    summary: 'Move multiple files',
    description:
      'Moves multiple files to a target folder. Returns a detailed report of successful and failed move operations.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Multiple files move report',
    schema: {
      example: {
        message: 'Successfully moved 3 file(s)',
        moved_count: 3,
        failed_count: 0,
        success: [
          {
            fileId: 'file-uuid-1',
            name: 'document.pdf',
          },
          {
            fileId: 'file-uuid-2',
            name: 'image.jpg',
          },
        ],
        failed: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async moveMultipleFiles(
    @Param('workspaceId') workspaceId: string,
    @Body() moveFilesDto: MoveFilesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.moveMultipleFiles(
      moveFilesDto.file_ids,
      workspaceId,
      moveFilesDto.target_folder_id,
      userId,
    );
  }

  @Put(':fileId/move')
  @ApiOperation({ summary: 'Move or rename a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File moved successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async moveFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() moveFileDto: MoveFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.moveFile(fileId, workspaceId, moveFileDto, userId);
  }

  @Put(':fileId')
  @ApiOperation({
    summary: 'Update file details',
    description:
      'Update file name, description, tags, starred status, or mark file as accessed (updates last_opened_at timestamp)',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File updated successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async updateFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() updateFileDto: UpdateFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.updateFile(fileId, workspaceId, updateFileDto, userId);
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteFile(fileId, workspaceId, userId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Delete multiple files',
    description:
      'Soft deletes multiple files at once. Returns a detailed report of successful and failed deletions.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Multiple files deletion report',
    schema: {
      example: {
        message: 'Successfully deleted 3 file(s)',
        deleted_count: 3,
        failed_count: 1,
        deleted_at: '2025-11-04T10:30:00.000Z',
        success: ['file-uuid-1', 'file-uuid-2', 'file-uuid-3'],
        failed: [
          {
            fileId: 'file-uuid-4',
            reason: 'You do not have permission to delete this file',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async deleteMultipleFiles(
    @Param('workspaceId') workspaceId: string,
    @Body() deleteFilesDto: DeleteFilesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteMultipleFiles(deleteFilesDto.file_ids, workspaceId, userId);
  }

  @Post(':fileId/restore')
  @ApiOperation({
    summary: 'Restore a deleted file',
    description:
      'Restores a deleted file. The file will be restored to its original folder if the folder still exists and is not deleted.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'Deleted file ID' })
  @ApiResponse({
    status: 200,
    description: 'File restored successfully',
    schema: {
      example: {
        message: 'File restored successfully',
        file: {
          id: 'file-uuid',
          name: 'document.pdf',
          folder_id: 'folder-uuid',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Parent folder is deleted' })
  @ApiResponse({ status: 404, description: 'Deleted file not found' })
  async restoreFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.restoreFile(fileId, workspaceId, userId);
  }

  // ============================================
  // FILE & FOLDER COPY OPERATIONS
  // ============================================

  @Post(':fileId/copy')
  @ApiOperation({
    summary: 'Copy a file',
    description:
      'Creates a duplicate of the file with a new name and/or in a different folder. The actual file content is also copied to storage.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID to copy' })
  @ApiResponse({ status: 201, description: 'File copied successfully' })
  @ApiResponse({ status: 400, description: 'Storage quota exceeded or copy failed' })
  @ApiResponse({ status: 404, description: 'File or target folder not found' })
  async copyFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() copyFileDto: CopyFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.copyFile(fileId, workspaceId, copyFileDto, userId);
  }

  @Post('copy')
  @ApiOperation({
    summary: 'Copy multiple files',
    description:
      'Copies multiple files to a target folder. Returns a detailed report of successful and failed copy operations.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Multiple files copy report',
    schema: {
      example: {
        message: 'Successfully copied 3 file(s)',
        copied_count: 3,
        failed_count: 0,
        success: [
          {
            fileId: 'file-uuid-1',
            newFileId: 'new-file-uuid-1',
            name: 'document (Copy).pdf',
          },
          {
            fileId: 'file-uuid-2',
            newFileId: 'new-file-uuid-2',
            name: 'image (Copy).jpg',
          },
        ],
        failed: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or storage quota exceeded' })
  async copyMultipleFiles(
    @Param('workspaceId') workspaceId: string,
    @Body() copyFilesDto: CopyFilesDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.copyMultipleFiles(
      copyFilesDto.file_ids,
      workspaceId,
      copyFilesDto.target_folder_id,
      userId,
    );
  }

  @Post('folders/batch-copy')
  @ApiOperation({
    summary: 'Copy multiple folders recursively',
    description:
      'Copies multiple folders with all their contents. Returns a detailed report of successful and failed copy operations.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 201,
    description: 'Multiple folders copy report',
    schema: {
      example: {
        message: 'Successfully copied 3 folder(s)',
        copied_count: 3,
        failed_count: 0,
        success: [
          {
            folderId: 'folder-uuid-1',
            newFolderId: 'new-folder-uuid-1',
            name: 'Project A (Copy)',
          },
          {
            folderId: 'folder-uuid-2',
            newFolderId: 'new-folder-uuid-2',
            name: 'Documents (Copy)',
          },
        ],
        failed: [],
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid request or cannot copy into descendants' })
  async copyMultipleFolders(
    @Param('workspaceId') workspaceId: string,
    @Body() copyFoldersDto: CopyFoldersDto,
    @CurrentUser('sub') userId: string,
  ) {
    console.log('🔥 BATCH COPY FOLDERS ENDPOINT HIT');
    return this.filesService.copyMultipleFolders(
      copyFoldersDto.folder_ids,
      workspaceId,
      copyFoldersDto.target_parent_id,
      userId,
    );
  }

  @Post('folders/:folderId/copy')
  @ApiOperation({
    summary: 'Copy a folder recursively',
    description:
      'Creates a duplicate of the folder including all subfolders and files. All file contents are also copied to storage.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'folderId', description: 'Folder ID to copy' })
  @ApiResponse({ status: 201, description: 'Folder copied successfully with all contents' })
  @ApiResponse({
    status: 400,
    description: 'Cannot copy folder into itself or storage quota exceeded',
  })
  @ApiResponse({ status: 404, description: 'Folder or target parent folder not found' })
  async copyFolder(
    @Param('workspaceId') workspaceId: string,
    @Param('folderId') folderId: string,
    @Body() copyFolderDto: CopyFolderDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.copyFolder(folderId, workspaceId, copyFolderDto, userId);
  }

  // ============================================
  // FILE SHARING
  // ============================================

  @Post(':fileId/share')
  @ApiOperation({ summary: 'Create a share link for a file' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 201, description: 'Share link created successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async shareFile(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() shareFileDto: ShareFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.shareFile(fileId, workspaceId, shareFileDto, userId);
  }

  @Delete('shares/:shareId')
  @ApiOperation({ summary: 'Revoke a file share link' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'shareId', description: 'Share ID' })
  @ApiResponse({ status: 200, description: 'Share link revoked successfully' })
  @ApiResponse({ status: 403, description: 'Permission denied' })
  async revokeFileShare(@Param('shareId') shareId: string, @CurrentUser('sub') userId: string) {
    return this.filesService.revokeFileShare(shareId, userId);
  }

  // ============================================
  // PUBLIC LINK SHARING (Google Drive style)
  // ============================================

  @Post(':fileId/share-link')
  @ApiOperation({
    summary: 'Create a public share link for a file',
    description:
      'Creates a shareable link that anyone can use to access the file. Supports password protection, expiration dates, and download limits.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 201,
    description: 'Share link created successfully',
    schema: {
      example: {
        id: 'share-uuid',
        fileId: 'file-uuid',
        shareToken: 'abc123xyz...',
        shareUrl: 'http://localhost:5175/shared/abc123xyz...',
        accessLevel: 'view',
        hasPassword: false,
        expiresAt: null,
        maxDownloads: null,
        downloadCount: 0,
        viewCount: 0,
        isActive: true,
        createdAt: '2025-12-30T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async createShareLink(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() createShareLinkDto: CreateShareLinkDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.createShareLink(fileId, workspaceId, createShareLinkDto, userId);
  }

  @Get(':fileId/share-links')
  @ApiOperation({
    summary: 'Get all share links for a file',
    description: 'Returns all active share links created for this file.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'List of share links for the file' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileShareLinks(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getFileShareLinks(fileId, workspaceId, userId);
  }

  @Get('share-links/:shareId')
  @ApiOperation({
    summary: 'Get share link details',
    description: 'Returns detailed information about a specific share link.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'shareId', description: 'Share link ID' })
  @ApiResponse({ status: 200, description: 'Share link details' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async getShareLink(@Param('shareId') shareId: string, @CurrentUser('sub') userId: string) {
    return this.filesService.getShareLink(shareId, userId);
  }

  @Put('share-links/:shareId')
  @ApiOperation({
    summary: 'Update share link settings',
    description: 'Update access level, password, expiration, download limits, or disable the link.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'shareId', description: 'Share link ID' })
  @ApiResponse({ status: 200, description: 'Share link updated successfully' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async updateShareLink(
    @Param('shareId') shareId: string,
    @Body() updateShareLinkDto: UpdateShareLinkDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.updateShareLink(shareId, updateShareLinkDto, userId);
  }

  @Delete('share-links/:shareId')
  @ApiOperation({
    summary: 'Delete a share link',
    description:
      'Permanently removes the share link. Anyone with the link will no longer be able to access the file.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'shareId', description: 'Share link ID' })
  @ApiResponse({ status: 200, description: 'Share link deleted successfully' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async deleteShareLink(@Param('shareId') shareId: string, @CurrentUser('sub') userId: string) {
    return this.filesService.deleteShareLink(shareId, userId);
  }

  // ============================================
  // FILE COMMENTS
  // ============================================

  @Get(':fileId/comments')
  @ApiOperation({
    summary: 'Get all comments for a file',
    description: 'Returns all comments for a file organized in threads with author information.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [FileCommentResponseDto],
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async getFileComments(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getFileComments(workspaceId, fileId, userId);
  }

  @Post(':fileId/comments')
  @ApiOperation({
    summary: 'Add a comment to a file',
    description: 'Creates a new comment on a file. Can also be a reply to an existing comment.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: FileCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File or parent comment not found' })
  async createComment(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: CreateFileCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.createComment(workspaceId, fileId, dto, userId);
  }

  @Get(':fileId/comments/:commentId')
  @ApiOperation({
    summary: 'Get a specific comment',
    description: 'Returns a single comment with author information.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment retrieved successfully',
    type: FileCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File or comment not found' })
  async getComment(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getComment(workspaceId, fileId, commentId, userId);
  }

  @Put(':fileId/comments/:commentId')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Updates the content of a comment. Only the comment author can edit.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: FileCommentResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Not authorized to edit this comment' })
  @ApiResponse({ status: 404, description: 'File or comment not found' })
  async updateComment(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateFileCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.updateComment(workspaceId, fileId, commentId, dto, userId);
  }

  @Delete(':fileId/comments/:commentId')
  @ApiOperation({
    summary: 'Delete a comment',
    description:
      'Soft deletes a comment and all its replies. Only the comment author or file owner can delete.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete this comment' })
  @ApiResponse({ status: 404, description: 'File or comment not found' })
  async deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.deleteComment(workspaceId, fileId, commentId, userId);
  }

  @Put(':fileId/comments/:commentId/resolve')
  @ApiOperation({
    summary: 'Resolve or unresolve a comment',
    description: 'Marks a comment as resolved or unresolved. Useful for tracking feedback.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment resolve status updated',
    type: FileCommentResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File or comment not found' })
  async resolveComment(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @Body() dto: ResolveCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.resolveComment(
      workspaceId,
      fileId,
      commentId,
      dto.is_resolved,
      userId,
    );
  }

  // ============================================
  // OFFLINE FILES OPERATIONS
  // ============================================

  @Post(':fileId/offline')
  @ApiOperation({
    summary: 'Mark file for offline access',
    description:
      'Marks a file to be available offline. The client will download and cache the file locally.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 201,
    description: 'File marked for offline access',
    type: OfflineFileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  async markFileOffline(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: MarkFileOfflineDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.markFileOffline(workspaceId, fileId, userId, dto);
  }

  @Delete(':fileId/offline')
  @ApiOperation({
    summary: 'Remove file from offline access',
    description: 'Removes a file from offline access. The client should delete the local cache.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File removed from offline access' })
  async removeFileOffline(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.removeFileOffline(workspaceId, fileId, userId);
  }

  @Get('offline')
  @ApiOperation({
    summary: 'Get all offline files',
    description:
      'Returns all files marked for offline access by the current user in this workspace.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'List of offline files',
    type: [OfflineFileResponseDto],
  })
  async getOfflineFiles(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getOfflineFiles(workspaceId, userId);
  }

  @Get('offline/stats')
  @ApiOperation({
    summary: 'Get offline storage statistics',
    description:
      'Returns statistics about offline files including total count, size, and sync status breakdown.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'Offline storage statistics',
    type: OfflineStorageStatsDto,
  })
  async getOfflineStorageStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getOfflineStorageStats(workspaceId, userId);
  }

  @Get('offline/needs-sync')
  @ApiOperation({
    summary: 'Get files needing sync',
    description:
      'Returns files that have auto-sync enabled and have updates available on the server.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'List of files needing sync',
    type: [OfflineFileResponseDto],
  })
  async getFilesNeedingSync(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getFilesNeedingSync(workspaceId, userId);
  }

  @Get(':fileId/offline')
  @ApiOperation({
    summary: 'Get offline status for a file',
    description: 'Returns the offline status and sync information for a specific file.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'File offline status' })
  async getOfflineStatus(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.getOfflineStatus(workspaceId, fileId, userId);
  }

  @Put(':fileId/offline')
  @ApiOperation({
    summary: 'Update offline file settings',
    description:
      'Updates settings for an offline file such as auto-sync, priority, or sync status.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({
    status: 200,
    description: 'Offline settings updated',
    type: OfflineFileResponseDto,
  })
  @ApiResponse({ status: 404, description: 'File is not marked for offline access' })
  async updateOfflineSettings(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @Body() dto: UpdateOfflineSettingsDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.updateOfflineSettings(workspaceId, fileId, userId, dto);
  }

  @Get(':fileId/offline/check-update')
  @ApiOperation({
    summary: 'Check if file has updates',
    description:
      'Compares server version with locally synced version to determine if an update is available.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'fileId', description: 'File ID' })
  @ApiResponse({ status: 200, description: 'Update check result', type: CheckUpdateResponseDto })
  @ApiResponse({ status: 404, description: 'File is not marked for offline access' })
  async checkFileUpdate(
    @Param('workspaceId') workspaceId: string,
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.checkFileUpdate(workspaceId, fileId, userId);
  }

  @Post('offline/sync-status')
  @ApiOperation({
    summary: 'Batch update sync status',
    description:
      'Updates sync status for multiple files at once. Used by client after syncing files.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Batch update results' })
  async batchUpdateSyncStatus(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: BatchUpdateSyncStatusDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.batchUpdateSyncStatus(workspaceId, userId, dto.updates);
  }
}

// ============================================
// PUBLIC SHARE ACCESS (No Auth Required)
// ============================================

@ApiTags('shared-files')
@Controller('shared')
export class SharedFilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':shareToken')
  @ApiOperation({
    summary: 'Access a shared file via public link',
    description:
      'Returns file information for a shared link. If password protected, returns requiresPassword: true.',
  })
  @ApiParam({ name: 'shareToken', description: 'Share token from the share URL' })
  @ApiQuery({ name: 'password', required: false, description: 'Password if the link is protected' })
  @ApiResponse({
    status: 200,
    description: 'Shared file details',
    schema: {
      example: {
        requiresPassword: false,
        file: {
          id: 'file-uuid',
          name: 'document.pdf',
          size: 1024000,
          mimeType: 'application/pdf',
          previewUrl: 'https://storage.example.com/file.pdf',
          url: null,
          accessLevel: 'view',
          canDownload: false,
          sharedBy: {
            name: 'John Doe',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
          sharedAt: '2025-12-30T00:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Link expired, disabled, or download limit reached' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async accessSharedFile(
    @Param('shareToken') shareToken: string,
    @Query('password') password?: string,
  ) {
    return this.filesService.accessSharedFile(shareToken, password);
  }

  @Post(':shareToken/verify-password')
  @ApiOperation({
    summary: 'Verify password for a protected share link',
    description: 'Verifies the password and returns file details if correct.',
  })
  @ApiParam({ name: 'shareToken', description: 'Share token' })
  @ApiResponse({ status: 200, description: 'Password verified, file details returned' })
  @ApiResponse({ status: 400, description: 'Incorrect password' })
  async verifySharePassword(
    @Param('shareToken') shareToken: string,
    @Body() dto: VerifySharePasswordDto,
  ) {
    return this.filesService.accessSharedFile(shareToken, dto.password);
  }

  @Get(':shareToken/download')
  @ApiOperation({
    summary: 'Download a shared file',
    description: 'Downloads the file if the share link allows downloads. Updates download count.',
  })
  @ApiParam({ name: 'shareToken', description: 'Share token' })
  @ApiQuery({ name: 'password', required: false, description: 'Password if required' })
  @ApiResponse({ status: 200, description: 'File content stream' })
  @ApiResponse({ status: 400, description: 'Download not allowed or limit reached' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async downloadSharedFile(
    @Param('shareToken') shareToken: string,
    @Res({ passthrough: true }) res: Response,
    @Query('password') password?: string,
  ) {
    const fileData = await this.filesService.downloadSharedFile(shareToken, password);

    res.set({
      'Content-Type': fileData.mimeType,
      'Content-Disposition': `attachment; filename="${fileData.fileName}"`,
    });

    return new StreamableFile(fileData.content);
  }
}
