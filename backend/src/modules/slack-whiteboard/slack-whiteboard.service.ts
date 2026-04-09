import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebClient } from '@slack/web-api';
import { DatabaseService } from '../database/database.service';
import { WhiteboardsService } from '../whiteboards/whiteboards.service';
import { randomBytes } from 'crypto';

@Injectable()
export class SlackWhiteboardService {
  private readonly logger = new Logger(SlackWhiteboardService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly whiteboardsService: WhiteboardsService,
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
   * Handle OAuth installation callback
   */
  async handleOAuthCallback(code: string, state: string) {
    this.logger.log('Processing OAuth callback...');

    const client = new WebClient();

    try {
      // Exchange authorization code for access token
      const result = await client.oauth.v2.access({
        client_id: this.configService.get('SLACK_WHITEBOARD_CLIENT_ID'),
        client_secret: this.configService.get('SLACK_WHITEBOARD_CLIENT_SECRET'),
        code,
      });

      this.logger.log('OAuth exchange successful for team:', result.team.name);

      // Get Slack user profile
      const authedUserId = result.authed_user.id;
      const userAccessToken = result.authed_user?.access_token;

      const slackClient = new WebClient(userAccessToken || result.access_token);
      const userInfo = await slackClient.users.info({ user: authedUserId });

      const slackUserEmail = userInfo.user.profile.email;
      const slackUserName = userInfo.user.profile.real_name || userInfo.user.name;
      const slackUserAvatar = userInfo.user.profile.image_512 || userInfo.user.profile.image_192;

      this.logger.log('Slack user info retrieved:', slackUserEmail);

      // Store Slack OAuth data temporarily for after user logs in/registers
      // We'll use this data to complete the setup after authentication
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
        timestamp: Date.now(),
      };

      // Store in database temporarily (or use Redis/cache)
      const setupToken = randomBytes(32).toString('hex');
      await this.db.table('slack_setup_sessions')
        .insert({
          setup_token: setupToken,
          slack_data: JSON.stringify(slackSetupData),
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
          created_at: new Date().toISOString(),
        })
        .execute();

      this.logger.log('Slack setup session created:', setupToken);

      // Store installation data (we'll update it after user completes auth)
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
        // Update existing installation
        await this.db.table('slack_whiteboard_installations')
          .update(installationData)
          .where('team_id', '=', result.team.id)
          .execute();

        this.logger.log('Updated existing installation for team:', result.team.id);
      } else {
        // Create new installation
        await this.db.table('slack_whiteboard_installations')
          .insert({
            ...installationData,
            created_at: new Date().toISOString(),
          })
          .execute();

        this.logger.log('Created new installation for team:', result.team.id);
      }

      // Don't send welcome message yet - wait until user completes login/register

      return {
        setupToken,
        teamId: result.team.id,
        teamName: result.team.name,
      };
    } catch (error) {
      this.logger.error('OAuth callback error:', error);
      throw error;
    }
  }

  /**
   * Handle /whiteboard slash command
   */
  async handleCommand(payload: any) {
    const { command, text, user_id, team_id, channel_id } = payload;

    this.logger.log(`Command received: ${command} ${text} from user ${user_id} in team ${team_id}`);

    const args = text.trim().split(' ').filter(Boolean);
    const action = args[0]?.toLowerCase() || 'new';

    switch (action) {
      case 'new':
      case 'create':
        // Process asynchronously to avoid timeout
        setImmediate(() => this.createWhiteboard(team_id, user_id, channel_id));
        return {
          response_type: 'ephemeral',
          text: '🎨 Creating your whiteboard... One moment!',
        };

      case 'list':
        return await this.listWhiteboards(team_id, user_id);

      case 'project':
        const projectAction = args[1]?.toLowerCase();
        if (projectAction === 'new' || projectAction === 'create') {
          return await this.openProjectCreationInBrowser(team_id, user_id, args.slice(2).join(' '));
        } else if (projectAction === 'list') {
          return await this.listProjects(team_id, user_id);
        }
        return {
          response_type: 'ephemeral',
          text: '❓ Unknown project command. Use `/whiteboard project new` or `/whiteboard project list`',
        };

      case 'help':
        return this.showHelp();

      default:
        return {
          response_type: 'ephemeral',
          text: `❓ Unknown command: \`${action}\`\n\nType \`/whiteboard help\` for available commands.`,
        };
    }
  }

  /**
   * Create new whiteboard
   */
  private async createWhiteboard(teamId: string, slackUserId: string, channelId: string) {
    try {
      this.logger.log(`Creating whiteboard for team ${teamId}, user ${slackUserId}`);

      // Get Slack installation
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get Slack user info
      const userInfo = await slackClient.users.info({ user: slackUserId });
      const userName = userInfo.user.real_name || userInfo.user.name;

      this.logger.log(`Slack user info: ${userName}`);

      const whiteboardName = `Whiteboard - ${new Date().toLocaleString()}`;

      // Get or create a default workspace for Slack whiteboards
      // This workspace acts as a container for Slack-created whiteboards
      let workspaceId = await this.getOrCreateSlackWorkspace(teamId, installation.team_name);

      // Get Deskive user ID from Slack user ID mapping
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        this.logger.error('Cannot find Deskive user for Slack user:', slackUserId);
        return {
          response_type: 'ephemeral',
          text: '❌ You need to be invited to the Deskive workspace first.\n\n' +
                'Please ask your workspace admin to invite you via email to the Deskive workspace.\n\n' +
                'Once you accept the invitation and create your Deskive account, you can use Slack commands.',
        };
      }

      this.logger.log(`Using Deskive user ID: ${deskiveUserId} for Slack user: ${slackUserId}`);

      // Create whiteboard with Deskive user ID
      const whiteboardResult = await this.db.table('whiteboards')
        .insert({
          workspace_id: workspaceId,
          name: whiteboardName,
          description: `Created from Slack by ${userName}`,
          created_by: deskiveUserId, // Use Deskive user ID, not Slack user ID!
          is_public: false,
          elements: JSON.stringify([]),
          app_state: JSON.stringify({}),
          files: JSON.stringify({}),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .returning('*')
        .execute();

      const whiteboard = whiteboardResult.data[0];

      this.logger.log(`Whiteboard created: ${whiteboard.id}`);

      // Link whiteboard to Slack
      await this.db.table('slack_whiteboard_links')
        .insert({
          whiteboard_id: whiteboard.id,
          team_id: teamId,
          channel_id: channelId,
          creator_slack_user_id: slackUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      // Generate shareable URL with workspace ID (note: /workspaces plural)
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const whiteboardUrl = `${appUrl}/workspaces/${workspaceId}/whiteboard/${whiteboard.id}?slack_team_id=${teamId}&slack_user_id=${slackUserId}&slack_channel_id=${channelId}`;

      // Try to join the channel first (in case bot isn't a member)
      try {
        await slackClient.conversations.join({ channel: channelId });
        this.logger.log('Bot joined channel:', channelId);
      } catch (joinError) {
        // If join fails, it might already be a member or it's a DM - continue anyway
        this.logger.warn('Could not join channel (might already be a member):', joinError.message);
      }

      // Try to post interactive message to Slack channel
      let messagePosted = false;
      try {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: `New whiteboard created! 🎨`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*🎨 New Whiteboard Created*\n\n<@${slackUserId}> created a collaborative whiteboard!`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📝 *Name:* ${whiteboard.name}\n🔗 *Link:* <${whiteboardUrl}|Open Whiteboard>`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🎨 Open Whiteboard', emoji: true },
                  url: whiteboardUrl,
                  style: 'primary',
                  action_id: 'open_whiteboard',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📤 Share', emoji: true },
                  action_id: 'share_whiteboard',
                  value: whiteboard.id,
                },
              ],
            },
          ],
        });
        messagePosted = true;
        this.logger.log('Whiteboard message posted to Slack');
      } catch (postError) {
        this.logger.error('Could not post to channel:', postError.message);
        // Continue anyway - user will get the link in ephemeral message
      }

      // Return ephemeral message to user with link
      if (messagePosted) {
        return {
          response_type: 'ephemeral',
          text: `✅ Whiteboard created successfully! Check the channel above for the link.`,
        };
      } else {
        // If posting to channel failed, give user the direct link
        return {
          response_type: 'ephemeral',
          text: `✅ Whiteboard created!\n\n🔗 *Link:* ${whiteboardUrl}\n\n💡 *Tip:* Invite the bot to this channel with \`/invite @Deskive Whiteboard\` to share whiteboards here.`,
        };
      }
    } catch (error) {
      this.logger.error('Error creating whiteboard:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error creating whiteboard: ${error.message}`,
      };
    }
  }

  /**
   * List user's whiteboards
   */
  private async listWhiteboards(teamId: string, slackUserId: string) {
    try {
      this.logger.log(`Listing whiteboards for team ${teamId}, user ${slackUserId}`);

      // Get user's whiteboards from Slack links
      const linksResult = await this.db.table('slack_whiteboard_links')
        .select('whiteboard_id', 'created_at', 'channel_id')
        .where('team_id', '=', teamId)
        .where('creator_slack_user_id', '=', slackUserId)
        .orderBy('created_at', 'DESC')
        .limit(10)
        .execute();

      const links = linksResult.data || [];

      if (!links || links.length === 0) {
        return {
          response_type: 'ephemeral',
          text: "You haven't created any whiteboards yet. 🎨\n\nUse `/whiteboard new` to create your first one!",
        };
      }

      // Get whiteboard details including workspace_id
      const whiteboardIds = links.map((l) => l.whiteboard_id);
      const whiteboardsResult = await this.db.table('whiteboards')
        .select('id', 'name', 'workspace_id', 'created_at')
        .whereIn('id', whiteboardIds)
        .execute();

      const whiteboards = whiteboardsResult.data || [];

      // Build response blocks
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📋 Your Recent Whiteboards* (${links.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      links.forEach((link, index) => {
        const wb = whiteboards.find((w) => w.id === link.whiteboard_id);
        const url = `${appUrl}/workspaces/${wb?.workspace_id || 'unknown'}/whiteboard/${link.whiteboard_id}`;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `${index + 1}. *${wb?.name || 'Whiteboard'}*\n` +
              `📅 Created: ${new Date(link.created_at).toLocaleDateString()}\n` +
              `📍 Channel: <#${link.channel_id}>`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: url,
            action_id: `open_wb_${link.whiteboard_id}`,
          },
        });
      });

      return {
        response_type: 'ephemeral',
        blocks,
      };
    } catch (error) {
      this.logger.error('Error listing whiteboards:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error loading whiteboards: ${error.message}`,
      };
    }
  }

  /**
   * Open project creation in Deskive web UI
   */
  private async openProjectCreationInBrowser(teamId: string, slackUserId: string, projectName?: string) {
    try {
      // Get Deskive user ID
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ You need to be invited to the Deskive workspace first.\n\n' +
                'Please ask your workspace admin to invite you via email to the Deskive workspace.\n\n' +
                'Once you accept the invitation and create your Deskive account, you can use Slack commands.',
        };
      }

      // Get workspace ID
      const installation = await this.getInstallation(teamId);
      const workspaceId = await this.getOrCreateSlackWorkspace(teamId, installation.team_name);

      // Generate temporary auth token (valid for 1 hour)
      const tempToken = await this.generateTempAuthToken(deskiveUserId, teamId, slackUserId);

      // Build URL to Deskive project creation page
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const params = new URLSearchParams({
        token: tempToken,
        workspace_id: workspaceId,
        slack_team_id: teamId,
        slack_user_id: slackUserId,
        source: 'slack',
      });

      if (projectName) {
        params.append('name', projectName);
      }

      const createProjectUrl = `${appUrl}/workspaces/${workspaceId}/projects?action=create&${params.toString()}`;

      return {
        response_type: 'ephemeral',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*📋 Create a New Project*\n\nClick the button below to open the project creation form in Deskive.',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '➕ Create Project in Deskive', emoji: true },
                url: createProjectUrl,
                style: 'primary',
                action_id: 'open_create_project',
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 *Tip:* The form will open in your browser with all project fields and options.',
              },
            ],
          },
        ],
      };
    } catch (error) {
      this.logger.error('Error opening project creation:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error: ${error.message}`,
      };
    }
  }

  /**

  /**
   * List user's projects
   */
  private async listProjects(teamId: string, slackUserId: string) {
    try {
      this.logger.log(`Listing projects for team ${teamId}, user ${slackUserId}`);

      // Get Deskive user ID
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: '❌ You need to be invited to the Deskive workspace first.\n\n' +
                'Please ask your workspace admin to invite you via email.',
        };
      }

      // Get workspace ID
      const installation = await this.getInstallation(teamId);
      const workspaceId = await this.getOrCreateSlackWorkspace(teamId, installation.team_name);

      // Get user's projects
      const projectsResult = await this.db.table('projects')
        .select('id', 'name', 'description', 'status', 'priority', 'created_at')
        .where('workspace_id', '=', workspaceId)
        .orderBy('created_at', 'DESC')
        .limit(10)
        .execute();

      const projects = projectsResult.data || [];

      if (!projects || projects.length === 0) {
        return {
          response_type: 'ephemeral',
          text: "You haven't created any projects yet. 📋\n\nUse `/whiteboard project new` to create your first one!",
        };
      }

      // Build response blocks
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📋 Your Recent Projects* (${projects.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      projects.forEach((project, index) => {
        const statusEmoji = {
          planning: '📋',
          in_progress: '🚀',
          on_hold: '⏸️',
          completed: '✅',
        }[project.status] || '📋';

        const priorityEmoji = {
          high: '🔴',
          medium: '🟡',
          low: '🟢',
        }[project.priority] || '🟡';

        const url = `${appUrl}/workspaces/${workspaceId}/projects/${project.id}`;

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `${index + 1}. *${project.name}*\n` +
              `${statusEmoji} ${project.status} • ${priorityEmoji} ${project.priority}\n` +
              `📅 Created: ${new Date(project.created_at).toLocaleDateString()}`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: url,
            action_id: `open_project_${project.id}`,
          },
        });
      });

      return {
        response_type: 'ephemeral',
        blocks,
      };
    } catch (error) {
      this.logger.error('Error listing projects:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error loading projects: ${error.message}`,
      };
    }
  }

  /**
   * Generate temporary auth token for browser access
   */
  private async generateTempAuthToken(deskiveUserId: string, slackTeamId: string, slackUserId: string): Promise<string> {
    try {
      // Create a temporary auth token (valid for 1 hour)
      const payload = {
        sub: deskiveUserId,
        userId: deskiveUserId,
        slack_team_id: slackTeamId,
        slack_user_id: slackUserId,
        temp_auth: true,
        purpose: 'slack_browser_access',
      };

      const token = this.jwtService.sign(payload, {
        expiresIn: '1h', // 1 hour expiration
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating temp auth token:', error);
      throw new Error('Could not generate authentication token');
    }
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
            text: '*🎨 Whiteboard Commands*',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              '`/whiteboard new` - Create a new collaborative whiteboard\n' +
              '`/whiteboard list` - View all your whiteboards\n' +
              '`/whiteboard help` - Show this help message',
          },
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 *Tip:* Use `/project` for projects, `/calendar` for events!',
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
      this.logger.log('Event received:', event.type);

      if (event.type === 'app_home_opened') {
        await this.updateHomeTab(event.user, team_id);
      }

      if (event.type === 'app_mention') {
        await this.handleMention(event, team_id);
      }

      if (event.type === 'app_uninstalled' || event.type === 'tokens_revoked') {
        await this.handleAppUninstalled(team_id);
      }
    } catch (error) {
      this.logger.error('Error handling Slack event:', error);
    }
  }

  /**
   * Handle user-initiated disconnect from App Home
   */
  private async handleDisconnectApp(teamId: string, userId: string) {
    try {
      this.logger.log('Processing disconnect request for team:', teamId, 'user:', userId);

      // Get installation
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Mark installation as inactive (same as app_uninstalled)
      await this.handleAppUninstalled(teamId);

      // Send confirmation DM
      await slackClient.chat.postMessage({
        channel: userId,
        text: '✅ Deskive has been disconnected from this workspace.',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*✅ App Disconnected Successfully*\n\nDeskive has been removed from your Slack workspace.',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*What happens next?*\n• Slash commands will stop working\n• Bot will no longer post to channels\n• Your data in Deskive is safe and accessible',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 You can reinstall Deskive anytime from the Slack App Directory',
              },
            ],
          },
        ],
      });

      this.logger.log('Disconnect completed for team:', teamId);
    } catch (error) {
      this.logger.error('Error handling disconnect:', error);
    }
  }

  /**
   * Handle app uninstallation (from Slack event or user action)
   */
  private async handleAppUninstalled(teamId: string) {
    try {
      this.logger.log('App uninstalled for team:', teamId);

      // Mark installation as inactive
      await this.db.table('slack_whiteboard_installations')
        .update({
          is_active: false,
          uninstalled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .where('team_id', '=', teamId)
        .execute();

      // Mark all user mappings as inactive for this team
      await this.db.table('slack_user_mappings')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .where('slack_team_id', '=', teamId)
        .execute();

      // Mark all channel links as inactive
      await this.db.table('slack_calendar_channel_links')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .where('team_id', '=', teamId)
        .execute();

      this.logger.log('Successfully marked installation and related data as inactive for team:', teamId);
    } catch (error) {
      this.logger.error('Error handling app uninstallation:', error);
    }
  }

  /**
   * Handle button clicks and interactions
   */
  async handleInteraction(payload: any) {
    const { type, user, actions, team, trigger_id } = payload;

    try {
      this.logger.log('Interaction type:', type);

      if (type === 'block_actions' && actions && actions.length > 0) {
        const action = actions[0];

        if (action.action_id === 'share_whiteboard') {
          this.logger.log('Share whiteboard action:', action.value);
          // Open modal to share with Deskive users
          await this.openShareModal(team.id, user.id, action.value, trigger_id);
        } else if (action.action_id === 'create_whiteboard_home') {
          // Create from App Home
          await this.createWhiteboard(team.id, user.id, user.id);
        } else if (action.action_id === 'disconnect_app') {
          this.logger.log('Disconnect app requested for team:', team.id);
          await this.handleDisconnectApp(team.id, user.id);
        }
      } else if (type === 'view_submission') {
        // Handle share whiteboard submission
        await this.handleShareSubmission(payload);
      }
    } catch (error) {
      this.logger.error('Error handling interaction:', error);
    }
  }

  /**
   * Open modal to share whiteboard with Deskive users
   */
  private async openShareModal(teamId: string, slackUserId: string, whiteboardId: string, triggerId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get whiteboard details
      const whiteboardResult = await this.db.table('whiteboards')
        .select('id', 'name', 'workspace_id')
        .where('id', '=', whiteboardId)
        .execute();

      const whiteboard = whiteboardResult.data?.[0];

      if (!whiteboard) {
        this.logger.error('Whiteboard not found:', whiteboardId);
        return;
      }

      // Get current user's Deskive ID
      const currentDeskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      // Get all workspace members
      const workspaceMembersResult = await this.db.table('workspace_members')
        .select('user_id')
        .where('workspace_id', '=', whiteboard.workspace_id)
        .where('is_active', '=', true)
        .execute();

      const members = workspaceMembersResult.data || [];

      // Get user details for each member (excluding current user)
      const userOptions: any[] = [];
      for (const member of members) {
        if (member.user_id === currentDeskiveUserId) {
          continue; // Skip current user
        }

        try {
          const userProfile = await this.db.getUserById(member.user_id);
          if (userProfile) {
            const metadata = userProfile.metadata || {};
            const userName = metadata.name || (userProfile as any).fullName || userProfile.name || userProfile.email || 'Unknown User';
            userOptions.push({
              text: { type: 'plain_text' as const, text: userName },
              value: member.user_id,
            });
          }
        } catch (error) {
          this.logger.error('Error fetching user:', member.user_id);
        }
      }

      this.logger.log(`Found ${userOptions.length} workspace members to share with`);

      if (userOptions.length === 0) {
        await slackClient.chat.postEphemeral({
          channel: slackUserId,
          user: slackUserId,
          text: '❌ No other workspace members found.\n\nInvite team members to the workspace first!',
        });
        return;
      }

      // Open modal for user selection
      await slackClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'share_whiteboard_modal',
          private_metadata: JSON.stringify({ whiteboardId, workspaceId: whiteboard.workspace_id, teamId }),
          title: {
            type: 'plain_text',
            text: 'Share Whiteboard',
          },
          submit: {
            type: 'plain_text',
            text: 'Share',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Share: ${whiteboard.name}*\n\nSelect workspace members to share with (${userOptions.length} available):`,
              },
            },
            {
              type: 'input',
              block_id: 'users_select',
              label: {
                type: 'plain_text',
                text: 'Select Workspace Members',
              },
              element: {
                type: 'multi_static_select',
                action_id: 'selected_users',
                placeholder: {
                  type: 'plain_text',
                  text: 'Choose members to share with...',
                },
                options: userOptions,
              },
            },
            {
              type: 'input',
              block_id: 'message_input',
              optional: true,
              label: {
                type: 'plain_text',
                text: 'Message (optional)',
              },
              element: {
                type: 'plain_text_input',
                action_id: 'share_message',
                multiline: true,
                placeholder: {
                  type: 'plain_text',
                  text: 'Add a message for the recipients...',
                },
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '💡 All workspace members are shown',
                },
              ],
            },
          ],
        },
      });

      this.logger.log('Share modal opened for whiteboard:', whiteboardId);
    } catch (error) {
      this.logger.error('Error opening share modal:', error);
    }
  }

  /**

  /**
   * Handle share modal submission
   */
  private async handleShareSubmission(payload: any) {
    try {
      const { user, team, view } = payload;
      const metadata = JSON.parse(view.private_metadata);
      const { whiteboardId, workspaceId, teamId } = metadata;

      // Get selected Deskive users from modal (now using multi_static_select)
      const selectedDeskiveUsers = view.state.values.users_select.selected_users.selected_options?.map(opt => opt.value) || [];
      const customMessage = view.state.values.message_input?.share_message?.value || '';

      this.logger.log('Share submission:', { whiteboardId, selectedDeskiveUsers, customMessage });

      if (!selectedDeskiveUsers || selectedDeskiveUsers.length === 0) {
        this.logger.warn('No users selected for sharing');
        return;
      }

      // Add selected users as collaborators
      const sharePromises = selectedDeskiveUsers.map(async (userId) => {
        try {
          await this.db.table('whiteboard_collaborators')
            .insert({
              whiteboard_id: whiteboardId,
              user_id: userId,
              permission: 'edit',
              created_at: new Date().toISOString(),
            })
            .execute();

          this.logger.log(`Added collaborator: ${userId} to whiteboard: ${whiteboardId}`);
        } catch (shareError) {
          if (shareError.message?.includes('duplicate') || shareError.code === '23505') {
            this.logger.log(`User ${userId} already has access`);
          } else {
            this.logger.error(`Failed to share with ${userId}:`, shareError.message);
          }
        }
      });

      await Promise.all(sharePromises);

      // Send confirmation to the user who shared
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      await slackClient.chat.postEphemeral({
        channel: user.id,
        user: user.id,
        text: `✅ Whiteboard shared with ${selectedDeskiveUsers.length} member(s)!`,
      });

      this.logger.log(`Whiteboard shared with ${selectedDeskiveUsers.length} workspace member(s)`);
    } catch (error) {
      this.logger.error('Error handling share submission:', error);
    }
  }

  /**
   * Update Slack App Home tab
   */
  private async updateHomeTab(userId: string, teamId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get Deskive user ID
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(userId, teamId);

      // Check workspace setup status
      const workspaceId = await this.getSlackWorkspaceId(teamId);
      const isWorkspaceSetup = !!workspaceId;

      // Get workspace member count
      let memberCount = 0;
      if (workspaceId) {
        const membersResult = await this.db.table('workspace_members')
          .select('id')
          .where('workspace_id', '=', workspaceId)
          .where('is_active', '=', true)
          .execute();
        memberCount = membersResult.data?.length || 0;
      }

      // Get stats for all three features
      const [whiteboardsResult, projectsResult, eventsResult] = await Promise.all([
        // Whiteboard count
        this.db.table('slack_whiteboard_links')
          .select('*')
          .where('team_id', '=', teamId)
          .where('creator_slack_user_id', '=', userId)
          .execute(),
        // Projects count (if user is linked)
        deskiveUserId
          ? this.db.table('projects')
              .select('*')
              .where('owner_id', '=', deskiveUserId)
              .where('status', '=', 'active')
              .execute()
          : Promise.resolve({ data: [] }),
        // Upcoming events count (next 7 days)
        deskiveUserId
          ? this.db.table('calendar_events')
              .select('*')
              .where('organizer_id', '=', deskiveUserId)
              .where('start_time', '>=', new Date().toISOString())
              .where('start_time', '<=', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())
              .execute()
          : Promise.resolve({ data: [] }),
      ]);

      const whiteboards = whiteboardsResult.data || [];
      const projects = projectsResult.data || [];
      const upcomingEvents = eventsResult.data || [];

      // Build blocks based on setup status
      const blocks: any[] = [];

      // Hero Section
      blocks.push(
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚀 Welcome to Deskive!',
            emoji: true,
          },
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '_Your all-in-one workspace for whiteboards, calendars, and projects - right inside Slack!_',
          },
        },
        { type: 'divider' }
      );

      // Setup Status Section (for admins/reviewers)
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*⚙️ Setup Status*',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Workspace*\n${isWorkspaceSetup ? '✅ Connected' : '⏳ Setting up...'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Your Account*\n${deskiveUserId ? '✅ Linked' : '⏳ Pending'}`,
            },
            {
              type: 'mrkdwn',
              text: `*Team Members*\n${memberCount} member${memberCount !== 1 ? 's' : ''}`,
            },
            {
              type: 'mrkdwn',
              text: `*Activity*\n${whiteboards.length + projects.length + upcomingEvents.length} item${whiteboards.length + projects.length + upcomingEvents.length !== 1 ? 's' : ''}`,
            },
          ],
        },
        { type: 'divider' }
      );

      // Getting Started Guide (especially for Slack reviewers)
      if (!deskiveUserId || memberCount <= 1) {
        blocks.push(
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*📖 Getting Started Guide*\n\n' +
                    'Follow these steps to set up and test Deskive:',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Step 1️⃣: Add Team Members*\n' +
                    '├ Go to <https://deskive.com|Deskive Dashboard>\n' +
                    '├ Navigate to Workspace Settings → Members\n' +
                    '├ Click "Invite Member"\n' +
                    '├ Enter their email (must match Slack email!)\n' +
                    '└ Team member will receive invitation via email',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Step 2️⃣: Member Accepts Invitation*\n' +
                    '├ Team member checks their email\n' +
                    '├ Clicks invitation link\n' +
                    '├ Creates Deskive account or logs in\n' +
                    '└ Now they can use Slack commands!',
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*Step 3️⃣: Test Commands*\n' +
                    '├ Any team member can type `/project list`\n' +
                    '├ First use automatically links their account\n' +
                    '├ Commands work instantly after linking\n' +
                    '└ All members collaborate in same workspace',
            },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: '💡 *For Slack Reviewers:* Invite a test email, accept the invitation in Deskive, then try slash commands. The auto-linking happens seamlessly!',
              },
            ],
          },
          { type: 'divider' }
        );
      }

      // Stats Dashboard
      blocks.push(
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*📊 Your Activity Dashboard*',
          },
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*🎨 Whiteboards*\n${whiteboards.length} created`,
            },
            {
              type: 'mrkdwn',
              text: `*📋 Projects*\n${projects.length} active`,
            },
            {
              type: 'mrkdwn',
              text: `*📅 Events*\n${upcomingEvents.length} upcoming`,
            },
            {
              type: 'mrkdwn',
              text: `*✨ Status*\n${whiteboards.length + projects.length + upcomingEvents.length > 0 ? 'Active' : 'Ready to Start!'}`,
            },
          ],
        },
        { type: 'divider' }
      );

      await slackClient.views.publish({
        user_id: userId,
        view: {
          type: 'home',
          blocks: [
            ...blocks,

            // Feature 1: Whiteboards
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*🎨 Whiteboards* - _Visual collaboration made simple_\n' +
                  '├ `/whiteboard new` - Create a whiteboard\n' +
                  '├ `/whiteboard list` - View your whiteboards\n' +
                  '└ `/whiteboard help` - Get help',
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: '➕ New Whiteboard', emoji: true },
                action_id: 'create_whiteboard_home',
                style: 'primary',
              },
            },

            // Feature 2: Calendar
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*📅 Calendar* - _Schedule and manage events effortlessly_\n' +
                  '├ `/calendar new <event>` - Quick event creation\n' +
                  '├ `/calendar today` - Today\'s schedule\n' +
                  '├ `/calendar list` - Upcoming events\n' +
                  '└ `/calendar help` - Get help',
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: '📅 New Event', emoji: true },
                url: `slack://channel?team=${teamId}&id=slackbot`,
                action_id: 'create_event_hint',
              },
            },

            // Feature 3: Projects
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*📋 Projects* - _Track tasks and deliver on time_\n' +
                  '├ `/project new <name>` - Create a project\n' +
                  '├ `/project list` - View all projects\n' +
                  '└ `/project help` - Get help',
              },
              accessory: {
                type: 'button',
                text: { type: 'plain_text', text: '📋 New Project', emoji: true },
                url: `slack://channel?team=${teamId}&id=slackbot`,
                action_id: 'create_project_hint',
              },
            },
            { type: 'divider' },

            // Quick Tips
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*💡 Pro Tips*\n' +
                  '• Use `/whiteboard new` in any channel to start collaborating instantly\n' +
                  '• Create events with natural language: `/calendar new Team lunch tomorrow at noon`\n' +
                  '• Mention `@Deskive help` anywhere for quick assistance',
              },
            },
            { type: 'divider' },

            // Footer with links
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📖 View Tutorial', emoji: true },
                  url: 'https://deskive.com/tutorial',
                  action_id: 'view_tutorial',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🌐 Open Dashboard', emoji: true },
                  url: 'https://deskive.com',
                  action_id: 'open_dashboard',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🆘 Get Support', emoji: true },
                  url: 'https://deskive.com/support',
                  action_id: 'get_support',
                },
              ],
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '🔌 Disconnect App', emoji: true },
                  action_id: 'disconnect_app',
                  style: 'danger',
                  confirm: {
                    title: { type: 'plain_text', text: 'Disconnect Deskive?' },
                    text: { type: 'mrkdwn', text: 'Are you sure you want to disconnect Deskive from this workspace?\n\n⚠️ This will:\n• Stop all notifications\n• Disable slash commands\n• Remove bot access\n\nYour data in Deskive will remain safe and accessible.' },
                    confirm: { type: 'plain_text', text: 'Yes, Disconnect' },
                    deny: { type: 'plain_text', text: 'Cancel' },
                  },
                },
              ],
            },
          ],
        },
      });

      this.logger.log('Combined App Home tab updated for user:', userId);
    } catch (error) {
      this.logger.error('Error updating home tab:', error);
    }
  }

  /**
   * Handle @mentions of the bot
   */
  private async handleMention(event: any, teamId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      const text = event.text.toLowerCase();

      let responseText = `Hi <@${event.user}>! 👋\n\n`;

      if (text.includes('help')) {
        responseText +=
          'Here are the available commands:\n\n' +
          '*🎨 Whiteboard*\n' +
          '• `/whiteboard new` - Create a whiteboard\n' +
          '• `/whiteboard list` - View your whiteboards\n\n' +
          '*📅 Calendar*\n' +
          '• `/calendar new <event>` - Create an event\n' +
          '• `/calendar today` - View today\'s events\n' +
          '• `/calendar list` - View upcoming events\n\n' +
          '*📋 Projects*\n' +
          '• `/project new` - Create a project\n' +
          '• `/project list` - View your projects\n\n' +
          'Need more help? Visit <https://deskive.com/tutorial|our documentation>';
      } else {
        responseText +=
          "I can help you with Whiteboards, Calendar, and Projects! 🎨📅📋\n\n" +
          'Try typing `/whiteboard new` to create your first whiteboard!';
      }

      await slackClient.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: responseText,
      });

      this.logger.log('Replied to mention from user:', event.user);
    } catch (error) {
      this.logger.error('Error handling mention:', error);
    }
  }

  /**
   * Send welcome message after installation
   */
  private async sendWelcomeMessage(teamId: string, userId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      await slackClient.chat.postMessage({
        channel: userId, // Send DM to installer
        text: '👋 Welcome to Deskive!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: "*👋 Welcome to Deskive!*\n\nYou're all set to collaborate with your team using Whiteboards, Calendar, and Project Management!",
            },
          },
          { type: 'divider' },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text:
                '*🎨 Whiteboard Commands*\n' +
                '• `/whiteboard new` - Create a whiteboard\n' +
                '• `/whiteboard list` - View your whiteboards\n\n' +
                '*📅 Calendar Commands*\n' +
                '• `/calendar new <event>` - Create an event\n' +
                '• `/calendar today` - View today\'s events\n' +
                '• `/calendar list` - View upcoming events\n\n' +
                '*📋 Project Commands*\n' +
                '• `/project new` - Create a project\n' +
                '• `/project list` - View your projects',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '📖 View Tutorial', emoji: true },
                url: 'https://deskive.com/tutorial',
                action_id: 'view_tutorial',
              },
            ],
          },
        ],
      });

      this.logger.log('Welcome message sent to user:', userId);
    } catch (error) {
      this.logger.error('Error sending welcome message:', error);
    }
  }

  /**
   * Helper: Get or create workspace for Slack team
   */
  private async getOrCreateSlackWorkspace(teamId: string, teamName: string): Promise<string> {
    // Check if workspace exists for this Slack team (by metadata, not name)
    const existingWorkspace = await this.db.table('workspaces')
      .select('*')
      .where('metadata', '@>', JSON.stringify({ slack_team_id: teamId }))
      .execute();

    if (existingWorkspace.data && existingWorkspace.data.length > 0) {
      this.logger.log('Found existing Slack workspace:', existingWorkspace.data[0].id);
      return existingWorkspace.data[0].id;
    }

    // Create new workspace for this Slack team
    const newWorkspace = await this.db.table('workspaces')
      .insert({
        name: `${teamName}`,
        description: `Workspace for Slack team: ${teamName}`,
        owner_id: teamId, // Use Slack team ID as owner temporarily
        is_active: true,
        settings: JSON.stringify({}),
        metadata: JSON.stringify({ slack_team_id: teamId, source: 'slack' }),
        collaborative_data: JSON.stringify({}),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .returning('*')
      .execute();

    this.logger.log('Created workspace for Slack team:', newWorkspace.data[0].id);
    return newWorkspace.data[0].id;
  }

  /**
   * Helper: Ensure user is a member of the workspace
   */
  private async ensureUserInWorkspace(workspaceId: string, userId: string, isOwner: boolean = false) {
    try {
      // Check if user is already a member
      const existingMember = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .execute();

      if (existingMember.data && existingMember.data.length > 0) {
        this.logger.log('User already a member of workspace:', { workspaceId, userId });
        return;
      }

      // Add user as member
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

      this.logger.log('Added user to workspace:', { workspaceId, userId, role: isOwner ? 'owner' : 'member' });

      // If this is the first real user (new user), update workspace owner
      if (isOwner) {
        await this.db.table('workspaces')
          .update({
            owner_id: userId,
            updated_at: new Date().toISOString(),
          })
          .where('id', '=', workspaceId)
          .execute();

        this.logger.log('Updated workspace owner to:', userId);
      }
    } catch (error) {
      this.logger.error('Error ensuring user in workspace:', error);
      // Don't throw - this shouldn't block the OAuth flow
    }
  }

  /**
   * Helper: Get Deskive user ID from Slack user ID
   * If no mapping exists, creates one for users already in the workspace
   */
  private async getDeskiveUserIdFromSlack(slackUserId: string, slackTeamId: string): Promise<string | null> {
    try {
      // 1. Check for existing mapping
      const mappingResult = await this.db.table('slack_user_mappings')
        .select('deskive_user_id')
        .where('slack_user_id', '=', slackUserId)
        .where('slack_team_id', '=', slackTeamId)
        .where('is_active', '=', true)
        .execute();

      if (mappingResult.data && mappingResult.data.length > 0) {
        return mappingResult.data[0].deskive_user_id;
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
      await this.createUserMapping(deskiveUserId, slackUserId, slackTeamId, email, name, avatar);

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
   * Get workspace ID for a Slack team
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
   * Create Slack user mapping
   */
  private async createUserMapping(
    deskiveUserId: string,
    slackUserId: string,
    slackTeamId: string,
    slackEmail: string,
    slackName: string,
    slackAvatar: string
  ): Promise<void> {
    try {
      const mappingData = {
        deskive_user_id: deskiveUserId,
        slack_user_id: slackUserId,
        slack_team_id: slackTeamId,
        slack_email: slackEmail,
        slack_name: slackName,
        slack_avatar: slackAvatar,
        user_access_token: null,
        onboarding_completed: true,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      await this.db.table('slack_user_mappings')
        .insert(mappingData)
        .execute();

      this.logger.log(`Created user mapping: ${slackUserId} → ${deskiveUserId}`);
    } catch (error) {
      // Handle duplicate key error gracefully
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        this.logger.log(`User mapping already exists for ${slackUserId}`);
      } else {
        this.logger.error('Error creating user mapping:', error);
        throw error;
      }
    }
  }

  /**
   * Helper: Get Slack installation
   */
  private async getInstallation(teamId: string) {
    const result = await this.db.table('slack_whiteboard_installations')
      .select('*')
      .where('team_id', '=', teamId)
      .where('is_active', '=', true)
      .execute();

    const installations = result.data || [];

    if (!installations || installations.length === 0) {
      throw new Error('Slack workspace not found. Please reinstall the app.');
    }

    return installations[0];
  }

  /**
   * Helper: Find Deskive user by email
   */
  private async findUserByEmail(email: string) {
    try {
      // Use searchUsers to find by email
      const result = await this.db.searchUsers(email, {
        limit: 1,
      });

      this.logger.log('Search result for email:', email, JSON.stringify(result, null, 2));

      if (result && result.users && result.users.length > 0) {
        // Find user with EXACT email match (searchUsers does fuzzy search)
        const user = result.users.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!user) {
          this.logger.log('No exact email match found for:', email);
          return null;
        }

        // Check if user is deleted or inactive
        if ((user as any).deleted_at || (user as any).deletedAt || (user as any).deleted) {
          this.logger.log('User found but marked as deleted:', email);
          return null;
        }

        // Check if email_verified exists and is not null (active user)
        this.logger.log('User found:', { id: user.id, email: user.email, emailVerified: (user as any).emailVerified });
        return user;
      }

      this.logger.log('No user found for email:', email);
      return null;
    } catch (error) {
      this.logger.error('Error finding user by email:', error);
      return null;
    }
  }

  /**
   * Helper: Create new Deskive user from Slack profile
   */
  private async createDeskiveUser(email: string, name: string, avatarUrl: string) {
    // Generate secure random password (user won't use it)
    const randomPassword = randomBytes(32).toString('hex');

    const response = await this.db.authClient.auth.register({
      email,
      password: randomPassword,
      name,
      metadata: {
        source: 'slack_oauth',
        slack_avatar: avatarUrl,
        onboarding_source: 'slack_whiteboard',
      },
      frontendUrl: this.configService.get('FRONTEND_URL'),
    });

    this.logger.log('Created new user via auth service:', response.user.id);

    return response; // Return the full response including token
  }

  /**
   * Helper: Generate auth token for user
   */
  private async generateAuthToken(user: any, fromRegistration: any = null): Promise<string> {
    try {
      // If we have a registration response with token, use it
      if (fromRegistration && (fromRegistration.token || fromRegistration.access_token)) {
        return fromRegistration.token || fromRegistration.access_token;
      }

      // For existing users, generate a JWT token
      // Use the same approach as AuthService
      const payload = {
        sub: user.id, // Standard JWT subject claim
        userId: user.id, // For backward compatibility
        email: user.email,
        name: user.name,
      };

      // Generate token with 7 days expiration
      const token = this.jwtService.sign(payload, {
        expiresIn: '7d',
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating auth token:', error);
      throw new Error('Could not generate authentication token');
    }
  }

  /**
   * Send notification to Slack after project is created in web UI
   */
  async notifySlackAfterProjectCreation(
    projectId: string,
    slackTeamId: string,
    slackUserId: string,
  ) {
    try {
      this.logger.log('Sending Slack notification for project:', projectId);

      // Get project details
      const projectResult = await this.db.table('projects')
        .select('*')
        .where('id', '=', projectId)
        .execute();

      if (!projectResult.data || projectResult.data.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectResult.data[0];

      // Get workspace details
      const workspaceResult = await this.db.table('workspaces')
        .select('id', 'name')
        .where('id', '=', project.workspace_id)
        .execute();

      const workspace = workspaceResult.data?.[0];

      // Get Slack installation
      const installation = await this.getInstallation(slackTeamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get project members count
      const membersResult = await this.db.table('project_members')
        .select('user_id')
        .where('project_id', '=', projectId)
        .execute();

      const memberCount = membersResult.data?.length || 0;

      // Build project URL
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const projectUrl = `${appUrl}/workspaces/${project.workspace_id}/projects/${projectId}`;

      // Format status and priority with emojis
      const statusEmoji = {
        planning: '📋',
        in_progress: '🚀',
        on_hold: '⏸️',
        completed: '✅',
      }[project.status] || '📋';

      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
      }[project.priority] || '🟡';

      // Send message to Slack user (DM)
      await slackClient.chat.postMessage({
        channel: slackUserId,
        text: '✅ Project created successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*✅ Project Created Successfully!*\n\nYour project has been created in Deskive.',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*📋 Project Name*\n${project.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*🏢 Workspace*\n${workspace?.name || 'Unknown'}`,
              },
              {
                type: 'mrkdwn',
                text: `*${statusEmoji} Status*\n${project.status}`,
              },
              {
                type: 'mrkdwn',
                text: `*${priorityEmoji} Priority*\n${project.priority}`,
              },
            ],
          },
        ],
      });

      // If project has description, add it
      if (project.description) {
        const cleanDescription = this.stripHtml(project.description);
        await slackClient.chat.postMessage({
          channel: slackUserId,
          thread_ts: undefined, // Will be in same conversation
          text: `📝 *Description*\n${cleanDescription}`,
        });
      }

      // Add project details and action buttons
      const detailBlocks: any[] = [];

      if (project.deadline) {
        detailBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏰ *Deadline:* ${new Date(project.deadline).toLocaleDateString()}\n` +
                  `👥 *Team Members:* ${memberCount} assigned`,
          },
        });
      } else if (memberCount > 0) {
        detailBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `👥 *Team Members:* ${memberCount} assigned`,
          },
        });
      }

      detailBlocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '📂 Open Project', emoji: true },
            url: projectUrl,
            style: 'primary',
            action_id: 'open_created_project',
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: '➕ Add Task', emoji: true },
            action_id: 'add_task_to_project',
            value: projectId,
          },
        ],
      });

      await slackClient.chat.postMessage({
        channel: slackUserId,
        blocks: detailBlocks,
      });

      this.logger.log('Slack notification sent successfully for project:', projectId);

      return {
        success: true,
        message: 'Notification sent to Slack',
      };
    } catch (error) {
      this.logger.error('Error sending Slack notification:', error);
      throw error;
    }
  }

  /**
   * Send notification to Slack after task is created in web UI
   */
  async notifySlackAfterTaskCreation(
    taskId: string,
    slackTeamId: string,
    slackUserId: string,
  ) {
    try {
      this.logger.log('Sending Slack notification for task:', taskId);

      // Get task details
      const taskResult = await this.db.table('tasks')
        .select('*')
        .where('id', '=', taskId)
        .execute();

      if (!taskResult.data || taskResult.data.length === 0) {
        throw new Error('Task not found');
      }

      const task = taskResult.data[0];

      // Get project details
      let projectName = 'No Project';
      if (task.project_id) {
        const projectResult = await this.db.table('projects')
          .select('name', 'workspace_id')
          .where('id', '=', task.project_id)
          .execute();

        if (projectResult.data && projectResult.data.length > 0) {
          projectName = projectResult.data[0].name;
        }
      }

      // Get Slack installation
      const installation = await this.getInstallation(slackTeamId);
      const slackClient = new WebClient(installation.bot_token);

      // Build task URL
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const taskUrl = task.project_id
        ? `${appUrl}/workspaces/${task.workspace_id}/projects/${task.project_id}?task=${taskId}`
        : `${appUrl}/workspaces/${task.workspace_id}/tasks/${taskId}`;

      // Format status and priority with emojis
      const statusEmoji = {
        todo: '⬜',
        in_progress: '🔵',
        in_review: '🟡',
        done: '✅',
        blocked: '🔴',
      }[task.status] || '⬜';

      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
      }[task.priority] || '🟡';

      // Send message to Slack user
      await slackClient.chat.postMessage({
        channel: slackUserId,
        text: '✅ Task created successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '*✅ Task Created Successfully!*\n\nYour task has been created in Deskive.',
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*✅ Task Name*\n${task.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*📋 Project*\n${projectName}`,
              },
              {
                type: 'mrkdwn',
                text: `*${statusEmoji} Status*\n${task.status}`,
              },
              {
                type: 'mrkdwn',
                text: `*${priorityEmoji} Priority*\n${task.priority}`,
              },
            ],
          },
        ],
      });

      // Add task details
      const detailBlocks: any[] = [];

      if (task.description) {
        const cleanDescription = this.stripHtml(task.description);
        detailBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `📝 *Description*\n${cleanDescription.substring(0, 300)}${cleanDescription.length > 300 ? '...' : ''}`,
          },
        });
      }

      if (task.due_date) {
        detailBlocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `⏰ *Due Date:* ${new Date(task.due_date).toLocaleDateString()}`,
          },
        });
      }

      detailBlocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: '✅ Open Task', emoji: true },
            url: taskUrl,
            style: 'primary',
            action_id: 'open_created_task',
          },
        ],
      });

      if (detailBlocks.length > 0) {
        await slackClient.chat.postMessage({
          channel: slackUserId,
          blocks: detailBlocks,
        });
      }

      this.logger.log('Slack notification sent successfully for task:', taskId);

      return {
        success: true,
        message: 'Notification sent to Slack',
      };
    } catch (error) {
      this.logger.error('Error sending Slack notification:', error);
      throw error;
    }
  }

  /**
   * Complete Slack setup after user authenticates
   */
  async completeSlackSetup(userId: string, setupToken: string) {
    this.logger.log('🔗 [Slack Setup] Starting for user:', userId, 'with token:', setupToken);

    // Get setup session
    const sessionResult = await this.db.table('slack_setup_sessions')
      .select('*')
      .where('setup_token', '=', setupToken)
      .where('completed', '=', false)
      .execute();

    this.logger.log('🔍 [Slack Setup] Session query result:', sessionResult);

    if (!sessionResult.data || sessionResult.data.length === 0) {
      this.logger.error('❌ [Slack Setup] Invalid or expired setup token');
      throw new Error('Invalid or expired setup token');
    }

    const session = sessionResult.data[0];
    const slackData = session.slack_data;

    this.logger.log('📦 [Slack Setup] Slack data:', slackData);

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      this.logger.error('⏰ [Slack Setup] Session expired');
      throw new Error('Setup session expired. Please install the app again from Slack.');
    }

    // Create or get workspace for Slack team
    this.logger.log('🏢 [Slack Setup] Creating/getting workspace...');
    const workspaceId = await this.getOrCreateSlackWorkspace(slackData.slack_team_id, slackData.slack_team_name);
    this.logger.log('✅ [Slack Setup] Workspace ID:', workspaceId);

    // Add user to workspace as owner (first user from this Slack team)
    this.logger.log('👥 [Slack Setup] Adding user to workspace as owner...');
    await this.ensureUserInWorkspace(workspaceId, userId, true);
    this.logger.log('✅ [Slack Setup] User added to workspace');

    // Create user mapping
    this.logger.log('🔗 [Slack Setup] Creating user mapping...');
    await this.createOrUpdateUserMapping(
      userId,
      slackData.slack_user_id,
      slackData.slack_team_id,
      slackData.slack_email,
      slackData.slack_name,
      slackData.slack_avatar,
      slackData.user_access_token,
      true // mark onboarding as complete
    );
    this.logger.log('✅ [Slack Setup] User mapping created');

    // Mark session as completed
    await this.db.table('slack_setup_sessions')
      .update({
        completed: true,
      })
      .where('setup_token', '=', setupToken)
      .execute();

    this.logger.log('✅ [Slack Setup] Session marked as complete');

    // Send welcome message to Slack
    this.logger.log('📨 [Slack Setup] Sending welcome message to Slack...');
    await this.sendWelcomeMessage(slackData.slack_team_id, slackData.slack_user_id);

    this.logger.log('🎉 [Slack Setup] Completed successfully:', { userId, workspaceId });

    return {
      workspaceId,
      teamId: slackData.slack_team_id,
      teamName: slackData.slack_team_name,
    };
  }

  /**
   * Helper: Create or update Slack-Deskive user mapping
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

    // Check if mapping exists
    const existingMapping = await this.db.table('slack_user_mappings')
      .select('*')
      .where('slack_user_id', '=', slackUserId)
      .where('slack_team_id', '=', slackTeamId)
      .execute();

    if (existingMapping.data && existingMapping.data.length > 0) {
      // Update existing mapping
      await this.db.table('slack_user_mappings')
        .update(mappingData)
        .where('slack_user_id', '=', slackUserId)
        .where('slack_team_id', '=', slackTeamId)
        .execute();

      this.logger.log('Updated Slack user mapping:', slackUserId);
    } else {
      // Create new mapping
      await this.db.table('slack_user_mappings')
        .insert({
          ...mappingData,
          created_at: new Date().toISOString(),
        })
        .execute();

      this.logger.log('Created new Slack user mapping:', slackUserId);
    }
  }

}
