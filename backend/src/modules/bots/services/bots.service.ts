import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateBotDto, BotStatus, BotType } from '../dto/create-bot.dto';
import { UpdateBotDto } from '../dto/update-bot.dto';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface Bot {
  id: string;
  workspaceId: string;
  name: string;
  displayName: string;
  description?: string;
  avatarUrl?: string;
  status: BotStatus;
  botType: BotType;
  settings: Record<string, any>;
  permissions: string[];
  webhookSecret?: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BotsService {
  private readonly logger = new Logger(BotsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new bot
   */
  async create(workspaceId: string, userId: string, dto: CreateBotDto): Promise<Bot> {
    this.logger.log(`[Bots] Creating bot "${dto.name}" in workspace ${workspaceId}`);

    // Check if bot name already exists in workspace
    const existing = await this.db.findOne('bots', {
      workspace_id: workspaceId,
      name: dto.name,
    });

    if (existing) {
      throw new ConflictException(`Bot with name "${dto.name}" already exists in this workspace`);
    }

    // Generate webhook secret for webhook bots
    let webhookSecret: string | undefined;
    if (dto.botType === BotType.WEBHOOK) {
      webhookSecret = crypto.randomBytes(32).toString('hex');
    }

    const botData = {
      workspace_id: workspaceId,
      name: dto.name,
      display_name: dto.displayName,
      description: dto.description || null,
      avatar_url: dto.avatarUrl || null,
      status: dto.status || BotStatus.DRAFT,
      bot_type: dto.botType || BotType.CUSTOM,
      settings: dto.settings || {},
      permissions: dto.permissions || [],
      webhook_secret: webhookSecret,
      is_public: dto.isPublic || false,
      created_by: userId,
    };

    const result = await this.db.insert('bots', botData);
    this.logger.log(`[Bots] Created bot with ID: ${result.id}`);

    return this.transformToBot(result);
  }

  /**
   * Get all bots in a workspace
   */
  async findAll(workspaceId: string, userId: string): Promise<Bot[]> {
    const result = await this.db
      .table('bots')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    return (result.data || []).map((bot: any) => this.transformToBot(bot));
  }

  /**
   * Get a single bot by ID
   */
  async findOne(botId: string, workspaceId: string): Promise<Bot> {
    const result = await this.db
      .table('bots')
      .select('*')
      .where('id', '=', botId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const bot = result.data?.[0];
    if (!bot) {
      throw new NotFoundException(`Bot with ID "${botId}" not found`);
    }

    return this.transformToBot(bot);
  }

  /**
   * Get a bot by name
   */
  async findByName(workspaceId: string, name: string): Promise<Bot | null> {
    const result = await this.db.findOne('bots', {
      workspace_id: workspaceId,
      name,
    });

    return result ? this.transformToBot(result) : null;
  }

  /**
   * Update a bot
   */
  async update(
    botId: string,
    workspaceId: string,
    userId: string,
    dto: UpdateBotDto,
  ): Promise<Bot> {
    const bot = await this.findOne(botId, workspaceId);

    // If changing name, check for conflicts
    if (dto.name && dto.name !== bot.name) {
      const existing = await this.db.findOne('bots', {
        workspace_id: workspaceId,
        name: dto.name,
      });

      if (existing) {
        throw new ConflictException(`Bot with name "${dto.name}" already exists in this workspace`);
      }
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.displayName !== undefined) updateData.display_name = dto.displayName;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.avatarUrl !== undefined) updateData.avatar_url = dto.avatarUrl;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.botType !== undefined) updateData.bot_type = dto.botType;
    if (dto.settings !== undefined) updateData.settings = dto.settings;
    if (dto.permissions !== undefined) updateData.permissions = dto.permissions;
    if (dto.isPublic !== undefined) updateData.is_public = dto.isPublic;

    await this.db.update('bots', botId, updateData);
    this.logger.log(`[Bots] Updated bot ${botId}`);

    return this.findOne(botId, workspaceId);
  }

  /**
   * Delete a bot
   */
  async delete(botId: string, workspaceId: string, userId: string): Promise<void> {
    const bot = await this.findOne(botId, workspaceId);

    // Delete related data first (triggers, actions, installations, logs)
    // Using transaction would be better but for now sequential deletes

    // Delete scheduled jobs
    const scheduledJobs = await this.db
      .table('bot_scheduled_jobs')
      .select('id')
      .where('trigger_id', 'IN', `(SELECT id FROM bot_triggers WHERE bot_id = '${botId}')`)
      .execute();
    for (const job of scheduledJobs.data || []) {
      await this.db.delete('bot_scheduled_jobs', job.id);
    }

    // Delete cooldowns
    const cooldowns = await this.db
      .table('bot_user_cooldowns')
      .select('id')
      .where('trigger_id', 'IN', `(SELECT id FROM bot_triggers WHERE bot_id = '${botId}')`)
      .execute();
    for (const cooldown of cooldowns.data || []) {
      await this.db.delete('bot_user_cooldowns', cooldown.id);
    }

    // Delete execution logs
    const logs = await this.db
      .table('bot_execution_logs')
      .select('id')
      .where('bot_id', '=', botId)
      .execute();
    for (const log of logs.data || []) {
      await this.db.delete('bot_execution_logs', log.id);
    }

    // Delete installations
    const installations = await this.db
      .table('bot_installations')
      .select('id')
      .where('bot_id', '=', botId)
      .execute();
    for (const installation of installations.data || []) {
      await this.db.delete('bot_installations', installation.id);
    }

    // Delete actions
    const actions = await this.db
      .table('bot_actions')
      .select('id')
      .where('bot_id', '=', botId)
      .execute();
    for (const action of actions.data || []) {
      await this.db.delete('bot_actions', action.id);
    }

    // Delete triggers
    const triggers = await this.db
      .table('bot_triggers')
      .select('id')
      .where('bot_id', '=', botId)
      .execute();
    for (const trigger of triggers.data || []) {
      await this.db.delete('bot_triggers', trigger.id);
    }

    // Finally delete the bot
    await this.db.delete('bots', botId);
    this.logger.log(`[Bots] Deleted bot ${botId} and all related data`);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateWebhookSecret(botId: string, workspaceId: string): Promise<string> {
    const bot = await this.findOne(botId, workspaceId);

    if (bot.botType !== BotType.WEBHOOK) {
      throw new ForbiddenException('Only webhook bots have webhook secrets');
    }

    const newSecret = crypto.randomBytes(32).toString('hex');
    await this.db.update('bots', botId, {
      webhook_secret: newSecret,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`[Bots] Regenerated webhook secret for bot ${botId}`);
    return newSecret;
  }

  /**
   * Get active bots for a channel/conversation
   */
  async getActiveBotsForLocation(
    workspaceId: string,
    channelId?: string,
    conversationId?: string,
  ): Promise<Bot[]> {
    console.log(
      `[BotsService] 🔍 Looking for bots in workspace=${workspaceId}, channel=${channelId}, conversation=${conversationId}`,
    );

    // Get installations for this location
    let query = this.db.table('bot_installations').select('bot_id').where('is_active', '=', true);

    if (channelId) {
      query = query.where('channel_id', '=', channelId);
    } else if (conversationId) {
      query = query.where('conversation_id', '=', conversationId);
    } else {
      console.log(`[BotsService] ⚠️ No channelId or conversationId provided`);
      return [];
    }

    const installations = await query.execute();
    const botIds = (installations.data || []).map((i: any) => i.bot_id);

    console.log(
      `[BotsService] 📦 Found ${botIds.length} installation(s): ${botIds.join(', ') || 'none'}`,
    );

    if (botIds.length === 0) {
      console.log(
        `[BotsService] 💡 No bots installed. Install a bot to this channel via Bot Builder > Installations tab`,
      );
      return [];
    }

    // Get active bots
    const bots: Bot[] = [];
    for (const botId of botIds) {
      const result = await this.db
        .table('bots')
        .select('*')
        .where('id', '=', botId)
        .where('workspace_id', '=', workspaceId)
        .where('status', '=', BotStatus.ACTIVE)
        .execute();

      if (result.data?.[0]) {
        bots.push(this.transformToBot(result.data[0]));
        console.log(`[BotsService] ✅ Bot ${result.data[0].name} is ACTIVE`);
      } else {
        // Check if bot exists but is not active
        const botCheck = await this.db.table('bots').select('*').where('id', '=', botId).execute();
        if (botCheck.data?.[0]) {
          console.log(
            `[BotsService] ⚠️ Bot ${botCheck.data[0].name} exists but status is '${botCheck.data[0].status}' (needs to be 'active')`,
          );
        } else {
          console.log(`[BotsService] ⚠️ Bot ${botId} not found in database`);
        }
      }
    }

    return bots;
  }

  /**
   * Transform database record to Bot interface
   */
  private transformToBot(record: any): Bot {
    return {
      id: record.id,
      workspaceId: record.workspace_id,
      name: record.name,
      displayName: record.display_name,
      description: record.description,
      avatarUrl: record.avatar_url,
      status: record.status,
      botType: record.bot_type,
      settings: record.settings || {},
      permissions: record.permissions || [],
      webhookSecret: record.webhook_secret,
      isPublic: record.is_public,
      createdBy: record.created_by,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }

  /**
   * Load prebuilt bots from JSON file
   */
  private loadPrebuiltBots(): any[] {
    // Try multiple paths to support both development and production
    const possiblePaths = [
      path.join(__dirname, '..', 'seed', 'prebuilt-bots.seed.json'), // Compiled dist folder
      path.join(
        __dirname,
        '..',
        '..',
        '..',
        'src',
        'modules',
        'bots',
        'seed',
        'prebuilt-bots.seed.json',
      ), // Development from dist
      path.join(process.cwd(), 'src', 'modules', 'bots', 'seed', 'prebuilt-bots.seed.json'), // Absolute from project root
    ];

    for (const seedFilePath of possiblePaths) {
      try {
        if (fs.existsSync(seedFilePath)) {
          const seedFileContent = fs.readFileSync(seedFilePath, 'utf-8');
          return JSON.parse(seedFileContent);
        }
      } catch (error) {
        this.logger.debug(`Failed to load prebuilt bots from ${seedFilePath}: ${error.message}`);
      }
    }

    this.logger.error('Could not find prebuilt-bots.seed.json in any expected location');
    return [];
  }

  /**
   * Get all available prebuilt bots
   */
  async getPrebuiltBots(workspaceId: string, userId: string): Promise<any[]> {
    this.logger.log('[Bots] Fetching prebuilt bots');

    // Load prebuilt bots from seed file
    const prebuiltBots = this.loadPrebuiltBots();

    // Check which bots user has already activated
    const userBots = await this.db.findMany('bots', {
      workspace_id: workspaceId,
      created_by: userId,
      bot_type: 'prebuilt',
    });

    const activatedBotIds = new Set(
      (Array.isArray(userBots.data) ? userBots.data : []).map((b: any) => b.name),
    );

    // Enrich prebuilt bots with activation status and transform to camelCase
    return prebuiltBots.map((bot: any) => {
      const isActivated = activatedBotIds.has(bot.name);
      const userBot = isActivated
        ? (Array.isArray(userBots.data) ? userBots.data : []).find((b: any) => b.name === bot.name)
        : null;

      return {
        id: bot.id,
        name: bot.name,
        displayName: bot.display_name,
        description: bot.description,
        avatarUrl: bot.avatar_url,
        botType: bot.bot_type,
        status: bot.status,
        category: bot.category,
        features: bot.features,
        settings: bot.settings,
        permissions: bot.permissions,
        setupInstructions: bot.setup_instructions,
        usageExamples: bot.usage_examples,
        isActivated: isActivated,
        userBotId: userBot?.id || null,
      };
    });
  }

  /**
   * Activate a prebuilt bot for a user
   */
  async activatePrebuiltBot(
    workspaceId: string,
    userId: string,
    prebuiltBotId: string,
    customDisplayName?: string,
    customSettings?: Record<string, any>,
  ): Promise<Bot> {
    this.logger.log(`[Bots] Activating prebuilt bot "${prebuiltBotId}" for user ${userId}`);

    // Load prebuilt bots
    const prebuiltBots = this.loadPrebuiltBots();
    const prebuiltBot = prebuiltBots.find((b: any) => b.id === prebuiltBotId);

    if (!prebuiltBot) {
      throw new NotFoundException(`Prebuilt bot "${prebuiltBotId}" not found`);
    }

    // Check if user has already activated this bot
    const existing = await this.db.findOne('bots', {
      workspace_id: workspaceId,
      name: prebuiltBot.name,
      created_by: userId,
    });

    if (existing) {
      throw new ConflictException('You have already activated this prebuilt bot');
    }

    // Create bot instance for user
    const botData = {
      workspace_id: workspaceId,
      name: prebuiltBot.name,
      display_name: customDisplayName || prebuiltBot.display_name,
      description: prebuiltBot.description,
      avatar_url: prebuiltBot.avatar_url,
      status: 'active',
      bot_type: 'prebuilt',
      settings: customSettings || prebuiltBot.settings || {},
      permissions: prebuiltBot.permissions || [],
      is_public: false, // User's instance is private to them
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const bot = await this.db.insert('bots', botData);
    this.logger.log(`[Bots] Prebuilt bot activated: ${bot.id}`);

    return this.transformToBot(bot);
  }

  /**
   * Deactivate a prebuilt bot for a user
   */
  async deactivatePrebuiltBot(workspaceId: string, userId: string, botId: string): Promise<void> {
    this.logger.log(`[Bots] Deactivating prebuilt bot ${botId}`);

    const bot = await this.findOne(botId, workspaceId);

    if (bot.botType !== BotType.PREBUILT) {
      throw new ForbiddenException('Only prebuilt bots can be deactivated this way');
    }

    if (bot.createdBy !== userId) {
      throw new ForbiddenException('You can only deactivate your own bots');
    }

    await this.delete(botId, workspaceId, userId);
    this.logger.log(`[Bots] Prebuilt bot deactivated: ${botId}`);
  }

  /**
   * Assign a bot to a project
   */
  async assignToProject(
    workspaceId: string,
    botId: string,
    projectId: string,
    userId: string,
  ): Promise<any> {
    this.logger.log(`[Bots] Assigning bot ${botId} to project ${projectId}`);

    // Verify bot exists
    await this.findOne(botId, workspaceId);

    // Check if already assigned
    const existing = await this.db.findOne('project_bot_assignments', {
      bot_id: botId,
      project_id: projectId,
      user_id: userId,
    });

    if (existing) {
      throw new ConflictException('Bot is already assigned to this project');
    }

    const assignmentData = {
      bot_id: botId,
      project_id: projectId,
      user_id: userId,
      workspace_id: workspaceId,
      settings: {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const assignment = await this.db.insert('project_bot_assignments', assignmentData);
    this.logger.log(`[Bots] Bot assigned to project: ${assignment.id}`);

    return assignment;
  }

  /**
   * Unassign a bot from a project
   */
  async unassignFromProject(
    workspaceId: string,
    botId: string,
    projectId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`[Bots] Unassigning bot ${botId} from project ${projectId}`);

    const assignment = await this.db.findOne('project_bot_assignments', {
      bot_id: botId,
      project_id: projectId,
      user_id: userId,
    });

    if (!assignment) {
      throw new NotFoundException('Bot assignment not found');
    }

    await this.db.delete('project_bot_assignments', assignment.id);
    this.logger.log(`[Bots] Bot unassigned from project`);
  }

  /**
   * Get all bots assigned to a project
   */
  async getProjectBots(workspaceId: string, projectId: string, userId: string): Promise<Bot[]> {
    this.logger.log(`[Bots] Getting bots for project ${projectId}`);

    const result = await this.db
      .table('project_bot_assignments')
      .select('*')
      .where('project_id', '=', projectId)
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .where('is_active', '=', true)
      .execute();

    const assignments = result.data || [];
    const botIds = assignments.map((a: any) => a.bot_id);

    if (botIds.length === 0) {
      return [];
    }

    // Fetch bot details
    const botsResult = await this.db
      .table('bots')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const allBots = botsResult.data || [];
    const projectBots = allBots.filter((bot: any) => botIds.includes(bot.id));

    return projectBots.map((bot: any) => this.transformToBot(bot));
  }

  /**
   * Get all active bots with assignment status for a project
   * Returns ALL activated bots with isAssigned flag to show current state
   */
  async getAvailableBotsForProject(
    workspaceId: string,
    projectId: string,
    userId: string,
  ): Promise<any[]> {
    this.logger.log(`[Bots] Getting bots with assignment status for project ${projectId}`);

    // Get all activated bots (status = 'active')
    const allBotsResult = await this.db
      .table('bots')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('status', '=', 'active')
      .execute();

    const allActiveBots = allBotsResult.data || [];

    if (allActiveBots.length === 0) {
      this.logger.log(`[Bots] No activated bots in workspace ${workspaceId}`);
      return [];
    }

    // Get bot IDs already assigned to this project
    const assignmentsResult = await this.db
      .table('project_bot_assignments')
      .select('bot_id')
      .where('project_id', '=', projectId)
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .execute();

    const assignments = assignmentsResult.data || [];
    const assignedBotIds = assignments.map((a: any) => a.bot_id);

    this.logger.log(`[Bots] Found ${assignedBotIds.length} bots already assigned to project`);

    // Return ALL bots with isAssigned flag
    const botsWithStatus = allActiveBots.map((bot: any) => {
      const transformedBot = this.transformToBot(bot);
      return {
        ...transformedBot,
        isAssigned: assignedBotIds.includes(bot.id),
      };
    });

    const availableCount = botsWithStatus.filter((b) => !b.isAssigned).length;
    this.logger.log(
      `[Bots] Returning ${botsWithStatus.length} bots (${availableCount} available, ${assignedBotIds.length} assigned)`,
    );

    return botsWithStatus;
  }
}
