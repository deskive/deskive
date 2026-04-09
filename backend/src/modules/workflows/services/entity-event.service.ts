import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { DatabaseService } from '../../database/database.service';
import { ConditionEvaluatorService } from './condition-evaluator.service';
import { EntityType, EntityEventType } from '../dto/workflow.dto';

export interface EntityChangeEvent {
  entityType: EntityType;
  eventType: EntityEventType;
  entity: Record<string, any>;
  previous?: Record<string, any>;
  workspaceId: string;
  triggeredBy?: string;
  timestamp: Date;
  changedFields?: string[];
}

interface EntitySubscription {
  id: string;
  workflowId: string;
  workspaceId: string;
  entityType: string;
  eventType: string;
  filterConfig: Record<string, any>;
  isActive: boolean;
}

@Injectable()
export class EntityEventService {
  private readonly logger = new Logger(EntityEventService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly db: DatabaseService,
    private readonly conditionEvaluator: ConditionEvaluatorService,
  ) {}

  /**
   * Listen for entity.changed events emitted by EntityEventIntegrationService
   * This bridges the gap between entity changes in services (Projects, Notes, etc.)
   * and the workflow trigger system.
   */
  @OnEvent('entity.changed')
  async handleEntityChanged(event: {
    entityType: string;
    eventType: string;
    workspaceId: string;
    entityId: string;
    userId: string;
    data: Record<string, any>;
    previousData?: Record<string, any>;
    timestamp: string;
  }): Promise<void> {
    this.logger.log(
      `[EntityEvent] Received entity.changed: ${event.entityType}.${event.eventType} in workspace ${event.workspaceId}`,
    );

    // Detect changed fields if we have previous data
    const changedFields = event.previousData
      ? this.detectChangedFields(event.previousData, event.data)
      : undefined;

    // Convert to internal event format and trigger matching workflows
    const internalEvent: EntityChangeEvent = {
      entityType: event.entityType as EntityType,
      eventType: event.eventType as EntityEventType,
      entity: event.data,
      previous: event.previousData,
      workspaceId: event.workspaceId,
      triggeredBy: event.userId,
      timestamp: new Date(event.timestamp),
      changedFields,
    };

    // Find and trigger matching workflows
    await this.triggerMatchingWorkflows(internalEvent);
  }

  /**
   * Emit a task change event
   */
  async emitTaskEvent(
    eventType: EntityEventType,
    task: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    const changedFields = previous ? this.detectChangedFields(previous, task) : undefined;

    await this.emitEntityEvent({
      entityType: EntityType.TASK,
      eventType,
      entity: task,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
      changedFields,
    });
  }

  /**
   * Emit a note change event
   */
  async emitNoteEvent(
    eventType: EntityEventType,
    note: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    const changedFields = previous ? this.detectChangedFields(previous, note) : undefined;

    await this.emitEntityEvent({
      entityType: EntityType.NOTE,
      eventType,
      entity: note,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
      changedFields,
    });
  }

  /**
   * Emit a calendar event change
   */
  async emitCalendarEvent(
    eventType: EntityEventType,
    event: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    const changedFields = previous ? this.detectChangedFields(previous, event) : undefined;

    await this.emitEntityEvent({
      entityType: EntityType.EVENT,
      eventType,
      entity: event,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
      changedFields,
    });
  }

