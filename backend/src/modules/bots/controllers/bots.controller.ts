import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BotsService } from '../services/bots.service';
import { BotTriggersService } from '../services/bot-triggers.service';
import { BotActionsService } from '../services/bot-actions.service';
import { BotInstallationsService } from '../services/bot-installations.service';
import { BotExecutionService } from '../services/bot-execution.service';
import {
  CreateBotDto,
  UpdateBotDto,
  CreateTriggerDto,
  UpdateTriggerDto,
  CreateActionDto,
  UpdateActionDto,
  InstallBotDto,
  UninstallBotDto,
  TestBotDto,
  BotLogsQueryDto,
  ActivatePrebuiltBotDto,
  PrebuiltBotResponseDto,
} from '../dto';

@ApiTags('Bots')
@Controller('workspaces/:workspaceId/bots')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BotsController {
  constructor(
    private readonly botsService: BotsService,
    private readonly triggersService: BotTriggersService,
    private readonly actionsService: BotActionsService,
    private readonly installationsService: BotInstallationsService,
    private readonly executionService: BotExecutionService,
  ) {}

  // ==================== BOT CRUD ====================

  @Post()
  @ApiOperation({ summary: 'Create a new bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async createBot(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateBotDto,
  ) {
    const bot = await this.botsService.create(workspaceId, userId, dto);
    return { data: bot, message: 'Bot created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'Get all bots in workspace' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  async getBots(@Param('workspaceId') workspaceId: string, @CurrentUser('sub') userId: string) {
    const bots = await this.botsService.findAll(workspaceId, userId);
    return { data: bots };
  }

  // ==================== PREBUILT BOTS ====================

  @Get('prebuilt')
  @ApiOperation({
    summary: 'Get all available prebuilt bots',
    description:
      'Returns a list of prebuilt bots that users can activate. Includes activation status for the current user.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({
    status: 200,
    description: 'List of prebuilt bots',
    type: [PrebuiltBotResponseDto],
  })
  async getPrebuiltBots(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const bots = await this.botsService.getPrebuiltBots(workspaceId, userId);
    return { data: bots };
  }

  @Post('prebuilt/activate')
  @ApiOperation({
    summary: 'Activate a prebuilt bot',
    description:
      'Creates a bot instance from a prebuilt bot template. The bot will be available in your Direct Messages.',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Prebuilt bot activated successfully' })
  @ApiResponse({ status: 404, description: 'Prebuilt bot not found' })
  @ApiResponse({ status: 409, description: 'Bot already activated' })
  async activatePrebuiltBot(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ActivatePrebuiltBotDto,
  ) {
    const bot = await this.botsService.activatePrebuiltBot(
      workspaceId,
      userId,
      dto.prebuiltBotId,
      dto.customDisplayName,
      dto.customSettings,
    );
    return { data: bot, message: 'Prebuilt bot activated successfully' };
  }

  @Delete('prebuilt/:botId')
  @ApiOperation({
    summary: 'Deactivate a prebuilt bot',
    description: 'Removes the prebuilt bot instance from your workspace',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot instance ID to deactivate' })
  @ApiResponse({ status: 200, description: 'Prebuilt bot deactivated successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to deactivate this bot' })
  async deactivatePrebuiltBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.botsService.deactivatePrebuiltBot(workspaceId, userId, botId);
    return { message: 'Prebuilt bot deactivated successfully' };
  }

  // ==================== BOT CRUD ====================

  @Get(':botId')
  @ApiOperation({ summary: 'Get a bot by ID' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async getBot(@Param('workspaceId') workspaceId: string, @Param('botId') botId: string) {
    const bot = await this.botsService.findOne(botId, workspaceId);
    return { data: bot };
  }

  @Patch(':botId')
  @ApiOperation({ summary: 'Update a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async updateBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateBotDto,
  ) {
    const bot = await this.botsService.update(botId, workspaceId, userId, dto);
    return { data: bot, message: 'Bot updated successfully' };
  }

  @Delete(':botId')
  @ApiOperation({ summary: 'Delete a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async deleteBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.botsService.delete(botId, workspaceId, userId);
    return { message: 'Bot deleted successfully' };
  }

  @Post(':botId/regenerate-webhook-secret')
  @ApiOperation({ summary: 'Regenerate webhook secret for a webhook bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async regenerateWebhookSecret(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
  ) {
    const secret = await this.botsService.regenerateWebhookSecret(botId, workspaceId);
    return { data: { webhookSecret: secret }, message: 'Webhook secret regenerated' };
  }

  // ==================== TRIGGERS ====================

  @Post(':botId/triggers')
  @ApiOperation({ summary: 'Create a new trigger for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async createTrigger(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Body() dto: CreateTriggerDto,
  ) {
    // Verify bot exists and belongs to workspace
    await this.botsService.findOne(botId, workspaceId);
    const trigger = await this.triggersService.create(botId, dto);
    return { data: trigger, message: 'Trigger created successfully' };
  }

  @Get(':botId/triggers')
  @ApiOperation({ summary: 'Get all triggers for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async getTriggers(@Param('workspaceId') workspaceId: string, @Param('botId') botId: string) {
    await this.botsService.findOne(botId, workspaceId);
    const triggers = await this.triggersService.findAllForBot(botId);
    return { data: triggers };
  }

  @Patch(':botId/triggers/:triggerId')
  @ApiOperation({ summary: 'Update a trigger' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID' })
  async updateTrigger(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('triggerId') triggerId: string,
    @Body() dto: UpdateTriggerDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    const trigger = await this.triggersService.update(triggerId, dto);
    return { data: trigger, message: 'Trigger updated successfully' };
  }

  @Delete(':botId/triggers/:triggerId')
  @ApiOperation({ summary: 'Delete a trigger' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'triggerId', description: 'Trigger ID' })
  async deleteTrigger(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('triggerId') triggerId: string,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    await this.triggersService.delete(triggerId);
    return { message: 'Trigger deleted successfully' };
  }

  // ==================== ACTIONS ====================

  @Post(':botId/actions')
  @ApiOperation({ summary: 'Create a new action for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async createAction(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Body() dto: CreateActionDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    const action = await this.actionsService.create(botId, dto);
    return { data: action, message: 'Action created successfully' };
  }

  @Get(':botId/actions')
  @ApiOperation({ summary: 'Get all actions for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async getActions(@Param('workspaceId') workspaceId: string, @Param('botId') botId: string) {
    await this.botsService.findOne(botId, workspaceId);
    const actions = await this.actionsService.findAllForBot(botId);
    return { data: actions };
  }

  @Patch(':botId/actions/:actionId')
  @ApiOperation({ summary: 'Update an action' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  async updateAction(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('actionId') actionId: string,
    @Body() dto: UpdateActionDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    const action = await this.actionsService.update(actionId, dto);
    return { data: action, message: 'Action updated successfully' };
  }

  @Delete(':botId/actions/:actionId')
  @ApiOperation({ summary: 'Delete an action' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'actionId', description: 'Action ID' })
  async deleteAction(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('actionId') actionId: string,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    await this.actionsService.delete(actionId);
    return { message: 'Action deleted successfully' };
  }

  @Post(':botId/actions/reorder')
  @ApiOperation({ summary: 'Reorder actions for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async reorderActions(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Body() body: { actionIds: string[] },
  ) {
    await this.botsService.findOne(botId, workspaceId);
    await this.actionsService.reorderActions(botId, body.actionIds);
    return { message: 'Actions reordered successfully' };
  }

  // ==================== INSTALLATIONS ====================

  @Post(':botId/install')
  @ApiOperation({ summary: 'Install a bot to a channel or conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async installBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: InstallBotDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    const installation = await this.installationsService.install(botId, userId, dto);
    return { data: installation, message: 'Bot installed successfully' };
  }

  @Post(':botId/uninstall')
  @ApiOperation({ summary: 'Uninstall a bot from a channel or conversation' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async uninstallBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UninstallBotDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    await this.installationsService.uninstall(botId, userId, dto);
    return { message: 'Bot uninstalled successfully' };
  }

  @Get(':botId/installations')
  @ApiOperation({ summary: 'Get all installations for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async getInstallations(@Param('workspaceId') workspaceId: string, @Param('botId') botId: string) {
    await this.botsService.findOne(botId, workspaceId);
    const installations = await this.installationsService.findAllForBot(botId);
    return { data: installations };
  }

  // ==================== TESTING & LOGS ====================

  @Post(':botId/test')
  @ApiOperation({ summary: 'Test a bot with a sample message' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  async testBot(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: TestBotDto,
  ) {
    const bot = await this.botsService.findOne(botId, workspaceId);
    const triggers = await this.triggersService.findAllForBot(botId);

    // Import TriggerEvaluatorService for testing
    const { TriggerEvaluatorService } = await import('../services/trigger-evaluator.service');

    const matchedTriggers: string[] = [];
    const actionsToExecute: any[] = [];

    // Evaluate each trigger
    for (const trigger of triggers) {
      // Simple evaluation for testing
      const config = trigger.triggerConfig;
      let matched = false;

      if (trigger.triggerType === 'keyword') {
        const keywords = (config as any).keywords || [];
        const matchType = (config as any).matchType || 'contains';
        const caseSensitive = (config as any).caseSensitive || false;

        const content = caseSensitive ? dto.testMessage : dto.testMessage.toLowerCase();

        for (const keyword of keywords) {
          const kw = caseSensitive ? keyword : keyword.toLowerCase();
          if (matchType === 'exact' && content === kw) matched = true;
          else if (matchType === 'contains' && content.includes(kw)) matched = true;
          else if (matchType === 'starts_with' && content.startsWith(kw)) matched = true;
          else if (matchType === 'ends_with' && content.endsWith(kw)) matched = true;
        }
      } else if (trigger.triggerType === 'regex') {
        try {
          const regex = new RegExp((config as any).pattern, (config as any).flags || '');
          matched = regex.test(dto.testMessage);
        } catch (e) {
          // Invalid regex
        }
      } else if (trigger.triggerType === 'mention') {
        matched = dto.testMessage.includes('@');
      } else if (trigger.triggerType === 'any_message') {
        matched = true;
      }

      if (matched) {
        matchedTriggers.push(trigger.id);

        // Get actions for this trigger
        const actions = await this.actionsService.getActionsForTrigger(botId, trigger.id);
        for (const action of actions) {
          actionsToExecute.push({
            actionId: action.id,
            actionType: action.actionType,
            actionName: action.name,
            wouldExecute: dto.executeActions || false,
          });
        }
      }
    }

    return {
      data: {
        triggersMatched: matchedTriggers.length > 0,
        matchedTriggers,
        actionsToExecute,
        executionResults: dto.executeActions ? [] : undefined, // TODO: Execute if requested
      },
    };
  }

  @Get(':botId/logs')
  @ApiOperation({ summary: 'Get execution logs for a bot' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiQuery({ name: 'triggerId', required: false })
  @ApiQuery({ name: 'actionId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'channelId', required: false })
  @ApiQuery({ name: 'conversationId', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  async getLogs(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Query() query: BotLogsQueryDto,
  ) {
    await this.botsService.findOne(botId, workspaceId);
    const logs = await this.executionService.getLogs(botId, {
      triggerId: query.triggerId,
      actionId: query.actionId,
      status: query.status,
      channelId: query.channelId,
      conversationId: query.conversationId,
      limit: query.limit,
      offset: query.offset,
    });
    return { data: logs };
  }

  // ==================== PROJECT BOT ASSIGNMENTS ====================

  @Post(':botId/assign-to-project/:projectId')
  @ApiOperation({
    summary: 'Assign bot to a project',
    description: 'Gives the bot context of this specific project',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async assignBotToProject(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const assignment = await this.botsService.assignToProject(
      workspaceId,
      botId,
      projectId,
      userId,
    );
    return { data: assignment, message: 'Bot assigned to project successfully' };
  }

  @Delete(':botId/unassign-from-project/:projectId')
  @ApiOperation({ summary: 'Unassign bot from a project' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'botId', description: 'Bot ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async unassignBotFromProject(
    @Param('workspaceId') workspaceId: string,
    @Param('botId') botId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.botsService.unassignFromProject(workspaceId, botId, projectId, userId);
    return { message: 'Bot unassigned from project successfully' };
  }

  @Get('projects/:projectId/bots')
  @ApiOperation({ summary: 'Get all bots assigned to a project' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async getProjectBots(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const bots = await this.botsService.getProjectBots(workspaceId, projectId, userId);
    return { data: bots };
  }

  @Get('projects/:projectId/available-bots')
  @ApiOperation({
    summary: 'Get available bots that can be assigned to a project',
    description: 'Returns activated bots that are NOT already assigned to this project',
  })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  async getAvailableBotsForProject(
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const bots = await this.botsService.getAvailableBotsForProject(workspaceId, projectId, userId);
    return { data: bots };
  }
}
