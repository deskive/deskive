import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTriggerDto, UpdateTriggerDto, TriggerType } from '../dto/create-trigger.dto';

export interface BotTrigger {
  id: string;
  botId: string;
  name: string;
  triggerType: TriggerType;
  triggerConfig: Record<string, any>;
  isActive: boolean;
  priority: number;
  cooldownSeconds: number;
  conditions: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BotTriggersService {
  private readonly logger = new Logger(BotTriggersService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Validate trigger config based on trigger type
   */
  private validateTriggerConfig(
    triggerType: TriggerType,
    triggerConfig: Record<string, any>,
  ): void {
    switch (triggerType) {
      case TriggerType.KEYWORD:
        if (
          !triggerConfig.keywords ||
          !Array.isArray(triggerConfig.keywords) ||
          triggerConfig.keywords.length === 0
        ) {
          throw new BadRequestException('Keyword trigger requires at least one keyword');
        }
        // Ensure all keywords are non-empty strings
        const validKeywords = triggerConfig.keywords.filter(
          (k: any) => typeof k === 'string' && k.trim().length > 0,
        );
        if (validKeywords.length === 0) {
          throw new BadRequestException('Keyword trigger requires at least one non-empty keyword');
        }
        break;
      case TriggerType.REGEX:
        if (
          !triggerConfig.pattern ||
          typeof triggerConfig.pattern !== 'string' ||
          triggerConfig.pattern.trim().length === 0
        ) {
          throw new BadRequestException('Regex trigger requires a pattern');
        }
        // Validate regex pattern is valid
        try {
          new RegExp(triggerConfig.pattern, triggerConfig.flags || '');
        } catch (e) {
          throw new BadRequestException(`Invalid regex pattern: ${e.message}`);
        }
        break;
      case TriggerType.SCHEDULE:
        if (
          !triggerConfig.cron ||
          typeof triggerConfig.cron !== 'string' ||
          triggerConfig.cron.trim().length === 0
        ) {
          throw new BadRequestException('Schedule trigger requires a cron expression');
        }
        break;
    }
  }

  /**
   * Create a new trigger for a bot
   */
  async create(botId: string, dto: CreateTriggerDto): Promise<BotTrigger> {
    this.logger.log(`[BotTriggers] Creating trigger "${dto.name}" for bot ${botId}`);

    // Validate trigger config
    this.validateTriggerConfig(dto.triggerType, dto.triggerConfig as Record<string, any>);

    const triggerData = {
      bot_id: botId,
      name: dto.name,
      trigger_type: dto.triggerType,
      trigger_config: dto.triggerConfig,
      is_active: dto.isActive !== false,
      priority: dto.priority || 0,
      cooldown_seconds: dto.cooldownSeconds || 0,
      conditions: dto.conditions || {},
    };

    const result = await this.db.insert('bot_triggers', triggerData);
    this.logger.log(`[BotTriggers] Created trigger with ID: ${result.id}`);

    return this.transformToTrigger(result);
  }

  /**
   * Get all triggers for a bot
   */
  async findAllForBot(botId: string): Promise<BotTrigger[]> {
    const result = await this.db
      .table('bot_triggers')
      .select('*')
      .where('bot_id', '=', botId)
      .execute();

    return (result.data || [])
      .map((trigger: any) => this.transformToTrigger(trigger))
      .sort((a: BotTrigger, b: BotTrigger) => b.priority - a.priority);
  }

  /**
   * Get a single trigger by ID
   */
  async findOne(triggerId: string): Promise<BotTrigger> {
    const result = await this.db.findOne('bot_triggers', { id: triggerId });

    if (!result) {
      throw new NotFoundException(`Trigger with ID "${triggerId}" not found`);
    }

    return this.transformToTrigger(result);
  }

  /**
   * Get active triggers for a bot
   */
  async getActiveTriggers(botId: string): Promise<BotTrigger[]> {
    const result = await this.db
      .table('bot_triggers')
      .select('*')
      .where('bot_id', '=', botId)
      .where('is_active', '=', true)
      .execute();

    return (result.data || [])
      .map((trigger: any) => this.transformToTrigger(trigger))
      .sort((a: BotTrigger, b: BotTrigger) => b.priority - a.priority);
  }

  /**
   * Update a trigger
   */
  async update(triggerId: string, dto: UpdateTriggerDto): Promise<BotTrigger> {
    const existingTrigger = await this.findOne(triggerId); // Verify exists

    // Validate trigger config if either type or config is being updated
    if (dto.triggerConfig !== undefined || dto.triggerType !== undefined) {
      const triggerType = dto.triggerType ?? existingTrigger.triggerType;
      const triggerConfig = dto.triggerConfig ?? existingTrigger.triggerConfig;
      this.validateTriggerConfig(triggerType, triggerConfig as Record<string, any>);
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.triggerType !== undefined) updateData.trigger_type = dto.triggerType;
    if (dto.triggerConfig !== undefined) updateData.trigger_config = dto.triggerConfig;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.cooldownSeconds !== undefined) updateData.cooldown_seconds = dto.cooldownSeconds;
    if (dto.conditions !== undefined) updateData.conditions = dto.conditions;

    await this.db.update('bot_triggers', triggerId, updateData);
    this.logger.log(`[BotTriggers] Updated trigger ${triggerId}`);

    return this.findOne(triggerId);
  }

  /**
   * Delete a trigger
   */
  async delete(triggerId: string): Promise<void> {
    await this.findOne(triggerId); // Verify exists

    // Delete related cooldowns
    const cooldowns = await this.db
      .table('bot_user_cooldowns')
      .select('id')
      .where('trigger_id', '=', triggerId)
      .execute();
    for (const cooldown of cooldowns.data || []) {
      await this.db.delete('bot_user_cooldowns', cooldown.id);
    }

    // Delete related scheduled jobs
    const jobs = await this.db
      .table('bot_scheduled_jobs')
      .select('id')
      .where('trigger_id', '=', triggerId)
      .execute();
    for (const job of jobs.data || []) {
      await this.db.delete('bot_scheduled_jobs', job.id);
    }

    // Delete the trigger
    await this.db.delete('bot_triggers', triggerId);
    this.logger.log(`[BotTriggers] Deleted trigger ${triggerId}`);
  }

  /**
   * Get triggers by type for a list of bots
   */
  async getTriggersByType(botIds: string[], triggerType: TriggerType): Promise<BotTrigger[]> {
    if (botIds.length === 0) return [];

    const allTriggers: BotTrigger[] = [];
    for (const botId of botIds) {
      const result = await this.db
        .table('bot_triggers')
        .select('*')
        .where('bot_id', '=', botId)
        .where('trigger_type', '=', triggerType)
        .where('is_active', '=', true)
        .execute();

      for (const trigger of result.data || []) {
        allTriggers.push(this.transformToTrigger(trigger));
      }
    }

    return allTriggers.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Transform database record to BotTrigger interface
   */
  private transformToTrigger(record: any): BotTrigger {
    return {
      id: record.id,
      botId: record.bot_id,
      name: record.name,
      triggerType: record.trigger_type,
      triggerConfig: record.trigger_config || {},
      isActive: record.is_active,
      priority: record.priority,
      cooldownSeconds: record.cooldown_seconds,
      conditions: record.conditions || {},
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