  /**
   * Emit a file change event
   */
  async emitFileEvent(
    eventType: EntityEventType,
    file: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    await this.emitEntityEvent({
      entityType: EntityType.FILE,
      eventType,
      entity: file,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a project change event
   */
  async emitProjectEvent(
    eventType: EntityEventType,
    project: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    await this.emitEntityEvent({
      entityType: EntityType.PROJECT,
      eventType,
      entity: project,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
    });
  }

  /**
   * Emit a message change event
   */
  async emitMessageEvent(
    eventType: EntityEventType,
    message: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
  ): Promise<void> {
    await this.emitEntityEvent({
      entityType: EntityType.MESSAGE,
      eventType,
      entity: message,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
    });
  }

  /**
   * Emit an approval change event
   */
  async emitApprovalEvent(
    eventType: EntityEventType,
    approval: Record<string, any>,
    workspaceId: string,
    triggeredBy?: string,
    previous?: Record<string, any>,
  ): Promise<void> {
    await this.emitEntityEvent({
      entityType: EntityType.APPROVAL,
      eventType,
      entity: approval,
      previous,
      workspaceId,
      triggeredBy,
      timestamp: new Date(),
    });
  }

  /**
   * Main method to emit entity events and find matching workflows
   */
  private async emitEntityEvent(event: EntityChangeEvent): Promise<void> {
    this.logger.log(
      `[EntityEvent] ${event.entityType}.${event.eventType} in workspace ${event.workspaceId}`,
    );

    // Emit for any listeners (real-time notifications, etc.)
    this.eventEmitter.emit('workflow.entity.change', event);

    // Find and trigger matching workflows
    await this.triggerMatchingWorkflows(event);
  }

  /**
   * Find workflows that match this entity event and trigger them
   */
  private async triggerMatchingWorkflows(event: EntityChangeEvent): Promise<void> {
    try {
      // Find active entity subscriptions matching this event
      const subscriptions = await this.findMatchingSubscriptions(event);

      this.logger.log(
        `[EntityEvent] Found ${subscriptions.length} matching subscriptions for ${event.entityType}.${event.eventType}`,
      );

      for (const subscription of subscriptions) {
        // Check if filters match
        if (this.matchesFilters(event, subscription.filterConfig)) {
          // Emit workflow trigger event
          this.eventEmitter.emit('workflow.trigger', {
            workflowId: subscription.workflowId,
            triggerSource: 'entity_change',
            triggerData: {
              entityType: event.entityType,
              eventType: event.eventType,
              entity: event.entity,
              previous: event.previous,
              changedFields: event.changedFields,
            },
            triggeredBy: event.triggeredBy || 'system',
          });

          this.logger.log(
            `[EntityEvent] Triggered workflow ${subscription.workflowId} for ${event.entityType}.${event.eventType}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`[EntityEvent] Error triggering workflows: ${error.message}`);
    }
  }

  /**
   * Find entity subscriptions matching the event
   */
  private async findMatchingSubscriptions(event: EntityChangeEvent): Promise<EntitySubscription[]> {
    const result = await this.db.table('workflow_entity_subscriptions')
      .select('*')
      .where('workspace_id', '=', event.workspaceId)
      .where('entity_type', '=', event.entityType)
      .where('event_type', '=', event.eventType)
      .where('is_active', '=', true)
      .execute();

    return (result.data || []).map((row: any) => ({
      id: row.id,
      workflowId: row.workflow_id,
      workspaceId: row.workspace_id,
      entityType: row.entity_type,
      eventType: row.event_type,
      filterConfig: row.filter_config || {},
      isActive: row.is_active,
    }));
  }

  /**
   * Check if event matches subscription filters
   */
  private matchesFilters(event: EntityChangeEvent, filterConfig: Record<string, any>): boolean {
    if (!filterConfig || Object.keys(filterConfig).length === 0) {
      return true; // No filters = match all
    }

    const entity = event.entity;

    // Check project filter
    if (filterConfig.projectIds && filterConfig.projectIds.length > 0) {
      const entityProjectId = entity.project_id || entity.projectId;
      if (!filterConfig.projectIds.includes(entityProjectId)) {
        return false;
      }
    }

    // Check assignee filter
    if (filterConfig.assigneeIds && filterConfig.assigneeIds.length > 0) {
      const entityAssigneeId = entity.assignee_id || entity.assigneeId || entity.assigned_to;
      if (!filterConfig.assigneeIds.includes(entityAssigneeId)) {
        return false;
      }
    }

    // Check status filter
    if (filterConfig.statusValues && filterConfig.statusValues.length > 0) {
      const entityStatus = entity.status;
      if (!filterConfig.statusValues.includes(entityStatus)) {
        return false;
      }
    }

    // Check priority filter
    if (filterConfig.priorityValues && filterConfig.priorityValues.length > 0) {
      const entityPriority = entity.priority;
      if (!filterConfig.priorityValues.includes(entityPriority)) {
        return false;
      }
    }

    // Check field changes filter
    if (filterConfig.fieldChanges && filterConfig.fieldChanges.length > 0) {
      if (!event.changedFields || event.changedFields.length === 0) {
        return false;
      }
      const hasRequiredFieldChange = filterConfig.fieldChanges.some((field: string) =>
        event.changedFields!.includes(field),
      );
      if (!hasRequiredFieldChange) {
        return false;
      }
    }

    // Check custom conditions
    if (filterConfig.customConditions) {
      const context = {
        trigger: {
          entity: event.entity,
          previous: event.previous,
          changedFields: event.changedFields,
        },
        current: event.entity,
        previous: event.previous,
      };

      if (!this.conditionEvaluator.evaluate(filterConfig.customConditions, context)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Detect which fields changed between previous and current state
   */
  private detectChangedFields(previous: Record<string, any>, current: Record<string, any>): string[] {
    const changedFields: string[] = [];
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of allKeys) {
      const prevValue = previous[key];
      const currValue = current[key];

      // Skip metadata fields
      if (key === 'updated_at' || key === 'updatedAt') {
        continue;
      }

      // Compare values
      if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
        changedFields.push(key);
      }
    }

    return changedFields;
  }

  /**
   * Helper to determine specific event type based on changes
   */
  determineEventType(
    previous: Record<string, any> | undefined,
    current: Record<string, any>,
    entityType: EntityType,
  ): EntityEventType {
    if (!previous) {
      return EntityEventType.CREATED;
    }

    // Check for specific changes
    switch (entityType) {
      case EntityType.TASK:
        if (previous.status !== current.status) {
          // Check if completed
          const completedStatuses = ['completed', 'done', 'closed'];
          if (completedStatuses.includes(current.status?.toLowerCase())) {
            return EntityEventType.COMPLETED;
          }
          return EntityEventType.STATUS_CHANGED;
        }
        if (previous.assignee_id !== current.assignee_id || previous.assigned_to !== current.assigned_to) {
          return EntityEventType.ASSIGNED;
        }
        if (previous.due_date !== current.due_date) {
          return EntityEventType.DUE_DATE_CHANGED;
        }
        if (previous.priority !== current.priority) {
          return EntityEventType.PRIORITY_CHANGED;
        }
        return EntityEventType.UPDATED;

      case EntityType.APPROVAL:
        if (current.status === 'approved') {
          return EntityEventType.APPROVED;
        }
        if (current.status === 'rejected') {
          return EntityEventType.REJECTED;
        }
        return EntityEventType.UPDATED;

      case EntityType.EVENT:
        if (current.status === 'started' || new Date(current.start_time) <= new Date()) {
          return EntityEventType.STARTED;
        }
        if (current.status === 'ended' || new Date(current.end_time) <= new Date()) {
          return EntityEventType.ENDED;
        }
        return EntityEventType.UPDATED;

      default:
        return EntityEventType.UPDATED;
    }
  }
}
