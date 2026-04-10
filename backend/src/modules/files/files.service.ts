import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';
import { AppGateway } from '../../common/gateways/app.gateway';
import { UploadFileDto, AddFileByUrlDto, CreateFolderDto, ShareFileDto, MoveFileDto, MoveFolderDto, UpdateFileDto, UpdateFolderDto, CopyFileDto, CopyFolderDto, FilterFilesByTypeDto, FileCategory, DashboardStatsResponseDto, CreateShareLinkDto, UpdateShareLinkDto, AccessLevel, CreateFileCommentDto, UpdateFileCommentDto, MarkFileOfflineDto, UpdateOfflineSettingsDto, SyncStatus } from './dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import axios from 'axios';

@Injectable()
export class FilesService {
  constructor(
    private readonly db: DatabaseService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => AppGateway))
    private appGateway: AppGateway,
  ) {}

  // ============================================
  // FOLDER OPERATIONS
  // ============================================

  async createFolder(workspaceId: string, createFolderDto: CreateFolderDto, userId: string) {
    // Check if folder name already exists in the same parent
    const existingFolders = await this.db.find('folders', {
      workspace_id: workspaceId,
      name: createFolderDto.name,
      parent_id: createFolderDto.parent_id || null,
      is_deleted: false
    });

    const existingFoldersData = Array.isArray(existingFolders.data) ? existingFolders.data : [];
    if (existingFoldersData.length > 0) {
      throw new BadRequestException('Folder with this name already exists in the same location');
    }

    const folderData = {
      workspace_id: workspaceId,
      name: createFolderDto.name,
      parent_id: createFolderDto.parent_id || null,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.db.insert('folders', folderData);
  }

  async getFolders(workspaceId: string, parentId?: string, isDeleted?: boolean, userId?: string) {
    const queryConditions: any = {
      workspace_id: workspaceId,
      parent_id: parentId || null,
    };

    // Only add is_deleted filter if explicitly provided
    if (isDeleted !== undefined) {
      queryConditions.is_deleted = isDeleted;
    } else {
      // Default to non-deleted folders if not specified
      queryConditions.is_deleted = false;
    }

    // Filter by created_by to only show folders created by the user
    if (userId) {
      queryConditions.created_by = userId;
    }

    const foldersQuery = await this.db.find('folders', queryConditions, { orderBy: 'name', order: 'asc' });

    return Array.isArray(foldersQuery.data) ? foldersQuery.data : [];
  }

  async deleteFolder(folderId: string, workspaceId: string, userId: string) {
    const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

    // Check if folder has children
    const childrenQuery = await this.db.find('folders', {
      parent_id: folderId,
      is_deleted: false
    });

    const filesQuery = await this.db.find('files', {
      parent_folder_ids: { $like: `%${folderId}%` },
      is_deleted: false
    });

    const childrenData = Array.isArray(childrenQuery.data) ? childrenQuery.data : [];
    const filesData = Array.isArray(filesQuery.data) ? filesQuery.data : [];
    if (childrenData.length > 0 || filesData.length > 0) {
      throw new BadRequestException('Cannot delete folder that contains files or subfolders');
    }

    // Soft delete folder
    return await this.db.update('folders', folderId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    });
  }

  async deleteFolderRecursive(folderId: string, workspaceId: string, userId: string) {
    const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

    const deletedAt = new Date().toISOString();

    // Recursively collect all subfolder IDs
    const allFolderIds = await this.collectAllSubfolderIds(folderId);

    // Include the parent folder
    allFolderIds.push(folderId);

    // Soft delete all folders
    for (const folderIdToDelete of allFolderIds) {
      await this.db.update('folders', folderIdToDelete, {
        is_deleted: true,
        deleted_at: deletedAt,
        deleted_by: userId
      });
    }

    // Soft delete all files in these folders
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Filter files that belong to any of the deleted folders
    const filesToDelete = allFilesData.filter(file =>
      file.workspace_id === workspaceId &&
      !file.is_deleted &&
      file.folder_id &&
      allFolderIds.includes(file.folder_id)
    );

    // Soft delete all files
    for (const file of filesToDelete) {
      await this.db.update('files', file.id, {
        is_deleted: true,
        deleted_at: deletedAt
      });
    }

    return {
      message: 'Folder and all contents deleted successfully',
      deleted_folders_count: allFolderIds.length,
      deleted_files_count: filesToDelete.length,
      deleted_at: deletedAt
    };
  }

  async deleteMultipleFolders(folderIds: string[], workspaceId: string, userId: string) {
    const deletedAt = new Date().toISOString();
    const results = {
      success: [] as Array<{ folderId: string; folders_deleted: number; files_deleted: number }>,
      failed: [] as Array<{ folderId: string; reason: string }>
    };

    let totalFoldersDeleted = 0;
    let totalFilesDeleted = 0;

    // Get workspace membership once for permission checking
    const membership = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true
    });

    const isAdmin = membership && (membership.role === 'admin' || membership.role === 'owner');

    // Process each folder
    for (const folderId of folderIds) {
      try {
        // Get folder with access check
        const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

        // Check if user has delete permissions
        if (folder.created_by !== userId && !isAdmin) {
          results.failed.push({
            folderId,
            reason: 'You do not have permission to delete this folder'
          });
          continue;
        }

        // Recursively collect all subfolder IDs
        const allFolderIds = await this.collectAllSubfolderIds(folderId);

        // Include the parent folder
        allFolderIds.push(folderId);

        // Soft delete all folders
        for (const folderIdToDelete of allFolderIds) {
          await this.db.update('folders', folderIdToDelete, {
            is_deleted: true,
            deleted_at: deletedAt,
            deleted_by: userId
          });
        }

        // Soft delete all files in these folders
        const allFilesResult = await this.db.find('files', {});
        const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

        // Filter files that belong to any of the deleted folders
        const filesToDelete = allFilesData.filter(file =>
          file.workspace_id === workspaceId &&
          !file.is_deleted &&
          file.folder_id &&
          allFolderIds.includes(file.folder_id)
        );

        // Soft delete all files
        for (const file of filesToDelete) {
          await this.db.update('files', file.id, {
            is_deleted: true,
            deleted_at: deletedAt
          });
        }

        totalFoldersDeleted += allFolderIds.length;
        totalFilesDeleted += filesToDelete.length;

        results.success.push({
          folderId,
          folders_deleted: allFolderIds.length,
          files_deleted: filesToDelete.length
        });
      } catch (error) {
        results.failed.push({
          folderId,
          reason: error.message || 'Failed to delete folder'
        });
      }
    }

    return {
      message: `Successfully deleted ${results.success.length} folder(s) and their contents`,
      deleted_folders_count: totalFoldersDeleted,
      deleted_files_count: totalFilesDeleted,
      deleted_at: deletedAt,
      success: results.success,
      failed: results.failed
    };
  }

  private async collectAllSubfolderIds(parentFolderId: string): Promise<string[]> {
    const subfolderIds: string[] = [];

    // Get immediate children
    const childrenQuery = await this.db.find('folders', {
      parent_id: parentFolderId,
      is_deleted: false
    });

    const children = Array.isArray(childrenQuery.data) ? childrenQuery.data : [];

    for (const child of children) {
      subfolderIds.push(child.id);

      // Recursively get children of this subfolder
      const descendantIds = await this.collectAllSubfolderIds(child.id);
      subfolderIds.push(...descendantIds);
    }

    return subfolderIds;
  }

  private async collectAllDeletedSubfolderIds(parentFolderId: string): Promise<string[]> {
    const subfolderIds: string[] = [];

    // Get immediate deleted children
    const childrenQuery = await this.db.find('folders', {
      parent_id: parentFolderId,
      is_deleted: true
    });

    const children = Array.isArray(childrenQuery.data) ? childrenQuery.data : [];

    for (const child of children) {
      subfolderIds.push(child.id);

      // Recursively get children of this subfolder
      const descendantIds = await this.collectAllDeletedSubfolderIds(child.id);
      subfolderIds.push(...descendantIds);
    }

    return subfolderIds;
  }

  async restoreFolderRecursive(folderId: string, workspaceId: string, userId: string) {
    // Get the deleted folder
    const folderQuery = await this.db.find('folders', {
      id: folderId,
      workspace_id: workspaceId,
      is_deleted: true
    });

    const folderData = Array.isArray(folderQuery.data) ? folderQuery.data : [];
    if (folderData.length === 0) {
      throw new NotFoundException('Deleted folder not found');
    }

    const folder = folderData[0];

    // Recursively collect all deleted subfolder IDs
    const allSubfolderIds = await this.collectAllDeletedSubfolderIds(folderId);

    // Include the parent folder
    const allFolderIds = [folderId, ...allSubfolderIds];

    // Restore all folders
    for (const folderIdToRestore of allFolderIds) {
      await this.db.update('folders', folderIdToRestore, {
        is_deleted: false,
        deleted_at: null,
        deleted_by: null
      });
    }

    // Restore all files in these folders
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Filter files that belong to any of the restored folders
    const filesToRestore = allFilesData.filter(file =>
      file.workspace_id === workspaceId &&
      file.is_deleted === true &&
      file.folder_id &&
      allFolderIds.includes(file.folder_id)
    );

    // Restore all files
    for (const file of filesToRestore) {
      await this.db.update('files', file.id, {
        is_deleted: false,
        deleted_at: null
      });
    }

    return {
      message: 'Folder and all contents restored successfully',
      restored_folders_count: allFolderIds.length,
      restored_files_count: filesToRestore.length
    };
  }

  async restoreFile(fileId: string, workspaceId: string, userId: string) {
    // Get the deleted file
    const fileQuery = await this.db.find('files', {
      id: fileId,
      workspace_id: workspaceId,
      is_deleted: true
    });

    const fileData = Array.isArray(fileQuery.data) ? fileQuery.data : [];
    if (fileData.length === 0) {
      throw new NotFoundException('Deleted file not found');
    }

    const file = fileData[0];

    // Check if parent folder exists and is not deleted
    if (file.folder_id) {
      const folderQuery = await this.db.find('folders', {
        id: file.folder_id,
        workspace_id: workspaceId
      });

      const folderData = Array.isArray(folderQuery.data) ? folderQuery.data : [];
      if (folderData.length === 0 || folderData[0].is_deleted) {
        throw new BadRequestException(
          'Cannot restore file: parent folder is deleted. Please restore the folder first or the file will be restored to root.'
        );
      }
    }

    // Restore the file
    await this.db.update('files', fileId, {
      is_deleted: false,
      deleted_at: null
    });

    return {
      message: 'File restored successfully',
      file: {
        id: file.id,
        name: file.name,
        folder_id: file.folder_id
      }
    };
  }

  async updateFolder(folderId: string, workspaceId: string, updateFolderDto: UpdateFolderDto, userId: string) {
    const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

    // If updating name, check if new name already exists in the same location
    if (updateFolderDto.name && updateFolderDto.name !== folder.name) {
      const existingFolders = await this.db.find('folders', {
        workspace_id: workspaceId,
        name: updateFolderDto.name,
        parent_id: folder.parent_id || null,
        is_deleted: false
      });

      const existingFoldersData = Array.isArray(existingFolders.data) ? existingFolders.data : [];
      // Filter out the current folder from the results
      const duplicates = existingFoldersData.filter(f => f.id !== folderId);
      if (duplicates.length > 0) {
        throw new BadRequestException('Folder with this name already exists in the same location');
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateFolderDto.name) {
      updateData.name = updateFolderDto.name;
    }

    return await this.db.update('folders', folderId, updateData);
  }

  // ============================================
  // FILE OPERATIONS
  // ============================================

  async uploadFile(workspaceId: string, file: Express.Multer.File, uploadFileDto: UploadFileDto, userId: string) {
    try {
      // Check workspace storage limits
      await this.checkStorageQuota(workspaceId, file.size);

      // Generate unique storage path
      const fileExtension = file.originalname.split('.').pop();
      const fileName = file.originalname;
      const storagePath = `workspaces/${workspaceId}/files/${Date.now()}-${uuidv4()}.${fileExtension}`;

      // Upload to storage service
      const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile('files', file.buffer, storagePath, {
        contentType: file.mimetype
      });

      // Extract public URL string from upload result
      let publicUrl = uploadResult.url;
      if (typeof publicUrl === 'object' && publicUrl !== null && publicUrl.publicUrl) {
        publicUrl = publicUrl.publicUrl;
      }

      // Calculate file hash for deduplication
      const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');

      // Process tags - handle both string (comma-separated) and array formats
      let tagsArray: string[] = [];
      if (uploadFileDto.tags) {
        if (typeof uploadFileDto.tags === 'string') {
          tagsArray = uploadFileDto.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(uploadFileDto.tags)) {
          tagsArray = uploadFileDto.tags;
        }
      }

      const fileData = {
        workspace_id: workspaceId,
        name: fileName,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: file.mimetype,
        size: file.size.toString(),
        uploaded_by: userId,
        folder_id: uploadFileDto.parent_folder_id || null,
        parent_folder_ids: uploadFileDto.parent_folder_id ? [uploadFileDto.parent_folder_id] : [],
        file_hash: fileHash,
        is_ai_generated: false,
        metadata: {
          original_name: file.originalname,
          description: uploadFileDto.description,
          tags: tagsArray
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createdFile = await this.db.insert('files', fileData);

      return {
        ...createdFile,
        url: publicUrl
      };
    } catch (error) {
      console.error('File upload error:', error);
      throw new BadRequestException('Failed to upload file: ' + error.message);
    }
  }

  async uploadMultipleFiles(workspaceId: string, files: Express.Multer.File[], uploadFileDto: UploadFileDto, userId: string) {
    const results = [];
    const errors = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(workspaceId, file, uploadFileDto, userId);
        results.push(result);
      } catch (error) {
        errors.push({
          filename: file.originalname,
          error: error.message
        });
      }
    }

    return {
      success: results,
      errors: errors,
      totalUploaded: results.length,
      totalFailed: errors.length
    };
  }

  async addFileByUrl(workspaceId: string, addFileByUrlDto: AddFileByUrlDto, userId: string) {
    try {
      // Validate that workspace_id in DTO matches the route parameter
      if (addFileByUrlDto.workspace_id !== workspaceId) {
        throw new BadRequestException('Workspace ID mismatch');
      }

      // Validate that the folder exists if folder_id is provided
      if (addFileByUrlDto.folder_id) {
        const folderResult = await this.db.find('folders', {
          id: addFileByUrlDto.folder_id,
          workspace_id: workspaceId,
          is_deleted: false
        });
        const folderData = Array.isArray(folderResult.data) ? folderResult.data : [];
        if (folderData.length === 0) {
          throw new NotFoundException('Folder not found');
        }
      }

      // Check if file with same name already exists in the same folder
      const existingFiles = await this.db.find('files', {
        workspace_id: workspaceId,
        name: addFileByUrlDto.name,
        folder_id: addFileByUrlDto.folder_id || null,
        is_deleted: false
      });
      const existingFilesData = Array.isArray(existingFiles.data) ? existingFiles.data : [];
      if (existingFilesData.length > 0) {
        throw new BadRequestException('File with this name already exists in the same location');
      }

      // Process tags - handle both string (comma-separated) and array formats
      let tagsArray: string[] = [];
      if (addFileByUrlDto.tags) {
        if (typeof addFileByUrlDto.tags === 'string') {
          tagsArray = addFileByUrlDto.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        } else if (Array.isArray(addFileByUrlDto.tags)) {
          tagsArray = addFileByUrlDto.tags;
        }
      }

      // Generate storage path if not provided
      const storagePath = addFileByUrlDto.storage_path || `workspaces/${workspaceId}/files/${Date.now()}-${uuidv4()}-${addFileByUrlDto.name}`;

      const fileData = {
        workspace_id: workspaceId,
        name: addFileByUrlDto.name,
        storage_path: storagePath,
        url: addFileByUrlDto.url,
        mime_type: addFileByUrlDto.mime_type || 'application/octet-stream',
        size: addFileByUrlDto.size?.toString() || '0',
        uploaded_by: userId,
        folder_id: addFileByUrlDto.folder_id || null,
        parent_folder_ids: addFileByUrlDto.folder_id ? [addFileByUrlDto.folder_id] : [],
        file_hash: addFileByUrlDto.file_hash || null,
        is_ai_generated: addFileByUrlDto.is_ai_generated || false,
        virus_scan_status: 'pending',
        metadata: {
          description: addFileByUrlDto.description,
          tags: tagsArray,
          is_public: addFileByUrlDto.is_public || false,
          source: 'url',
          ...(addFileByUrlDto.metadata || {})
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const createdFile = await this.db.insert('files', fileData);

      return {
        ...createdFile,
        url: addFileByUrlDto.url
      };
    } catch (error) {
      console.error('Add file by URL error:', error);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to add file: ' + error.message);
    }
  }

  async getFiles(workspaceId: string, folderId?: string, page = 1, limit = 50, isDeleted?: boolean, userId?: string) {
    const offset = (page - 1) * limit;

    // Using workaround pattern for complex queries
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Apply workspace filter
    let files = allFilesData.filter(f => f.workspace_id === workspaceId);

    // Filter by uploaded_by to only show files uploaded by the user
    if (userId) {
      files = files.filter(f => f.uploaded_by === userId);
    }

    // Apply is_deleted filter
    if (isDeleted !== undefined) {
      files = files.filter(f => f.is_deleted === isDeleted);
    } else {
      // Default to non-deleted files if not specified
      files = files.filter(f => !f.is_deleted);
    }

    // Helper to parse parent_folder_ids (may be string or array)
    const parseParentFolderIds = (ids: any): string[] => {
      if (!ids) return [];
      if (Array.isArray(ids)) return ids;
      if (typeof ids === 'string') {
        try {
          const parsed = JSON.parse(ids);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Filter by folder
    if (folderId) {
      files = files.filter(f => {
        const parentIds = parseParentFolderIds(f.parent_folder_ids);
        return parentIds.includes(folderId);
      });
    } else {
      // Show files in root (no parent folder)
      files = files.filter(f => {
        const parentIds = parseParentFolderIds(f.parent_folder_ids);
        return parentIds.length === 0;
      });
    }

    // Sort and paginate
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const paginatedFiles = files.slice(offset, offset + limit);

    return {
      data: paginatedFiles,
      total: files.length,
      page,
      limit
    };
  }

  async getFile(fileId: string, workspaceId: string, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    // Update last opened tracking
    await this.db.update('files', fileId, {
      last_opened_at: new Date().toISOString(),
      last_opened_by: userId,
      open_count: (file.open_count || 0) + 1
    });

    // Use the existing URL from database, or generate a new public URL if needed
    let fileUrl = file.url;
    if (!fileUrl && file.storage_path) {
      const publicUrlResult = await /* TODO: use StorageService */ this.db.getPublicUrl('files', file.storage_path);
      // getPublicUrl returns { publicUrl: string }, extract the string
      fileUrl = typeof publicUrlResult === 'object' && publicUrlResult?.publicUrl
        ? publicUrlResult.publicUrl
        : publicUrlResult;
    }

    return {
      ...file,
      url: fileUrl
    };
  }

  async downloadFile(fileId: string, workspaceId: string, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    try {
      // Fetch file content directly from S3 URL
      const response = await axios.get(file.url, {
        responseType: 'arraybuffer'
      });

      const fileContent = Buffer.from(response.data);

      // Update download tracking
      await this.db.update('files', fileId, {
        last_opened_at: new Date().toISOString(),
        last_opened_by: userId,
        open_count: (file.open_count || 0) + 1
      });

      return {
        content: fileContent,
        fileName: file.name,
        mimeType: file.mime_type
      };
    } catch (error) {
      console.error('File download error:', error);
      throw new NotFoundException('File content not found');
    }
  }

  async deleteFile(fileId: string, workspaceId: string, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    // Check if user has delete permissions
    if (file.uploaded_by !== userId) {
      // Check workspace permissions - admins can delete any file
      const membership = await this.db.findOne('workspace_members', {
        workspace_id: workspaceId,
        user_id: userId,
        is_active: true
      });

      if (!membership || (membership.role !== 'admin' && membership.role !== 'owner')) {
        throw new ForbiddenException('You do not have permission to delete this file');
      }
    }

    // Soft delete the file
    const result = await this.db.update('files', fileId, {
      is_deleted: true,
      deleted_at: new Date().toISOString()
    });

    // TODO: In future if possible - Clean up physical file from storage (could be done asynchronously)
    // For now, we keep the file in storage for data integrity

    return result;
  }

  async deleteMultipleFiles(fileIds: string[], workspaceId: string, userId: string) {
    const deletedAt = new Date().toISOString();
    const results = {
      success: [] as string[],
      failed: [] as { fileId: string; reason: string }[]
    };

    // Get workspace membership once for permission checking
    const membership = await this.db.findOne('workspace_members', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true
    });

    const isAdmin = membership && (membership.role === 'admin' || membership.role === 'owner');

    // Process each file
    for (const fileId of fileIds) {
      try {
        // Get file with access check
        const file = await this.getFileWithAccess(fileId, workspaceId, userId);

        // Check if user has delete permissions
        if (file.uploaded_by !== userId && !isAdmin) {
          results.failed.push({
            fileId,
            reason: 'You do not have permission to delete this file'
          });
          continue;
        }

        // Soft delete the file
        await this.db.update('files', fileId, {
          is_deleted: true,
          deleted_at: deletedAt
        });

        results.success.push(fileId);
      } catch (error) {
        results.failed.push({
          fileId,
          reason: error.message || 'Failed to delete file'
        });
      }
    }

    return {
      message: `Successfully deleted ${results.success.length} file(s)`,
      deleted_count: results.success.length,
      failed_count: results.failed.length,
      deleted_at: deletedAt,
      success: results.success,
      failed: results.failed
    };
  }

  async moveFile(fileId: string, workspaceId: string, moveFileDto: MoveFileDto, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update folder location
    if (moveFileDto.target_folder_id !== undefined) {
      if (moveFileDto.target_folder_id) {
        // Verify target folder exists
        await this.getFolderWithAccess(moveFileDto.target_folder_id, workspaceId, userId);
        updateData.parent_folder_ids = [moveFileDto.target_folder_id];
      } else {
        // Move to root
        updateData.parent_folder_ids = [];
      }
    }

    // Update file name
    if (moveFileDto.new_name) {
      updateData.name = moveFileDto.new_name;
    }

    return await this.db.update('files', fileId, updateData);
  }

  async moveMultipleFiles(fileIds: string[], workspaceId: string, targetFolderId: string | null | undefined, userId: string) {
    const results = {
      success: [] as Array<{ fileId: string; name: string }>,
      failed: [] as Array<{ fileId: string; reason: string }>
    };

    // Verify target folder exists if provided
    if (targetFolderId) {
      try {
        await this.getFolderWithAccess(targetFolderId, workspaceId, userId);
      } catch (error) {
        throw new BadRequestException('Target folder not found or access denied');
      }
    }

    const updatedAt = new Date().toISOString();

    // Process each file
    for (const fileId of fileIds) {
      try {
        // Get file with access check
        const file = await this.getFileWithAccess(fileId, workspaceId, userId);

        const updateData: any = {
          updated_at: updatedAt,
          folder_id: targetFolderId || null,
          parent_folder_ids: targetFolderId ? [targetFolderId] : []
        };

        await this.db.update('files', fileId, updateData);

        results.success.push({
          fileId,
          name: file.name
        });
      } catch (error) {
        results.failed.push({
          fileId,
          reason: error.message || 'Failed to move file'
        });
      }
    }

    return {
      message: `Successfully moved ${results.success.length} file(s)`,
      moved_count: results.success.length,
      failed_count: results.failed.length,
      success: results.success,
      failed: results.failed
    };
  }

  async moveFolder(folderId: string, workspaceId: string, moveFolderDto: MoveFolderDto, userId: string) {
    const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update parent location
    if (moveFolderDto.target_parent_id !== undefined) {
      if (moveFolderDto.target_parent_id) {
        // Verify target parent folder exists
        await this.getFolderWithAccess(moveFolderDto.target_parent_id, workspaceId, userId);

        // Prevent moving folder into itself
        if (moveFolderDto.target_parent_id === folderId) {
          throw new BadRequestException('Cannot move folder into itself');
        }

        // Prevent moving folder into its own descendants
        if (await this.isFolderDescendantOf(moveFolderDto.target_parent_id, folderId)) {
          throw new BadRequestException('Cannot move folder into its own descendants');
        }

        updateData.parent_id = moveFolderDto.target_parent_id;
      } else {
        // Move to root (parent_id = null)
        updateData.parent_id = null;
      }
    }

    // Update folder name
    if (moveFolderDto.new_name) {
      // Check if new name already exists in target location
      const targetParentId = moveFolderDto.target_parent_id !== undefined
        ? (moveFolderDto.target_parent_id || null)
        : folder.parent_id;

      const existingFolders = await this.db.find('folders', {
        workspace_id: workspaceId,
        name: moveFolderDto.new_name,
        parent_id: targetParentId,
        is_deleted: false
      });

      const existingFoldersData = Array.isArray(existingFolders.data) ? existingFolders.data : [];
      // Filter out the current folder from the results
      const duplicates = existingFoldersData.filter(f => f.id !== folderId);
      if (duplicates.length > 0) {
        throw new BadRequestException('Folder with this name already exists in the target location');
      }

      updateData.name = moveFolderDto.new_name;
    }

    return await this.db.update('folders', folderId, updateData);
  }

  async moveMultipleFolders(folderIds: string[], workspaceId: string, targetParentId: string | null | undefined, userId: string) {
    const results = {
      success: [] as Array<{ folderId: string; name: string }>,
      failed: [] as Array<{ folderId: string; reason: string }>
    };

    // Verify target parent folder exists if provided
    if (targetParentId) {
      try {
        await this.getFolderWithAccess(targetParentId, workspaceId, userId);
      } catch (error) {
        throw new BadRequestException('Target parent folder not found or access denied');
      }
    }

    const updatedAt = new Date().toISOString();

    // Process each folder
    for (const folderId of folderIds) {
      try {
        // Get folder with access check
        const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

        // Prevent moving folder into itself
        if (targetParentId === folderId) {
          results.failed.push({
            folderId,
            reason: 'Cannot move folder into itself'
          });
          continue;
        }

        // Prevent moving folder into its own descendants
        if (targetParentId && await this.isFolderDescendantOf(targetParentId, folderId)) {
          results.failed.push({
            folderId,
            reason: 'Cannot move folder into its own descendants'
          });
          continue;
        }

        const updateData: any = {
          updated_at: updatedAt,
          parent_id: targetParentId || null
        };

        await this.db.update('folders', folderId, updateData);

        results.success.push({
          folderId,
          name: folder.name
        });
      } catch (error) {
        results.failed.push({
          folderId,
          reason: error.message || 'Failed to move folder'
        });
      }
    }

    return {
      message: `Successfully moved ${results.success.length} folder(s)`,
      moved_count: results.success.length,
      failed_count: results.failed.length,
      success: results.success,
      failed: results.failed
    };
  }

  async updateFile(fileId: string, workspaceId: string, updateFileDto: UpdateFileDto, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    // Get current metadata
    const currentMetadata = file.metadata || {};

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Update file name if provided
    if (updateFileDto.name) {
      updateData.name = updateFileDto.name;
    }

    // Update starred field if provided
    if (updateFileDto.starred !== undefined) {
      updateData.starred = updateFileDto.starred;
    }

    // Update last opened fields if mark_as_opened is true
    if (updateFileDto.mark_as_opened === true) {
      updateData.last_opened_at = new Date().toISOString();
      updateData.last_opened_by = userId;
      updateData.open_count = (file.open_count || 0) + 1;
    }

    // Update metadata fields
    const newMetadata = { ...currentMetadata };

    if (updateFileDto.description !== undefined) {
      newMetadata.description = updateFileDto.description;
    }

    if (updateFileDto.tags !== undefined) {
      // Process tags - handle both string (comma-separated) and array formats
      let tagsArray: string[] = [];
      if (typeof updateFileDto.tags === 'string') {
        tagsArray = updateFileDto.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(updateFileDto.tags)) {
        tagsArray = updateFileDto.tags;
      }
      newMetadata.tags = tagsArray;
    }

    updateData.metadata = newMetadata;

    return await this.db.update('files', fileId, updateData);
  }

  // ============================================
  // FILE & FOLDER COPY OPERATIONS
  // ============================================

  async copyFile(fileId: string, workspaceId: string, copyFileDto: CopyFileDto, userId: string) {
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    // Verify target folder exists if provided
    if (copyFileDto.target_folder_id) {
      await this.getFolderWithAccess(copyFileDto.target_folder_id, workspaceId, userId);
    }

    // Generate new name if not provided
    const newName = copyFileDto.new_name || this.generateCopyName(file.name);

    try {
      // Create new file record pointing to the same storage location
      const newFileData = {
        workspace_id: workspaceId,
        name: newName,
        storage_path: file.storage_path, // Reuse same storage path
        url: file.url, // Reuse same URL
        mime_type: file.mime_type,
        size: file.size,
        uploaded_by: userId,
        folder_id: copyFileDto.target_folder_id || null,
        parent_folder_ids: copyFileDto.target_folder_id ? [copyFileDto.target_folder_id] : [],
        file_hash: file.file_hash,
        virus_scan_status: file.virus_scan_status,
        is_ai_generated: file.is_ai_generated,
        metadata: {
          ...file.metadata,
          original_file_id: fileId,
          copied_at: new Date().toISOString(),
          copied_by: userId
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const copiedFile = await this.db.insert('files', newFileData);

      return {
        ...copiedFile,
        url: file.url
      };
    } catch (error) {
      console.error('File copy error:', error);
      throw new BadRequestException('Failed to copy file: ' + error.message);
    }
  }

  async copyMultipleFiles(fileIds: string[], workspaceId: string, targetFolderId: string | null | undefined, userId: string) {
    const results = {
      success: [] as Array<{ fileId: string; newFileId: string; name: string }>,
      failed: [] as Array<{ fileId: string; reason: string }>
    };

    // Verify target folder exists if provided
    if (targetFolderId) {
      try {
        await this.getFolderWithAccess(targetFolderId, workspaceId, userId);
      } catch (error) {
        throw new BadRequestException('Target folder not found or access denied');
      }
    }

    // Process each file
    for (const fileId of fileIds) {
      try {
        // Get file with access check
        const file = await this.getFileWithAccess(fileId, workspaceId, userId);

        // Generate copy name
        const newName = this.generateCopyName(file.name);

        // Create new file record pointing to the same storage location
        const newFileData = {
          workspace_id: workspaceId,
          name: newName,
          storage_path: file.storage_path, // Reuse same storage path
          url: file.url, // Reuse same URL
          mime_type: file.mime_type,
          size: file.size,
          uploaded_by: userId,
          folder_id: targetFolderId || null,
          parent_folder_ids: targetFolderId ? [targetFolderId] : [],
          file_hash: file.file_hash,
          virus_scan_status: file.virus_scan_status,
          is_ai_generated: file.is_ai_generated,
          metadata: {
            ...file.metadata,
            original_file_id: fileId,
            copied_at: new Date().toISOString(),
            copied_by: userId
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const copiedFile = await this.db.insert('files', newFileData);

        results.success.push({
          fileId,
          newFileId: copiedFile.id,
          name: newName
        });
      } catch (error) {
        results.failed.push({
          fileId,
          reason: error.message || 'Failed to copy file'
        });
      }
    }

    return {
      message: `Successfully copied ${results.success.length} file(s)`,
      copied_count: results.success.length,
      failed_count: results.failed.length,
      success: results.success,
      failed: results.failed
    };
  }

  async copyFolder(folderId: string, workspaceId: string, copyFolderDto: CopyFolderDto, userId: string) {
    const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

    // Verify target parent folder exists if provided
    if (copyFolderDto.target_parent_id) {
      await this.getFolderWithAccess(copyFolderDto.target_parent_id, workspaceId, userId);

      // Prevent copying folder into itself or its descendants
      if (await this.isFolderDescendantOf(copyFolderDto.target_parent_id, folderId)) {
        throw new BadRequestException('Cannot copy folder into itself or its descendants');
      }
    }

    // Generate new name if not provided
    const newName = copyFolderDto.new_name || this.generateCopyName(folder.name);

    try {
      // Copy the folder recursively
      const copiedFolder = await this.copyFolderRecursive(
        folder,
        workspaceId,
        copyFolderDto.target_parent_id || null,
        newName,
        userId
      );

      return copiedFolder;
    } catch (error) {
      console.error('Folder copy error:', error);
      throw new BadRequestException('Failed to copy folder: ' + error.message);
    }
  }

  async copyMultipleFolders(folderIds: string[], workspaceId: string, targetParentId: string | null | undefined, userId: string) {
    const results = {
      success: [] as Array<{ folderId: string; newFolderId: string; name: string }>,
      failed: [] as Array<{ folderId: string; reason: string }>
    };

    // Verify target parent folder exists if provided
    if (targetParentId) {
      try {
        await this.getFolderWithAccess(targetParentId, workspaceId, userId);
      } catch (error) {
        throw new BadRequestException('Target parent folder not found or access denied');
      }
    }

    // Process each folder
    for (const folderId of folderIds) {
      try {
        // Get folder with access check
        const folder = await this.getFolderWithAccess(folderId, workspaceId, userId);

        // Prevent copying folder into itself or its descendants
        if (targetParentId && await this.isFolderDescendantOf(targetParentId, folderId)) {
          results.failed.push({
            folderId,
            reason: 'Cannot copy folder into itself or its descendants'
          });
          continue;
        }

        // Generate copy name
        const newName = this.generateCopyName(folder.name);

        // Copy the folder recursively
        const copiedFolder = await this.copyFolderRecursive(
          folder,
          workspaceId,
          targetParentId || null,
          newName,
          userId
        );

        results.success.push({
          folderId,
          newFolderId: copiedFolder.id,
          name: newName
        });
      } catch (error) {
        results.failed.push({
          folderId,
          reason: error.message || 'Failed to copy folder'
        });
      }
    }

    return {
      message: `Successfully copied ${results.success.length} folder(s)`,
      copied_count: results.success.length,
      failed_count: results.failed.length,
      success: results.success,
      failed: results.failed
    };
  }

  private async copyFolderRecursive(
    folder: any,
    workspaceId: string,
    targetParentId: string | null,
    newName: string,
    userId: string,
    folderIdMap: Map<string, string> = new Map()
  ): Promise<any> {
    // Create the new folder
    const newFolderData = {
      workspace_id: workspaceId,
      name: newName,
      parent_id: targetParentId,
      created_by: userId,
      collaborative_data: {
        ...folder.collaborative_data,
        original_folder_id: folder.id,
        copied_at: new Date().toISOString(),
        copied_by: userId
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const newFolder = await this.db.insert('folders', newFolderData);

    // Store the mapping of old folder ID to new folder ID
    folderIdMap.set(folder.id, newFolder.id);

    // Get all subfolders
    const subFoldersQuery = await this.db.find('folders', {
      parent_id: folder.id,
      is_deleted: false
    });
    const subFolders = Array.isArray(subFoldersQuery.data) ? subFoldersQuery.data : [];

    // Recursively copy subfolders
    for (const subFolder of subFolders) {
      await this.copyFolderRecursive(
        subFolder,
        workspaceId,
        newFolder.id,
        subFolder.name,
        userId,
        folderIdMap
      );
    }

    // Get all files in this folder
    const filesQuery = await this.db.find('files', {
      folder_id: folder.id,
      is_deleted: false
    });
    const files = Array.isArray(filesQuery.data) ? filesQuery.data : [];

    // Copy all files (create new database entries pointing to same storage)
    for (const file of files) {
      try {
        // Create new file record pointing to the same storage location
        const newFileData = {
          workspace_id: workspaceId,
          name: file.name,
          storage_path: file.storage_path, // Reuse same storage path
          url: file.url, // Reuse same URL
          mime_type: file.mime_type,
          size: file.size,
          uploaded_by: userId,
          folder_id: newFolder.id,
          parent_folder_ids: [newFolder.id],
          file_hash: file.file_hash,
          virus_scan_status: file.virus_scan_status,
          is_ai_generated: file.is_ai_generated,
          metadata: {
            ...file.metadata,
            original_file_id: file.id,
            copied_at: new Date().toISOString(),
            copied_by: userId
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await this.db.insert('files', newFileData);
      } catch (error) {
        console.error(`Failed to copy file ${file.name}:`, error);
        // Continue copying other files even if one fails
      }
    }

    return newFolder;
  }

  private generateCopyName(originalName: string): string {
    // Check if the name already has a (Copy X) suffix
    const copyPattern = /^(.+?)\s*\(Copy(?:\s+(\d+))?\)(\.[^.]+)?$/;
    const match = originalName.match(copyPattern);

    if (match) {
      const baseName = match[1];
      const copyNumber = match[2] ? parseInt(match[2]) : 1;
      const extension = match[3] || '';
      return `${baseName} (Copy ${copyNumber + 1})${extension}`;
    }

    // Check if the name has an extension
    const extensionPattern = /^(.+)(\.[^.]+)$/;
    const extMatch = originalName.match(extensionPattern);

    if (extMatch) {
      return `${extMatch[1]} (Copy)${extMatch[2]}`;
    }

    return `${originalName} (Copy)`;
  }

  private async isFolderDescendantOf(folderId: string, ancestorId: string): Promise<boolean> {
    if (folderId === ancestorId) {
      return true;
    }

    const folderQuery = await this.db.find('folders', {
      id: folderId
    });

    const folderData = Array.isArray(folderQuery.data) ? folderQuery.data : [];
    if (folderData.length === 0 || !folderData[0].parent_id) {
      return false;
    }

    return this.isFolderDescendantOf(folderData[0].parent_id, ancestorId);
  }

  // ============================================
  // FILE SHARING
  // ============================================

  async shareFile(fileId: string, workspaceId: string, shareFileDto: ShareFileDto, userId: string) {
    // Verify user has access to the file
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    console.log('[FilesService] Sharing file with users:', {
      fileId,
      fileName: file.name,
      workspaceId: file.workspace_id,
      userIds: shareFileDto.user_ids,
      sharedBy: userId,
      userIdsCount: shareFileDto.user_ids?.length
    });

    // Create share records for each user
    const sharePromises = shareFileDto.user_ids.map(async (sharedWithUserId) => {
      const shareData = {
        id: uuidv4(),
        file_id: fileId,
        shared_by: userId,
        shared_with: sharedWithUserId,
        share_token: uuidv4(),
        permissions: JSON.stringify(shareFileDto.permissions || { read: true, download: true }),
        expires_at: shareFileDto.expires_at || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('[FilesService] Creating share record:', {
        shareId: shareData.id,
        fileId: shareData.file_id,
        sharedWith: shareData.shared_with,
        sharedBy: shareData.shared_by
      });

      return this.db.insert('file_shares', shareData);
    });

    const shares = await Promise.all(sharePromises);

    console.log('[FilesService] Successfully created shares:', {
      count: shares.length,
      shareIds: shares.map(s => s.id)
    });

    // Send notifications to newly shared users
    for (const sharedWithUserId of shareFileDto.user_ids) {
      if (sharedWithUserId !== userId) {
        try {
          await this.notificationsService.sendNotification({
            user_id: sharedWithUserId,
            type: NotificationType.WORKSPACE,
            title: 'File Shared with You',
            message: `A file "${file.name}" has been shared with you`,
            action_url: `/workspaces/${workspaceId}/files/shared-with-me`,
            priority: 'normal' as any,
            send_push: true, // Enable FCM push notification for mobile users
            data: {
              category: 'workspace',
              entity_type: 'file',
              entity_id: fileId,
              actor_id: userId,
              workspace_id: workspaceId,
              file_name: file.name,
              file_id: fileId,
            }
          });
        } catch (error) {
          console.error(`Failed to send file share notification to user ${sharedWithUserId}:`, error);
        }
      }
    }

    return {
      success: true,
      shared_count: shares.length,
      shares: shares.map(share => ({
        id: share.id,
        shared_with: share.shared_with,
        share_token: share.share_token,
        share_url: `/api/files/shared/${share.share_token}`
      }))
    };
  }

  async getSharedWithMe(workspaceId: string, userId: string) {
    console.log('[FilesService] Getting files shared with user:', { workspaceId, userId });

    // Get all shares where current user is the recipient
    const sharesResult = await this.db.table('file_shares')
      .select('*')
      .where('shared_with', '=', userId)
      .where('is_active', '=', true)
      .execute();

    const sharesData = Array.isArray(sharesResult.data) ? sharesResult.data : [];
    console.log('[FilesService] Found shares:', {
      count: sharesData.length,
      shares: sharesData.map(s => ({
        id: s.id,
        fileId: s.file_id,
        sharedBy: s.shared_by,
        sharedWith: s.shared_with
      }))
    });

    // Get file details for each share
    const sharedFiles = await Promise.all(
      sharesData.map(async (share) => {
        try {
          console.log('[FilesService] Querying file for share:', {
            shareId: share.id,
            fileId: share.file_id,
            workspaceId,
            sharedWith: share.shared_with
          });

          // Get file details
          const fileResult = await this.db.table('files')
            .select('*')
            .where('id', '=', share.file_id)
            .where('workspace_id', '=', workspaceId)
            .where('is_deleted', '=', false)
            .execute();

          const filesData = Array.isArray(fileResult.data) ? fileResult.data : [];

          if (filesData.length === 0) {
            console.log('[FilesService] ⚠️ File not found for share:', {
              shareId: share.id,
              fileId: share.file_id,
              workspaceId
            });
            return null;
          }

          const file = filesData[0];
          console.log('[FilesService] ✅ Found file for share:', {
            shareId: share.id,
            fileId: file.id,
            fileName: file.name,
            fileWorkspaceId: file.workspace_id
          });

          // Get owner info
          let sharedByUser = null;
          try {
            const userInfo: any = await this.db.getUserById(share.shared_by);
            if (userInfo) {
              const metadata = userInfo.metadata || {};
              sharedByUser = {
                id: userInfo.id,
                name: metadata.name || userInfo.fullName || userInfo.name || userInfo.email?.split('@')[0] || 'User',
                email: userInfo.email,
                avatarUrl: userInfo.avatar_url || null,
              };
            }
          } catch (error) {
            console.warn('[FilesService] Could not fetch owner info:', error.message);
          }

          // Parse JSON fields
          const permissions = typeof share.permissions === 'string'
            ? JSON.parse(share.permissions)
            : share.permissions;

          // The URL should already be stored as a string in the database
          // If it's not available or is an object, generate it from storage_path
          let publicUrl = file.url;

          // Handle case where url might be an object
          if (typeof publicUrl === 'object' && publicUrl !== null && publicUrl.publicUrl) {
            publicUrl = publicUrl.publicUrl;
          }

          // If still no valid URL, generate from storage_path
          if (!publicUrl && file.storage_path) {
            try {
              const generatedUrl = await /* TODO: use StorageService */ this.db.getPublicUrl('files', file.storage_path);
              if (typeof generatedUrl === 'object' && generatedUrl !== null && generatedUrl.publicUrl) {
                publicUrl = generatedUrl.publicUrl;
              } else {
                publicUrl = generatedUrl;
              }
            } catch (error) {
              console.warn('[FilesService] Could not generate public URL for file:', error.message);
            }
          }

          console.log('[FilesService] Shared file URL:', {
            fileName: file.name,
            originalUrl: file.url,
            finalUrl: publicUrl,
            storagePath: file.storage_path
          });

          return {
            ...file,
            url: publicUrl, // Ensure it's always a string URL
            share_id: share.id,
            shared_by: share.shared_by,
            shared_by_user: sharedByUser,
            shared_at: share.created_at,
            share_permissions: permissions,
            expires_at: share.expires_at,
          };
        } catch (error) {
          console.error('[FilesService] Error processing shared file:', error);
          return null;
        }
      })
    );

    // Filter out nulls and return
    const validSharedFiles = sharedFiles.filter(f => f !== null);
    console.log('[FilesService] Returning shared files:', validSharedFiles.length);

    return validSharedFiles;
  }

  async getSharedFile(shareToken: string, password?: string) {
    const shareQuery = await this.db.find('file_shares', {
      share_token: shareToken,
      is_active: true
    });

    const shareData = Array.isArray(shareQuery.data) ? shareQuery.data : [];
    if (shareData.length === 0) {
      throw new NotFoundException('Share link not found or expired');
    }

    const share = shareQuery[0];

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    // Check password
    if (share.password && share.password !== password) {
      throw new BadRequestException('Invalid password');
    }

    // Check download limit
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      throw new BadRequestException('Download limit exceeded');
    }

    // Get the file
    const fileQuery = await this.db.find('files', {
      id: share.file_id
    });

    const fileData = Array.isArray(fileQuery.data) ? fileQuery.data : [];
    if (fileData.length === 0) {
      throw new NotFoundException('File not found');
    }

    const file = fileQuery[0];

    // Update download count
    await this.db.update('file_shares', share.id, {
      download_count: (share.download_count || 0) + 1
    });

    const publicUrl = await /* TODO: use StorageService */ this.db.getPublicUrl('files', file.storage_path);

    return {
      ...file,
      url: publicUrl,
      permissions: share.permissions
    };
  }

  async getFileShares(fileId: string, workspaceId: string, userId: string) {
    await this.getFileWithAccess(fileId, workspaceId, userId);

    const sharesQuery = await this.db.find('file_shares', {
      file_id: fileId,
      is_active: true
    }, { orderBy: 'created_at', order: 'desc' });

    const sharesData = Array.isArray(sharesQuery.data) ? sharesQuery.data : [];
    return sharesData.map(share => ({
      ...share,
      share_url: `/api/files/shared/${share.share_token}`
    }));
  }

  async revokeFileShare(shareId: string, userId: string) {
    const shareQuery = await this.db.find('file_shares', {
      id: shareId
    });

    const shareData = Array.isArray(shareQuery.data) ? shareQuery.data : [];
    if (shareData.length === 0) {
      throw new NotFoundException('Share not found');
    }

    const share = shareQuery[0];

    if (share.shared_by !== userId) {
      throw new ForbiddenException('You can only revoke your own shares');
    }

    return await this.db.update('file_shares', shareId, {
      is_active: false
    });
  }

  // ============================================
  // PUBLIC LINK SHARING (Google Drive style)
  // ============================================

  /**
   * Create a public share link for a file
   */
  async createShareLink(fileId: string, workspaceId: string, dto: CreateShareLinkDto, userId: string) {
    // Verify user has access to the file
    const file = await this.getFileWithAccess(fileId, workspaceId, userId);

    // Generate unique share token
    const shareToken = this.generateShareToken();

    // Hash password if provided
    let hashedPassword = null;
    if (dto.password) {
      hashedPassword = crypto.createHash('sha256').update(dto.password).digest('hex');
    }

    const shareData = {
      file_id: fileId,
      shared_by: userId,
      shared_with: null, // null for public links
      share_token: shareToken,
      share_type: 'link',
      access_level: dto.accessLevel || AccessLevel.VIEW,
      permissions: JSON.stringify({
        read: true,
        download: dto.accessLevel === AccessLevel.DOWNLOAD || dto.accessLevel === AccessLevel.EDIT,
        edit: dto.accessLevel === AccessLevel.EDIT
      }),
      expires_at: dto.expiresAt || null,
      password: hashedPassword,
      max_downloads: dto.maxDownloads || null,
      download_count: 0,
      view_count: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const share = await this.db.insert('file_shares', shareData);

    console.log(`[FilesService] Created share link for file ${file.name} by user ${userId}`);

    return this.formatShareLinkResponse(share);
  }

  /**
   * Get all share links for a file
   */
  async getFileShareLinks(fileId: string, workspaceId: string, userId: string) {
    // Verify user has access to the file
    await this.getFileWithAccess(fileId, workspaceId, userId);

    const sharesResult = await this.db.find('file_shares', {
      file_id: fileId,
      share_type: 'link',
      is_active: true
    });

    const shares = Array.isArray(sharesResult.data) ? sharesResult.data : [];
    return shares.map(share => this.formatShareLinkResponse(share));
  }

  /**
   * Get a specific share link
   */
  async getShareLink(shareId: string, userId: string) {
    const shareResult = await this.db.find('file_shares', { id: shareId });
    const shares = Array.isArray(shareResult.data) ? shareResult.data : [];

    if (shares.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shares[0];

    // Only the creator can view share details
    if (share.shared_by !== userId) {
      throw new ForbiddenException('You do not have permission to view this share link');
    }

    return this.formatShareLinkResponse(share);
  }

  /**
   * Update a share link's settings
   */
  async updateShareLink(shareId: string, dto: UpdateShareLinkDto, userId: string) {
    const shareResult = await this.db.find('file_shares', { id: shareId });
    const shares = Array.isArray(shareResult.data) ? shareResult.data : [];

    if (shares.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shares[0];

    // Only the creator can update
    if (share.shared_by !== userId) {
      throw new ForbiddenException('You do not have permission to update this share link');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (dto.accessLevel !== undefined) {
      updateData.access_level = dto.accessLevel;
      updateData.permissions = JSON.stringify({
        read: true,
        download: dto.accessLevel === AccessLevel.DOWNLOAD || dto.accessLevel === AccessLevel.EDIT,
        edit: dto.accessLevel === AccessLevel.EDIT
      });
    }

    if (dto.password !== undefined) {
      updateData.password = dto.password
        ? crypto.createHash('sha256').update(dto.password).digest('hex')
        : null;
    }

    if (dto.expiresAt !== undefined) {
      updateData.expires_at = dto.expiresAt || null;
    }

    if (dto.maxDownloads !== undefined) {
      updateData.max_downloads = dto.maxDownloads || null;
    }

    if (dto.isActive !== undefined) {
      updateData.is_active = dto.isActive;
    }

    await this.db.update('file_shares', shareId, updateData);

    // Fetch updated share
    const updatedResult = await this.db.find('file_shares', { id: shareId });
    const updatedShares = Array.isArray(updatedResult.data) ? updatedResult.data : [];

    return this.formatShareLinkResponse(updatedShares[0]);
  }

  /**
   * Delete a share link
   */
  async deleteShareLink(shareId: string, userId: string) {
    const shareResult = await this.db.find('file_shares', { id: shareId });
    const shares = Array.isArray(shareResult.data) ? shareResult.data : [];

    if (shares.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shares[0];

    // Only the creator can delete
    if (share.shared_by !== userId) {
      throw new ForbiddenException('You do not have permission to delete this share link');
    }

    await this.db.delete('file_shares', shareId);

    return { success: true, message: 'Share link deleted' };
  }

  /**
   * Access a shared file via public link (no auth required)
   */
  async accessSharedFile(shareToken: string, password?: string) {
    const shareResult = await this.db.find('file_shares', {
      share_token: shareToken,
      share_type: 'link'
    });

    const shares = Array.isArray(shareResult.data) ? shareResult.data : [];

    if (shares.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shares[0];

    // Check if active
    if (!share.is_active) {
      throw new BadRequestException('This share link has been disabled');
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new BadRequestException('This share link has expired');
    }

    // Check download limit
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      throw new BadRequestException('Download limit reached for this share link');
    }

    // Check password
    if (share.password) {
      if (!password) {
        return {
          requiresPassword: true,
          message: 'This link is password protected'
        };
      }

      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (share.password !== hashedPassword) {
        throw new BadRequestException('Incorrect password');
      }
    }

    // Get the file
    const fileResult = await this.db.find('files', { id: share.file_id });
    const files = Array.isArray(fileResult.data) ? fileResult.data : [];

    if (files.length === 0 || files[0].is_deleted) {
      throw new NotFoundException('File not found or has been deleted');
    }

    const file = files[0];

    // Update view count and last accessed
    await this.db.update('file_shares', share.id, {
      view_count: (share.view_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    // Get sharer info
    let sharedByUser = null;
    try {
      const userInfo: any = await this.db.getUserById(share.shared_by);
      if (userInfo) {
        const metadata = userInfo.metadata || {};
        sharedByUser = {
          name: metadata.name || userInfo.fullName || userInfo.name || 'Someone',
          avatarUrl: userInfo.avatar_url || null,
        };
      }
    } catch (error) {
      console.warn('[FilesService] Could not fetch sharer info:', error.message);
    }

    // Build response based on access level
    const accessLevel = share.access_level || AccessLevel.VIEW;
    const canDownload = accessLevel === AccessLevel.DOWNLOAD || accessLevel === AccessLevel.EDIT;

    // Get public URL for the file
    let fileUrl = file.url;
    if (typeof fileUrl === 'object' && fileUrl?.publicUrl) {
      fileUrl = fileUrl.publicUrl;
    }
    if (!fileUrl && file.storage_path) {
      try {
        const generatedUrl = await /* TODO: use StorageService */ this.db.getPublicUrl('files', file.storage_path);
        fileUrl = typeof generatedUrl === 'object' ? generatedUrl.publicUrl : generatedUrl;
      } catch (error) {
        console.warn('[FilesService] Could not generate public URL:', error.message);
      }
    }

    return {
      requiresPassword: false,
      file: {
        id: file.id,
        name: file.name,
        size: parseInt(file.size) || 0,
        mimeType: file.mime_type,
        url: canDownload ? fileUrl : null, // Only provide URL if download is allowed
        previewUrl: fileUrl, // Always allow preview
        accessLevel,
        canDownload,
        sharedBy: sharedByUser,
        sharedAt: share.created_at
      }
    };
  }

  /**
   * Download a shared file (updates download count)
   */
  async downloadSharedFile(shareToken: string, password?: string) {
    const shareResult = await this.db.find('file_shares', {
      share_token: shareToken,
      share_type: 'link'
    });

    const shares = Array.isArray(shareResult.data) ? shareResult.data : [];

    if (shares.length === 0) {
      throw new NotFoundException('Share link not found');
    }

    const share = shares[0];

    // Check if active
    if (!share.is_active) {
      throw new BadRequestException('This share link has been disabled');
    }

    // Check access level
    const accessLevel = share.access_level || AccessLevel.VIEW;
    if (accessLevel === AccessLevel.VIEW) {
      throw new ForbiddenException('This share link does not allow downloads');
    }

    // Check expiration
    if (share.expires_at && new Date(share.expires_at) < new Date()) {
      throw new BadRequestException('This share link has expired');
    }

    // Check download limit
    if (share.max_downloads && share.download_count >= share.max_downloads) {
      throw new BadRequestException('Download limit reached for this share link');
    }

    // Check password
    if (share.password) {
      if (!password) {
        throw new BadRequestException('Password required');
      }

      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (share.password !== hashedPassword) {
        throw new BadRequestException('Incorrect password');
      }
    }

    // Get the file
    const fileResult = await this.db.find('files', { id: share.file_id });
    const files = Array.isArray(fileResult.data) ? fileResult.data : [];

    if (files.length === 0 || files[0].is_deleted) {
      throw new NotFoundException('File not found or has been deleted');
    }

    const file = files[0];

    // Update download count
    await this.db.update('file_shares', share.id, {
      download_count: (share.download_count || 0) + 1,
      last_accessed_at: new Date().toISOString()
    });

    // Get file content
    try {
      const response = await axios.get(file.url, {
        responseType: 'arraybuffer'
      });

      return {
        content: Buffer.from(response.data),
        fileName: file.name,
        mimeType: file.mime_type
      };
    } catch (error) {
      console.error('Shared file download error:', error);
      throw new NotFoundException('File content not found');
    }
  }

  /**
   * Generate a secure share token
   */
  private generateShareToken(): string {
    // Generate a URL-safe token: 32 random bytes -> base64url
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Format share link response
   */
  private formatShareLinkResponse(share: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5175';

    return {
      id: share.id,
      fileId: share.file_id,
      shareToken: share.share_token,
      shareUrl: `${frontendUrl}/shared/${share.share_token}`,
      accessLevel: share.access_level || AccessLevel.VIEW,
      hasPassword: !!share.password,
      expiresAt: share.expires_at,
      maxDownloads: share.max_downloads,
      downloadCount: share.download_count || 0,
      viewCount: share.view_count || 0,
      isActive: share.is_active,
      createdAt: share.created_at
    };
  }

  // ============================================
  // SEARCH AND FILTERS
  // ============================================

  async searchFiles(workspaceId: string, query: string, filters?: any, page = 1, limit = 50, userId?: string) {
    const offset = (page - 1) * limit;

    // Using workaround pattern for complex search
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];
    let files = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted &&
      (userId ? f.uploaded_by === userId : true) // Filter by current user if userId provided
    );

    // Apply text search
    if (query) {
      const searchTerm = query.toLowerCase();
      files = files.filter(f => 
        f.name.toLowerCase().includes(searchTerm) ||
        (f.extracted_text && f.extracted_text.toLowerCase().includes(searchTerm)) ||
        (f.metadata?.description && f.metadata.description.toLowerCase().includes(searchTerm)) ||
        (f.metadata?.tags && f.metadata.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Apply filters
    if (filters?.mime_type) {
      files = files.filter(f => f.mime_type === filters.mime_type);
    }

    if (filters?.uploaded_by) {
      files = files.filter(f => f.uploaded_by === filters.uploaded_by);
    }

    if (filters?.date_from) {
      files = files.filter(f => new Date(f.created_at) >= new Date(filters.date_from));
    }

    if (filters?.date_to) {
      files = files.filter(f => new Date(f.created_at) <= new Date(filters.date_to));
    }

    // Sort by relevance/date
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    const paginatedFiles = files.slice(offset, offset + limit);

    return {
      data: paginatedFiles,
      total: files.length,
      page,
      limit,
      query,
      filters
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async getFileWithAccess(fileId: string, workspaceId: string, userId: string) {
    const fileQuery = await this.db.find('files', {
      id: fileId,
      workspace_id: workspaceId,
      is_deleted: false
    });

    const fileData = Array.isArray(fileQuery.data) ? fileQuery.data : [];
    if (fileData.length === 0) {
      throw new NotFoundException('File not found');
    }

    return fileData[0];
  }

  private async getFolderWithAccess(folderId: string, workspaceId: string, userId: string) {
    const folderQuery = await this.db.find('folders', {
      id: folderId,
      workspace_id: workspaceId,
      is_deleted: false
    });

    const folderData = Array.isArray(folderQuery.data) ? folderQuery.data : [];
    if (folderData.length === 0) {
      throw new NotFoundException('Folder not found');
    }

    return folderData[0];
  }

  private async checkStorageQuota(workspaceId: string, fileSize: number) {
    // Get workspace subscription to determine storage limits

    // Get workspace owner to fetch subscription
    const workspaceQuery = await this.db.find('workspaces', {
      id: workspaceId
    });

    const workspaceData = Array.isArray(workspaceQuery.data) ? workspaceQuery.data : [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const workspace = workspaceData[0];

    // Open-source self-hosted: no plan-based storage limits
    const maxStorageGb = Number.POSITIVE_INFINITY;
    const planName = 'Self-hosted';
    const maxStorageBytes = Number.POSITIVE_INFINITY;

    // Calculate current usage - using workaround pattern
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];
    const workspaceFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted
    );

    const currentUsage = workspaceFiles.reduce((total, file) => {
      return total + (parseInt(file.size) || 0);
    }, 0);

    const usedGB = (currentUsage / (1024 * 1024 * 1024)).toFixed(2);
    const fileGB = (fileSize / (1024 * 1024 * 1024)).toFixed(2);

    if (currentUsage + fileSize > maxStorageBytes) {
      throw new BadRequestException(
        `Storage quota exceeded. Your ${planName} plan allows ${maxStorageGb} GB. ` +
        `Currently using ${usedGB} GB. This file (${fileGB} GB) would exceed your limit. ` +
        `Please upgrade your plan or delete some files.`
      );
    }
  }

  async getStorageStats(workspaceId: string) {
    // Get workspace subscription to determine storage limits

    const workspaceQuery = await this.db.find('workspaces', {
      id: workspaceId
    });

    const workspaceData = Array.isArray(workspaceQuery.data) ? workspaceQuery.data : [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }

    const workspace = workspaceData[0];

    // Open-source self-hosted: no plan-based storage limits
    const maxStorageGb = Number.POSITIVE_INFINITY;
    const planName = 'Self-hosted';
    const planId = 'self-hosted';
    const maxStorageBytes = Number.POSITIVE_INFINITY;

    // Calculate current usage - using workaround pattern
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];
    const workspaceFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted
    );

    const currentUsage = workspaceFiles.reduce((total, file) => {
      return total + (parseInt(file.size) || 0);
    }, 0);

    return {
      used_bytes: currentUsage,
      total_bytes: maxStorageBytes,
      used_percentage: Math.round((currentUsage / maxStorageBytes) * 100),
      file_count: workspaceFiles.length,
      plan: {
        id: planId,
        name: planName,
        max_storage_gb: maxStorageGb
      }
    };
  }

  async getRecentFiles(workspaceId: string, userId?: string, limit = 100) {
    // Get all files and filter
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Filter by workspace, uploaded by current user, non-deleted, and must have last_opened_at
    let recentFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted &&
      f.last_opened_at &&
      (userId ? f.uploaded_by === userId : true) // Filter by current user if userId provided
    );

    // Sort by last_opened_at descending (most recent first)
    recentFiles.sort((a, b) => {
      const dateA = new Date(a.last_opened_at).getTime();
      const dateB = new Date(b.last_opened_at).getTime();
      return dateB - dateA;
    });

    // Limit to specified number
    const limitedFiles = recentFiles.slice(0, limit);

    return {
      data: limitedFiles,
      total: limitedFiles.length
    };
  }

  async getStarredFiles(workspaceId: string, page = 1, limit = 50) {
    const offset = (page - 1) * limit;

    // Get all files and filter
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Filter by workspace, non-deleted, and starred
    let starredFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted &&
      f.starred === true
    );

    // Sort by updated_at descending (most recently updated first)
    starredFiles.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.created_at).getTime();
      const dateB = new Date(b.updated_at || b.created_at).getTime();
      return dateB - dateA;
    });

    // Paginate
    const paginatedFiles = starredFiles.slice(offset, offset + limit);

    return {
      data: paginatedFiles,
      total: starredFiles.length,
      page,
      limit
    };
  }

  async getFilesByType(workspaceId: string, filterDto: FilterFilesByTypeDto, userId?: string) {
    const { category, mime_type, extension, folder_id, page = 1, limit = 50 } = filterDto;
    const offset = (page - 1) * limit;

    // Get all files
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // Filter by workspace, uploaded by current user, and non-deleted
    let files = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted &&
      (userId ? f.uploaded_by === userId : true) // Filter by current user if userId provided
    );

    // Helper to parse parent_folder_ids (may be string or array)
    const parseParentFolderIds = (ids: any): string[] => {
      if (!ids) return [];
      if (Array.isArray(ids)) return ids;
      if (typeof ids === 'string') {
        try {
          const parsed = JSON.parse(ids);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };

    // Filter by folder if provided
    if (folder_id) {
      files = files.filter(f => {
        const parentIds = parseParentFolderIds(f.parent_folder_ids);
        return parentIds.includes(folder_id);
      });
    }

    // Filter by category
    if (category) {
      if (category === FileCategory.DOCUMENTS) {
        // For DOCUMENTS category, include all files that are NOT images, videos, audio, pdfs, or spreadsheets
        // This ensures .zip, .env, .json, .xml and other misc files are included
        const imageMimeTypes = this.getMimeTypesForCategory(FileCategory.IMAGES);
        const videoMimeTypes = this.getMimeTypesForCategory(FileCategory.VIDEOS);
        const audioMimeTypes = this.getMimeTypesForCategory(FileCategory.AUDIO);
        const pdfMimeTypes = this.getMimeTypesForCategory(FileCategory.PDFS);
        const spreadsheetMimeTypes = this.getMimeTypesForCategory(FileCategory.SPREADSHEETS);

        files = files.filter(f => {
          const mimeType = f.mime_type || '';
          // Exclude images, videos, audio, pdfs, and spreadsheets
          const isImage = this.matchesMimeTypes(mimeType, imageMimeTypes);
          const isVideo = this.matchesMimeTypes(mimeType, videoMimeTypes);
          const isAudio = this.matchesMimeTypes(mimeType, audioMimeTypes);
          const isPdf = this.matchesMimeTypes(mimeType, pdfMimeTypes);
          const isSpreadsheet = this.matchesMimeTypes(mimeType, spreadsheetMimeTypes);

          return !isImage && !isVideo && !isAudio && !isPdf && !isSpreadsheet;
        });
      } else {
        const categoryMimeTypes = this.getMimeTypesForCategory(category);
        files = files.filter(f =>
          categoryMimeTypes.some(mimePattern => {
            if (mimePattern.includes('*')) {
              const regex = new RegExp('^' + mimePattern.replace('*', '.*') + '$');
              return regex.test(f.mime_type);
            }
            return f.mime_type === mimePattern;
          })
        );
      }
    }

    // Filter by specific MIME type
    if (mime_type) {
      files = files.filter(f => f.mime_type === mime_type);
    }

    // Filter by extension
    if (extension) {
      files = files.filter(f => {
        const fileExtension = f.name.split('.').pop()?.toLowerCase();
        return fileExtension === extension.toLowerCase();
      });
    }

    // Sort by created date (newest first)
    files.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Paginate
    const paginatedFiles = files.slice(offset, offset + limit);

    return {
      data: paginatedFiles,
      total: files.length,
      page,
      limit,
      filters: {
        category,
        mime_type,
        extension,
        folder_id
      }
    };
  }

  private getMimeTypesForCategory(category: FileCategory): string[] {
    const mimeTypeMap: Record<FileCategory, string[]> = {
      [FileCategory.DOCUMENTS]: [
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/rtf',
        'text/plain',
        'text/markdown',
        'application/vnd.oasis.opendocument.text',
        'application/vnd.ms-word',
        'application/vnd.wordperfect'
      ],
      [FileCategory.IMAGES]: [
        'image/*'
      ],
      [FileCategory.SPREADSHEETS]: [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/vnd.oasis.opendocument.spreadsheet'
      ],
      [FileCategory.VIDEOS]: [
        'video/*'
      ],
      [FileCategory.AUDIO]: [
        'audio/*'
      ],
      [FileCategory.PDFS]: [
        'application/pdf'
      ]
    };

    return mimeTypeMap[category] || [];
  }

  async getDashboardStats(workspaceId: string, userId?: string): Promise<DashboardStatsResponseDto> {
    // Get workspace details for storage limits
    const workspaceQuery = await this.db.find('workspaces', { id: workspaceId });
    const workspaceData = Array.isArray(workspaceQuery.data) ? workspaceQuery.data : [];
    if (workspaceData.length === 0) {
      throw new NotFoundException('Workspace not found');
    }
    const workspace = workspaceData[0];

    // Open-source self-hosted: no plan-based storage limits
    const maxStorageGb = Number.POSITIVE_INFINITY;
    const planName = 'Self-hosted';
    const planId = 'self-hosted';
    const maxStorageBytes = Number.POSITIVE_INFINITY;

    // Get all workspace files
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];

    // WORKSPACE-WIDE: All files for storage calculation (used by all users)
    const workspaceFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      !f.is_deleted
    );

    // USER-SPECIFIC: Only current user's files for counts
    const userFiles = workspaceFiles.filter(f =>
      userId ? f.uploaded_by === userId : true
    );

    // Calculate total files (USER-SPECIFIC)
    const totalFiles = userFiles.length;

    // Calculate files added today (USER-SPECIFIC)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const filesAddedToday = userFiles.filter(f => {
      const createdDate = new Date(f.created_at);
      return createdDate >= today;
    }).length;

    // Calculate storage used (WORKSPACE-WIDE - everyone sees the same total)
    const storageUsedBytes = workspaceFiles.reduce((total, file) => {
      return total + (parseInt(file.size) || 0);
    }, 0);

    // Calculate AI generations this month (USER-SPECIFIC)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const aiGenerationsThisMonth = userFiles.filter(f => {
      const createdDate = new Date(f.created_at);
      return f.is_ai_generated === true && createdDate >= startOfMonth;
    }).length;

    // Calculate file type breakdown (USER-SPECIFIC)
    const fileTypeBreakdown = {
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0,
      spreadsheets: 0,
      pdfs: 0
    };

    for (const file of userFiles) {
      const mimeType = file.mime_type || '';

      // Check each category - order matters!
      // First check specific types (PDFs, images, videos, audio)
      // Then check document types (word docs, spreadsheets)
      // Finally, count anything that's NOT image/video/audio as a document
      if (this.matchesMimeTypes(mimeType, this.getMimeTypesForCategory(FileCategory.PDFS))) {
        fileTypeBreakdown.pdfs++;
      } else if (this.matchesMimeTypes(mimeType, this.getMimeTypesForCategory(FileCategory.IMAGES))) {
        fileTypeBreakdown.images++;
      } else if (this.matchesMimeTypes(mimeType, this.getMimeTypesForCategory(FileCategory.VIDEOS))) {
        fileTypeBreakdown.videos++;
      } else if (this.matchesMimeTypes(mimeType, this.getMimeTypesForCategory(FileCategory.AUDIO))) {
        fileTypeBreakdown.audio++;
      } else if (this.matchesMimeTypes(mimeType, this.getMimeTypesForCategory(FileCategory.SPREADSHEETS))) {
        fileTypeBreakdown.spreadsheets++;
      } else {
        // Count all other files (zip, env, unknown types, etc.) as documents
        // This ensures files like .zip, .env, .json, .xml, etc. are counted
        fileTypeBreakdown.documents++;
      }
    }

    // Count unique file types (categories with at least one file)
    const uniqueFileTypes = Object.values(fileTypeBreakdown).filter(count => count > 0).length;

    // Calculate storage percentage
    const storagePercentageUsed = maxStorageBytes > 0
      ? Math.round((storageUsedBytes / maxStorageBytes) * 10000) / 100
      : 0;

    return {
      total_files: totalFiles,
      files_added_today: filesAddedToday,
      storage_used_bytes: storageUsedBytes,
      storage_used_formatted: this.formatBytes(storageUsedBytes),
      storage_total_bytes: maxStorageBytes,
      storage_total_formatted: this.formatBytes(maxStorageBytes),
      storage_percentage_used: storagePercentageUsed,
      ai_generations_this_month: aiGenerationsThisMonth,
      unique_file_types: uniqueFileTypes,
      file_type_breakdown: fileTypeBreakdown,
      plan: {
        id: planId,
        name: planName,
        max_storage_gb: maxStorageGb
      }
    };
  }

  private matchesMimeTypes(mimeType: string, patterns: string[]): boolean {
    return patterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
        return regex.test(mimeType);
      }
      return mimeType === pattern;
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i];
  }

  async getDeletedItemsTree(workspaceId: string) {
    // Get all deleted folders
    const allFoldersResult = await this.db.find('folders', {});
    const allFoldersData = Array.isArray(allFoldersResult.data) ? allFoldersResult.data : [];
    const deletedFolders = allFoldersData.filter(f =>
      f.workspace_id === workspaceId &&
      f.is_deleted === true
    );

    // Get all deleted files
    const allFilesResult = await this.db.find('files', {});
    const allFilesData = Array.isArray(allFilesResult.data) ? allFilesResult.data : [];
    const deletedFiles = allFilesData.filter(f =>
      f.workspace_id === workspaceId &&
      f.is_deleted === true
    );

    // Build folder map for quick lookup
    const folderMap = new Map();
    deletedFolders.forEach(folder => {
      folderMap.set(folder.id, {
        ...folder,
        type: 'folder',
        children: [],
        files: []
      });
    });

    // Build tree structure for folders
    const rootFolders = [];

    deletedFolders.forEach(folder => {
      const folderNode = folderMap.get(folder.id);

      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        // Add to parent's children
        const parent = folderMap.get(folder.parent_id);
        parent.children.push(folderNode);
      } else {
        // Root level deleted folder (parent is null or parent is not deleted)
        rootFolders.push(folderNode);
      }
    });

    // Add files to their respective folders
    deletedFiles.forEach(file => {
      const fileNode = {
        ...file,
        type: 'file'
      };

      if (file.folder_id && folderMap.has(file.folder_id)) {
        // File belongs to a deleted folder
        const parentFolder = folderMap.get(file.folder_id);
        parentFolder.files.push(fileNode);
      } else {
        // File was deleted but folder is not deleted (or root level)
        // Add as root level item
        rootFolders.push(fileNode);
      }
    });

    // Sort everything by deleted_at (most recent first)
    const sortByDeletedAt = (a, b) => {
      const dateA = new Date(a.deleted_at || a.created_at).getTime();
      const dateB = new Date(b.deleted_at || b.created_at).getTime();
      return dateB - dateA;
    };

    // Recursively sort children and files in each folder
    const sortFolder = (folder) => {
      if (folder.children) {
        folder.children.sort(sortByDeletedAt);
        folder.children.forEach(child => sortFolder(child));
      }
      if (folder.files) {
        folder.files.sort(sortByDeletedAt);
      }
    };

    rootFolders.sort(sortByDeletedAt);
    rootFolders.forEach(item => {
      if (item.type === 'folder') {
        sortFolder(item);
      }
    });

    // Calculate statistics
    const stats = {
      total_deleted_folders: deletedFolders.length,
      total_deleted_files: deletedFiles.length,
      total_deleted_items: deletedFolders.length + deletedFiles.length,
      total_size_bytes: deletedFiles.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0),
      total_size_formatted: this.formatBytes(
        deletedFiles.reduce((sum, file) => sum + (parseInt(file.size) || 0), 0)
      )
    };

    return {
      items: rootFolders,
      stats
    };
  }

  // ============================================
  // FILE COMMENTS
  // ============================================

  async createComment(workspaceId: string, fileId: string, dto: CreateFileCommentDto, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // If this is a reply, verify parent comment exists
    if (dto.parent_id) {
      const parentComment = await this.db.findOne('file_comments', {
        id: dto.parent_id,
        file_id: fileId,
        is_deleted: false
      });
      if (!parentComment) {
        throw new NotFoundException('Parent comment not found');
      }
    }

    const commentData = {
      file_id: fileId,
      user_id: userId,
      content: dto.content,
      parent_id: dto.parent_id || null,
      metadata: dto.metadata || {},
      is_resolved: false,
      is_edited: false,
      is_deleted: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await this.db.insert('file_comments', commentData);

    // Fetch user info for the response
    const commentWithAuthor = await this.enrichCommentWithAuthor(result);

    // Emit socket event for real-time updates
    this.appGateway.emitToRoom(`file:${fileId}:comments`, 'file:comment:created', {
      fileId,
      comment: commentWithAuthor,
    });

    // Send notification to file owner if they're not the commenter
    if (file.uploaded_by && file.uploaded_by !== userId) {
      try {
        const commenterInfo = await this.db.getUserById(userId);
        const commenterName = commenterInfo?.name || commenterInfo?.email?.split('@')[0] || 'Someone';

        await this.notificationsService.sendNotification({
          user_id: file.uploaded_by,
          type: NotificationType.OTHER,
          title: `${commenterName} commented on your file`,
          message: `New comment on "${file.name}": "${dto.content.substring(0, 100)}${dto.content.length > 100 ? '...' : ''}"`,
          data: {
            fileId,
            fileName: file.name,
            commentId: result.id,
            commenterId: userId,
            commenterName,
            notificationType: 'file_comment',
          },
          action_url: `/${workspaceId}/files?fileId=${fileId}&tab=comments`,
        });
      } catch (error) {
        // Don't fail the comment creation if notification fails
        console.error('Failed to send comment notification:', error);
      }
    }

    // If this is a reply, also notify the parent comment author
    if (dto.parent_id) {
      const parentComment = await this.db.findOne('file_comments', { id: dto.parent_id });
      if (parentComment && parentComment.user_id !== userId && parentComment.user_id !== file.uploaded_by) {
        try {
          const commenterInfo = await this.db.getUserById(userId);
          const commenterName = commenterInfo?.name || commenterInfo?.email?.split('@')[0] || 'Someone';

          await this.notificationsService.sendNotification({
            user_id: parentComment.user_id,
            type: NotificationType.OTHER,
            title: `${commenterName} replied to your comment`,
            message: `Reply on "${file.name}": "${dto.content.substring(0, 100)}${dto.content.length > 100 ? '...' : ''}"`,
            data: {
              fileId,
              fileName: file.name,
              commentId: result.id,
              parentCommentId: dto.parent_id,
              commenterId: userId,
              commenterName,
              notificationType: 'file_comment_reply',
            },
            action_url: `/${workspaceId}/files?fileId=${fileId}&tab=comments`,
          });
        } catch (error) {
          console.error('Failed to send reply notification:', error);
        }
      }
    }

    return commentWithAuthor;
  }

  async getFileComments(workspaceId: string, fileId: string, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Get all non-deleted comments for the file
    const comments = await this.db.find('file_comments', {
      file_id: fileId,
      is_deleted: false
    });

    const commentsData = Array.isArray(comments.data) ? comments.data : (comments ? [comments] : []);

    // Enrich with author info and organize into threads
    const enrichedComments = await Promise.all(
      commentsData.map(comment => this.enrichCommentWithAuthor(comment))
    );

    // Organize into threads (top-level comments with their replies)
    const topLevelComments = enrichedComments.filter(c => !c.parentId);
    const replies = enrichedComments.filter(c => c.parentId);

    // Attach replies to their parent comments
    const commentsWithReplies = topLevelComments.map(comment => ({
      ...comment,
      replies: replies
        .filter(r => r.parentId === comment.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }));

    // Sort by created date (newest first for top-level)
    commentsWithReplies.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return commentsWithReplies;
  }

  async getComment(workspaceId: string, fileId: string, commentId: string, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const comment = await this.db.findOne('file_comments', {
      id: commentId,
      file_id: fileId,
      is_deleted: false
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.enrichCommentWithAuthor(comment);
  }

  async updateComment(workspaceId: string, fileId: string, commentId: string, dto: UpdateFileCommentDto, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const comment = await this.db.findOne('file_comments', {
      id: commentId,
      file_id: fileId,
      is_deleted: false
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the comment author can edit
    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateData = {
      content: dto.content,
      metadata: dto.metadata !== undefined ? dto.metadata : comment.metadata,
      is_edited: true,
      edited_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.db.update('file_comments', commentId, updateData);

    const updatedComment = await this.db.findOne('file_comments', { id: commentId });
    const commentWithAuthor = await this.enrichCommentWithAuthor(updatedComment);

    // Emit socket event for real-time updates
    this.appGateway.emitToRoom(`file:${fileId}:comments`, 'file:comment:updated', {
      fileId,
      comment: commentWithAuthor,
    });

    return commentWithAuthor;
  }

  async deleteComment(workspaceId: string, fileId: string, commentId: string, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const comment = await this.db.findOne('file_comments', {
      id: commentId,
      file_id: fileId,
      is_deleted: false
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Only the comment author or file owner can delete
    if (comment.user_id !== userId && file.uploaded_by !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    // Soft delete the comment and all its replies
    await this.db.update('file_comments', commentId, {
      is_deleted: true,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Also soft delete all replies
    const replies = await this.db.find('file_comments', {
      parent_id: commentId,
      is_deleted: false
    });

    const repliesData = Array.isArray(replies.data) ? replies.data : (replies ? [replies] : []);
    const deletedReplyIds: string[] = [];
    for (const reply of repliesData) {
      await this.db.update('file_comments', reply.id, {
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      deletedReplyIds.push(reply.id);
    }

    // Emit socket event for real-time updates
    this.appGateway.emitToRoom(`file:${fileId}:comments`, 'file:comment:deleted', {
      fileId,
      commentId,
      deletedReplyIds,
    });

    return { success: true, message: 'Comment deleted successfully' };
  }

  async resolveComment(workspaceId: string, fileId: string, commentId: string, isResolved: boolean, userId: string) {
    // Verify file exists and user has access
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    const comment = await this.db.findOne('file_comments', {
      id: commentId,
      file_id: fileId,
      is_deleted: false
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const updateData: any = {
      is_resolved: isResolved,
      updated_at: new Date().toISOString()
    };

    if (isResolved) {
      updateData.resolved_by = userId;
      updateData.resolved_at = new Date().toISOString();
    } else {
      updateData.resolved_by = null;
      updateData.resolved_at = null;
    }

    await this.db.update('file_comments', commentId, updateData);

    const updatedComment = await this.db.findOne('file_comments', { id: commentId });
    const commentWithAuthor = await this.enrichCommentWithAuthor(updatedComment);

    // Emit socket event for real-time updates
    this.appGateway.emitToRoom(`file:${fileId}:comments`, 'file:comment:resolved', {
      fileId,
      comment: commentWithAuthor,
      isResolved,
    });

    return commentWithAuthor;
  }

  private async enrichCommentWithAuthor(comment: any) {
    let author = null;

    try {
      // Try to get user info from database
      const userInfo = await this.db.getUserById(comment.user_id);
      if (userInfo) {
        author = {
          id: userInfo.id,
          name: userInfo.name || userInfo.email?.split('@')[0] || 'Unknown',
          email: userInfo.email,
          avatarUrl: userInfo.avatar_url
        };
      }
    } catch (error) {
      // User info not available
      author = {
        id: comment.user_id,
        name: 'Unknown User',
        email: '',
        avatarUrl: null
      };
    }

    return {
      id: comment.id,
      fileId: comment.file_id,
      userId: comment.user_id,
      content: comment.content,
      parentId: comment.parent_id,
      isResolved: comment.is_resolved,
      resolvedBy: comment.resolved_by,
      resolvedAt: comment.resolved_at,
      isEdited: comment.is_edited,
      editedAt: comment.edited_at,
      metadata: comment.metadata || {},
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      author
    };
  }

  // ============================================
  // OFFLINE FILES OPERATIONS
  // ============================================

  /**
   * Mark a file for offline access
   */
  async markFileOffline(
    workspaceId: string,
    fileId: string,
    userId: string,
    dto: MarkFileOfflineDto = {}
  ) {
    // Get the file to verify it exists and get its size
    const file = await this.getFile(fileId, workspaceId, userId);
    if (!file) {
      throw new NotFoundException('File not found');
    }

    // Check if already marked for offline
    const existingResult = await this.db.table('offline_files')
      .select('*')
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .execute();

    const existing = Array.isArray(existingResult.data) ? existingResult.data : [];

    if (existing.length > 0) {
      // Update existing record
      const updateResult = await this.db.table('offline_files')
        .update({
          auto_sync: dto.autoSync ?? true,
          priority: dto.priority ?? 0,
          sync_status: SyncStatus.PENDING,
          updated_at: new Date().toISOString()
        })
        .where('id', '=', existing[0].id)
        .execute();

      return this.formatOfflineFile(existing[0], file);
    }

    // Create new offline file record
    const offlineData = {
      file_id: fileId,
      user_id: userId,
      workspace_id: workspaceId,
      sync_status: SyncStatus.PENDING,
      auto_sync: dto.autoSync ?? true,
      priority: dto.priority ?? 0,
      file_size: file.size || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const insertResult = await this.db.insert('offline_files', offlineData);

    // The insert might not return data, so query it back
    const queryResult = await this.db.table('offline_files')
      .select('*')
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const inserted = Array.isArray(queryResult.data) && queryResult.data.length > 0
      ? queryResult.data[0]
      : { ...offlineData, id: insertResult?.data?.id || 'temp' };

    return this.formatOfflineFile(inserted, file);
  }

  /**
   * Remove file from offline access
   */
  async removeFileOffline(workspaceId: string, fileId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .delete()
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    return { success: true, message: 'File removed from offline access' };
  }

  /**
   * Get all offline files for a user in a workspace
   */
  async getOfflineFiles(workspaceId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    // Get file details for each offline file
    const filesWithDetails = await Promise.all(
      offlineFiles.map(async (offlineFile: any) => {
        try {
          const file = await this.getFile(offlineFile.file_id, workspaceId, userId);
          return this.formatOfflineFile(offlineFile, file);
        } catch (error) {
          // File might have been deleted
          return this.formatOfflineFile(offlineFile, null);
        }
      })
    );

    return filesWithDetails;
  }

  /**
   * Get offline status for a specific file
   */
  async getOfflineStatus(workspaceId: string, fileId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    if (offlineFiles.length === 0) {
      return { isOffline: false };
    }

    const file = await this.getFile(fileId, workspaceId, userId);
    return {
      isOffline: true,
      ...this.formatOfflineFile(offlineFiles[0], file)
    };
  }

  /**
   * Update offline file settings
   */
  async updateOfflineSettings(
    workspaceId: string,
    fileId: string,
    userId: string,
    dto: UpdateOfflineSettingsDto
  ) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    if (offlineFiles.length === 0) {
      throw new NotFoundException('File is not marked for offline access');
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (dto.autoSync !== undefined) updateData.auto_sync = dto.autoSync;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.syncStatus !== undefined) {
      updateData.sync_status = dto.syncStatus;
      if (dto.syncStatus === SyncStatus.SYNCED) {
        updateData.last_synced_at = new Date().toISOString();
        updateData.error_message = null;
      }
    }
    if (dto.syncedVersion !== undefined) updateData.synced_version = dto.syncedVersion;
    if (dto.errorMessage !== undefined) updateData.error_message = dto.errorMessage;

    await this.db.table('offline_files')
      .update(updateData)
      .where('id', '=', offlineFiles[0].id)
      .execute();

    const file = await this.getFile(fileId, workspaceId, userId);
    return this.formatOfflineFile({ ...offlineFiles[0], ...updateData }, file);
  }

  /**
   * Check if file has updates available (compare versions)
   */
  async checkFileUpdate(workspaceId: string, fileId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('file_id', '=', fileId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    if (offlineFiles.length === 0) {
      throw new NotFoundException('File is not marked for offline access');
    }

    const offlineFile = offlineFiles[0];
    const file = await this.getFile(fileId, workspaceId, userId);

    const serverVersion = file.version || 1;
    const syncedVersion = offlineFile.synced_version || 1;

    return {
      fileId,
      serverVersion,
      syncedVersion,
      hasUpdate: serverVersion > syncedVersion,
      fileSize: file.size || 0,
      updatedAt: file.updatedAt || file.updated_at
    };
  }

  /**
   * Batch update sync status for multiple files
   */
  async batchUpdateSyncStatus(
    workspaceId: string,
    userId: string,
    updates: Array<{
      fileId: string;
      syncStatus: SyncStatus;
      syncedVersion?: number;
      errorMessage?: string;
    }>
  ) {
    const results = await Promise.all(
      updates.map(async (update) => {
        try {
          await this.updateOfflineSettings(workspaceId, update.fileId, userId, {
            syncStatus: update.syncStatus,
            syncedVersion: update.syncedVersion,
            errorMessage: update.errorMessage
          });
          return { fileId: update.fileId, success: true };
        } catch (error) {
          return { fileId: update.fileId, success: false, error: error.message };
        }
      })
    );

    return results;
  }

  /**
   * Get offline storage statistics for a user
   */
  async getOfflineStorageStats(workspaceId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    const stats = {
      totalFiles: offlineFiles.length,
      totalSize: 0,
      pendingCount: 0,
      syncedCount: 0,
      errorCount: 0,
      outdatedCount: 0
    };

    offlineFiles.forEach((file: any) => {
      stats.totalSize += parseInt(file.file_size) || 0;

      switch (file.sync_status) {
        case SyncStatus.PENDING:
        case SyncStatus.SYNCING:
          stats.pendingCount++;
          break;
        case SyncStatus.SYNCED:
          stats.syncedCount++;
          break;
        case SyncStatus.ERROR:
          stats.errorCount++;
          break;
        case SyncStatus.OUTDATED:
          stats.outdatedCount++;
          break;
      }
    });

    return stats;
  }

  /**
   * Get files that need syncing (auto_sync enabled and outdated)
   */
  async getFilesNeedingSync(workspaceId: string, userId: string) {
    const result = await this.db.table('offline_files')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('auto_sync', '=', true)
      .execute();

    const offlineFiles = Array.isArray(result.data) ? result.data : [];

    // Check each file for updates
    const filesNeedingSync = await Promise.all(
      offlineFiles.map(async (offlineFile: any) => {
        try {
          const file = await this.getFile(workspaceId, offlineFile.file_id, userId);
          const serverVersion = file.version || 1;
          const syncedVersion = offlineFile.synced_version || 1;

          if (serverVersion > syncedVersion || offlineFile.sync_status === SyncStatus.OUTDATED) {
            return this.formatOfflineFile(offlineFile, file);
          }
          return null;
        } catch (error) {
          return null;
        }
      })
    );

    return filesNeedingSync.filter(f => f !== null);
  }

  /**
   * Format offline file record for API response
   */
  private formatOfflineFile(offlineRecord: any, file: any | null) {
    const response: any = {
      id: offlineRecord.id,
      fileId: offlineRecord.file_id,
      userId: offlineRecord.user_id,
      workspaceId: offlineRecord.workspace_id,
      syncStatus: offlineRecord.sync_status,
      lastSyncedAt: offlineRecord.last_synced_at,
      syncedVersion: offlineRecord.synced_version || 1,
      autoSync: offlineRecord.auto_sync,
      priority: offlineRecord.priority || 0,
      fileSize: parseInt(offlineRecord.file_size) || 0,
      errorMessage: offlineRecord.error_message,
      createdAt: offlineRecord.created_at,
      updatedAt: offlineRecord.updated_at
    };

    if (file) {
      response.fileName = file.name;
      response.mimeType = file.mimeType || file.mime_type;
      response.fileUrl = file.url;
      response.serverVersion = file.version || 1;
      response.needsSync = (file.version || 1) > (offlineRecord.synced_version || 1);
    }

    return response;
  }
}