import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WebClient } from '@slack/web-api';
import { DatabaseService } from '../database/database.service';
import { ProjectsService } from '../projects/projects.service';

@Injectable()
export class SlackProjectsService {
  private readonly logger = new Logger(SlackProjectsService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
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
   * Handle /deskive project slash command
   */
  async handleCommand(payload: any) {
    const { command, text, user_id, team_id, channel_id } = payload;

    this.logger.log(`Command received: ${command} ${text} from user ${user_id} in team ${team_id}`);

    const args = text.trim().split(' ').filter(Boolean);
    const action = args[0]?.toLowerCase() || 'list';

    switch (action) {
      case 'new':
      case 'create':
        // Get project name from remaining args (optional, will be passed to browser UI)
        const projectName = args.slice(1).join(' ') || null;
        return await this.openProjectCreationInBrowser(team_id, user_id, channel_id, projectName);

      case 'list':
        return await this.listProjects(team_id, user_id);

      case 'help':
        return this.showHelp();

      default:
        return {
          response_type: 'ephemeral',
          text: `❓ Unknown command: \`${action}\`\n\nType \`/project help\` for available commands.`,
        };
    }
  }

  /**
   * Create new project from Slack
   */
  private async createProject(teamId: string, slackUserId: string, channelId: string, projectName: string | null) {
    try {
      this.logger.log(`Creating project for team ${teamId}, user ${slackUserId}`);

      // Get Slack installation
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get Deskive user ID
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(slackUserId, teamId);

      if (!deskiveUserId) {
        return {
          response_type: 'ephemeral',
          text: `❌ Your Slack account is not linked to Deskive.\n\nPlease reinstall the Deskive Whiteboard app to link your account.`,
        };
      }

      // Get user's workspace
      const workspaceResult = await this.db.table('workspace_members')
        .select('workspace_id')
        .where('user_id', '=', deskiveUserId)
        .where('is_active', '=', true)
        .limit(1)
        .execute();

      if (!workspaceResult.data || workspaceResult.data.length === 0) {
        return {
          response_type: 'ephemeral',
          text: `❌ No workspace found. Please complete the Deskive setup first.`,
        };
      }

      const workspaceId = workspaceResult.data[0].workspace_id;

      // Get Slack user info for display name
      const userInfo = await slackClient.users.info({ user: slackUserId });
      const userName = userInfo.user.real_name || userInfo.user.name;

      // If no project name provided, open modal
      if (!projectName) {
        return await this.openCreateProjectModal(slackClient, teamId, slackUserId, workspaceId, channelId, userName);
      }

      // Create project
      const projectData = {
        workspace_id: workspaceId,
        name: projectName,
        description: `Created from Slack by ${userName}`,
        type: 'kanban',
        status: 'active',
        owner_id: deskiveUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const projectResult = await this.db.table('projects')
        .insert(projectData)
        .returning('*')
        .execute();

      const project = projectResult.data[0];

      this.logger.log(`Project created: ${project.id}`);

      // Add user as project member
      await this.db.table('project_members')
        .insert({
          project_id: project.id,
          user_id: deskiveUserId,
          role: 'owner',
          permissions: JSON.stringify([]),
          joined_at: new Date().toISOString(),
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .execute();

      // Link project to Slack
      await this.db.table('slack_project_links')
        .insert({
          project_id: project.id,
          team_id: teamId,
          channel_id: channelId,
          creator_slack_user_id: slackUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .execute();

      // Generate project URL
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const projectUrl = `${appUrl}/workspaces/${workspaceId}/projects/${project.id}`;

      // Try to join channel
      try {
        await slackClient.conversations.join({ channel: channelId });
        this.logger.log('Bot joined channel:', channelId);
      } catch (joinError) {
        this.logger.warn('Could not join channel:', joinError.message);
      }

      // Post message to channel
      let messagePosted = false;
      try {
        await slackClient.chat.postMessage({
          channel: channelId,
          text: `New project created! 📋`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*📋 New Project Created*\n\n<@${slackUserId}> created a new project!`,
              },
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `📝 *Name:* ${project.name}\n🔗 *Link:* <${projectUrl}|Open Project>`,
              },
            },
            {
              type: 'actions',
              elements: [
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📋 Open Project', emoji: true },
                  url: projectUrl,
                  style: 'primary',
                  action_id: 'open_project',
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '➕ Add Task', emoji: true },
                  action_id: 'add_task',
                  value: project.id,
                },
                {
                  type: 'button',
                  text: { type: 'plain_text', text: '📤 Share', emoji: true },
                  action_id: 'share_project',
                  value: project.id,
                },
              ],
            },
          ],
        });
        messagePosted = true;
        this.logger.log('Project message posted to Slack');
      } catch (postError) {
        this.logger.error('Could not post to channel:', postError.message);
      }

      // Return ephemeral message
      if (messagePosted) {
        return {
          response_type: 'ephemeral',
          text: `✅ Project created successfully! Check the channel above for the link.`,
        };
      } else {
        return {
          response_type: 'ephemeral',
          text: `✅ Project created!\n\n🔗 *Link:* ${projectUrl}\n\n💡 *Tip:* Invite the bot to this channel with \`/invite @Deskive Whiteboard\` to share projects here.`,
        };
      }
    } catch (error) {
      this.logger.error('Error creating project:', error);
      return {
        response_type: 'ephemeral',
        text: `❌ Error creating project: ${error.message}`,
      };
    }
  }

  /**
   * Open project creation in Deskive web UI (called directly from slash command)
   */
  private async openProjectCreationInBrowser(teamId: string, slackUserId: string, channelId: string, projectName: string | null) {
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

      // Get user's workspace
      const workspaceResult = await this.db.table('workspace_members')
        .select('workspace_id')
        .where('user_id', '=', deskiveUserId)
        .where('is_active', '=', true)
        .limit(1)
        .execute();

      if (!workspaceResult.data || workspaceResult.data.length === 0) {
        return {
          response_type: 'ephemeral',
          text: '❌ No workspace found. Please complete the Deskive setup first.',
        };
      }

      const workspaceId = workspaceResult.data[0].workspace_id;

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
   * Open browser UI to create project with full form (DEPRECATED - kept for old flow)
   */
  private async openCreateProjectModal(slackClient: WebClient, teamId: string, slackUserId: string, workspaceId: string, channelId: string, userName: string) {
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
   * Generate temporary auth token for browser access
   */
  private async generateTempAuthToken(deskiveUserId: string, slackTeamId: string, slackUserId: string): Promise<string> {
    try {
      const payload = {
        sub: deskiveUserId,
        userId: deskiveUserId,
        slack_team_id: slackTeamId,
        slack_user_id: slackUserId,
        temp_auth: true,
        purpose: 'slack_browser_access',
      };

      const token = this.jwtService.sign(payload, {
        expiresIn: '1h',
      });

      return token;
    } catch (error) {
      this.logger.error('Error generating temp auth token:', error);
      throw new Error('Could not generate authentication token');
    }
  }

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
          text: `❌ Your Slack account is not linked to Deskive.`,
        };
      }

      // Get user's projects via Slack links
      const linksResult = await this.db.table('slack_project_links')
        .select('project_id', 'created_at', 'channel_id')
        .where('team_id', '=', teamId)
        .where('creator_slack_user_id', '=', slackUserId)
        .orderBy('created_at', 'DESC')
        .limit(10)
        .execute();

      const links = linksResult.data || [];

      if (!links || links.length === 0) {
        return {
          response_type: 'ephemeral',
          text: "You haven't created any projects yet. 📋\n\nUse `/project new <name>` to create your first project!",
        };
      }

      // Get project details
      const projectIds = links.map((l) => l.project_id);
      const projectsResult = await this.db.table('projects')
        .select('id', 'name', 'status', 'workspace_id', 'created_at')
        .whereIn('id', projectIds)
        .execute();

      const projects = projectsResult.data || [];

      // Build response blocks
      const blocks: any[] = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*📋 Your Recent Projects* (${links.length})`,
          },
        },
        { type: 'divider' },
      ];

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';

      links.forEach((link, index) => {
        const proj = projects.find((p) => p.id === link.project_id);
        const url = `${appUrl}/workspaces/${proj?.workspace_id || 'unknown'}/projects/${link.project_id}`;

        const statusEmoji = proj?.status === 'active' ? '🟢' : proj?.status === 'completed' ? '✅' : '⏸️';

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              `${index + 1}. *${proj?.name || 'Project'}* ${statusEmoji}\n` +
              `📅 Created: ${new Date(link.created_at).toLocaleDateString()}\n` +
              `📍 Channel: <#${link.channel_id}>`,
          },
          accessory: {
            type: 'button',
            text: { type: 'plain_text', text: 'Open', emoji: true },
            url: url,
            action_id: `open_project_${link.project_id}`,
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
            text: '*📋 Deskive Project Commands*',
          },
        },
        { type: 'divider' },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text:
              '*Project Commands:*\n' +
              '`/project new` - Create a new project (opens in browser)\n' +
              '`/project list` - View all your projects\n\n' +
              '*Task Commands:*\n' +
              'Click "➕ Add Task" on any project to create tasks\n\n' +
              '`/project help` - Show this help message',
          },
        },
        { type: 'divider' },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: '💡 *Tip:* Projects open in browser, tasks use quick Slack modals!',
            },
          ],
        },
      ],
    };
  }

  /**
   * Handle interactions (buttons, modals)
   */
  async handleInteraction(payload: any) {
    const { type, user, actions, team, trigger_id } = payload;

    try {
      this.logger.log('Interaction type:', type);

      if (type === 'block_actions' && actions && actions.length > 0) {
        const action = actions[0];

        if (action.action_id === 'add_task' || action.action_id === 'add_task_to_project') {
          this.logger.log('Add task action:', action.value);
          await this.openAddTaskModal(team.id, user.id, action.value, trigger_id);
        }
      } else if (type === 'view_submission') {
        const callbackId = payload.view.callback_id;

        if (callbackId === 'add_task_modal') {
          await this.handleAddTaskSubmission(payload);
        }
      }
    } catch (error) {
      this.logger.error('Error handling interaction:', error);
    }
  }

  /**
   * Open modal to share project with Deskive users
   */
  private async openShareModal(teamId: string, slackUserId: string, projectId: string, triggerId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get project details
      const projectResult = await this.db.table('projects')
        .select('id', 'name', 'workspace_id')
        .where('id', '=', projectId)
        .execute();

      const project = projectResult.data?.[0];

      if (!project) {
        this.logger.error('Project not found:', projectId);
        return;
      }

      // Get Deskive users in this workspace with Slack linked (excluding current user)
      const workspaceMembersResult = await this.db.table('workspace_members')
        .select('user_id')
        .where('workspace_id', '=', project.workspace_id)
        .where('is_active', '=', true)
        .execute();

      const deskiveUserIds = workspaceMembersResult.data?.map(m => m.user_id) || [];

      // Get Slack mappings for these users
      const slackMappingsResult = await this.db.table('slack_user_mappings')
        .select('slack_user_id', 'deskive_user_id', 'slack_name')
        .whereIn('deskive_user_id', deskiveUserIds)
        .where('slack_team_id', '=', teamId)
        .where('is_active', '=', true)
        .execute();

      const availableUsers = slackMappingsResult.data?.filter(u => u.slack_user_id !== slackUserId) || [];

      if (availableUsers.length === 0) {
        await slackClient.chat.postEphemeral({
          channel: slackUserId,
          user: slackUserId,
          text: '❌ No other Deskive users found in this workspace.\n\nInvite your team members to install the app and join the workspace!',
        });
        return;
      }

      // Open modal
      await slackClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'share_project_modal',
          private_metadata: JSON.stringify({ projectId, workspaceId: project.workspace_id, teamId }),
          title: {
            type: 'plain_text',
            text: 'Share Project',
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
                text: `*Share: ${project.name}*\n\nSelect Deskive team members to add to this project (${availableUsers.length} available):`,
              },
            },
            {
              type: 'input',
              block_id: 'users_select',
              label: {
                type: 'plain_text',
                text: 'Select Team Members',
              },
              element: {
                type: 'multi_users_select',
                action_id: 'selected_users',
                placeholder: {
                  type: 'plain_text',
                  text: 'Choose users to share with...',
                },
              },
            },
            {
              type: 'input',
              block_id: 'role_select',
              label: {
                type: 'plain_text',
                text: 'Member Role',
              },
              element: {
                type: 'static_select',
                action_id: 'member_role',
                placeholder: {
                  type: 'plain_text',
                  text: 'Select role...',
                },
                initial_option: {
                  text: { type: 'plain_text', text: 'Member' },
                  value: 'member',
                },
                options: [
                  {
                    text: { type: 'plain_text', text: 'Member (Can view and edit)' },
                    value: 'member',
                  },
                  {
                    text: { type: 'plain_text', text: 'Admin (Can manage settings)' },
                    value: 'admin',
                  },
                ],
              },
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: '💡 Only Deskive users in your workspace can be selected',
                },
              ],
            },
          ],
        },
      });

      this.logger.log('Share modal opened for project:', projectId);
    } catch (error) {
      this.logger.error('Error opening share modal:', error);
    }
  }

  /**
   * Handle share modal submission
   */
  private async handleShareSubmission(payload: any) {
    try {
      const { user, view } = payload;
      const metadata = JSON.parse(view.private_metadata);
      const { projectId, workspaceId, teamId } = metadata;

      // Get selected users
      const selectedSlackUsers = view.state.values.users_select.selected_users.selected_users;
      const memberRole = view.state.values.role_select.member_role.selected_option.value;

      this.logger.log('Share submission:', { projectId, selectedSlackUsers, memberRole });

      if (!selectedSlackUsers || selectedSlackUsers.length === 0) {
        return;
      }

      // Convert Slack user IDs to Deskive user IDs
      const mappingsResult = await this.db.table('slack_user_mappings')
        .select('deskive_user_id', 'slack_user_id')
        .whereIn('slack_user_id', selectedSlackUsers)
        .where('slack_team_id', '=', teamId)
        .where('is_active', '=', true)
        .execute();

      const userMappings = mappingsResult.data || [];

      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get project details
      const projectResult = await this.db.table('projects')
        .select('name')
        .where('id', '=', projectId)
        .execute();

      const projectName = projectResult.data?.[0]?.name || 'Project';
      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const projectUrl = `${appUrl}/workspaces/${workspaceId}/projects/${projectId}`;

      // Add users as project members
      const sharePromises = userMappings.map(async (mapping) => {
        try {
          // Add to project_members table
          await this.db.table('project_members')
            .insert({
              project_id: projectId,
              user_id: mapping.deskive_user_id,
              role: memberRole,
              permissions: JSON.stringify([]),
              joined_at: new Date().toISOString(),
              is_active: true,
              created_at: new Date().toISOString(),
            })
            .execute();

          this.logger.log(`Added ${mapping.deskive_user_id} to project ${projectId}`);

          // Send DM via Slack
          await slackClient.chat.postMessage({
            channel: mapping.slack_user_id,
            text: `📋 ${user.name} added you to a project!`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*📋 You've Been Added to a Project*\n\n<@${user.id}> added you to a project!`,
                },
              },
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `📝 *Project:* ${projectName}\n👤 *Role:* ${memberRole}\n🔗 Click below to view and manage tasks!`,
                },
              },
              {
                type: 'actions',
                elements: [
                  {
                    type: 'button',
                    text: { type: 'plain_text', text: '📋 Open Project', emoji: true },
                    url: projectUrl,
                    style: 'primary',
                  },
                ],
              },
            ],
          });

          this.logger.log(`Shared project with: ${mapping.slack_user_id}`);
        } catch (shareError) {
          if (shareError.code === '23505' || shareError.message?.includes('duplicate')) {
            this.logger.log(`User ${mapping.deskive_user_id} already in project`);
          } else {
            this.logger.error(`Failed to share with ${mapping.slack_user_id}:`, shareError.message);
          }
        }
      });

      await Promise.all(sharePromises);

      this.logger.log(`Project shared with ${userMappings.length} user(s)`);
    } catch (error) {
      this.logger.error('Error handling share submission:', error);
    }
  }

  /**
   * Open modal to add task to project
   */
  private async openAddTaskModal(teamId: string, slackUserId: string, projectId: string, triggerId: string) {
    try {
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      // Get project details
      const projectResult = await this.db.table('projects')
        .select('name', 'kanban_stages')
        .where('id', '=', projectId)
        .execute();

      const project = projectResult.data?.[0];

      if (!project) {
        return;
      }

      const stages = project.kanban_stages || [];
      const stageOptions = stages.map(stage => ({
        text: { type: 'plain_text', text: stage.name },
        value: stage.id,
      }));

      // Get project members
      const membersResult = await this.db.table('project_members')
        .select('user_id')
        .where('project_id', '=', projectId)
        .where('is_active', '=', true)
        .execute();

      const members = membersResult.data || [];

      // Get user details for each member
      const assigneeOptions: any[] = [];
      for (const member of members) {
        try {
          const userProfile = await this.db.getUserById(member.user_id);
          if (userProfile) {
            const metadata = userProfile.metadata || {};
            const userName = metadata.name || (userProfile as any).fullName || userProfile.name || userProfile.email || 'Unknown User';
            assigneeOptions.push({
              text: { type: 'plain_text' as const, text: userName },
              value: member.user_id,
            });
          }
        } catch (error) {
          this.logger.error('Error fetching user:', member.user_id);
        }
      }

      // Open modal
      await slackClient.views.open({
        trigger_id: triggerId,
        view: {
          type: 'modal',
          callback_id: 'add_task_modal',
          private_metadata: JSON.stringify({ projectId, teamId }),
          title: {
            type: 'plain_text',
            text: 'Add Task',
          },
          submit: {
            type: 'plain_text',
            text: 'Create Task',
          },
          close: {
            type: 'plain_text',
            text: 'Cancel',
          },
          blocks: [
            // Task name
            {
              type: 'input',
              block_id: 'task_name',
              label: { type: 'plain_text', text: 'Task Name' },
              element: {
                type: 'plain_text_input',
                action_id: 'name_input',
                placeholder: { type: 'plain_text', text: 'Enter task name...' },
              },
            },
            // Description
            {
              type: 'input',
              block_id: 'task_description',
              optional: true,
              label: { type: 'plain_text', text: 'Description' },
              element: {
                type: 'plain_text_input',
                action_id: 'description_input',
                multiline: true,
                placeholder: { type: 'plain_text', text: 'Add details...' },
              },
            },
            // Stage/Status
            {
              type: 'input',
              block_id: 'task_stage',
              label: { type: 'plain_text', text: 'Status' },
              element: {
                type: 'static_select',
                action_id: 'stage_select',
                placeholder: { type: 'plain_text', text: 'Select status...' },
                initial_option: stageOptions[0],
                options: stageOptions,
              },
            },
            // Priority
            {
              type: 'input',
              block_id: 'task_priority',
              label: { type: 'plain_text', text: 'Priority' },
              element: {
                type: 'static_select',
                action_id: 'priority_select',
                placeholder: { type: 'plain_text', text: 'Select priority' },
                options: [
                  {
                    text: { type: 'plain_text' as const, text: '🔴 High' },
                    value: 'high',
                  },
                  {
                    text: { type: 'plain_text' as const, text: '🟡 Medium' },
                    value: 'medium',
                  },
                  {
                    text: { type: 'plain_text' as const, text: '🟢 Low' },
                    value: 'low',
                  },
                ],
                initial_option: {
                  text: { type: 'plain_text' as const, text: '🟡 Medium' },
                  value: 'medium',
                },
              },
            },
            // Due date
            {
              type: 'input',
              block_id: 'task_due_date',
              optional: true,
              label: { type: 'plain_text', text: 'Due Date' },
              element: {
                type: 'datepicker',
                action_id: 'due_date_picker',
                placeholder: { type: 'plain_text', text: 'Select a date' },
              },
            },
            // Assign users (project members)
            {
              type: 'input',
              block_id: 'task_assignees',
              optional: true,
              label: { type: 'plain_text', text: 'Assign To' },
              element: {
                type: 'multi_static_select',
                action_id: 'assignees_select',
                placeholder: { type: 'plain_text', text: 'Select project members...' },
                options: assigneeOptions.length > 0 ? assigneeOptions : [
                  { text: { type: 'plain_text' as const, text: 'No members found' }, value: 'none' }
                ],
              },
            },
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error opening add task modal:', error);
    }
  }

  /**
   * Handle add task modal submission
   */
  private async handleAddTaskSubmission(payload: any) {
    try {
      const { user, view } = payload;
      const metadata = JSON.parse(view.private_metadata);
      const { projectId, teamId } = metadata;

      // Extract all form values
      const values = view.state.values;
      const taskName = values.task_name.name_input.value;
      const taskDescription = values.task_description?.description_input?.value || '';
      const status = values.task_stage.stage_select.selected_option.value;
      const priority = values.task_priority?.priority_select?.selected_option?.value || 'medium';
      const dueDate = values.task_due_date?.due_date_picker?.selected_date || null;
      const assignedDeskiveUsers = values.task_assignees?.assignees_select?.selected_options?.map(opt => opt.value) || [];

      this.logger.log('Add task submission:', { projectId, taskName, status, priority, dueDate, assignees: assignedDeskiveUsers });

      // Get Deskive user ID (creator)
      const deskiveUserId = await this.getDeskiveUserIdFromSlack(user.id, teamId);

      if (!deskiveUserId) {
        return;
      }

      // Add creator to assignees if not already included
      const finalAssignees = assignedDeskiveUsers.includes(deskiveUserId)
        ? assignedDeskiveUsers
        : [deskiveUserId, ...assignedDeskiveUsers];

      // Get workspace ID from project
      const projectResult = await this.db.table('projects')
        .select('workspace_id', 'name')
        .where('id', '=', projectId)
        .execute();

      const project = projectResult.data?.[0];
      if (!project) {
        this.logger.error('Project not found:', projectId);
        return;
      }

      // Create task
      const taskResult = await this.db.table('tasks')
        .insert({
          project_id: projectId,
          title: taskName,
          description: taskDescription,
          status: status,
          task_type: 'task',
          priority: priority,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          created_by: deskiveUserId,
          assigned_to: JSON.stringify(finalAssignees),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .returning('*')
        .execute();

      const task = taskResult.data[0];

      this.logger.log(`Task created: ${task.id}`);

      // Send confirmation to creator
      const installation = await this.getInstallation(teamId);
      const slackClient = new WebClient(installation.bot_token);

      const appUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
      const taskUrl = `${appUrl}/workspaces/${project.workspace_id}/projects/${projectId}?task=${task.id}`;

      const statusEmoji = {
        todo: '⬜',
        in_progress: '🔵',
        in_review: '🟡',
        done: '✅',
      }[status] || '⬜';

      const priorityEmoji = {
        high: '🔴',
        medium: '🟡',
        low: '🟢',
      }[priority] || '🟡';

      await slackClient.chat.postMessage({
        channel: user.id,
        text: '✅ Task created successfully!',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*✅ Task Created Successfully!*`,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*📝 Task*\n${taskName}`,
              },
              {
                type: 'mrkdwn',
                text: `*📋 Project*\n${project.name}`,
              },
              {
                type: 'mrkdwn',
                text: `*${statusEmoji} Status*\n${status}`,
              },
              {
                type: 'mrkdwn',
                text: `*${priorityEmoji} Priority*\n${priority}`,
              },
            ],
          },
        ],
      });

      // Add details if available
      if (taskDescription || dueDate) {
        const details = [];
        if (taskDescription) {
          const cleanDescription = this.stripHtml(taskDescription);
          details.push(`📝 *Description:* ${cleanDescription.substring(0, 300)}${cleanDescription.length > 300 ? '...' : ''}`);
        }
        if (dueDate) {
          details.push(`⏰ *Due Date:* ${new Date(dueDate).toLocaleDateString()}`);
        }

        await slackClient.chat.postMessage({
          channel: user.id,
          text: details.join('\n'),
        });
      }

      // Add action button
      await slackClient.chat.postMessage({
        channel: user.id,
        blocks: [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: '✅ View Task', emoji: true },
                url: taskUrl,
                style: 'primary',
              },
            ],
          },
        ],
      });

      this.logger.log('Task created via Slack:', task.id);
    } catch (error) {
      this.logger.error('Error creating task:', error);
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
}
