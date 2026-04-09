import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthGuard } from '../../common/guards/auth.guard';
import { FormsService } from './forms.service';
import { FormResponsesService } from './form-responses.service';
import { FormAnalyticsService } from './form-analytics.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { SubmitResponseDto } from './dto/submit-response.dto';
import { FormCreateShareLinkDto } from './dto/form-share.dto';
import { FormStatus } from './entities/form.types';

@ApiTags('Forms')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('workspaces/:workspaceId/forms')
export class FormsController {
  constructor(
    private readonly formsService: FormsService,
    private readonly responsesService: FormResponsesService,
    private readonly analyticsService: FormAnalyticsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all forms in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'status', enum: FormStatus, required: false })
  @ApiResponse({ status: 200, description: 'Forms retrieved successfully' })
  async findAll(
    @Param('workspaceId') workspaceId: string,
    @Query('status') status: FormStatus,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const forms = await this.formsService.findAll(workspaceId, userId, status);
    return {
      data: forms,
      message: 'Forms retrieved successfully',
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Form created successfully' })
  async create(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateFormDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.create(workspaceId, userId, dto);
    return {
      data: form,
      message: 'Form created successfully',
    };
  }

  @Get(':formId')
  @ApiOperation({ summary: 'Get a form by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form retrieved successfully' })
  async findOne(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.findOne(formId, workspaceId, userId);
    return {
      data: form,
      message: 'Form retrieved successfully',
    };
  }

  @Put(':formId')
  @ApiOperation({ summary: 'Update a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form updated successfully' })
  async update(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Body() dto: UpdateFormDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.update(formId, workspaceId, userId, dto);
    return {
      data: form,
      message: 'Form updated successfully',
    };
  }

  @Delete(':formId')
  @ApiOperation({ summary: 'Delete a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.formsService.remove(formId, workspaceId, userId);
    return {
      message: 'Form deleted successfully',
    };
  }

  @Post(':formId/duplicate')
  @ApiOperation({ summary: 'Duplicate a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 201, description: 'Form duplicated successfully' })
  async duplicate(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.duplicate(formId, workspaceId, userId);
    return {
      data: form,
      message: 'Form duplicated successfully',
    };
  }

  @Post(':formId/publish')
  @ApiOperation({ summary: 'Publish a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form published successfully' })
  async publish(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.publish(formId, workspaceId, userId);
    return {
      data: form,
      message: 'Form published successfully',
    };
  }

  @Post(':formId/close')
  @ApiOperation({ summary: 'Close a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Form closed successfully' })
  async close(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const form = await this.formsService.close(formId, workspaceId, userId);
    return {
      data: form,
      message: 'Form closed successfully',
    };
  }

  // Share Links
  @Post(':formId/share')
  @ApiOperation({ summary: 'Create a share link for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 201, description: 'Share link created successfully' })
  async createShareLink(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Body() dto: FormCreateShareLinkDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const shareLink = await this.formsService.createShareLink(formId, workspaceId, userId, dto);
    return {
      data: shareLink,
      message: 'Share link created successfully',
    };
  }

  @Get(':formId/shares')
  @ApiOperation({ summary: 'Get all share links for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Share links retrieved successfully' })
  async getShareLinks(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const shares = await this.formsService.getShareLinks(formId, workspaceId, userId);
    return {
      data: shares,
      message: 'Share links retrieved successfully',
    };
  }

  @Delete('shares/:shareId')
  @ApiOperation({ summary: 'Delete a share link' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'shareId', description: 'Share link ID' })
  @ApiResponse({ status: 200, description: 'Share link deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async deleteShareLink(
    @Param('workspaceId') workspaceId: string,
    @Param('shareId') shareId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.formsService.deleteShareLink(shareId, workspaceId, userId);
    return {
      message: 'Share link deleted successfully',
    };
  }

  // Responses
  @Post(':formId/responses')
  @ApiOperation({ summary: 'Submit a response to a form (authenticated)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 201, description: 'Response submitted successfully' })
  async submitResponse(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Body() dto: SubmitResponseDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const response = await this.responsesService.submitResponse(
      formId,
      dto,
      userId,
      req.ip,
      req.get('user-agent'),
      workspaceId,
    );
    return {
      data: response,
      message: 'Response submitted successfully',
    };
  }

  @Get(':formId/responses')
  @ApiOperation({ summary: 'Get all responses for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Responses retrieved successfully' })
  async getResponses(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Query('limit') limit: number,
    @Query('offset') offset: number,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.responsesService.findAll(
      formId,
      workspaceId,
      userId,
      limit || 100,
      offset || 0,
    );
    return {
      data: result.data,
      total: result.total,
      message: 'Responses retrieved successfully',
    };
  }

  @Get(':formId/responses/export')
  @ApiOperation({ summary: 'Export responses to CSV' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Responses exported successfully' })
  async exportResponses(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
    @Res() res: Response,
  ) {
    const userId = req.user.sub || req.user.userId;
    const csv = await this.responsesService.exportToCSV(formId, workspaceId, userId);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="form-responses-${formId}.csv"`);
    res.send(csv);
  }

  @Get(':formId/responses/:responseId')
  @ApiOperation({ summary: 'Get a single response' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiParam({ name: 'responseId', description: 'Response ID' })
  @ApiResponse({ status: 200, description: 'Response retrieved successfully' })
  async getResponse(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Param('responseId') responseId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const response = await this.responsesService.findOne(responseId, formId, workspaceId, userId);
    return {
      data: response,
      message: 'Response retrieved successfully',
    };
  }

  @Delete(':formId/responses/:responseId')
  @ApiOperation({ summary: 'Delete a response' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiParam({ name: 'responseId', description: 'Response ID' })
  @ApiResponse({ status: 200, description: 'Response deleted successfully' })
  @HttpCode(HttpStatus.OK)
  async deleteResponse(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Param('responseId') responseId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    await this.responsesService.remove(responseId, formId, workspaceId, userId);
    return {
      message: 'Response deleted successfully',
    };
  }

  // Analytics
  @Get(':formId/analytics')
  @ApiOperation({ summary: 'Get analytics for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const analytics = await this.analyticsService.getAnalytics(formId, workspaceId, userId);
    return {
      data: analytics,
      message: 'Analytics retrieved successfully',
    };
  }

  @Post(':formId/analytics/calculate')
  @ApiOperation({ summary: 'Calculate analytics for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Analytics calculated successfully' })
  async calculateAnalytics(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const analytics = await this.analyticsService.calculateAnalytics(formId, workspaceId, userId);
    return {
      data: analytics,
      message: 'Analytics calculated successfully',
    };
  }

  @Get(':formId/summary')
  @ApiOperation({ summary: 'Get summary statistics for a form' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getSummary(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const summary = await this.responsesService.getSummary(formId, workspaceId, userId);
    return {
      data: summary,
      message: 'Summary retrieved successfully',
    };
  }

  @Get(':formId/timeline')
  @ApiOperation({ summary: 'Get response timeline' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'formId', description: 'Form ID' })
  @ApiQuery({ name: 'groupBy', enum: ['day', 'week', 'month'], required: false })
  @ApiResponse({ status: 200, description: 'Timeline retrieved successfully' })
  async getTimeline(
    @Param('workspaceId') workspaceId: string,
    @Param('formId') formId: string,
    @Query('groupBy') groupBy: 'day' | 'week' | 'month',
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const timeline = await this.analyticsService.getResponseTimeline(
      formId,
      workspaceId,
      userId,
      groupBy || 'day',
    );
    return {
      data: timeline,
      message: 'Timeline retrieved successfully',
    };
  }
}
