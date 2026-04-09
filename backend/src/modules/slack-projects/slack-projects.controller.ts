import { Controller, Post, Get, Body, Query, Res, Headers, HttpStatus, Logger, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { SlackProjectsService } from './slack-projects.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import * as crypto from 'crypto';

@ApiTags('Slack Projects')
@Controller('slack/projects')
export class SlackProjectsController {
  private readonly logger = new Logger(SlackProjectsController.name);

  constructor(private readonly slackProjectsService: SlackProjectsService) {}

  /**
   * Slash command handler - /deskive project
   * URL: /api/v1/slack/projects/command
   */
  @Post('command')
  @ApiOperation({ summary: 'Handle /deskive project slash command' })
  async handleCommand(
    @Body() payload: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    try {
      this.logger.log('Project command received:', payload.command, payload.text);

      // Verify token
      if (payload.token !== process.env.SLACK_WHITEBOARD_VERIFICATION_TOKEN) {
        this.logger.error('Invalid verification token');
        return {
          response_type: 'ephemeral',
          text: '❌ Invalid request. Please try again.',
        };
      }

      return await this.slackProjectsService.handleCommand(payload);
    } catch (error) {
      this.logger.error('Error handling command:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error: ${error.message}`,
      };
    }
  }

  /**
   * Interactive components handler (buttons, modals)
   * URL: /api/v1/slack/projects/interactions
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
      // Get the raw body for signature verification
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

      // Process interaction asynchronously
      setImmediate(() => this.slackProjectsService.handleInteraction(payload));

      return { ok: true };
    } catch (error) {
      this.logger.error('Error handling interaction:', error);
      return { ok: false };
    }
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
      'v0=' +
      crypto.createHmac('sha256', signingSecret).update(signatureBaseString).digest('hex');

    // Compare signatures (timing-safe)
    try {
      return crypto.timingSafeEqual(Buffer.from(mySignature), Buffer.from(signature));
    } catch (error) {
      this.logger.error('Signature comparison failed:', error);
      return false;
    }
  }
}
