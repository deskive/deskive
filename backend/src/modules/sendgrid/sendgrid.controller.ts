import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { SendGridService } from './sendgrid.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
  SendGridConnectDto,
  SendGridSendEmailDto,
  ListTemplatesQueryDto,
  GetStatsQueryDto,
  SendBulkEmailDto,
} from './dto/sendgrid.dto';

@ApiTags('sendgrid')
@Controller('workspaces/:workspaceId/sendgrid')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class SendGridController {
  constructor(private readonly sendGridService: SendGridService) {}

  // ==================== Connection Endpoints ====================

  @Post('connect')
  @ApiOperation({ summary: 'Connect SendGrid by providing API key' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'SendGrid connected successfully' })
  @ApiResponse({ status: 400, description: 'Invalid API key' })
  async connect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() connectDto: SendGridConnectDto,
  ) {
    const connection = await this.sendGridService.saveConnection(
      userId,
      workspaceId,
      connectDto,
    );
    return {
      data: connection,
      message: 'SendGrid connected successfully',
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get current SendGrid connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection details or null if not connected' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.sendGridService.getConnection(userId, workspaceId);
    return {
      data: connection,
      message: connection ? 'Connected' : 'Not connected',
    };
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Disconnect SendGrid connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  @ApiResponse({ status: 404, description: 'Connection not found' })
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.sendGridService.disconnect(userId, workspaceId);
    return {
      data: null,
      message: 'SendGrid disconnected successfully',
    };
  }

  @Post('test')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test the SendGrid API key connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.sendGridService.testConnection(userId, workspaceId);
    return {
      data: result,
      message: result.success ? 'Connection test passed' : 'Connection test failed',
    };
  }

  // ==================== Email Endpoints ====================

  @Post('send')
  @ApiOperation({ summary: 'Send an email via SendGrid' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data or send failed' })
  @ApiResponse({ status: 404, description: 'SendGrid not connected' })
  async sendEmail(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() emailDto: SendGridSendEmailDto,
  ) {
    const result = await this.sendGridService.sendEmail(userId, workspaceId, emailDto);
    return {
      data: result,
      message: result.success ? 'Email sent successfully' : 'Failed to send email',
    };
  }

  @Post('send-bulk')
  @ApiOperation({ summary: 'Send bulk emails using a template' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Bulk emails sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid email data or send failed' })
  @ApiResponse({ status: 404, description: 'SendGrid not connected' })
  async sendBulkEmail(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() bulkEmailDto: SendBulkEmailDto,
  ) {
    const result = await this.sendGridService.sendBulkEmail(userId, workspaceId, bulkEmailDto);
    return {
      data: result,
      message: result.status === 'sent' ? 'Bulk emails sent successfully' : 'Failed to send bulk emails',
    };
  }

  // ==================== Template Endpoints ====================

  @Get('templates')
  @ApiOperation({ summary: 'List email templates from SendGrid' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  @ApiResponse({ status: 404, description: 'SendGrid not connected' })
  async listTemplates(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListTemplatesQueryDto,
  ) {
    const result = await this.sendGridService.listTemplates(userId, workspaceId, {
      generations: query.generations,
      pageSize: query.pageSize,
      pageToken: query.pageToken,
    });
    return {
      data: result,
      message: 'Templates retrieved successfully',
    };
  }

  @Get('templates/:templateId')
  @ApiOperation({ summary: 'Get a specific template by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'templateId', description: 'SendGrid template ID' })
  @ApiResponse({ status: 200, description: 'Template details' })
  @ApiResponse({ status: 404, description: 'Template or connection not found' })
  async getTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('templateId') templateId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const template = await this.sendGridService.getTemplate(userId, workspaceId, templateId);
    return {
      data: template,
      message: 'Template retrieved successfully',
    };
  }

  // ==================== Stats Endpoints ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get email statistics from SendGrid' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Email statistics' })
  @ApiResponse({ status: 404, description: 'SendGrid not connected' })
  async getStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: GetStatsQueryDto,
  ) {
    const result = await this.sendGridService.getStats(userId, workspaceId, {
      startDate: query.startDate,
      endDate: query.endDate,
      aggregatedBy: query.aggregatedBy,
    });
    return {
      data: result,
      message: 'Statistics retrieved successfully',
    };
  }
}
