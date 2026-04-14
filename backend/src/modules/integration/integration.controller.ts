import { Controller, Post, Get, Body, Param, UseGuards, Delete } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IntegrationService } from './integration.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('integrations')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/integrations')
@UseGuards(AuthGuard, WorkspaceGuard)
export class IntegrationController {
  constructor(private readonly integrationService: IntegrationService) {}

  // ============================================
  // VIDEO CALLS
  // ============================================

  @Post('video-calls')
  @ApiOperation({ summary: 'Create a video call session' })
  @ApiResponse({ status: 201, description: 'Video call created' })
  async createVideoCall(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { channel_id?: string; conversation_id?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.integrationService.createVideoCall(
      workspaceId,
      body.channel_id,
      body.conversation_id,
      userId,
    );
  }

  @Post('video-calls/:sessionId/join')
  @ApiOperation({ summary: 'Join a video call session' })
  @ApiParam({ name: 'sessionId', description: 'Video call session ID' })
  @ApiResponse({ status: 200, description: 'Joined video call' })
  async joinVideoCall(@Param('sessionId') sessionId: string, @CurrentUser('sub') userId: string) {
    return this.integrationService.joinVideoCall(sessionId, userId);
  }

  @Delete('video-calls/:sessionId')
  @ApiOperation({ summary: 'End a video call session' })
  @ApiParam({ name: 'sessionId', description: 'Video call session ID' })
  @ApiResponse({ status: 200, description: 'Video call ended' })
  async endVideoCall(@Param('sessionId') sessionId: string, @CurrentUser('sub') userId: string) {
    return this.integrationService.endVideoCall(sessionId, userId);
  }

  // ============================================
  // AI SERVICES
  // ============================================

  @Post('ai/generate-text')
  @ApiOperation({ summary: 'Generate text using AI' })
  @ApiResponse({ status: 200, description: 'Text generated' })
  async generateText(@Body() body: { prompt: string; options?: any }) {
    return this.integrationService.generateText(body.prompt, body.options);
  }

  @Post('ai/summarize')
  @ApiOperation({ summary: 'Generate content summary' })
  @ApiResponse({ status: 200, description: 'Summary generated' })
  async generateSummary(
    @Body() body: { content: string; type?: 'meeting' | 'document' | 'conversation' },
  ) {
    return this.integrationService.generateSummary(body.content, body.type);
  }

  @Post('ai/meeting-notes')
  @ApiOperation({ summary: 'Generate meeting notes from transcript' })
  @ApiResponse({ status: 200, description: 'Meeting notes generated' })
  async generateMeetingNotes(@Body() body: { transcript: string }) {
    return this.integrationService.generateMeetingNotes(body.transcript);
  }

  @Post('ai/analyze-content')
  @ApiOperation({ summary: 'Analyze content' })
  @ApiResponse({ status: 200, description: 'Content analyzed' })
  async analyzeContent(
    @Body()
    body: {
      content: string;
      analysis_type?: 'sentiment' | 'readability' | 'seo' | 'engagement' | 'all';
    },
  ) {
    return this.integrationService.analyzeContent(body.content, body.analysis_type || 'all');
  }

  // ============================================
  // EMAIL NOTIFICATIONS
  // ============================================

  @Post('email/send')
  @ApiOperation({ summary: 'Send notification email' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  async sendEmail(@Body() body: { to: string | string[]; subject: string; content: string }) {
    return this.integrationService.sendNotificationEmail(body.to, body.subject, body.content);
  }

  // ============================================
  // PUSH NOTIFICATIONS
  // ============================================

  @Post('push/send')
  @ApiOperation({ summary: 'Send push notification' })
  @ApiResponse({ status: 200, description: 'Push notification sent' })
  async sendPushNotification(
    @Param('workspaceId') workspaceId: string,
    @Body() body: { title: string; body: string; user_ids?: string[] },
    @CurrentUser('sub') userId: string,
  ) {
    if (body.user_ids) {
      return this.integrationService.sendPushNotification(body.user_ids, body.title, body.body);
    } else {
      return this.integrationService.sendWorkspaceNotification(
        workspaceId,
        body.title,
        body.body,
        userId,
      );
    }
  }

  // ============================================
  // HEALTH CHECK
  // ============================================

  @Get('health')
  @ApiOperation({ summary: 'Check integration services health' })
  @ApiResponse({ status: 200, description: 'Health status' })
  async healthCheck() {
    return this.integrationService.healthCheck();
  }
}
