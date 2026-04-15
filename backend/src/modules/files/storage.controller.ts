import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './files.service';
import { UploadFileDto } from './dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
@UseGuards(AuthGuard)
export class StorageController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload a file to storage',
    description:
      'Universal file upload endpoint for workspace icons, file attachments, and other assets',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'File ID' },
        name: { type: 'string', description: 'File name' },
        url: { type: 'string', description: 'Public URL to access the file' },
        mime_type: { type: 'string', description: 'MIME type' },
        size: { type: 'string', description: 'File size in bytes' },
        storage_path: { type: 'string', description: 'Internal storage path' },
        uploaded_by: { type: 'string', description: 'User ID who uploaded the file' },
        workspace_id: { type: 'string', description: 'Workspace ID' },
        created_at: { type: 'string', description: 'Upload timestamp' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or missing workspace_id' })
  @ApiResponse({ status: 413, description: 'File too large' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
    @CurrentUser('sub') userId: string,
  ) {
    console.log('Received file:', file);
    console.log('Received body:', uploadFileDto);

    if (!file) {
      throw new BadRequestException('No file provided. Please select a file to upload.');
    }

    // workspace_id is required for all uploads
    if (!uploadFileDto.workspace_id) {
      throw new BadRequestException('workspace_id is required');
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 100MB');
    }

    // Validate file type
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/bmp',
      'image/tiff',
      // Videos
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/aac',
      'audio/x-m4a',
      // Documents
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-zip-compressed',
      // Code/Text
      'application/json',
      'text/html',
      'text/css',
      'text/javascript',
      'application/javascript',
      // Generic binary (fallback for files with undetected MIME type)
      'application/octet-stream',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(`File type '${file.mimetype}' is not allowed`);
    }

    try {
      return await this.filesService.uploadFile(
        uploadFileDto.workspace_id,
        file,
        uploadFileDto,
        userId,
      );
    } catch (error) {
      console.error('Storage upload error:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
