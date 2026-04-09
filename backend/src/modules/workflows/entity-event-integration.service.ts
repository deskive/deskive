import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Entity Event Integration Service
 *
 * This service provides a simple interface for existing services to emit
 * entity change events that can trigger workflow automations.
 *
 * Usage in existing services:
 *
 * 1. Inject this service in the constructor
 * 2. Call the appropriate emit method after create/update/delete operations
 *
 * Example:
 * ```typescript
 * // In projects.service.ts after creating a task:
 * this.entityEventIntegration.emitTaskCreated(workspaceId, task, userId);
 * ```
 */
@Injectable()
export class EntityEventIntegrationService {
  constructor(private eventEmitter: EventEmitter2) {}

  // ============================================
  // TASK EVENTS
  // ============================================

  emitTaskCreated(workspaceId: string, task: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'task',
      eventType: 'created',
      workspaceId,
      entityId: task.id,
      userId,
      data: task,
      timestamp: new Date().toISOString(),
    });
  }

  emitTaskUpdated(workspaceId: string, task: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'task',
      eventType: 'updated',
      workspaceId,
      entityId: task.id,
      userId,
      data: task,
      previousData,
      timestamp: new Date().toISOString(),
    });

    // Check for specific changes and emit specialized events
    if (previousData?.status !== task.status) {
      this.eventEmitter.emit('entity.changed', {
        entityType: 'task',
        eventType: 'status_changed',
        workspaceId,
        entityId: task.id,
        userId,
        data: {
          ...task,
          previousStatus: previousData?.status,
          newStatus: task.status,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check for task completion
    if (task.completed_at && !previousData?.completed_at) {
      this.eventEmitter.emit('entity.changed', {
        entityType: 'task',
        eventType: 'completed',
        workspaceId,
        entityId: task.id,
        userId,
        data: task,
        timestamp: new Date().toISOString(),
      });
    }

    // Check for assignee changes
    const prevAssignees = previousData?.assigned_to || [];
    const newAssignees = task.assigned_to || [];
    if (JSON.stringify(prevAssignees) !== JSON.stringify(newAssignees)) {
      this.eventEmitter.emit('entity.changed', {
        entityType: 'task',
        eventType: 'assigned',
        workspaceId,
        entityId: task.id,
        userId,
        data: {
          ...task,
          previousAssignees: prevAssignees,
          newAssignees: newAssignees,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check for due date changes
    if (previousData?.due_date !== task.due_date) {
      this.eventEmitter.emit('entity.changed', {
        entityType: 'task',
        eventType: 'due_date_changed',
        workspaceId,
        entityId: task.id,
        userId,
        data: {
          ...task,
          previousDueDate: previousData?.due_date,
          newDueDate: task.due_date,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Check for priority changes
    if (previousData?.priority !== task.priority) {
      this.eventEmitter.emit('entity.changed', {
        entityType: 'task',
        eventType: 'priority_changed',
        workspaceId,
        entityId: task.id,
        userId,
        data: {
          ...task,
          previousPriority: previousData?.priority,
          newPriority: task.priority,
        },
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitTaskDeleted(workspaceId: string, taskId: string, taskData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'task',
      eventType: 'deleted',
      workspaceId,
      entityId: taskId,
      userId,
      data: taskData,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // NOTE EVENTS
  // ============================================

  emitNoteCreated(workspaceId: string, note: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'note',
      eventType: 'created',
      workspaceId,
      entityId: note.id,
      userId,
      data: note,
      timestamp: new Date().toISOString(),
    });
  }

  emitNoteUpdated(workspaceId: string, note: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'note',
      eventType: 'updated',
      workspaceId,
      entityId: note.id,
      userId,
      data: note,
      previousData,
      timestamp: new Date().toISOString(),
    });
  }

  emitNoteDeleted(workspaceId: string, noteId: string, noteData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'note',
      eventType: 'deleted',
      workspaceId,
      entityId: noteId,
      userId,
      data: noteData,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // EVENT (CALENDAR) EVENTS
  // ============================================

  emitEventCreated(workspaceId: string, event: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'event',
      eventType: 'created',
      workspaceId,
      entityId: event.id,
      userId,
      data: event,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventUpdated(workspaceId: string, event: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'event',
      eventType: 'updated',
      workspaceId,
      entityId: event.id,
      userId,
      data: event,
      previousData,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventDeleted(workspaceId: string, eventId: string, eventData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'event',
      eventType: 'deleted',
      workspaceId,
      entityId: eventId,
      userId,
      data: eventData,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventStarted(workspaceId: string, event: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'event',
      eventType: 'started',
      workspaceId,
      entityId: event.id,
      userId,
      data: event,
      timestamp: new Date().toISOString(),
    });
  }

  emitEventEnded(workspaceId: string, event: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'event',
      eventType: 'ended',
      workspaceId,
      entityId: event.id,
      userId,
      data: event,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // PROJECT EVENTS
  // ============================================

  emitProjectCreated(workspaceId: string, project: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'project',
      eventType: 'created',
      workspaceId,
      entityId: project.id,
      userId,
      data: project,
      timestamp: new Date().toISOString(),
    });
  }

  emitProjectUpdated(workspaceId: string, project: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'project',
      eventType: 'updated',
      workspaceId,
      entityId: project.id,
      userId,
      data: project,
      previousData,
      timestamp: new Date().toISOString(),
    });
  }

  emitProjectDeleted(workspaceId: string, projectId: string, projectData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'project',
      eventType: 'deleted',
      workspaceId,
      entityId: projectId,
      userId,
      data: projectData,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // FILE EVENTS
  // ============================================

  emitFileCreated(workspaceId: string, file: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'file',
      eventType: 'created',
      workspaceId,
      entityId: file.id,
      userId,
      data: file,
      timestamp: new Date().toISOString(),
    });
  }

  emitFileUpdated(workspaceId: string, file: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'file',
      eventType: 'updated',
      workspaceId,
      entityId: file.id,
      userId,
      data: file,
      previousData,
      timestamp: new Date().toISOString(),
    });
  }

  emitFileDeleted(workspaceId: string, fileId: string, fileData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'file',
      eventType: 'deleted',
      workspaceId,
      entityId: fileId,
      userId,
      data: fileData,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // APPROVAL EVENTS
  // ============================================

  emitApprovalCreated(workspaceId: string, approval: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'approval',
      eventType: 'created',
      workspaceId,
      entityId: approval.id,
      userId,
      data: approval,
      timestamp: new Date().toISOString(),
    });
  }

  emitApprovalApproved(workspaceId: string, approval: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'approval',
      eventType: 'approved',
      workspaceId,
      entityId: approval.id,
      userId,
      data: approval,
      timestamp: new Date().toISOString(),
    });
  }

  emitApprovalRejected(workspaceId: string, approval: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'approval',
      eventType: 'rejected',
      workspaceId,
      entityId: approval.id,
      userId,
      data: approval,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================
  // MESSAGE EVENTS
  // ============================================

  emitMessageCreated(workspaceId: string, message: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'message',
      eventType: 'created',
      workspaceId,
      entityId: message.id,
      userId,
      data: message,
      timestamp: new Date().toISOString(),
    });
  }

  emitMessageUpdated(workspaceId: string, message: any, previousData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'message',
      eventType: 'updated',
      workspaceId,
      entityId: message.id,
      userId,
      data: message,
      previousData,
      timestamp: new Date().toISOString(),
    });
  }

  emitMessageDeleted(workspaceId: string, messageId: string, messageData: any, userId: string) {
    this.eventEmitter.emit('entity.changed', {
      entityType: 'message',
      eventType: 'deleted',
      workspaceId,
      entityId: messageId,
      userId,
      data: messageData,
      timestamp: new Date().toISOString(),
    });
  }
}
