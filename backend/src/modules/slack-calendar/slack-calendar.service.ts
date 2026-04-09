import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WebClient } from '@slack/web-api';
import { DatabaseService } from '../database/database.service';
import { CalendarService } from '../calendar/calendar.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SlackCalendarService {
  private readonly logger = new Logger(SlackCalendarService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly calendarService: CalendarService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Strip HTML tags and decode HTML entities for Slack messages
   */
  private stripHtml(html: string): string {
    if (!html) return '';

    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&rdquo;/g, '"')
      .replace(/&ldquo;/g, '"')
      .replace(/&rsquo;/g, "'")
      .replace(/&lsquo;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–');

    // Remove excessive whitespace
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  }

  /**
   * Handle OAuth installation callback for Calendar app
   */
  async handleOAuthCallback(code: string, state: string) {
    this.logger.log('Processing Calendar OAuth callback...');

    const client = new WebClient();

    try {
      // Exchange authorization code for access token
      const result = await client.oauth.v2.access({
        client_id: this.configService.get('SLACK_WHITEBOARD_CLIENT_ID'),
        client_secret: this.configService.get('SLACK_WHITEBOARD_CLIENT_SECRET'),
        code,
      });

      this.logger.log('Calendar OAuth exchange successful for team:', result.team.name);

      // Get Slack user profile
      const authedUserId = result.authed_user.id;
      const userAccessToken = result.authed_user?.access_token;

      const slackClient = new WebClient(userAccessToken || result.access_token);
      const userInfo = await slackClient.users.info({ user: authedUserId });

      const slackUserEmail = userInfo.user.profile.email;
      const slackUserName = userInfo.user.profile.real_name || userInfo.user.name;
      const slackUserAvatar = userInfo.user.profile.image_512 || userInfo.user.profile.image_192;

      this.logger.log('Slack user info retrieved for calendar:', slackUserEmail);

      // Store Slack OAuth data temporarily for after user logs in/registers
      const slackSetupData = {
        slack_user_id: authedUserId,
        slack_team_id: result.team.id,
        slack_team_name: result.team.name,
        slack_email: slackUserEmail,
        slack_name: slackUserName,
        slack_avatar: slackUserAvatar,
        user_access_token: userAccessToken,
        bot_token: result.access_token,
        bot_user_id: result.bot_user_id,
        app_type: 'calendar', // Mark this as calendar app
        timestamp: Date.now(),
      };

      // Store in database temporarily (reusing slack_setup_sessions)
      const setupToken = randomBytes(32).toString('hex');
      await this.db.table('slack_setup_sessions')
        .insert({
          setup_token: setupToken,
          slack_data: JSON.stringify(slackSetupData),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          created_at: new Date().toISOString(),
        })
        .execute();

      this.logger.log('Calendar setup session created:', setupToken);

      // Store installation data in whiteboard table (shared by all features)
      const existingInstallation = await this.db.table('slack_whiteboard_installations')
        .select('*')
        .where('team_id', '=', result.team.id)
        .execute();

      const installationData = {
        team_id: result.team.id,
        team_name: result.team.name,
        bot_token: result.access_token,
        bot_user_id: result.bot_user_id,
        installer_user_id: result.authed_user.id,
        user_token: result.authed_user?.access_token || null,
        scope: result.scope,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (existingInstallation.data && existingInstallation.data.length > 0) {
        await this.db.table('slack_whiteboard_installations')
          .update(installationData)
          .where('team_id', '=', result.team.id)
          .execute();

        this.logger.log('Updated existing installation for team:', result.team.id);
      } else {
        await this.db.table('slack_whiteboard_installations')
          .insert({
            ...installationData,
            created_at: new Date().toISOString(),
          })
          .execute();

        this.logger.log('Created new installation for team:', result.team.id);
      }

      return {
        setupToken,
        teamId: result.team.id,
        teamName: result.team.name,
      };
    } catch (error) {
      this.logger.error('Calendar OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Complete Slack Calendar setup after user authenticates
   */
  async completeSlackSetup(userId: string, setupToken: string) {
    this.logger.log('[Calendar Setup] Starting for user:', userId, 'with token:', setupToken);

    // Get setup session
    const sessionResult = await this.db.table('slack_setup_sessions')
      .select('*')
      .where('setup_token', '=', setupToken)
      .where('completed', '=', false)
      .execute();

    if (!sessionResult.data || sessionResult.data.length === 0) {
      this.logger.error('[Calendar Setup] Invalid or expired setup token');
      throw new Error('Invalid or expired setup token');
    }

    const session = sessionResult.data[0];
    const slackData = session.slack_data;

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      this.logger.error('[Calendar Setup] Session expired');
      throw new Error('Setup session expired. Please install the app again from Slack.');
    }

    // Create or get workspace for Slack team
    const workspaceId = await this.getOrCreateSlackWorkspace(slackData.slack_team_id, slackData.slack_team_name);

    // Add user to workspace
    await this.ensureUserInWorkspace(workspaceId, userId, true);

    // Create user mapping (reusing slack_user_mappings)
    await this.createOrUpdateUserMapping(
      userId,
      slackData.slack_user_id,
      slackData.slack_team_id,
      slackData.slack_email,
      slackData.slack_name,
      slackData.slack_avatar,
      slackData.user_access_token,
      true
    );

    // Mark session as completed
    await this.db.table('slack_setup_sessions')
      .update({ completed: true })
      .where('setup_token', '=', setupToken)
      .execute();

    // Send welcome message
    await this.sendWelcomeMessage(slackData.slack_team_id, slackData.slack_user_id);

    this.logger.log('[Calendar Setup] Completed successfully:', { userId, workspaceId });

    return {
      workspaceId,
      teamId: slackData.slack_team_id,
      teamName: slackData.slack_team_name,
    };
  }

  /**
   * Handle /calendar slash command
   */
  async handleCommand(payload: any) {
    const { text, user_id, team_id, channel_id } = payload;

    this.logger.log(`Calendar command received: ${text} from user ${user_id} in team ${team_id}`);

    const args = text.trim().split(' ').filter(Boolean);
    const action = args[0]?.toLowerCase() || 'help';

    switch (action) {
      case 'new':
        return await this.createQuickEvent(team_id, user_id, channel_id, args.slice(1).join(' '));

      case 'create':
        return await this.openCreateEventModal(payload);

      case 'list':
        return await this.listUpcomingEvents(team_id, user_id, 7);

      case 'today':
        return await this.listTodayEvents(team_id, user_id);

      case 'week':
        return await this.listUpcomingEvents(team_id, user_id, 7);

      case 'search':
        return await this.searchEvents(team_id, user_id, args.slice(1).join(' '));

      case 'link':
        return await this.linkChannel(team_id, user_id, channel_id);

      case 'unlink':
        return await this.unlinkChannel(team_id, channel_id);

      case 'settings':
        return this.showSettings(team_id, channel_id);

      case 'help':
        return this.showHelp();

      default:
        return {
          response_type: 'ephemeral',
          text: `❓ Unknown command: \`${action}\`\n\nType \`/calendar help\` for available commands.`,
        };
    }
  }

  /**
   * Create a quick event from natural language
   */
  private async createQuickEvent(teamId: string, slackUserId: string, channelId: string, eventText: string) {
    try {
      this.logger.log(`Creating quick event for team ${teamId}, user ${slackUserId}: ${eventText}`);

      if (!eventText || eventText.trim() === '') {
        return {
          response_type: 'ephemeral',
          text: '📝 Please provide event details.\n\nExample: `/calendar new Team lunch tomorrow at noon`',
        };
      }

      // Get Deskive user ID from Slack user mapping
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ You need to be invited to the Deskive workspace first.\n\n' +
                'Please ask your workspace admin to invite you via email to the Deskive workspace.\n\n' +
                'Once you accept the invitation and create your Deskive account, you can use Slack commands.',
        };
      }

      // Get workspace for this Slack team
      const workspaceId = await this.getSlackWorkspaceId(teamId);

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace. Please reinstall the Calendar app.',
        };
      }

      // Parse natural language event (simple parsing for now)
      const parsedEvent = this.parseEventText(eventText);

      // Create event using CalendarService
      const event = await this.calendarService.createEvent(
        workspaceId,
        {
          title: parsedEvent.title,
          description: `Created from Slack by /calendar command`,
          start_time: parsedEvent.startTime,
          end_time: parsedEvent.endTime,
          all_day: parsedEvent.allDay,
        },
        deskiveUserId
      );

      this.logger.log(`Event created: ${event.id}`);

      // Get Slack installation for posting message
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Generate event URL
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const eventUrl = `${appUrl}/workspaces/${workspaceId}/calendar?event=${event.id}`;

      // Format times for display
      const startDate = new Date(parsedEvent.startTime);
      const endDate = new Date(parsedEvent.endTime);
      const timeDisplay = parsedEvent.allDay
        ? `All day - ${startDate.toLocaleDateString()}`
        : `${startDate.toLocaleString()} - ${endDate.toLocaleTimeString()}`;

      // Try to post to channel
      try {
        await slackClient.conversations.join({ channel: channelId });
      } catch (joinError) {
        this.logger.warn('Could not join channel:', joinError.message);
      }

      let messagePosted = false;
      try {
        const result = await slackClient.chat.postMessage({
          channel: channelId,
          text: `📅 New event created: ${parsedEvent.title}`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*📅 New Event Created*\n\n<@${slackUserId}> created an event`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📋 *Title:* ${parsedEvent.title}\n🕐 *When:* ${timeDisplay}`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📅 Open in Deskive', emoji: true },
                  url: eventUrl,
                  style: 'primary',
                  action_id: 'open_event',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '✅ Going', emoji: true },
                  action_id: 'rsvp_going',
                  value: event.id,
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🤔 Maybe', emoji: true },
                  action_id: 'rsvp_maybe',
                  value: event.id,
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '❌ Can\'t', emoji: true },
                  action_id: 'rsvp_declined',
                  value: event.id,
                },
              ],
            },
          ],
        });

        messagePosted = true;

        // Store message reference for updates
        await this.db.table('slack_event_messages')
          .insert({
            event_id: event.id,
            team_id: teamId,
            channel_id: channelId,
            message_ts: result.ts,
            message_type: 'event_created',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .execute();

      } catch (postError) {
        this.logger.error('Could not post event to channel:', postError.message);
      }

      if (messagePosted) {
        return {
          response_type: 'ephemeral',
          text: '✅ Event created successfully! Check the channel above.',
        };
      } else {
        return {
          response_type: 'ephemeral',
          text: `✅ Event created!\n\n📋 *${parsedEvent.title}*\n🕐 ${timeDisplay}\n\n🔗 ${eventUrl}\n\n💡 *Tip:* Use \`/calendar link\` to enable event notifications in this channel.`,
        };
      }
    } catch (error) {
      this.logger.error('Error creating quick event:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error creating event: ${error.message}`,
      };
    }
  }

  /**
   * Open modal for creating event with full details
   */
  private async openCreateEventModal(payload: any) {
    try {
      const { trigger_id, team_id, user_id } = payload;

      // Run all queries in parallel for speed
      const [deskiveUserId, workspaceId, installation] = await Promise.all([
        this.getDeskiveUserIdFromSlack(user_id, team_id),
        this.getSlackWorkspaceId(team_id),
        this.getInstallation(team_id),
      ]);

      // Verify user is linked
      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ You need to be invited to the Deskive workspace first.\n\n' +
                'Please ask your workspace admin to invite you via email to the Deskive workspace.\n\n' +
                'Once you accept the invitation and create your Deskive account, you can use Slack commands.',
        };
      }

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace. Please reinstall the Calendar app.',
        };
      }

      // Get Slack client
      const slackClient = new WebClient(installation.bot_token);

      // Get tomorrow's date as default
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const defaultDate = tomorrow.toISOString().split('T')[0];

      // Open modal
      await slackClient.views.open({
        trigger_id,
        view: {
          type: 'modal',
          callback_id: 'create_event_modal',
          private_metadata: JSON.stringify({ team_id, user_id, workspace_id: workspaceId }),
          title: {
            type: 'plain_text',
            text: '📅 Create Event',
          },
          submit: {
            type: 'plain_text',
            text: 'Create Event',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'input',
              block_id: 'title_block',
              element: {
                type: 'plain_text_input',
                action_id: 'title_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'Enter event title',
                },
              },
              label: {
                type: 'plain_text',
                text: '📋 Event Title',
              },
            },
            {
              type: 'input',
              block_id: 'description_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'description_input',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Add event description (optional)',
                },
              },
              label: {
                type: 'plain_text',
                text: '📝 Description',
              },
            },
            {
              type: 'input',
              block_id: 'date_block',
              element: {
                type: 'datepicker',
                action_id: 'date_input',
                initial_date: defaultDate,
                placeholder: {
                  type: 'plain_text',
                  text: 'Select date',
                },
              },
              label: {
                type: 'plain_text',
                text: '📆 Date',
              },
            },
            {
              type: 'input',
              block_id: 'start_time_block',
              element: {
                type: 'timepicker',
                action_id: 'start_time_input',
                initial_time: '09:00',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select start time',
                },
              },
              label: {
                type: 'plain_text',
                text: '🕐 Start Time',
              },
            },
            {
              type: 'input',
              block_id: 'duration_block',
              element: {
                type: 'static_select',
                action_id: 'duration_input',
                initial_option: {
                  text: { type: 'plain_text', text: '1 hour' },
                  value: '60',
                },
                options: [
                  { text: { type: 'plain_text', text: '15 minutes' }, value: '15' },
                  { text: { type: 'plain_text', text: '30 minutes' }, value: '30' },
                  { text: { type: 'plain_text', text: '45 minutes' }, value: '45' },
                  { text: { type: 'plain_text', text: '1 hour' }, value: '60' },
                  { text: { type: 'plain_text', text: '1.5 hours' }, value: '90' },
                  { text: { type: 'plain_text', text: '2 hours' }, value: '120' },
                  { text: { type: 'plain_text', text: '3 hours' }, value: '180' },
                  { text: { type: 'plain_text', text: '4 hours' }, value: '240' },
                  { text: { type: 'plain_text', text: 'All day' }, value: 'all_day' },
                ],
              },
              label: {
                type: 'plain_text',
                text: '⏱️ Duration',
              },
            },
            {
              type: 'input',
              block_id: 'location_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'location_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'Conference Room A, Zoom, etc.',
                },
              },
              label: {
                type: 'plain_text',
                text: '📍 Location',
              },
            },
            {
              type: 'input',
              block_id: 'meeting_url_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'meeting_url_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'https://zoom.us/j/...',
                },
              },
              label: {
                type: 'plain_text',
                text: '🔗 Meeting URL',
              },
            },
            {
              type: 'input',
              block_id: 'attendees_block',
              optional: true,
              element: {
                type: 'plain_text_input',
                action_id: 'attendees_input',
                placeholder: {
                  type: 'plain_text',
                  text: 'john@example.com, jane@example.com',
                },
              },
              label: {
                type: 'plain_text',
                text: '👥 Attendees (comma-separated emails)',
              },
            },
            {
              type: 'input',
              block_id: 'priority_block',
              optional: true,
              element: {
                type: 'static_select',
                action_id: 'priority_input',
                initial_option: {
                  text: { type: 'plain_text', text: '📊 Normal' },
                  value: 'normal',
                },
                options: [
                  { text: { type: 'plain_text', text: '⬇️ Low' }, value: 'low' },
                  { text: { type: 'plain_text', text: '📊 Normal' }, value: 'normal' },
                  { text: { type: 'plain_text', text: '⬆️ High' }, value: 'high' },
                  { text: { type: 'plain_text', text: '🔥 Urgent' }, value: 'urgent' },
                ],
              },
              label: {
                type: 'plain_text',
                text: '🎯 Priority',
              },
            },
            {
              type: 'input',
              block_id: 'visibility_block',
              optional: true,
              element: {
                type: 'static_select',
                action_id: 'visibility_input',
                initial_option: {
                  text: { type: 'plain_text', text: '🔒 Private' },
                  value: 'private',
                },
                options: [
                  { text: { type: 'plain_text', text: '🔒 Private' }, value: 'private' },
                  { text: { type: 'plain_text', text: '🏢 Internal' }, value: 'internal' },
                  { text: { type: 'plain_text', text: '🌐 Public' }, value: 'public' },
                ],
              },
              label: {
                type: 'plain_text',
                text: '👁️ Visibility',
              },
            },
            {
              type: 'input',
              block_id: 'timezone_block',
              optional: true,
              element: {
                type: 'static_select',
                action_id: 'timezone_input',
                initial_option: {
                  text: { type: 'plain_text', text: '🌍 Asia/Dhaka (GMT+6)' },
                  value: 'Asia/Dhaka',
                },
                options: [
                  { text: { type: 'plain_text', text: '🌍 Asia/Dhaka (GMT+6)' }, value: 'Asia/Dhaka' },
                  { text: { type: 'plain_text', text: '🌍 UTC (GMT+0)' }, value: 'UTC' },
                  { text: { type: 'plain_text', text: '🌍 America/New_York (EST)' }, value: 'America/New_York' },
                  { text: { type: 'plain_text', text: '🌍 America/Los_Angeles (PST)' }, value: 'America/Los_Angeles' },
                  { text: { type: 'plain_text', text: '🌍 Europe/London (GMT)' }, value: 'Europe/London' },
                  { text: { type: 'plain_text', text: '🌍 Asia/Tokyo (JST)' }, value: 'Asia/Tokyo' },
                  { text: { type: 'plain_text', text: '🌍 Asia/Singapore (SGT)' }, value: 'Asia/Singapore' },
                  { text: { type: 'plain_text', text: '🌍 Australia/Sydney (AEST)' }, value: 'Australia/Sydney' },
                ],
              },
              label: {
                type: 'plain_text',
                text: '🌐 Timezone',
              },
            },
            {
              type: 'input',
              block_id: 'recurrence_block',
              optional: true,
              element: {
                type: 'static_select',
                action_id: 'recurrence_input',
                initial_option: {
                  text: { type: 'plain_text', text: '📅 Does not repeat' },
                  value: 'none',
                },
                options: [
                  { text: { type: 'plain_text', text: '📅 Does not repeat' }, value: 'none' },
                  { text: { type: 'plain_text', text: '🔄 Daily' }, value: 'daily' },
                  { text: { type: 'plain_text', text: '🔄 Weekly' }, value: 'weekly' },
                  { text: { type: 'plain_text', text: '🔄 Bi-weekly' }, value: 'biweekly' },
                  { text: { type: 'plain_text', text: '🔄 Monthly' }, value: 'monthly' },
                ],
              },
              label: {
                type: 'plain_text',
                text: '🔄 Repeat',
              },
            },
          ],
        },
      });

      // Return empty object - Slack expects no message when modal opens successfully
      return {};
    } catch (error) {
      this.logger.error('Error opening create event modal:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error opening event form: ${error.message}`,
      };
    }
  }

  /**
   * Handle modal submission for creating event
   */
  async handleModalSubmission(payload: any) {
    try {
      const { view, user } = payload;
      const values = view.state.values;
      const metadata = JSON.parse(view.private_metadata);

      this.logger.log('Modal submission received:', { user: user.id, metadata });

      // Extract values from modal
      const title = values.title_block.title_input.value;
      const description = values.description_block?.description_input?.value || '';
      const date = values.date_block.date_input.selected_date;
      const startTime = values.start_time_block.start_time_input.selected_time;
      const duration = values.duration_block.duration_input.selected_option.value;
      const location = values.location_block?.location_input?.value || '';
      const meetingUrl = values.meeting_url_block?.meeting_url_input?.value || '';
      const attendeesRaw = values.attendees_block?.attendees_input?.value || '';
      const priority = values.priority_block?.priority_input?.selected_option?.value || 'normal';
      const visibility = values.visibility_block?.visibility_input?.selected_option?.value || 'private';
      const timezone = values.timezone_block?.timezone_input?.selected_option?.value || 'Asia/Dhaka';
      const recurrence = values.recurrence_block?.recurrence_input?.selected_option?.value || 'none';

      // Parse attendees
      const attendees = attendeesRaw
        .split(',')
        .map((email: string) => email.trim())
        .filter((email: string) => email.length > 0);

      // Calculate start and end times with timezone awareness
      const isAllDay = duration === 'all_day';
      let startDateTime: Date;
      let endDateTime: Date;

      // Get timezone offset in hours (positive = east of UTC)
      const getTimezoneOffset = (tz: string): number => {
        const offsets: Record<string, number> = {
          'UTC': 0,
          'America/New_York': -5,
          'America/Los_Angeles': -8,
          'Europe/London': 0,
          'Asia/Dhaka': 6,
          'Asia/Tokyo': 9,
          'Asia/Singapore': 8,
          'Australia/Sydney': 11,
        };
        return offsets[tz] || 0;
      };

      const tzOffset = getTimezoneOffset(timezone);

      if (isAllDay) {
        // For all-day events, store as midnight UTC
        startDateTime = new Date(`${date}T00:00:00Z`);
        endDateTime = new Date(`${date}T23:59:59Z`);
      } else {
        // Parse the selected time (HH:MM format)
        const [hours, mins] = startTime.split(':').map(Number);

        // Calculate UTC hours by subtracting timezone offset
        // Example: 09:00 in Asia/Dhaka (UTC+6) = 03:00 UTC
        let utcHours = hours - tzOffset;
        let dayAdjust = 0;

        // Handle day rollover
        if (utcHours < 0) {
          utcHours += 24;
          dayAdjust = -1;
        } else if (utcHours >= 24) {
          utcHours -= 24;
          dayAdjust = 1;
        }

        // Create the date in UTC
        startDateTime = new Date(`${date}T00:00:00Z`);
        startDateTime.setUTCDate(startDateTime.getUTCDate() + dayAdjust);
        startDateTime.setUTCHours(utcHours, mins, 0, 0);

        endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60 * 1000);

        this.logger.log(`Event time: ${date} ${startTime} (${timezone}) -> UTC: ${startDateTime.toISOString()}`);
      }

      // Build recurrence rule if not 'none'
      let recurrenceRule = null;
      let isRecurring = false;
      if (recurrence !== 'none') {
        isRecurring = true;
        const recurrenceMap: Record<string, any> = {
          'daily': { frequency: 'daily', interval: 1 },
          'weekly': { frequency: 'weekly', interval: 1 },
          'biweekly': { frequency: 'weekly', interval: 2 },
          'monthly': { frequency: 'monthly', interval: 1 },
        };
        recurrenceRule = recurrenceMap[recurrence] || null;
      }

      // Get Deskive user ID and installation in parallel
      const [deskiveUserId, installation] = await Promise.all([
        this.getDeskiveUserIdFromSlack(user.id, metadata.team_id),
        this.getInstallation(metadata.team_id),
      ]);

      if (!deskiveUserId) {
        return {
          response_action: 'errors',
          errors: {
            title_block: 'Your account is not linked to Deskive.',
          },
        };
      }

      // Create event
      const eventData: any = {
        title,
        description: description || `Created from Slack`,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: isAllDay,
        location,
        meeting_url: meetingUrl,
        attendees,
        priority,
        visibility,
      };

      // Add recurrence if set
      if (isRecurring && recurrenceRule) {
        eventData.is_recurring = true;
        eventData.recurrence_rule = recurrenceRule;
      }

      const event = await this.calendarService.createEvent(
        metadata.workspace_id,
        eventData,
        deskiveUserId
      );

      this.logger.log(`Event created from modal: ${event.id}`);

      // Get Slack client for confirmation
      const slackClient = new WebClient(installation.bot_token);

      // Format time for display with timezone
      const recurrenceText = isRecurring ? ` (${recurrence})` : '';
      const timeDisplay = isAllDay
        ? `📆 ${date} (All day)${recurrenceText}`
        : `📆 ${date} at ${startTime} (${timezone})${recurrenceText}`;

      // Send DM confirmation asynchronously (don't block modal response)
      const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5175';
      setImmediate(async () => {
        try {
          await slackClient.chat.postMessage({
            channel: user.id,
            text: `✅ Event created: ${title}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *Event Created Successfully!*`,
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*📋 Title:*\n${title}` },
                  { type: 'mrkdwn', text: `*🕐 When:*\n${timeDisplay}` },
                  { type: 'mrkdwn', text: `*📍 Location:*\n${location || 'Not specified'}` },
                  { type: 'mrkdwn', text: `*🎯 Priority:*\n${priority}` },
                ],
              },
              ...(description ? [{
                type: 'section' as const,
                text: { type: 'mrkdwn' as const, text: `*📝 Description:*\n${this.stripHtml(description)}` },
              }] : []),
              ...(attendees.length > 0 ? [{
                type: 'section' as const,
                text: { type: 'mrkdwn' as const, text: `*👥 Attendees:*\n${attendees.join(', ')}` },
              }] : []),
              {
                type: 'context',
                elements: [
                  {
                    type: 'mrkdwn',
                    text: `💡 View and edit this event in <${frontendUrl}/workspaces/${metadata.workspace_id}/calendar|Deskive Calendar>`,
                  },
                ],
              },
            ],
          });
          this.logger.log('Sent DM confirmation for event:', title);
        } catch (dmError) {
          this.logger.warn('Could not send DM confirmation:', dmError.message);
        }
      });

      // Return empty response to close modal immediately (Slack expects empty body for success)
      return {};
    } catch (error) {
      this.logger.error('Error handling modal submission:', error);
      // Return validation error to show in modal
      return {
        response_action: 'errors',
        errors: {
          title_block: `Error creating event: ${error.message}`,
        },
      };
    }
  }

  /**
   * Parse natural language event text (simple implementation)
   */
  private parseEventText(text: string): { title: string; startTime: string; endTime: string; allDay: boolean } {
    const now = new Date();
    let title = text;
    let startTime = new Date();
    let endTime = new Date();
    let allDay = false;

    // Simple keyword parsing
    const lowerText = text.toLowerCase();

    // Extract time keywords
    if (lowerText.includes('tomorrow')) {
      startTime.setDate(startTime.getDate() + 1);
      title = text.replace(/tomorrow/i, '').trim();
    } else if (lowerText.includes('today')) {
      title = text.replace(/today/i, '').trim();
    } else if (lowerText.includes('next week')) {
      startTime.setDate(startTime.getDate() + 7);
      title = text.replace(/next week/i, '').trim();
    }

    // Extract time
    const timeMatch = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const ampm = timeMatch[3]?.toLowerCase();

      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;

      startTime.setHours(hours, minutes, 0, 0);
      title = title.replace(/at\s+\d{1,2}(?::\d{2})?\s*(am|pm)?/i, '').trim();
    }

    // Check for noon/midnight
    if (lowerText.includes('noon')) {
      startTime.setHours(12, 0, 0, 0);
      title = title.replace(/noon/i, '').trim();
    } else if (lowerText.includes('midnight')) {
      startTime.setHours(0, 0, 0, 0);
      title = title.replace(/midnight/i, '').trim();
    }

    // Default duration: 1 hour
    endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

    // Clean up title
    title = title.replace(/^(at|on|in)\s+/i, '').trim();
    if (!title) title = 'New Event';

    return {
      title,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      allDay,
    };
  }

  /**
   * List today's events
   */
  private async listTodayEvents(teamId: string, slackUserId: string) {
    try {
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Your account is not linked. Please reinstall the Calendar app.',
        };
      }

      const workspaceId = await this.getSlackWorkspaceId(teamId);

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace.',
        };
      }

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Query events
      const eventsResult = await this.db.table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', today.toISOString())
        .where('start_time', '<', tomorrow.toISOString())
        .orderBy('start_time', 'ASC')
        .limit(10)
        .execute();

      const events = eventsResult.data || [];

      if (events.length === 0) {
        return {
          response_type: 'ephemeral',
          text: '📅 No events scheduled for today.\n\nUse `/calendar new Meeting at 2pm` to create one!',
        };
      }

      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📅 Today's Events* (${events.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      events.forEach((event, index) => {
        const startTime = new Date(event.start_time);
        const endTime = new Date(event.end_time);
        const timeStr = event.all_day
          ? 'All Day'
          : `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const eventUrl = `${appUrl}/workspaces/${workspaceId}/calendar?event=${event.id}`;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `🕐 *${timeStr}*\n${event.title}${event.location ? `\n📍 ${event.location}` : ''}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: eventUrl,
            action_id: `open_event_${event.id}`,
          },
        });
      });

      return {
        response_type: 'ephemeral',
        blocks,
      };
    } catch (error) {
      this.logger.error('Error listing today events:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error loading events: ${error.message}`,
      };
    }
  }

  /**
   * List upcoming events
   */
  private async listUpcomingEvents(teamId: string, slackUserId: string, days: number = 7) {
    try {
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Your account is not linked. Please reinstall the Calendar app.',
        };
      }

      const workspaceId = await this.getSlackWorkspaceId(teamId);

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace.',
        };
      }

      const now = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + days);

      const eventsResult = await this.db.table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('start_time', '>=', now.toISOString())
        .where('start_time', '<', endDate.toISOString())
        .orderBy('start_time', 'ASC')
        .limit(15)
        .execute();

      const events = eventsResult.data || [];

      if (events.length === 0) {
        return {
          response_type: 'ephemeral',
          text: `📅 No events in the next ${days} days.\n\nUse \`/calendar new\` to create one!`,
        };
      }

      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📅 Upcoming Events* (${events.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      events.forEach((event) => {
        const startTime = new Date(event.start_time);
        const dateStr = startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        const timeStr = event.all_day
          ? 'All Day'
          : startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const eventUrl = `${appUrl}/workspaces/${workspaceId}/calendar?event=${event.id}`;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${event.title}*\n📅 ${dateStr} at ${timeStr}${event.location ? `\n📍 ${event.location}` : ''}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: eventUrl,
            action_id: `open_event_${event.id}`,
          },
        });
      });

      return {
        response_type: 'ephemeral',
        blocks,
      };
    } catch (error) {
      this.logger.error('Error listing upcoming events:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error loading events: ${error.message}`,
      };
    }
  }

  /**
   * Search events
   */
  private async searchEvents(teamId: string, slackUserId: string, query: string) {
    if (!query) {
      return {
        response_type: 'ephemeral',
        text: '🔍 Please provide a search query.\n\nExample: `/calendar search quarterly review`',
      };
    }

    try {
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Your account is not linked.',
        };
      }

      const workspaceId = await this.getSlackWorkspaceId(teamId);

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace.',
        };
      }

      // Simple search by title (case insensitive)
      const eventsResult = await this.db.table('calendar_events')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('title', 'ILIKE', `%${query}%`)
        .orderBy('start_time', 'DESC')
        .limit(10)
        .execute();

      const events = eventsResult.data || [];

      if (events.length === 0) {
        return {
          response_type: 'ephemeral',
          text: `🔍 No events found matching "${query}"`,
        };
      }

      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🔍 Search Results for "${query}"* (${events.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      events.forEach((event) => {
        const startTime = new Date(event.start_time);
        const dateStr = startTime.toLocaleDateString();
        const eventUrl = `${appUrl}/workspaces/${workspaceId}/calendar?event=${event.id}`;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${event.title}*\n📅 ${dateStr}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: eventUrl,
            action_id: `open_event_${event.id}`,
          },
        });
      });

      return {
        response_type: 'ephemeral',
        blocks,
      };
    } catch (error) {
      this.logger.error('Error searching events:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error searching: ${error.message}`,
      };
    }
  }

  /**
   * Link channel for notifications
   */
  private async linkChannel(teamId: string, slackUserId: string, channelId: string) {
    try {
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Your account is not linked.',
        };
      }

      const workspaceId = await this.getSlackWorkspaceId(teamId);

      if (!workspaceId) {
        return {
          response_type: 'ephemeral',
          text: '❌ Could not find workspace.',
        };
      }

      // Check if already linked
      const existingLink = await this.db.table('slack_calendar_channel_links')
        .select('*')
        .where('team_id', '=', teamId)
        .where('channel_id', '=', channelId)
        .execute();

      if (existingLink.data && existingLink.data.length > 0) {
        return {
          response_type: 'ephemeral',
          text: '✅ This channel is already linked for calendar notifications!\n\nUse `/calendar settings` to adjust notification preferences.',
        };
      }

      // Get channel info
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      let channelName = 'unknown';
      try {
        const channelInfo = await slackClient.conversations.info({ channel: channelId });
        channelName = channelInfo.channel.name;
      } catch (e) {
        this.logger.warn('Could not get channel info:', e.message);
      }

      // Create link
      await this.db.table('slack_calendar_channel_links')
        .insert({
          workspace_id: workspaceId,
          team_id: teamId,
          channel_id: channelId,
          channel_name: channelName,
          creator_slack_user_id: slackUserId,
          notification_settings: JSON.stringify({
            new_events: true,
            event_reminders: true,
            event_updates: true,
            daily_digest: false,
          }),
          reminder_minutes: JSON.stringify([15, 60]),
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      return {
        response_type: 'ephemeral',
        text: '✅ Channel linked! This channel will now receive:\n\n• 📅 New event notifications\n• ⏰ Event reminders (15 min & 1 hour before)\n• 📝 Event updates\n\nUse `/calendar unlink` to stop notifications.',
      };
    } catch (error) {
      this.logger.error('Error linking channel:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error linking channel: ${error.message}`,
      };
    }
  }

  /**
   * Unlink channel from notifications
   */
  private async unlinkChannel(teamId: string, channelId: string) {
    try {
      const result = await this.db.table('slack_calendar_channel_links')
        .delete()
        .where('team_id', '=', teamId)
        .where('channel_id', '=', channelId)
        .execute();

      return {
        response_type: 'ephemeral',
        text: '✅ Channel unlinked. It will no longer receive calendar notifications.',
      };
    } catch (error) {
      this.logger.error('Error unlinking channel:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error unlinking channel: ${error.message}`,
      };
    }
  }

  /**
   * Show notification settings
   */
  private showSettings(teamId: string, channelId: string) {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*⚙️ Calendar Notification Settings*',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              '*Channel Notifications:*\n' +
              '`/calendar link` - Enable notifications in this channel\n' +
              '`/calendar unlink` - Disable notifications\n\n' +
              '*Default Settings:*\n' +
              '• New events: ✅ Enabled\n' +
              '• Reminders: ✅ 15 min & 1 hour before\n' +
              '• Event updates: ✅ Enabled\n' +
              '• Daily digest: ❌ Disabled',
          },
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 Advanced settings can be configured in Deskive web app.',
            },
          ],
        },
      ],
    };
  }

  /**
   * Show help message
   */
  private showHelp() {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📅 Deskive Calendar Commands*',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📝 Create Events:*\n' +
              '`/calendar create` - Open form with all event options\n' +
              '`/calendar new [title] at [time]` - Quick create from text\n\n' +
              '*📋 View Events:*\n' +
              '`/calendar today` - View today\'s events\n' +
              '`/calendar list` - View upcoming events (7 days)\n' +
              '`/calendar week` - View this week\'s events\n' +
              '`/calendar search [query]` - Search events\n\n' +
              '*🔔 Notifications:*\n' +
              '`/calendar link` - Get notifications in this channel\n' +
              '`/calendar unlink` - Stop notifications\n' +
              '`/calendar settings` - View notification settings\n\n' +
              '`/calendar help` - Show this help',
          },
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 *Tips:*\n' +
                '• Use `/calendar create` for full event details (description, attendees, location, etc.)\n' +
                '• Use `/calendar new Team lunch tomorrow at noon` for quick events',
            },
          ],
        },
      ],
    };
  }

  /**
   * Handle Slack events
   */
  async handleEvent(payload: any) {
    const { event, team_id } = payload;

    try {
      this.logger.log('Calendar event received:', event.type);

      if (event.type === 'app_home_opened') {
        await this.updateHomeTab(event.user, team_id);
      }

      if (event.type === 'app_mention') {
        await this.handleMention(event, team_id);
      }
    } catch (error) {
      this.logger.error('Error handling Slack calendar event:', error);
    }
  }

  /**
   * Handle interactions (RSVP buttons, modal submissions, etc.)
   */
  async handleInteraction(payload: any) {
    const { type, user, actions, team, view } = payload;

    try {
      this.logger.log('Calendar interaction type:', type);

      // Handle modal submissions
      if (type === 'view_submission') {
        const callbackId = view?.callback_id;
        this.logger.log('Modal submission callback_id:', callbackId);

        if (callbackId === 'create_event_modal') {
          return await this.handleModalSubmission(payload);
        }
      }

      // Handle block actions (buttons, etc.)
      if (type === 'block_actions' && actions && actions.length > 0) {
        const action = actions[0];
        const eventId = action.value;

        if (action.action_id === 'rsvp_going') {
          await this.handleRsvp(team.id, user.id, eventId, 'accepted');
          await this.postRsvpConfirmation(payload, 'going');
        } else if (action.action_id === 'rsvp_maybe') {
          await this.handleRsvp(team.id, user.id, eventId, 'tentative');
          await this.postRsvpConfirmation(payload, 'maybe');
        } else if (action.action_id === 'rsvp_declined') {
          await this.handleRsvp(team.id, user.id, eventId, 'declined');
          await this.postRsvpConfirmation(payload, 'declined');
        } else if (action.action_id === 'create_event_home') {
          // Handle create from App Home - would need modal
          this.logger.log('Create event from home requested');
        }
      }
    } catch (error) {
      this.logger.error('Error handling calendar interaction:', error);
    }
  }

  /**
   * Handle RSVP
   */
  private async handleRsvp(teamId: string, slackUserId: string, eventId: string, status: 'accepted' | 'tentative' | 'declined') {
    try {
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        this.logger.error('Cannot find Deskive user for RSVP');
        return;
      }

      // Get event to find workspace
      const eventResult = await this.db.table('calendar_events')
        .select('*')
        .where('id', '=', eventId)
        .execute();

      if (!eventResult.data || eventResult.data.length === 0) {
        this.logger.error('Event not found for RSVP:', eventId);
        return;
      }

      const event = eventResult.data[0];

      // Update attendee status
      await this.calendarService.respondToEvent(eventId, deskiveUserId, status);

      this.logger.log(`RSVP updated: ${deskiveUserId} is ${status} for event ${eventId}`);
    } catch (error) {
      this.logger.error('Error handling RSVP:', error);
    }
  }

  /**
   * Post RSVP confirmation in thread
   */
  private async postRsvpConfirmation(payload: any, status: string) {
    try {
      const installation = await this.getInstallation(payload.team.id);
      const slackClient = new WebClient(installation.bot_token);

      const statusEmoji = status === 'going' ? '✅' : status === 'maybe' ? '🤔' : '❌';
      const statusText = status === 'going' ? 'going' : status === 'maybe' ? 'maybe' : 'can\'t make it';

      // Reply in thread
      await slackClient.chat.postMessage({
        channel: payload.channel.id,
        thread_ts: payload.message.ts,
        text: `${statusEmoji} <@${payload.user.id}> is *${statusText}*`,
      });
    } catch (error) {
      this.logger.error('Error posting RSVP confirmation:', error);
    }
  }

  /**
   * Update App Home tab
   */
  private async updateHomeTab(userId: string, teamId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get user's event count for today
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(userId, teamId);
      let todayCount = 0;
      let upcomingCount = 0;

      if (deskiveUserId) {
        const workspaceId = await this.getSlackWorkspaceId(teamId);
        if (workspaceId) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const nextWeek = new Date(today);
          nextWeek.setDate(nextWeek.getDate() + 7);

          const todayResult = await this.db.table('calendar_events')
            .select('id')
            .where('workspace_id', '=', workspaceId)
            .where('start_time', '>=', today.toISOString())
            .where('start_time', '<', tomorrow.toISOString())
            .execute();

          const upcomingResult = await this.db.table('calendar_events')
            .select('id')
            .where('workspace_id', '=', workspaceId)
            .where('start_time', '>=', tomorrow.toISOString())
            .where('start_time', '<', nextWeek.toISOString())
            .execute();

          todayCount = todayResult.data?.length || 0;
          upcomingCount = upcomingResult.data?.length || 0;
        }
      }

      await slackClient.views.publish({
        user_id: userId,
        view: {
          type: 'home',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Welcome to Deskive Calendar! 📅*\n\nManage your events and schedule directly from Slack.',
              },
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*📊 Your Schedule*\n• ${todayCount} events today\n• ${upcomingCount} events this week`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '➕ Create Event', emoji: true },
                  action_id: 'create_event_home',
                  style: 'primary',
                },
              ],
            },
            { type: 'divider' },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text:
                  '*📖 Quick Commands*\n' +
                  '• `/calendar new [title]` - Create event\n' +
                  '• `/calendar today` - Today\'s events\n' +
                  '• `/calendar list` - Upcoming events\n' +
                  '• `/calendar help` - All commands',
              },
            },
            { type: 'divider' },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '📚 <https://deskive.com/calendar|Documentation> • 🆘 <https://deskive.com/support|Support>',
                },
              ],
            },
          ],
        },
      });

      this.logger.log('Calendar App Home tab updated for user:', userId);
    } catch (error) {
      this.logger.error('Error updating calendar home tab:', error);
    }
  }

  /**
   * Handle @mentions
   */
  private async handleMention(event: any, teamId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      const text = event.text.toLowerCase();
      let responseText = `Hi <@${event.user}>! 👋\n\n`;

      if (text.includes('help')) {
        responseText +=
          'Here are the available calendar commands:\n' +
          '• `/calendar new [title]` - Create an event\n' +
          '• `/calendar today` - See today\'s events\n' +
          '• `/calendar list` - See upcoming events\n' +
          '• `/calendar help` - All commands';
      } else {
        responseText +=
          "I can help you manage your calendar! 📅\n\n" +
          'Try `/calendar today` to see your schedule!';
      }

      await slackClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: responseText,
      });
    } catch (error) {
      this.logger.error('Error handling calendar mention:', error);
    }
  }

  /**
   * Send welcome message
   */
  private async sendWelcomeMessage(teamId: string, userId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      await slackClient.chat.postMessage({
        channel: userId,
        text: '👋 Welcome to Deskive Calendar!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "*👋 Welcome to Deskive Calendar!*\n\nYou're ready to manage your schedule from Slack.",
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                '*🚀 Get Started*\n\n' +
                '1️⃣ Create an event: `/calendar new Team meeting tomorrow at 2pm`\n' +
                '2️⃣ View your day: `/calendar today`\n' +
                '3️⃣ Enable notifications: `/calendar link` in any channel',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📖 View Tutorial', emoji: true },
                url: 'https://deskive.com/calendar/tutorial',
                action_id: 'view_tutorial',
              },
            ],
          },
        ],
      });

      this.logger.log('Calendar welcome message sent to user:', userId);
    } catch (error) {
      this.logger.error('Error sending calendar welcome message:', error);
    }
  }

  /**
   * Cron: Send event reminders to linked Slack channels
   * Runs every 5 minutes to reduce load and prevent duplicate notifications
   */
  @Cron('0 */5 * * * *') // Every 5 minutes at :00 seconds
  async processSlackReminders() {
    try {
      this.logger.log('Processing Slack reminders...');

      // Get all linked channels with reminder settings
      const linksResult = await this.db.table('slack_calendar_channel_links')
        .select('*')
        .where('is_active', '=', true)
        .execute();

      const links = linksResult.data || [];

      if (links.length === 0) {
        this.logger.log('No linked channels found for reminders');
        return;
      }

      // For each linked channel, check for upcoming events
      for (const link of links) {
        const notificationSettings = typeof link.notification_settings === 'string'
          ? JSON.parse(link.notification_settings)
          : link.notification_settings;

        if (!notificationSettings?.event_reminders) continue;

        const reminderMinutes = typeof link.reminder_minutes === 'string'
          ? JSON.parse(link.reminder_minutes)
          : (link.reminder_minutes || [15, 60]);

        for (const minutes of reminderMinutes) {
          // Use a 5-minute window to match cron interval
          const reminderTime = new Date(Date.now() + minutes * 60 * 1000);
          const reminderWindowStart = new Date(reminderTime.getTime() - 2.5 * 60 * 1000); // -2.5 min
          const reminderWindowEnd = new Date(reminderTime.getTime() + 2.5 * 60 * 1000);   // +2.5 min

          // Get events starting within the reminder window
          const eventsResult = await this.db.table('calendar_events')
            .select('*')
            .where('workspace_id', '=', link.workspace_id)
            .where('start_time', '>=', reminderWindowStart.toISOString())
            .where('start_time', '<=', reminderWindowEnd.toISOString())
            .execute();

          const events = eventsResult.data || [];

          this.logger.debug(`Found ${events.length} events for ${minutes}min reminder in workspace ${link.workspace_id}`);

          for (const event of events) {
            const eventStart = new Date(event.start_time);
            const now = new Date();

            // Skip events that have already started
            if (eventStart <= now) {
              this.logger.debug(`Skipping past event: ${event.id}`);
              continue;
            }

            // SANITY CHECK: Skip events more than 2 hours away
            // This prevents buggy reminders for events scheduled days/weeks in the future
            const maxReminderWindow = minutes + 10; // Allow 10 minute buffer
            const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60);
            if (minutesUntilEvent > maxReminderWindow) {
              this.logger.debug(`Skipping event ${event.id} - starts in ${Math.round(minutesUntilEvent)} minutes, but checking ${minutes}min reminder`);
              continue;
            }

            // Check if reminder already sent
            const existingMessage = await this.db.table('slack_event_messages')
              .select('*')
              .where('event_id', '=', event.id)
              .where('channel_id', '=', link.channel_id)
              .where('message_type', '=', `reminder_${minutes}`)
              .execute();

            if (existingMessage.data && existingMessage.data.length > 0) {
              this.logger.debug(`Reminder already sent for event ${event.id}, skipping`);
              continue;
            }

            // Send reminder
            this.logger.log(`Sending ${minutes}min reminder for event: ${event.title}`);
            await this.sendEventReminder(link.team_id, link.channel_id, event, minutes);
          }
        }
      }

      this.logger.log('Slack reminders processing completed');
    } catch (error) {
      this.logger.error('Error processing Slack reminders:', error);
    }
  }

  /**
   * Send event reminder to Slack channel
   */
  private async sendEventReminder(teamId: string, channelId: string, event: any, minutesBefore: number) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const eventUrl = `${appUrl}/workspaces/${event.workspace_id}/calendar?event=${event.id}`;

      const startTime = new Date(event.start_time);
      const timeStr = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = startTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

      const reminderText = minutesBefore < 60
        ? `${minutesBefore} minutes`
        : `${Math.floor(minutesBefore / 60)} hour${minutesBefore >= 120 ? 's' : ''}`;

      // Build action elements
      const actionElements: any[] = [
        {
          type: 'button',
          text: { type: 'plain_text', text: '📅 Open in Deskive', emoji: true },
          url: eventUrl,
          style: 'primary',
          action_id: 'open_reminder_event',
        },
      ];

      if (event.meeting_url) {
        actionElements.push({
          type: 'button',
          text: { type: 'plain_text', text: '🎥 Join Meeting', emoji: true },
          url: event.meeting_url,
          action_id: 'join_meeting',
        });
      }

      const result = await slackClient.chat.postMessage({
        channel: channelId,
        text: `⏰ Reminder: ${event.title} starts in ${reminderText}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*⏰ Event Reminder - Starting in ${reminderText}*`,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `📋 *${event.title}*\n🕐 ${dateStr} at ${timeStr}${event.location ? `\n📍 ${event.location}` : ''}${event.meeting_url ? `\n🔗 <${event.meeting_url}|Join Meeting>` : ''}`,
            },
          },
          {
            type: 'actions',
            elements: actionElements,
          },
        ],
      });

      // Record that reminder was sent
      await this.db.table('slack_event_messages')
        .insert({
          event_id: event.id,
          team_id: teamId,
          channel_id: channelId,
          message_ts: result.ts,
          message_type: `reminder_${minutesBefore}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      this.logger.log(`Sent ${minutesBefore}min reminder for event ${event.id} to channel ${channelId}`);
    } catch (error) {
      this.logger.error('Error sending event reminder:', error);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Get Slack installation (uses whiteboard installations since it's the same app)
   */
  private async getInstallation(teamId: string) {
    const result = await this.db.table('slack_whiteboard_installations')
      .select('*')
      .where('team_id', '=', teamId)
      .where('is_active', '=', true)
      .execute();

    if (!result.data || result.data.length === 0) {
      throw new Error('Slack app not installed. Please reinstall the app from Slack marketplace.');
    }

    return result.data[0];
  }

  /**
   * Get Deskive user ID from Slack user mapping
   * If no mapping exists, creates one for users already in the workspace
   */
  private async getDeskiveUserIdFromSlack(slackUserId: string, slackTeamId: string): Promise<string | null> {
    try {
      // 1. Check for existing mapping
      const result = await this.db.table('slack_user_mappings')
        .select('deskive_user_id')
        .where('slack_user_id', '=', slackUserId)
        .where('slack_team_id', '=', slackTeamId)
        .where('is_active', '=', true)
        .execute();

      if (result.data?.[0]?.deskive_user_id) {
        return result.data[0].deskive_user_id;
      }

      // 2. No mapping found - try to create one for existing workspace members
      this.logger.log(`[Mapping] No mapping found for Slack user ${slackUserId}, checking if user is in workspace...`);
      return await this.createMappingForExistingUser(slackUserId, slackTeamId);
    } catch (error) {
      this.logger.error('Error getting Deskive user ID:', error);
      return null;
    }
  }

  /**
   * Create mapping for a user who's already in the workspace (invited via Deskive)
   */
  private async createMappingForExistingUser(slackUserId: string, slackTeamId: string): Promise<string | null> {
    try {
      // 1. Get Slack user email
      const slackUserInfo = await this.getSlackUserInfo(slackUserId, slackTeamId);
      if (!slackUserInfo) {
        this.logger.error('[Mapping] Could not get Slack user info');
        return null;
      }

      const { email, name, avatar } = slackUserInfo;

      // 2. Find Deskive user by email
      const deskiveUserId = await this.findDeskiveUserByEmail(email);
      if (!deskiveUserId) {
        this.logger.log(`[Mapping] No Deskive user found with email: ${email}`);
        return null;
      }

      this.logger.log(`[Mapping] Found Deskive user: ${deskiveUserId} for email: ${email}`);

      // 3. Get workspace for this Slack team
      const workspaceId = await this.getSlackWorkspaceId(slackTeamId);
      if (!workspaceId) {
        this.logger.error('[Mapping] No workspace found for Slack team');
        return null;
      }

      // 4. Check if user is a member of the workspace
      const isMember = await this.isUserInWorkspace(workspaceId, deskiveUserId);
      if (!isMember) {
        this.logger.log(`[Mapping] User ${deskiveUserId} is not a member of workspace ${workspaceId}`);
        return null;
      }

      this.logger.log(`[Mapping] User is workspace member, creating mapping...`);

      // 5. Create the mapping
      await this.createOrUpdateUserMapping(
        deskiveUserId,
        slackUserId,
        slackTeamId,
        email,
        name,
        avatar,
        null,
        true
      );

      this.logger.log(`[Mapping] ✅ Successfully created mapping: ${slackUserId} → ${deskiveUserId}`);
      return deskiveUserId;
    } catch (error) {
      this.logger.error('[Mapping] Error creating mapping for existing user:', error);
      return null;
    }
  }

  /**
   * Get Slack user information (email, name, avatar)
   */
  private async getSlackUserInfo(slackUserId: string, slackTeamId: string): Promise<{ email: string; name: string; avatar: string } | null> {
    try {
      const installation = await this.getInstallation(slackTeamId);
      const slackClient = new WebClient(installation.bot_token);
      const userInfo = await slackClient.users.info({ user: slackUserId });

      const email = userInfo.user.profile.email;
      const name = userInfo.user.profile.real_name || userInfo.user.name;
      const avatar = userInfo.user.profile.image_512 || userInfo.user.profile.image_192;

      if (!email) {
        this.logger.error('No email found for Slack user');
        return null;
      }

      return { email, name, avatar };
    } catch (error) {
      this.logger.error('Error getting Slack user info:', error);
      return null;
    }
  }

  /**
   * Find Deskive user by email
   */
  private async findDeskiveUserByEmail(email: string): Promise<string | null> {
    try {
      // Query users table directly using database query builder
      const result = await this.db.table('users')
        .select('id')
        .where('email', '=', email)
        .limit(1)
        .execute();

      return result.data?.[0]?.id || null;
    } catch (error) {
      this.logger.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Check if user is a member of the workspace
   */
  private async isUserInWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    try {
      const result = await this.db.table('workspace_members')
        .select('id')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('is_active', '=', true)
        .execute();

      return result.data && result.data.length > 0;
    } catch (error) {
      this.logger.error('Error checking workspace membership:', error);
      return false;
    }
  }

  /**
   * Get workspace ID for Slack team
   */
  private async getSlackWorkspaceId(teamId: string): Promise<string | null> {
    try {
      const result = await this.db.table('workspaces')
        .select('id')
        .where('metadata', '@>', JSON.stringify({ slack_team_id: teamId }))
        .execute();

      return result.data?.[0]?.id || null;
    } catch (error) {
      this.logger.error('Error getting workspace ID:', error);
      return null;
    }
  }

  /**
   * Get or create workspace for Slack team
   */
  private async getOrCreateSlackWorkspace(teamId: string, teamName: string): Promise<string> {
    const existingWorkspace = await this.db.table('workspaces')
      .select('*')
      .where('metadata', '@>', JSON.stringify({ slack_team_id: teamId }))
      .execute();

    if (existingWorkspace.data && existingWorkspace.data.length > 0) {
      return existingWorkspace.data[0].id;
    }

    const newWorkspace = await this.db.table('workspaces')
      .insert({
        name: teamName,
        description: `Workspace for Slack team: ${teamName}`,
        owner_id: teamId,
        is_active: true,
        settings: JSON.stringify({}),
        metadata: JSON.stringify({ slack_team_id: teamId, source: 'slack_calendar' }),
        collaborative_data: JSON.stringify({}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning('*')
      .execute();

    return newWorkspace.data[0].id;
  }

  /**
   * Ensure user is a member of workspace
   */
  private async ensureUserInWorkspace(workspaceId: string, userId: string, isOwner: boolean = false) {
    try {
      const existing = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      if (existing.data && existing.data.length > 0) return;

      await this.db.table('workspace_members')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          role: isOwner ? 'owner' : 'member',
          permissions: JSON.stringify([]),
          joined_at: new Date().toISOString(),
          is_active: true,
          collaborative_data: JSON.stringify({}),
        })
        .execute();

      if (isOwner) {
        await this.db.table('workspaces')
          .update({
            owner_id: userId,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', workspaceId)
          .execute();
      }
    } catch (error) {
      this.logger.error('Error ensuring user in workspace:', error);
    }
  }

  /**
   * Create or update Slack-Deskive user mapping
   */
  private async createOrUpdateUserMapping(
    deskiveUserId: string,
    slackUserId: string,
    slackTeamId: string,
    slackEmail: string,
    slackName: string,
    slackAvatar: string,
    userAccessToken: string | null,
    onboardingCompleted: boolean
  ) {
    const mappingData = {
      deskive_user_id: deskiveUserId,
      slack_user_id: slackUserId,
      slack_team_id: slackTeamId,
      slack_email: slackEmail,
      slack_name: slackName,
      slack_avatar: slackAvatar,
      user_access_token: userAccessToken,
      onboarding_completed: onboardingCompleted,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    const existing = await this.db.table('slack_user_mappings')
      .select('*')
      .where('slack_user_id', '=', slackUserId)
      .where('slack_team_id', '=', slackTeamId)
      .execute();

    if (existing.data && existing.data.length > 0) {
      await this.db.table('slack_user_mappings')
        .update(mappingData)
        .where('slack_user_id', '=', slackUserId)
        .where('slack_team_id', '=', slackTeamId)
        .execute();
    } else {
      await this.db.table('slack_user_mappings')
        .insert({
          ...mappingData,
          created_at: new Date().toISOString(),
        })
        .execute();
    }
  }
}
