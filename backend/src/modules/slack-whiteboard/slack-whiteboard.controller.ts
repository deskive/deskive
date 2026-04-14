import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  Headers,
  HttpStatus,
  Logger,
  Req,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SlackWhiteboardService } from './slack-whiteboard.service';
import { SlackProjectsService } from '../slack-projects/slack-projects.service';
import { SlackCalendarService } from '../slack-calendar/slack-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as crypto from 'crypto';

@ApiTags('Slack Whiteboard')
@Controller('slack/whiteboard')
export class SlackWhiteboardController {
  private readonly logger = new Logger(SlackWhiteboardController.name);

  constructor(
    private readonly slackWhiteboardService: SlackWhiteboardService,
    @Inject(forwardRef(() => SlackProjectsService))
    private readonly slackProjectsService: SlackProjectsService,
    @Inject(forwardRef(() => SlackCalendarService))
    private readonly slackCalendarService: SlackCalendarService,
  ) {}

  /**
   * Installation endpoint - Entry point from Slack App Directory
   * Returns 302 redirect to OAuth URL (satisfies Slack requirement)
   * URL: /api/v1/slack/whiteboard/install
   */
  @Get('install')
  @ApiOperation({ summary: 'Installation endpoint for Slack App Directory' })
  async install(@Res() res: Response) {
    try {
      this.logger.log('📥 Installation request received from Slack App Directory');

      // Build OAuth URL
      const clientId = process.env.SLACK_WHITEBOARD_CLIENT_ID;
      const redirectUri = encodeURIComponent(
        process.env.SLACK_REDIRECT_URI ||
          'https://api.deskive.com/api/v1/slack/whiteboard/oauth/callback',
      );
      const scopes = encodeURIComponent(
        'app_mentions:read,channels:join,channels:read,chat:write,commands,im:read,im:write,users:read,users:read.email,chat:write.public,groups:read,groups:write',
      );

      const oauthUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scopes}&redirect_uri=${redirectUri}`;

      this.logger.log('🔄 Returning 302 redirect to OAuth URL');

      // Return 302 redirect (satisfies Slack App Directory requirement)
      return res.redirect(302, oauthUrl);
    } catch (error) {
      this.logger.error('❌ Installation endpoint error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'https://deskive.com';
      return res.redirect(`${frontendUrl}/slack/error?reason=install_failed`);
    }
  }

  /**
   * OAuth callback - Handles Slack app installation
   * URL: /api/v1/slack/whiteboard/oauth/callback
   */
  @Get('oauth/callback')
  @ApiOperation({ summary: 'Handle Slack OAuth callback' })
  async oauthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    try {
      this.logger.log('OAuth callback received');

      if (!code) {
        this.logger.error('No code provided in OAuth callback');
        const frontendUrl = process.env.FRONTEND_URL || 'https://deskive.com';
        return res.redirect(`${frontendUrl}/slack/error?reason=no_code`);
      }

      const result = await this.slackWhiteboardService.handleOAuthCallback(code, state);

      this.logger.log('OAuth callback successful, redirecting user...');

      const frontendUrl = process.env.FRONTEND_URL || 'https://deskive.com';

      // Redirect to login/register page with setup token
      return res.redirect(`${frontendUrl}/auth/login?slack_setup=${result.setupToken}`);
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      const frontendUrl = process.env.FRONTEND_URL || 'https://deskive.com';
      return res.redirect(
        `${frontendUrl}/slack/error?reason=oauth_failed&message=${encodeURIComponent(error.message)}`,
      );
    }
  }

  /**
   * Complete Slack setup after user logs in/registers
   * URL: /api/v1/slack/whiteboard/complete-setup
   */
  @Post('complete-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete Slack setup after authentication' })
  async completeSetup(@Req() req: Request, @Body() body: { setupToken: string }) {
    try {
      const userId = req.user['sub'] || req.user['userId'];

      this.logger.log('🔗 [Complete Setup] Endpoint called');
      this.logger.log('👤 [Complete Setup] User ID:', userId);
      this.logger.log('🎫 [Complete Setup] Setup token:', body.setupToken);
      this.logger.log('📦 [Complete Setup] Request body:', body);

      if (!body.setupToken) {
        this.logger.error('❌ [Complete Setup] No setup token provided');
        return {
          success: false,
          message: 'Setup token is required',
        };
      }

      const result = await this.slackWhiteboardService.completeSlackSetup(userId, body.setupToken);

      this.logger.log('✅ [Complete Setup] Success! Result:', result);

      return {
        success: true,
        data: result,
        message: 'Slack workspace setup completed successfully',
      };
    } catch (error) {
      this.logger.error('❌ [Complete Setup] Error:', error.message);
      this.logger.error('❌ [Complete Setup] Full error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Send Slack notification after project creation
   * URL: /api/v1/slack/whiteboard/notify/project
   */
  @Post('notify/project')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send Slack notification after project creation' })
  async notifyProjectCreation(
    @Req() req: Request,
    @Body()
    body: {
      projectId: string;
      slackTeamId: string;
      slackUserId: string;
    },
  ) {
    try {
      this.logger.log('📨 [Notify Project] Sending notification for project:', body.projectId);

      if (!body.projectId || !body.slackTeamId || !body.slackUserId) {
        return {
          success: false,
          message: 'projectId, slackTeamId, and slackUserId are required',
        };
      }

      await this.slackWhiteboardService.notifySlackAfterProjectCreation(
        body.projectId,
        body.slackTeamId,
        body.slackUserId,
      );

      return {
        success: true,
        message: 'Slack notification sent successfully',
      };
    } catch (error) {
      this.logger.error('❌ [Notify Project] Error:', error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Send Slack notification after task creation
   * URL: /api/v1/slack/whiteboard/notify/task
   */
  @Post('notify/task')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send Slack notification after task creation' })
  async notifyTaskCreation(
    @Req() req: Request,
    @Body()
    body: {
      taskId: string;
      slackTeamId: string;
      slackUserId: string;
    },
  ) {
    try {
      this.logger.log('📨 [Notify Task] Sending notification for task:', body.taskId);

      if (!body.taskId || !body.slackTeamId || !body.slackUserId) {
        return {
          success: false,
          message: 'taskId, slackTeamId, and slackUserId are required',
        };
      }

      await this.slackWhiteboardService.notifySlackAfterTaskCreation(
        body.taskId,
        body.slackTeamId,
        body.slackUserId,
      );

      return {
        success: true,
        message: 'Slack notification sent successfully',
      };
    } catch (error) {
      this.logger.error('❌ [Notify Task] Error:', error.message);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Slash command handler - /whiteboard
   * URL: /api/v1/slack/whiteboard/command
   */
  @Post('command')
  @ApiOperation({ summary: 'Handle /whiteboard slash command' })
  async handleCommand(
    @Body() payload: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    try {
      this.logger.log('Slash command received:', payload.command, payload.text);

      // TODO: Fix signature verification for form-encoded data
      // For now, verify token as fallback
      if (payload.token !== process.env.SLACK_WHITEBOARD_VERIFICATION_TOKEN) {
        this.logger.error('Invalid verification token');
        return {
          response_type: 'ephemeral',
          text: '❌ Invalid request. Please try again.',
        };
      }

      return await this.slackWhiteboardService.handleCommand(payload);
    } catch (error) {
      this.logger.error('Error handling command:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error: ${error.message}`,
      };
    }
  }

  /**
   * Event subscriptions handler
   * URL: /api/v1/slack/whiteboard/events
   */
  @Post('events')
  @ApiOperation({ summary: 'Handle Slack events' })
  async handleEvents(
    @Body() payload: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    // Handle URL verification challenge (Slack setup)
    if (payload.type === 'url_verification') {
      this.logger.log('URL verification challenge received');
      return { challenge: payload.challenge };
    }

    try {
      // Verify signature
      if (!this.verifySlackRequest(payload, signature, timestamp)) {
        this.logger.error('Invalid Slack signature for event');
        throw new Error('Invalid signature');
      }

      // Process event asynchronously (respond to Slack within 3s)
      setImmediate(() => this.slackWhiteboardService.handleEvent(payload));

      return { ok: true };
    } catch (error) {
      this.logger.error('Error handling event:', error);
      return { ok: false };
    }
  }

  /**
   * Interactive components handler (buttons, modals)
   * URL: /api/v1/slack/whiteboard/interactions
   */
  @Post('interactions')
  @ApiOperation({ summary: 'Handle Slack interactions' })
  async handleInteractions(
    @Req() req: Request & { rawBody?: string },
    @Body() body: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    try {
      // Get the raw body for signature verification (stored by RawBodyMiddleware)
      const rawBody = req.rawBody;

      this.logger.log('Raw body available:', !!rawBody);

      // Parse the payload
      const payload = typeof body.payload === 'string' ? JSON.parse(body.payload) : body;

      this.logger.log('Interaction received:', payload.type);

      // Verify signature with raw body
      if (rawBody && !this.verifySlackRequest(rawBody, signature, timestamp)) {
        this.logger.error('Invalid Slack signature for interaction');
        return { ok: false };
      } else if (!rawBody) {
        this.logger.warn('No raw body available for signature verification, skipping check');
      }

      // Route interaction to appropriate service based on action_id or callback_id
      const isProjectInteraction = this.isProjectRelated(payload);
      const isCalendarInteraction = this.isCalendarRelated(payload);

      // For view_submission (modal submissions), we need to respond synchronously
      // For block_actions (button clicks), we can respond asynchronously
      if (payload.type === 'view_submission') {
        this.logger.log('Modal submission - processing synchronously');

        if (isCalendarInteraction) {
          this.logger.log('Routing to SlackCalendarService');
          await this.slackCalendarService.handleInteraction(payload);
        } else if (isProjectInteraction) {
          this.logger.log('Routing to SlackProjectsService');
          await this.slackProjectsService.handleInteraction(payload);
        } else {
          this.logger.log('Routing to SlackWhiteboardService');
          await this.slackWhiteboardService.handleInteraction(payload);
        }

        // Return empty response to close the modal
        return {};
      } else {
        // For button clicks, process asynchronously
        if (isCalendarInteraction) {
          this.logger.log('Routing to SlackCalendarService');
          setImmediate(() => this.slackCalendarService.handleInteraction(payload));
        } else if (isProjectInteraction) {
          this.logger.log('Routing to SlackProjectsService');
          setImmediate(() => this.slackProjectsService.handleInteraction(payload));
        } else {
          this.logger.log('Routing to SlackWhiteboardService');
          setImmediate(() => this.slackWhiteboardService.handleInteraction(payload));
        }

        return { ok: true };
      }
    } catch (error) {
      this.logger.error('Error handling interaction:', error);
      return { ok: false };
    }
  }

  /**
   * Check if interaction is project-related
   */
  private isProjectRelated(payload: any): boolean {
    // Check callback_id for modals
    if (payload.type === 'view_submission') {
      const callbackId = payload.view?.callback_id || '';
      return callbackId.includes('project') || callbackId.includes('task');
    }

    // Check action_id for button clicks
    if (payload.type === 'block_actions' && payload.actions?.length > 0) {
      const actionId = payload.actions[0].action_id || '';
      return (
        actionId.includes('project') ||
        actionId.includes('task') ||
        actionId.includes('add_task') ||
        actionId.includes('share_project')
      );
    }

    return false;
  }

  /**
   * Check if interaction is calendar-related
   */
  private isCalendarRelated(payload: any): boolean {
    // Check callback_id for modals
    if (payload.type === 'view_submission') {
      const callbackId = payload.view?.callback_id || '';
      return callbackId.includes('calendar') || callbackId.includes('event');
    }

    // Check action_id for button clicks
    if (payload.type === 'block_actions' && payload.actions?.length > 0) {
      const actionId = payload.actions[0].action_id || '';
      return (
        actionId.includes('calendar') || actionId.includes('event') || actionId.includes('rsvp')
      );
    }

    return false;
  }

  /**
   * Verify Slack request signature (security)
   */
  private verifySlackRequest(body: any, signature: string, timestamp: string): boolean {
    if (!signature || !timestamp) {
      this.logger.warn('Missing signature or timestamp');
      return false;
    }

    const signingSecret = process.env.SLACK_WHITEBOARD_SIGNING_SECRET;

    if (!signingSecret) {
      this.logger.error('SLACK_WHITEBOARD_SIGNING_SECRET not configured');
      return false;
    }

    // Prevent replay attacks (>5 minutes old)
    const currentTime = Math.floor(Date.now() / 1000);
    const requestAge = Math.abs(currentTime - parseInt(timestamp));

    if (requestAge > 300) {
      this.logger.warn('Slack request too old:', requestAge, 'seconds');
      return false;
    }

    // Generate expected signature
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const signatureBaseString = `v0:${timestamp}:${bodyString}`;
    const mySignature =
      'v0=' + crypto.createHmac('sha256', signingSecret).update(signatureBaseString).digest('hex');

    // Compare signatures (timing-safe)
    try {
      return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
    } catch (error) {
      this.logger.error('Signature comparison failed:', error);
      return false;
    }
  }
}
