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
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WorkflowsService } from './services/workflows.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { AIWorkflowGeneratorService } from './services/ai-workflow-generator.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowStepDto,
  UpdateWorkflowStepDto,
  ManualExecuteWorkflowDto,
  UseTemplateDto,
  CreateTemplateFromWorkflowDto,
  GenerateWorkflowDto,
  WorkflowTriggerType,
} from './dto/workflow.dto';

@ApiTags('Workflows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/workflows')
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly workflowExecutorService: WorkflowExecutorService,
    private readonly aiWorkflowGeneratorService: AIWorkflowGeneratorService,
  ) {}

  // ============================================
  // WORKFLOW CRUD
  // ============================================

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async createWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const workflow = await this.workflowsService.createWorkflow(workspaceId, userId, dto);
    return { data: workflow, message: 'Workflow created successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows in workspace' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'triggerType', required: false, enum: WorkflowTriggerType })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listWorkflows(
    @Param('workspaceId') workspaceId: string,
    @Query('isActive') isActive?: string,
    @Query('triggerType') triggerType?: WorkflowTriggerType,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.workflowsService.listWorkflows(workspaceId, {
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      triggerType,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { data: result.data, total: result.total };
  }

  @Get('pending')
  @ApiOperation({ summary: 'List pending workflows (scheduled or with pending executions)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listPendingWorkflows(
    @Param('workspaceId') workspaceId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.workflowsService.getPendingWorkflows(workspaceId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
    return { data: result.data, total: result.total };
  }

  @Get(':workflowId')
  @ApiOperation({ summary: 'Get workflow details' })
  async getWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    const workflow = await this.workflowsService.getWorkflow(workspaceId, workflowId);
    return { data: workflow };
  }

  @Patch(':workflowId')
  @ApiOperation({ summary: 'Update a workflow' })
  async updateWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: UpdateWorkflowDto,
  ) {
    const workflow = await this.workflowsService.updateWorkflow(workspaceId, workflowId, dto);
    return { data: workflow, message: 'Workflow updated successfully' };
  }

  @Delete(':workflowId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  async deleteWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    await this.workflowsService.deleteWorkflow(workspaceId, workflowId);
  }

  @Post(':workflowId/toggle')
  @ApiOperation({ summary: 'Toggle workflow active state' })
  async toggleWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
  ) {
    const workflow = await this.workflowsService.toggleWorkflow(workspaceId, workflowId);
    return {
      data: workflow,
      message: `Workflow ${workflow.isActive ? 'activated' : 'deactivated'}`,
    };
  }

  @Post(':workflowId/duplicate')
  @ApiOperation({ summary: 'Duplicate a workflow' })
  async duplicateWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const workflow = await this.workflowsService.duplicateWorkflow(workspaceId, workflowId, userId);
    return { data: workflow, message: 'Workflow duplicated successfully' };
  }

  // ============================================
  // AI WORKFLOW GENERATION
  // ============================================

  @Post('generate')
  @ApiOperation({ summary: 'Generate workflow from natural language description' })
  @ApiResponse({ status: 201, description: 'Workflow generated successfully' })
  async generateWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: GenerateWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const result = await this.aiWorkflowGeneratorService.generateFromDescription(
      dto.prompt,
      workspaceId,
      userId,
    );
    return {
      data: result,
      message: 'Workflow generated successfully',
    };
  }

  @Post('generate/suggestions')
  @ApiOperation({ summary: 'Get suggestions for workflow description' })
  async getWorkflowSuggestions(@Body() dto: { partialDescription: string }) {
    const suggestions = this.aiWorkflowGeneratorService.getSuggestions(dto.partialDescription);
    return { data: suggestions };
  }

  @Post('generate/create')
  @ApiOperation({ summary: 'Generate and create workflow in one step' })
  @ApiResponse({ status: 201, description: 'Workflow created from description' })
  async generateAndCreateWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: GenerateWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;

    // Generate workflow from description
    const result = await this.aiWorkflowGeneratorService.generateFromDescription(
      dto.prompt,
      workspaceId,
      userId,
    );

    // Validate the generated workflow
    const validation = this.aiWorkflowGeneratorService.validateWorkflow(result.workflow);
    if (!validation.isValid) {
      return {
        data: result,
        message: 'Generated workflow has validation errors',
        errors: validation.errors,
        created: false,
      };
    }

    // Create the workflow
    const createDto: CreateWorkflowDto = {
      name: result.workflow.name,
      description: result.workflow.description,
      triggerType: result.workflow.triggerType as any,
      triggerConfig: result.workflow.triggerConfig,
      color: result.workflow.color,
      icon: result.workflow.icon,
      steps: result.workflow.steps.map((step, index) => ({
        stepName: step.name,
        stepOrder: index,
        stepType: step.stepType as any,
        stepConfig: {
          actionType: step.actionType,
          actionConfig: step.actionConfig,
          conditions:
            step.conditions?.map((cond) => ({
              field: cond.field,
              operator: cond.operator as any,
              value: cond.value,
              logicalOperator: cond.logicalOperator as any,
            })) || [],
        },
      })),
    };

    const workflow = await this.workflowsService.createWorkflow(workspaceId, userId, createDto);

    return {
      data: {
        workflow,
        generation: result,
      },
      message: 'Workflow created successfully from description',
      created: true,
    };
  }

  // ============================================
  // WORKFLOW STEPS
  // ============================================

  @Post(':workflowId/steps')
  @ApiOperation({ summary: 'Add a step to workflow' })
  async addWorkflowStep(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateWorkflowStepDto,
  ) {
    // Verify workflow exists and belongs to workspace
    await this.workflowsService.getWorkflow(workspaceId, workflowId);
    const step = await this.workflowsService.createWorkflowStep(workflowId, dto);
    return { data: step, message: 'Step added successfully' };
  }

  @Patch(':workflowId/steps/:stepId')
  @ApiOperation({ summary: 'Update a workflow step' })
  async updateWorkflowStep(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateWorkflowStepDto,
  ) {
    // Verify workflow exists and belongs to workspace
    await this.workflowsService.getWorkflow(workspaceId, workflowId);
    const step = await this.workflowsService.updateWorkflowStep(stepId, dto);
    return { data: step, message: 'Step updated successfully' };
  }

  @Delete(':workflowId/steps/:stepId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow step' })
  async deleteWorkflowStep(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Param('stepId') stepId: string,
  ) {
    // Verify workflow exists and belongs to workspace
    await this.workflowsService.getWorkflow(workspaceId, workflowId);
    await this.workflowsService.deleteWorkflowStep(stepId);
  }

  // ============================================
  // WORKFLOW EXECUTION
  // ============================================

  @Post(':workflowId/execute')
  @ApiOperation({ summary: 'Manually execute a workflow' })
  async executeWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: ManualExecuteWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;

    // Verify workflow exists
    const workflow = await this.workflowsService.getWorkflow(workspaceId, workflowId);

    const executionId = await this.workflowExecutorService.executeWorkflow(
      workflowId,
      dto.triggerData || {},
      userId,
      'manual',
      dto.context,
    );

    return {
      data: { executionId, workflowId: workflow.id, workflowName: workflow.name },
      message: 'Workflow execution started',
    };
  }

  @Get(':workflowId/executions')
  @ApiOperation({ summary: 'List workflow executions' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async listWorkflowExecutions(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    // Verify workflow exists
    await this.workflowsService.getWorkflow(workspaceId, workflowId);

    // This would be implemented in a separate executions service
    return { data: [], total: 0, message: 'Execution history' };
  }

  @Post(':workflowId/test')
  @ApiOperation({ summary: 'Test a workflow with sample data' })
  async testWorkflow(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: ManualExecuteWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;

    // Get workflow
    const workflow = await this.workflowsService.getWorkflow(workspaceId, workflowId);

    // Create test trigger data based on workflow trigger type
    const testData =
      dto.triggerData || this.generateTestData(workflow.triggerType, workflow.triggerConfig);

    const executionId = await this.workflowExecutorService.executeWorkflow(
      workflowId,
      testData,
      userId,
      'test',
      dto.context,
    );

    return {
      data: { executionId, isTest: true },
      message: 'Test execution started',
    };
  }

  private generateTestData(triggerType: string, triggerConfig: any): Record<string, any> {
    switch (triggerType) {
      case 'entity_change':
        return {
          entityType: triggerConfig?.entityType || 'task',
          eventType: triggerConfig?.eventType || 'created',
          entity: {
            id: 'test-entity-id',
            title: 'Test Entity',
            status: 'todo',
            priority: 'medium',
            created_at: new Date().toISOString(),
          },
        };
      case 'schedule':
        return {
          scheduledAt: new Date().toISOString(),
          cronExpression: triggerConfig?.cronExpression,
        };
      case 'webhook':
        return {
          payload: { test: true },
          headers: {},
        };
      default:
        return { test: true };
    }
  }

  // ============================================
  // TEMPLATES
  // ============================================

  @Post(':workflowId/save-as-template')
  @ApiOperation({ summary: 'Save workflow as template' })
  async saveAsTemplate(
    @Param('workspaceId') workspaceId: string,
    @Param('workflowId') workflowId: string,
    @Body() dto: CreateTemplateFromWorkflowDto,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const template = await this.workflowsService.createTemplateFromWorkflow(
      workspaceId,
      workflowId,
      userId,
      dto,
    );
    return { data: template, message: 'Template created successfully' };
  }
}

// ============================================
// TEMPLATES CONTROLLER (Separate route)
// ============================================

@ApiTags('Automation Templates')
@ApiBearerAuth()
@Controller('automation-templates')
export class AutomationTemplatesController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: 'List automation templates' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async listTemplates(
    @Query('category') category?: string,
    @Query('featured') featured?: string,
    @Query('limit') limit?: string,
  ) {
    const templates = await this.workflowsService.listTemplates({
      category,
      isFeatured: featured !== undefined ? featured === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { data: templates };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List template categories' })
  async listCategories() {
    const categories = [
      { id: 'project_management', name: 'Project Management', icon: 'folder' },
      { id: 'communication', name: 'Communication', icon: 'chat' },
      { id: 'productivity', name: 'Productivity', icon: 'bolt' },
      { id: 'approvals', name: 'Approvals', icon: 'check_circle' },
      { id: 'onboarding', name: 'Onboarding', icon: 'person_add' },
      { id: 'notifications', name: 'Notifications', icon: 'notifications' },
      { id: 'scheduling', name: 'Scheduling', icon: 'calendar_today' },
      { id: 'integrations', name: 'Integrations', icon: 'extension' },
    ];
    return { data: categories };
  }

  @Get('featured')
  @ApiOperation({ summary: 'Get featured templates' })
  async getFeaturedTemplates() {
    const templates = await this.workflowsService.listTemplates({
      isFeatured: true,
      limit: 10,
    });
    return { data: templates };
  }

  @Get(':templateId')
  @ApiOperation({ summary: 'Get template details' })
  async getTemplate(@Param('templateId') templateId: string) {
    const template = await this.workflowsService.getTemplate(templateId);
    return { data: template };
  }

  @Post(':templateId/use')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create workflow from template' })
  async useTemplate(
    @Param('templateId') templateId: string,
    @Body() dto: UseTemplateDto & { workspaceId: string },
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.userId;
    const workflow = await this.workflowsService.useTemplate(
      dto.workspaceId,
      userId,
      templateId,
      dto,
    );
    return { data: workflow, message: 'Workflow created from template' };
  }
}

// ============================================
// WEBHOOK CONTROLLER (Public endpoint)
// ============================================

@ApiTags('Workflow Webhooks')
@Controller('webhooks/workflows')
export class WorkflowWebhooksController {
  constructor(private readonly workflowExecutorService: WorkflowExecutorService) {}

  @Post(':webhookKey')
  @ApiOperation({ summary: 'Trigger workflow via webhook' })
  async triggerWebhook(
    @Param('webhookKey') webhookKey: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    // This would look up the webhook, verify it, and trigger the associated workflow
    // Implementation would include:
    // 1. Find webhook by key
    // 2. Verify IP whitelist if configured
    // 3. Verify signature if secret is configured
    // 4. Get associated workflow
    // 5. Trigger workflow execution

    return { message: 'Webhook received', webhookKey };
  }
}
