import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { DatabaseService } from '../database/database.service';

/**
 * Public Storage Controller
 * Handles public file uploads for marketing assets (videos, images) without authentication
 * Use case: Feature page videos, marketing images, public assets
 */
@ApiTags('public-storage')
@Controller('public/storage')
export class PublicStorageController {
  constructor(private readonly db: DatabaseService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Upload public file (videos/images)',
    description: 'Public endpoint for uploading marketing assets like feature videos, hero images, etc. No authentication required.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video or image file to upload (max 200MB)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        url: { type: 'string', example: 'https://storage.example.com/public/video.mp4' },
        fileName: { type: 'string', example: 'feature-video.mp4' },
        mimeType: { type: 'string', example: 'video/mp4' },
        size: { type: 'number', example: 5242880 },
        uploadedAt: { type: 'string', example: '2026-01-19T12:00:00.000Z' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file type not allowed' })
  @ApiResponse({ status: 413, description: 'File too large (max 200MB)' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPublicFile(@UploadedFile() file: Express.Multer.File) {
    console.log('📤 Public file upload received:', file?.originalname);

    if (!file) {
      throw new BadRequestException('No file provided. Please select a file to upload.');
    }

    // Validate file size (max 200MB for videos)
    const maxSize = 200 * 1024 * 1024; // 200MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size exceeds maximum limit of 200MB');
    }

    // Allowed file types for public assets
    const allowedTypes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      // Videos (for feature pages)
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type '${file.mimetype}' is not allowed. Allowed types: images (jpg, png, gif, webp, svg) and videos (mp4, webm, mov, avi, mkv)`,
      );
    }

    try {
      // Upload to storage service in public folder
      const bucket = 'public';
      const path = `marketing/${Date.now()}-${file.originalname}`;

      const uploadResult = await /* TODO: use StorageService */ this.db.uploadFile(
        bucket,
        file.buffer,
        path,
        {
          contentType: file.mimetype,
          metadata: {
            originalName: file.originalname,
            size: file.size.toString(),
            uploadedAt: new Date().toISOString(),
            type: 'public-marketing-asset',
          },
        },
      );

      console.log('✅ Public file uploaded successfully:', uploadResult.url);

      return {
        success: true,
        url: uploadResult.url,
        fileName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('❌ Public upload error:', error);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
