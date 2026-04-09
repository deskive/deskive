import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';

export interface GeneratedWorkflow {
  name: string;
  description: string;
  triggerType: string;
  triggerConfig: Record<string, any>;
  steps: GeneratedStep[];
  color?: string;
  icon?: string;
}

export interface GeneratedStep {
  name: string;
  stepType: string;
  actionType?: string;
  actionConfig: Record<string, any>;
  conditions: GeneratedCondition[];
  order: number;
}

export interface GeneratedCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: string;
}

export interface NLPParseResult {
  workflow: GeneratedWorkflow;
  confidence: number;
  suggestions: string[];
  warnings: string[];
}

/**
 * AI Workflow Generator Service
 *
 * This service converts natural language descriptions into workflow configurations.
 * It uses AI to parse user intent and generate appropriate triggers, conditions, and actions.
 */
@Injectable()
export class AIWorkflowGeneratorService {
  private readonly logger = new Logger(AIWorkflowGeneratorService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Generate a workflow from natural language description
   */
  async generateFromDescription(
    description: string,
    workspaceId: string,
    userId: string,
  ): Promise<NLPParseResult> {
    this.logger.log(`Generating workflow from description: "${description}"`);

    try {
      // Use AI to parse the natural language description
      const parsedResult = await this.parseWithAI(description, workspaceId);

      return parsedResult;
    } catch (error) {
      this.logger.error(`Failed to generate workflow: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse description using AI
   */
  private async parseWithAI(
    description: string,
    workspaceId: string,
  ): Promise<NLPParseResult> {
    const systemPrompt = `You are a workflow automation expert. Parse the user's natural language description and generate a workflow configuration.

Available trigger types:
- entity_change: Triggered when a task, note, event, project, file, or approval changes
- schedule: Triggered on a schedule (cron expression)
- webhook: Triggered by external webhook call
- manual: Triggered manually by user

Available entity types for entity_change trigger:
- task: Task entity (events: created, updated, deleted, status_changed, assigned, completed, due_date_changed, priority_changed)
- note: Note entity (events: created, updated, deleted)
- event: Calendar event (events: created, updated, deleted, started, ended)
- project: Project entity (events: created, updated, deleted)
- file: File entity (events: created, updated, deleted)
- approval: Approval entity (events: created, approved, rejected)

Available action types:
- send_email: Send email notification
- send_notification: Send push notification
- create_task: Create a new task
- update_task: Update existing task
- create_note: Create a new note
- create_event: Create calendar event
- send_slack_message: Send Slack message
- call_webhook: Call external API
- delay: Wait for specified time
- assign_user: Assign user to entity
- change_status: Change entity status
- add_tag: Add tag to entity
- remove_tag: Remove tag from entity
- move_to_project: Move to different project
- set_due_date: Set or update due date
- set_priority: Set priority level
- request_approval: Request approval from users
- run_ai_action: Execute AI-powered action

Available condition operators:
- equals, not_equals, contains, not_contains, starts_with, ends_with
- greater_than, less_than, greater_than_or_equals, less_than_or_equals
- is_empty, is_not_empty, is_null, is_not_null
- in, not_in, matches_regex

Respond with a JSON object containing:
{
  "workflow": {
    "name": "Descriptive workflow name",
    "description": "Brief description of what the workflow does",
    "triggerType": "entity_change|schedule|webhook|manual",
    "triggerConfig": {
      // For entity_change: { "entityType": "task", "eventType": "created" }
      // For schedule: { "cronExpression": "0 9 * * *", "timezone": "UTC" }
      // For webhook/manual: {}
    },
    "steps": [
      {
        "name": "Step name",
        "stepType": "action|condition",
        "actionType": "send_email|send_notification|...",
        "actionConfig": { ... },
        "conditions": [
          {
            "field": "triggerData.fieldName",
            "operator": "equals",
            "value": "value",
            "logicalOperator": null|"and"|"or"
          }
        ],
        "order": 1
      }
    ],
    "color": "#HEX",
    "icon": "icon_name"
  },
  "confidence": 0.0-1.0,
  "suggestions": ["Optional improvement suggestions"],
  "warnings": ["Optional warnings about potential issues"]
}`;

    const userPrompt = `Parse this automation request and generate a workflow configuration:

"${description}"

Generate a complete workflow JSON that implements this automation.`;

    try {
      // Call AI service to generate the workflow
      const response = await this.aiProvider.generateText(userPrompt, {
        systemPrompt,
        maxTokens: 2000,
        temperature: 0.3, // Lower temperature for more consistent output
      });

      // Parse the AI response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI did not return valid JSON');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize the result
      return this.normalizeResult(parsed);
    } catch (error) {
      this.logger.error(`AI parsing failed: ${error.message}`);

      // Fall back to rule-based parsing
      return this.parseWithRules(description);
    }
  }

  /**
   * Normalize the AI result to ensure consistent structure
   */
  private normalizeResult(parsed: any): NLPParseResult {
    const workflow = parsed.workflow || parsed;

    return {
      workflow: {
        name: workflow.name || 'Generated Workflow',
        description: workflow.description || '',
        triggerType: workflow.triggerType || 'manual',
        triggerConfig: workflow.triggerConfig || {},
        steps: (workflow.steps || []).map((step: any, index: number) => ({
          name: step.name || `Step ${index + 1}`,
          stepType: step.stepType || 'action',
          actionType: step.actionType,
          actionConfig: step.actionConfig || {},
          conditions: (step.conditions || []).map((cond: any, condIndex: number) => ({
            field: cond.field || '',
            operator: cond.operator || 'equals',
            value: cond.value,
            logicalOperator: condIndex > 0 ? (cond.logicalOperator || 'and') : null,
          })),
          order: step.order || index + 1,
        })),
        color: workflow.color || '#3B82F6',
        icon: workflow.icon || 'auto_awesome',
      },
      confidence: parsed.confidence || 0.8,
      suggestions: parsed.suggestions || [],
      warnings: parsed.warnings || [],
    };
  }

  /**
   * Rule-based fallback parser for when AI fails
   */
  private parseWithRules(description: string): NLPParseResult {
    const lowerDesc = description.toLowerCase();
    const workflow: GeneratedWorkflow = {
      name: 'Generated Workflow',
      description: description,
      triggerType: 'manual',
      triggerConfig: {},
      steps: [],
    };

    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Detect trigger type
    if (lowerDesc.includes('when') || lowerDesc.includes('whenever')) {
      if (lowerDesc.includes('task') && (lowerDesc.includes('created') || lowerDesc.includes('new'))) {
        workflow.triggerType = 'entity_change';
        workflow.triggerConfig = { entityType: 'task', eventType: 'created' };
        workflow.name = 'Task Creation Workflow';
      } else if (lowerDesc.includes('task') && lowerDesc.includes('complete')) {
        workflow.triggerType = 'entity_change';
        workflow.triggerConfig = { entityType: 'task', eventType: 'completed' };
        workflow.name = 'Task Completion Workflow';
      } else if (lowerDesc.includes('note') && lowerDesc.includes('created')) {
        workflow.triggerType = 'entity_change';
        workflow.triggerConfig = { entityType: 'note', eventType: 'created' };
        workflow.name = 'Note Creation Workflow';
      } else if (lowerDesc.includes('event') && lowerDesc.includes('created')) {
        workflow.triggerType = 'entity_change';
        workflow.triggerConfig = { entityType: 'event', eventType: 'created' };
        workflow.name = 'Event Creation Workflow';
      }
    }

    // Check for schedule-based triggers
    if (lowerDesc.includes('every day') || lowerDesc.includes('daily')) {
      workflow.triggerType = 'schedule';
      workflow.triggerConfig = { cronExpression: '0 9 * * *', timezone: 'UTC' };
      workflow.name = 'Daily Workflow';
    } else if (lowerDesc.includes('every week') || lowerDesc.includes('weekly')) {
      workflow.triggerType = 'schedule';
      workflow.triggerConfig = { cronExpression: '0 9 * * 1', timezone: 'UTC' };
      workflow.name = 'Weekly Workflow';
    } else if (lowerDesc.includes('every hour') || lowerDesc.includes('hourly')) {
      workflow.triggerType = 'schedule';
      workflow.triggerConfig = { cronExpression: '0 * * * *', timezone: 'UTC' };
      workflow.name = 'Hourly Workflow';
    }

    // Detect actions
    let stepOrder = 1;

    if (lowerDesc.includes('send email') || lowerDesc.includes('email')) {
      workflow.steps.push({
        name: 'Send Email',
        stepType: 'action',
        actionType: 'send_email',
        actionConfig: {
          recipient: '{{triggerData.assigneeEmail}}',
          subject: 'Notification',
          body: 'You have a new notification.',
        },
        conditions: [],
        order: stepOrder++,
      });
    }

    if (lowerDesc.includes('notify') || lowerDesc.includes('notification')) {
      workflow.steps.push({
        name: 'Send Notification',
        stepType: 'action',
        actionType: 'send_notification',
        actionConfig: {
          userId: '{{triggerData.userId}}',
          title: 'Notification',
          message: 'You have a new notification.',
        },
        conditions: [],
        order: stepOrder++,
      });
    }

    if (lowerDesc.includes('create task') || lowerDesc.includes('add task')) {
      workflow.steps.push({
        name: 'Create Task',
        stepType: 'action',
        actionType: 'create_task',
        actionConfig: {
          title: 'Follow-up Task',
          description: 'Auto-generated task',
        },
        conditions: [],
        order: stepOrder++,
      });
    }

    if (lowerDesc.includes('assign')) {
      workflow.steps.push({
        name: 'Assign User',
        stepType: 'action',
        actionType: 'assign_user',
        actionConfig: {
          userId: '{{triggerData.leadId}}',
        },
        conditions: [],
        order: stepOrder++,
      });
    }

    if (lowerDesc.includes('slack')) {
      workflow.steps.push({
        name: 'Send Slack Message',
        stepType: 'action',
        actionType: 'send_slack_message',
        actionConfig: {
          channel: '#general',
          message: 'Workflow notification',
        },
        conditions: [],
        order: stepOrder++,
      });
    }

    // Add conditions if detected
    if (lowerDesc.includes('high priority') || lowerDesc.includes('urgent')) {
      workflow.steps.forEach(step => {
        step.conditions.push({
          field: 'triggerData.priority',
          operator: 'in',
          value: ['high', 'urgent'],
        });
      });
    }

    // Add warnings if we couldn't parse completely
    if (workflow.steps.length === 0) {
      warnings.push('Could not detect specific actions. Please add actions manually.');
      workflow.steps.push({
        name: 'Manual Action',
        stepType: 'action',
        actionType: 'send_notification',
        actionConfig: {
          userId: '{{triggerData.userId}}',
          title: 'Action Required',
          message: 'Please review and update this workflow step.',
        },
        conditions: [],
        order: 1,
      });
    }

    if (workflow.triggerType === 'manual') {
      suggestions.push('Consider adding a specific trigger to automate this workflow.');
    }

    return {
      workflow,
      confidence: this.calculateConfidence(description, workflow),
      suggestions,
      warnings,
    };
  }

  /**
   * Calculate confidence score for the parsed workflow
   */
  private calculateConfidence(description: string, workflow: GeneratedWorkflow): number {
    let score = 0.5; // Base score

    // Higher confidence if we detected a specific trigger
    if (workflow.triggerType !== 'manual') {
      score += 0.2;
    }

    // Higher confidence if we detected actions
    if (workflow.steps.length > 0) {
      score += 0.1 * Math.min(workflow.steps.length, 3);
    }

    // Lower confidence for very short descriptions
    const wordCount = description.split(/\s+/).length;
    if (wordCount < 5) {
      score -= 0.2;
    } else if (wordCount > 20) {
      score += 0.1;
    }

    return Math.max(0.1, Math.min(1.0, score));
  }

  /**
   * Get suggestions for improving a workflow description
   */
  getSuggestions(partialDescription: string): string[] {
    const lowerDesc = partialDescription.toLowerCase();
    const suggestions: string[] = [];

    if (!lowerDesc.includes('when') && !lowerDesc.includes('every')) {
      suggestions.push('Try starting with "When..." to specify a trigger');
    }

    if (!lowerDesc.includes('email') && !lowerDesc.includes('notify') && !lowerDesc.includes('create')) {
      suggestions.push('Add what action should happen (e.g., "send email", "notify team", "create task")');
    }

    if (lowerDesc.length < 20) {
      suggestions.push('Add more details about what should trigger the workflow');
    }

    // Suggest common patterns
    if (lowerDesc.includes('task')) {
      suggestions.push('When a high-priority task is created, notify the team lead');
      suggestions.push('When a task is completed, send an email to the project manager');
    }

    if (lowerDesc.includes('deadline') || lowerDesc.includes('due')) {
      suggestions.push('Every day at 9 AM, check for tasks due today and send reminders');
    }

    return suggestions.slice(0, 5); // Return max 5 suggestions
  }

  /**
   * Validate a generated workflow
   */
  validateWorkflow(workflow: GeneratedWorkflow): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!workflow.name || workflow.name.length < 3) {
      errors.push('Workflow name must be at least 3 characters');
    }

    if (!workflow.triggerType) {
      errors.push('Trigger type is required');
    }

    if (workflow.triggerType === 'entity_change') {
      if (!workflow.triggerConfig?.entityType) {
        errors.push('Entity type is required for entity change triggers');
      }
      if (!workflow.triggerConfig?.eventType) {
        errors.push('Event type is required for entity change triggers');
      }
    }

    if (workflow.triggerType === 'schedule') {
      if (!workflow.triggerConfig?.cronExpression) {
        errors.push('Cron expression is required for schedule triggers');
      }
    }

    if (!workflow.steps || workflow.steps.length === 0) {
      errors.push('At least one step is required');
    }

    workflow.steps.forEach((step, index) => {
      if (step.stepType === 'action' && !step.actionType) {
        errors.push(`Step ${index + 1}: Action type is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
