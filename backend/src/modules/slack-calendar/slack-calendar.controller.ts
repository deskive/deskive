import { Controller, Post, Body, Headers, Logger, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SlackCalendarService } from './slack-calendar.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Slack Calendar')
@Controller('slack/calendar')
export class SlackCalendarController {
  private readonly logger = new Logger(SlackCalendarController.name);

  constructor(private readonly slackCalendarService: SlackCalendarService) {}

  /**
   * NOTE: OAuth, Events, Interactions, and Complete-Setup endpoints are handled by SlackWhiteboardController
   * This controller ONLY handles the calendar slash command
   */

  /**
   * Slash command handler - /calendar
   * URL: /api/v1/slack/calendar/command
   */
  @Post('command')
  @ApiOperation({ summary: 'Handle /calendar slash command' })
  async handleCommand(
    @Body() payload: any,
    @Headers('x-slack-signature') signature: string,
    @Headers('x-slack-request-timestamp') timestamp: string,
  ) {
    try {
      this.logger.log('Calendar slash command received:', payload.command, payload.text);

      // Verify token
      if (payload.token !== process.env.SLACK_WHITEBOARD_VERIFICATION_TOKEN) {
        this.logger.error('Invalid verification token for calendar command');
        return {
          response_type: 'ephemeral',
          text: '❌ Invalid request. Please try again.',
        };
      }

      const result = await this.slackCalendarService.handleCommand(payload);

      // If result is empty (modal was opened), return 200 with empty body
      if (!result || Object.keys(result).length === 0) {
        return {};
      }

      return result;
    } catch (error) {
      this.logger.error('Error handling calendar command:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error: ${error.message}`,
      };
    }
  }
}
