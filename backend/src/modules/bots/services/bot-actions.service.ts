import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateActionDto, UpdateActionDto, ActionType, FailurePolicy } from '../dto/create-action.dto';

export interface BotAction {
  id: string;
  botId: string;
  triggerId?: string;
  name: string;
  actionType: ActionType;
  actionConfig: Record<string, any>;
  executionOrder: number;
  isActive: boolean;
  failurePolicy: FailurePolicy;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class BotActionsService {
  private readonly logger = new Logger(BotActionsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Create a new action for a bot
   */
  async create(botId: string, dto: CreateActionDto): Promise<BotAction> {
    this.logger.log(`[BotActions] Creating action "${dto.name}" for bot ${botId}`);

    const actionData = {
      bot_id: botId,
      trigger_id: dto.triggerId || null,
      name: dto.name,
      action_type: dto.actionType,
      action_config: dto.actionConfig,
      execution_order: dto.executionOrder || 0,
      is_active: dto.isActive !== false,
      failure_policy: dto.failurePolicy || FailurePolicy.CONTINUE,
    };

    const result = await this.db.insert('bot_actions', actionData);
    this.logger.log(`[BotActions] Created action with ID: ${result.id}`);

    return this.transformToAction(result);
  }

  /**
   * Get all actions for a bot
   */
  async findAllForBot(botId: string): Promise<BotAction[]> {
    const result = await this.db.table('bot_actions')
      .select('*')
      .where('bot_id', '=', botId)
      .execute();

    return (result.data || [])
      .map((action: any) => this.transformToAction(action))
      .sort((a: BotAction, b: BotAction) => a.executionOrder - b.executionOrder);
  }

  /**
   * Get a single action by ID
   */
  async findOne(actionId: string): Promise<BotAction> {
    const result = await this.db.findOne('bot_actions', { id: actionId });

    if (!result) {
      throw new NotFoundException(`Action with ID "${actionId}" not found`);
    }

    return this.transformToAction(result);
  }

  /**
   * Get actions for a specific trigger
   */
  async getActionsForTrigger(botId: string, triggerId?: string): Promise<BotAction[]> {
    let query = this.db.table('bot_actions')
      .select('*')
      .where('bot_id', '=', botId)
      .where('is_active', '=', true);

    const result = await query.execute();

    // Filter actions: either linked to this trigger or global (no trigger_id)
    const actions = (result.data || [])
      .filter((action: any) => {
        if (!triggerId) return !action.trigger_id; // Global actions only
        return action.trigger_id === triggerId || !action.trigger_id;
      })
      .map((action: any) => this.transformToAction(action))
      .sort((a: BotAction, b: BotAction) => a.executionOrder - b.executionOrder);

    return actions;
  }

  /**
   * Update an action
   */
  async update(actionId: string, dto: UpdateActionDto): Promise<BotAction> {
    await this.findOne(actionId); // Verify exists

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.triggerId !== undefined) updateData.trigger_id = dto.triggerId;
    if (dto.actionType !== undefined) updateData.action_type = dto.actionType;
    if (dto.actionConfig !== undefined) updateData.action_config = dto.actionConfig;
    if (dto.executionOrder !== undefined) updateData.execution_order = dto.executionOrder;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;
    if (dto.failurePolicy !== undefined) updateData.failure_policy = dto.failurePolicy;

    await this.db.update('bot_actions', actionId, updateData);
    this.logger.log(`[BotActions] Updated action ${actionId}`);

    return this.findOne(actionId);
  }

  /**
   * Delete an action
   */
  async delete(actionId: string): Promise<void> {
    await this.findOne(actionId); // Verify exists

    await this.db.delete('bot_actions', actionId);
    this.logger.log(`[BotActions] Deleted action ${actionId}`);
  }

  /**
   * Reorder actions for a bot
   */
  async reorderActions(botId: string, actionIds: string[]): Promise<void> {
    for (let i = 0; i < actionIds.length; i++) {
      await this.db.update('bot_actions', actionIds[i], {
        execution_order: i,
        updated_at: new Date().toISOString(),
      });
    }
    this.logger.log(`[BotActions] Reordered ${actionIds.length} actions for bot ${botId}`);
  }

  /**
   * Transform database record to BotAction interface
   */
  private transformToAction(record: any): BotAction {
    return {
      id: record.id,
      botId: record.bot_id,
      triggerId: record.trigger_id,
      name: record.name,
      actionType: record.action_type,
      actionConfig: record.action_config || {},
      executionOrder: record.execution_order,
      isActive: record.is_active,
      failurePolicy: record.failure_policy,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}
