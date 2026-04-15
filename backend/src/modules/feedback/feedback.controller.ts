import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto, ResolveFeedbackDto } from './dto/update-feedback.dto';
import { FeedbackQueryDto } from './dto/feedback-query.dto';
import {
  CreateFeedbackResponseDto,
  FeedbackDto,
  FeedbackResponseDto,
  PaginatedFeedbackDto,
} from './dto/create-feedback-response.dto';

@ApiTags('Feedback')
@ApiBearerAuth()
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  // =============================================
  // USER ENDPOINTS
  // =============================================

  @Post()
  @ApiOperation({ summary: 'Submit new feedback' })
  @ApiResponse({ status: 201, description: 'Feedback submitted successfully' })
  async createFeedback(
    @Request() req,
    @Body() dto: CreateFeedbackDto,
  ): Promise<{ data: FeedbackDto; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const feedback = await this.feedbackService.createFeedback(userId, dto);
    return {
      data: feedback,
      message: 'Feedback submitted successfully',
    };
  }

  @Get('my')
  @ApiOperation({ summary: "Get user's feedback list" })
  @ApiResponse({ status: 200, description: 'Feedback list retrieved' })
  async getUserFeedback(
    @Request() req,
    @Query() query: FeedbackQueryDto,
  ): Promise<{ data: PaginatedFeedbackDto; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.feedbackService.getUserFeedback(userId, query);
    return {
      data: result,
      message: 'Feedback retrieved successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get single feedback details' })
  @ApiResponse({ status: 200, description: 'Feedback retrieved' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async getFeedbackById(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: FeedbackDto; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const feedback = await this.feedbackService.getFeedbackById(userId, id, false);
    return {
      data: feedback,
      message: 'Feedback retrieved successfully',
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload feedback attachment' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadAttachment(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ data: { url: string; name: string; type: string; size: number }; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const result = await this.feedbackService.uploadAttachment(userId, file);
    return {
      data: result,
      message: 'File uploaded successfully',
    };
  }

  @Get(':id/responses')
  @ApiOperation({ summary: 'Get responses for feedback' })
  @ApiResponse({ status: 200, description: 'Responses retrieved' })
  async getResponses(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: FeedbackResponseDto[]; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const responses = await this.feedbackService.getResponses(id, userId, false);
    return {
      data: responses,
      message: 'Responses retrieved successfully',
    };
  }

  // =============================================
  // ADMIN ENDPOINTS
  // =============================================

  @Get('admin/list')
  @ApiOperation({ summary: 'Get all feedback (admin)' })
  @ApiResponse({ status: 200, description: 'Feedback list retrieved' })
  async getAllFeedback(
    @Query() query: FeedbackQueryDto,
  ): Promise<{ data: PaginatedFeedbackDto; message: string }> {
    const result = await this.feedbackService.getAllFeedback(query);
    return {
      data: result,
      message: 'Feedback retrieved successfully',
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update feedback (admin)' })
  @ApiResponse({ status: 200, description: 'Feedback updated' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async updateFeedback(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackDto,
  ): Promise<{ data: FeedbackDto; message: string }> {
    const feedback = await this.feedbackService.updateFeedback(id, dto);
    return {
      data: feedback,
      message: 'Feedback updated successfully',
    };
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Resolve feedback and notify user (admin)' })
  @ApiResponse({ status: 200, description: 'Feedback resolved' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async resolveFeedback(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveFeedbackDto,
  ): Promise<{ data: FeedbackDto; message: string }> {
    const adminUserId = req.user.sub || req.user.userId;
    const feedback = await this.feedbackService.resolveFeedback(id, adminUserId, dto);
    return {
      data: feedback,
      message: 'Feedback resolved successfully',
    };
  }

  @Post(':id/response')
  @ApiOperation({ summary: 'Add admin response to feedback' })
  @ApiResponse({ status: 201, description: 'Response added' })
  @ApiResponse({ status: 404, description: 'Feedback not found' })
  async addResponse(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateFeedbackResponseDto,
  ): Promise<{ data: FeedbackResponseDto; message: string }> {
    const adminUserId = req.user.sub || req.user.userId;
    const response = await this.feedbackService.addResponse(id, adminUserId, dto);
    return {
      data: response,
      message: 'Response added successfully',
    };
  }

  @Get('admin/:id/responses')
  @ApiOperation({ summary: 'Get all responses for feedback including internal notes (admin)' })
  @ApiResponse({ status: 200, description: 'Responses retrieved' })
  async getAdminResponses(
    @Request() req,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ data: FeedbackResponseDto[]; message: string }> {
    const userId = req.user.sub || req.user.userId;
    const responses = await this.feedbackService.getResponses(id, userId, true);
    return {
      data: responses,
      message: 'Responses retrieved successfully',
    };
  }
}
