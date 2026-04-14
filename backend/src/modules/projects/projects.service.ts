import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';
import { EntityEventIntegrationService } from '../workflows/entity-event-integration.service';
import {
  CreateProjectDto,
  UpdateProjectDto,
  CreateTaskDto,
  UpdateTaskDto,
  CreateSprintDto,
  CreateTaskCommentDto,
  UpdateTaskCommentDto,
  TaskStatus,
} from './dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly db: DatabaseService,
    private notificationsService: NotificationsService,
    @Optional()
    @Inject(forwardRef(() => EntityEventIntegrationService))
    private entityEventIntegration?: EntityEventIntegrationService,
  ) {}

  // Project operations
  async create(workspaceId: string, createProjectDto: CreateProjectDto, userId: string) {
    console.log('[ProjectsService] create called with DTO:', {
      name: createProjectDto.name,
      lead_id: createProjectDto.lead_id,
      hasLeadId: !!createProjectDto.lead_id,
      collaborative_data: createProjectDto.collaborative_data,
      fullDto: createProjectDto,
    });

    // Only include valid project fields (avoid spreading unknown properties)
    const projectData = {
      name: createProjectDto.name,
      description: createProjectDto.description,
      type: createProjectDto.type,
      status: createProjectDto.status,
      priority: createProjectDto.priority,
      lead_id: createProjectDto.lead_id,
      start_date: createProjectDto.start_date,
      end_date: createProjectDto.end_date,
      estimated_hours: createProjectDto.estimated_hours,
      budget: createProjectDto.budget,
      is_template: createProjectDto.is_template,
      workspace_id: workspaceId,
      owner_id: createProjectDto.owner_id || userId,
      kanban_stages: createProjectDto.kanban_stages
        ? JSON.stringify(createProjectDto.kanban_stages)
        : JSON.stringify([
            { id: 'todo', name: 'To Do', order: 1, color: '#3B82F6' },
            { id: 'in_progress', name: 'In Progress', order: 2, color: '#F59E0B' },
            { id: 'done', name: 'Done', order: 3, color: '#10B981' },
          ]),
      attachments: createProjectDto.attachments
        ? JSON.stringify({
            note_attachment: createProjectDto.attachments.note_attachment || [],
            file_attachment: createProjectDto.attachments.file_attachment || [],
            event_attachment: createProjectDto.attachments.event_attachment || [],
          })
        : JSON.stringify({
            note_attachment: [],
            file_attachment: [],
            event_attachment: [],
          }),
      collaborative_data: createProjectDto.collaborative_data
        ? JSON.stringify(createProjectDto.collaborative_data)
        : JSON.stringify({}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('[ProjectsService] ====== PROJECT DATA DEBUG ======');
    console.log(
      '[ProjectsService] createProjectDto.collaborative_data:',
      createProjectDto.collaborative_data,
    );
    console.log(
      '[ProjectsService] Stringified collaborative_data:',
      projectData.collaborative_data,
    );
    console.log('[ProjectsService] =====================================');

    console.log('[ProjectsService] projectData to insert:', {
      lead_id: projectData.lead_id,
      hasLeadId: !!projectData.lead_id,
      collaborative_data: projectData.collaborative_data,
    });

    const project = await this.db.insert('projects', projectData);

    console.log('[ProjectsService] ====== AFTER INSERT DEBUG ======');
    console.log('[ProjectsService] Project inserted - lead_id:', project.lead_id);
    console.log(
      '[ProjectsService] Project inserted - collaborative_data TYPE:',
      typeof project.collaborative_data,
    );
    console.log(
      '[ProjectsService] Project inserted - collaborative_data VALUE:',
      project.collaborative_data,
    );
    console.log('[ProjectsService] =====================================');

    // Parse collaborative_data to get project members
    const collaborativeData = createProjectDto.collaborative_data || {};
    const projectMembers: string[] =
      collaborativeData.default_assignee_ids || collaborativeData.default_assignees || [];
    const leadId = createProjectDto.lead_id;

    console.log('[ProjectsService] ====== PROJECT MEMBERS SETUP ======');
    console.log('[ProjectsService] Creator ID:', userId);
    console.log('[ProjectsService] Lead ID:', leadId);
    console.log('[ProjectsService] Project Members:', projectMembers);
    console.log('[ProjectsService] =====================================');

    // Collect all unique user IDs to add as project members
    const uniqueMemberIds = new Set<string>();

    // Add creator as admin
    uniqueMemberIds.add(userId);

    // Add project lead (if exists and different from creator)
    if (leadId) {
      uniqueMemberIds.add(leadId);
    }

    // Add all project members
    projectMembers.forEach((memberId) => uniqueMemberIds.add(memberId));

    // Insert all project members into project_members table
    for (const memberId of uniqueMemberIds) {
      const role = memberId === userId ? 'admin' : memberId === leadId ? 'lead' : 'member';

      console.log(`[ProjectsService] Adding project member: ${memberId} with role: ${role}`);

      await this.db.insert('project_members', {
        project_id: project.id,
        user_id: memberId,
        role: role,
        joined_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    console.log('[ProjectsService] ====== PROJECT MEMBERS ADDED ======');
    console.log('[ProjectsService] Total members added:', uniqueMemberIds.size);
    console.log('[ProjectsService] =====================================');

    // Send notifications for project creation
    try {
      console.log('[ProjectsService] ====== NOTIFICATION SECTION START ======');
      console.log('[ProjectsService] project.lead_id:', project.lead_id);
      console.log('[ProjectsService] project.collaborative_data:', project.collaborative_data);
      console.log('[ProjectsService] userId (creator):', userId);
      console.log('[ProjectsService] ===========================================');

      // 1. Notify the project lead (if different from creator)
      const leadId = project.lead_id;
      if (leadId && leadId !== userId) {
        console.log(`[ProjectsService] ====================================`);
        console.log(`[ProjectsService] SENDING PROJECT LEAD NOTIFICATION`);
        console.log(`[ProjectsService] Project: "${project.name}" (${project.id})`);
        console.log(`[ProjectsService] Lead User ID: ${leadId}`);
        console.log(`[ProjectsService] Creator User ID: ${userId}`);
        console.log(`[ProjectsService] Workspace ID: ${workspaceId}`);
        console.log(`[ProjectsService] ====================================`);

        const notificationResult = await this.notificationsService.sendNotification({
          user_id: leadId,
          type: NotificationType.TASKS,
          title: 'New Project Created - You are the Lead',
          message: `You have been assigned as the lead for project "${project.name}"`,
          action_url: `/workspaces/${workspaceId}/projects/${project.id}`,
          priority: 'high' as any,
          send_push: true, // Enable FCM push notification
          data: {
            category: 'tasks',
            entity_type: 'project',
            entity_id: project.id,
            actor_id: userId,
            project_name: project.name,
            project_id: project.id,
            workspace_id: workspaceId,
            role: 'lead',
            action: 'project_lead_assigned',
          },
        });

        console.log(`[ProjectsService] ✅ Notification sent successfully:`, notificationResult);
      }

      console.log('[ProjectsService] ====== CHECKING DEFAULT ASSIGNEES ======');

      // 2. Notify default assignees (from collaborative_data)
      // Parse collaborative_data if it's a string
      let collaborativeData = project.collaborative_data || {};
      console.log('[ProjectsService] Initial collaborativeData:', collaborativeData);
      console.log('[ProjectsService] Type of collaborativeData:', typeof collaborativeData);

      if (typeof collaborativeData === 'string') {
        try {
          collaborativeData = JSON.parse(collaborativeData);
          console.log('[ProjectsService] ✓ Parsed collaborative_data:', collaborativeData);
        } catch (e) {
          console.error('[ProjectsService] ✗ Failed to parse collaborative_data:', e);
          collaborativeData = {};
        }
      } else {
        console.log('[ProjectsService] ✓ collaborativeData is already an object');
      }

      // Support both 'default_assignees' (Flutter) and 'default_assignee_ids' (Web)
      const defaultAssignees =
        collaborativeData.default_assignees || collaborativeData.default_assignee_ids || [];
      console.log('[ProjectsService] Default assignees extracted:', defaultAssignees);
      console.log(
        '[ProjectsService] Checked fields: default_assignees =',
        collaborativeData.default_assignees,
        ', default_assignee_ids =',
        collaborativeData.default_assignee_ids,
      );
      console.log('[ProjectsService] Is array?', Array.isArray(defaultAssignees));
      console.log('[ProjectsService] Length:', defaultAssignees.length);
      console.log('[ProjectsService] ==========================================');

      if (Array.isArray(defaultAssignees) && defaultAssignees.length > 0) {
        console.log(
          '[ProjectsService] Sending notifications to default assignees:',
          defaultAssignees,
        );

        for (const assigneeId of defaultAssignees) {
          // Skip if assignee is the creator or lead (already notified)
          if (assigneeId !== userId && assigneeId !== leadId) {
            console.log(`[ProjectsService] Sending assignee notification to user: ${assigneeId}`);

            await this.notificationsService.sendNotification({
              user_id: assigneeId,
              type: NotificationType.TASKS,
              title: 'Added to New Project',
              message: `You have been added as a default assignee to project "${project.name}"`,
              action_url: `/workspaces/${workspaceId}/projects/${project.id}`,
              priority: 'high' as any,
              send_push: true, // Enable FCM push notification
              data: {
                category: 'tasks',
                entity_type: 'project',
                entity_id: project.id,
                actor_id: userId,
                project_name: project.name,
                project_id: project.id,
                workspace_id: workspaceId,
                role: 'default_assignee',
                action: 'project_assignee_added',
              },
            });

            console.log(`[ProjectsService] Assignee notification sent to user: ${assigneeId}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to send project creation notifications:', error);
      // Don't fail the project creation if notification fails
    }

    // Emit project created event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitProjectCreated(workspaceId, project, userId);
      } catch (error) {
        console.error('[ProjectsService] Failed to emit project created event:', error);
      }
    }

    return project;
  }

  async findAll(workspaceId: string, userId: string, filters?: { status?: string; type?: string }) {
    // Check if user is a member of the workspace
    const workspaceMembershipResult = await this.db
      .table('workspace_members')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .execute();

    const workspaceMembershipData = Array.isArray(workspaceMembershipResult.data)
      ? workspaceMembershipResult.data
      : [];
    if (workspaceMembershipData.length === 0) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    console.log('[ProjectsService] ====== FINDING USER PROJECTS ======');
    console.log('[ProjectsService] Workspace ID:', workspaceId);
    console.log('[ProjectsService] User ID:', userId);
    console.log('[ProjectsService] =====================================');

    // Get all project memberships for this user
    const projectMembershipsResult = await this.db
      .table('project_members')
      .select('*')
      .where('user_id', '=', userId)
      .execute();

    const projectMemberships = Array.isArray(projectMembershipsResult.data)
      ? projectMembershipsResult.data
      : [];
    const userProjectIds = projectMemberships.map((pm) => pm.project_id);

    console.log('[ProjectsService] User is member of projects:', userProjectIds);

    // Get all projects in the workspace
    const allProjectsResult = await this.db.table('projects').select('*').execute();
    const allProjectsData = Array.isArray(allProjectsResult.data) ? allProjectsResult.data : [];

    // Filter projects: must be in workspace, not archived, AND user must be a member
    let projects = allProjectsData.filter(
      (p) => p.workspace_id === workspaceId && !p.archived_at && userProjectIds.includes(p.id),
    );

    console.log('[ProjectsService] Filtered projects count:', projects.length);
    console.log('[ProjectsService] =====================================');

    // Apply filters if provided
    if (filters?.type) {
      projects = projects.filter((p) => p.type === filters.type);
    }

    if (filters?.status) {
      projects = projects.filter((p) => p.status === filters.status);
    }

    // Parse and enrich all projects
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        let parsedAttachments =
          typeof project.attachments === 'string'
            ? JSON.parse(project.attachments)
            : project.attachments;

        const parsedCollaborativeData =
          typeof project.collaborative_data === 'string'
            ? JSON.parse(project.collaborative_data)
            : project.collaborative_data;

        // Fallback: Check collaborative_data.attachments for backward compatibility
        // (old projects may have attachments stored there)
        if (
          (!parsedAttachments || this.isEmptyAttachments(parsedAttachments)) &&
          parsedCollaborativeData?.attachments
        ) {
          parsedAttachments = parsedCollaborativeData.attachments;
        }

        // Enrich attachments with full details
        const enrichedAttachments = await this.enrichAttachments(parsedAttachments, workspaceId);

        // Remove attachments from collaborative_data to avoid duplication
        const cleanedCollaborativeData = { ...parsedCollaborativeData };
        delete cleanedCollaborativeData.attachments;

        return {
          ...project,
          kanban_stages:
            typeof project.kanban_stages === 'string'
              ? JSON.parse(project.kanban_stages)
              : project.kanban_stages,
          attachments: enrichedAttachments,
          collaborative_data: cleanedCollaborativeData,
        };
      }),
    );

    return enrichedProjects;
  }

  /**
   * Check if attachments object is empty (all arrays are empty)
   */
  private isEmptyAttachments(attachments: any): boolean {
    if (!attachments) return true;
    return (
      (!attachments.file_attachment || attachments.file_attachment.length === 0) &&
      (!attachments.note_attachment || attachments.note_attachment.length === 0) &&
      (!attachments.event_attachment || attachments.event_attachment.length === 0)
    );
  }

  async findOne(id: string, userId: string) {
    const project = await this.getProjectWithAccess(id, userId);

    let parsedAttachments =
      typeof project.attachments === 'string'
        ? JSON.parse(project.attachments)
        : project.attachments;

    const parsedCollaborativeData =
      typeof project.collaborative_data === 'string'
        ? JSON.parse(project.collaborative_data)
        : project.collaborative_data;

    // Fallback: Check collaborative_data.attachments for backward compatibility
    if (
      (!parsedAttachments || this.isEmptyAttachments(parsedAttachments)) &&
      parsedCollaborativeData?.attachments
    ) {
      parsedAttachments = parsedCollaborativeData.attachments;
    }

    // Enrich attachments with full details
    const enrichedAttachments = await this.enrichAttachments(
      parsedAttachments,
      project.workspace_id,
    );

    // Remove attachments from collaborative_data to avoid duplication
    const cleanedCollaborativeData = { ...parsedCollaborativeData };
    delete cleanedCollaborativeData.attachments;

    return {
      ...project,
      kanban_stages:
        typeof project.kanban_stages === 'string'
          ? JSON.parse(project.kanban_stages)
          : project.kanban_stages,
      attachments: enrichedAttachments,
      collaborative_data: cleanedCollaborativeData,
    };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, userId: string) {
    const project = await this.getProjectWithAccess(id, userId);

    // Only owner can update project
    if (project.owner_id !== userId) {
      throw new ForbiddenException('Only project owner can edit the project');
    }

    const updateData: any = {
      ...updateProjectDto,
      updated_at: new Date().toISOString(),
    };

    if (updateProjectDto.kanban_stages) {
      updateData.kanban_stages = JSON.stringify(updateProjectDto.kanban_stages);
    }

    if (updateProjectDto.attachments) {
      updateData.attachments = JSON.stringify({
        note_attachment: updateProjectDto.attachments.note_attachment || [],
        file_attachment: updateProjectDto.attachments.file_attachment || [],
        event_attachment: updateProjectDto.attachments.event_attachment || [],
      });
    }

    if (updateProjectDto.collaborative_data) {
      updateData.collaborative_data = JSON.stringify(updateProjectDto.collaborative_data);
    }

    const updatedProject = await this.db.update('projects', id, updateData);

    // Send notifications for project updates
    try {
      const oldLeadId = project.lead_id;
      const newLeadId = updateProjectDto.lead_id;

      // Parse old collaborative_data to get old assignees - support both field names
      const oldCollaborativeData =
        typeof project.collaborative_data === 'string'
          ? JSON.parse(project.collaborative_data)
          : project.collaborative_data || {};
      const oldAssignees: string[] =
        oldCollaborativeData.default_assignees || oldCollaborativeData.default_assignee_ids || [];

      // Get new assignees from update DTO - support both field names
      const newCollaborativeData = updateProjectDto.collaborative_data || {};
      const newAssignees: string[] =
        newCollaborativeData.default_assignees || newCollaborativeData.default_assignee_ids || [];

      // Check if lead_id was updated and is different from old value
      if (newLeadId && newLeadId !== oldLeadId && newLeadId !== userId) {
        console.log(`[ProjectsService] Project lead changed from ${oldLeadId} to ${newLeadId}`);

        await this.notificationsService.sendNotification({
          user_id: newLeadId,
          type: NotificationType.TASKS,
          title: 'You are now Project Lead',
          message: `You have been assigned as the lead for project "${project.name}"`,
          action_url: `/workspaces/${project.workspace_id}/projects/${id}`,
          priority: 'high' as any,
          send_push: true, // Enable FCM push notification
          data: {
            category: 'tasks',
            entity_type: 'project',
            entity_id: id,
            actor_id: userId,
            project_name: project.name,
            project_id: id,
            workspace_id: project.workspace_id,
            role: 'lead',
            action: 'project_lead_assigned',
          },
        });

        console.log(`[ProjectsService] Notification sent to new project lead: ${newLeadId}`);
      }

      // Optionally notify old lead that they were removed
      if (oldLeadId && newLeadId !== oldLeadId && oldLeadId !== userId) {
        await this.notificationsService.sendNotification({
          user_id: oldLeadId,
          type: NotificationType.TASKS,
          title: 'Project Lead Changed',
          message: `You are no longer the lead for project "${project.name}"`,
          action_url: `/workspaces/${project.workspace_id}/projects/${id}`,
          priority: 'normal' as any,
          send_push: true,
          data: {
            category: 'tasks',
            entity_type: 'project',
            entity_id: id,
            actor_id: userId,
            project_name: project.name,
            project_id: id,
            workspace_id: project.workspace_id,
            role: 'lead_removed',
            action: 'project_lead_removed',
          },
        });

        console.log(`[ProjectsService] Notification sent to old project lead: ${oldLeadId}`);
      }

      // Check for new assignees added to collaborative_data
      if (updateProjectDto.collaborative_data?.default_assignees) {
        const addedAssignees = newAssignees.filter((id) => !oldAssignees.includes(id));
        const removedAssignees = oldAssignees.filter((id) => !newAssignees.includes(id));

        // Notify newly added assignees
        for (const assigneeId of addedAssignees) {
          if (assigneeId !== userId) {
            console.log(
              `[ProjectsService] Sending notification to newly added assignee: ${assigneeId}`,
            );

            await this.notificationsService.sendNotification({
              user_id: assigneeId,
              type: NotificationType.TASKS,
              title: 'Added to Project',
              message: `You have been added as an assignee to project "${project.name}"`,
              action_url: `/workspaces/${project.workspace_id}/projects/${id}`,
              priority: 'high' as any,
              send_push: true,
              data: {
                category: 'tasks',
                entity_type: 'project',
                entity_id: id,
                actor_id: userId,
                project_name: project.name,
                project_id: id,
                workspace_id: project.workspace_id,
                role: 'assignee',
                action: 'project_assignee_added',
              },
            });

            console.log(
              `[ProjectsService] Notification sent to newly added assignee: ${assigneeId}`,
            );
          }
        }

        // Optionally notify removed assignees
        for (const assigneeId of removedAssignees) {
          if (assigneeId !== userId) {
            console.log(
              `[ProjectsService] Sending notification to removed assignee: ${assigneeId}`,
            );

            await this.notificationsService.sendNotification({
              user_id: assigneeId,
              type: NotificationType.TASKS,
              title: 'Removed from Project',
              message: `You have been removed from project "${project.name}"`,
              action_url: `/workspaces/${project.workspace_id}/projects`,
              priority: 'normal' as any,
              send_push: true,
              data: {
                category: 'tasks',
                entity_type: 'project',
                entity_id: id,
                actor_id: userId,
                project_name: project.name,
                project_id: id,
                workspace_id: project.workspace_id,
                role: 'assignee_removed',
                action: 'project_assignee_removed',
              },
            });

            console.log(`[ProjectsService] Notification sent to removed assignee: ${assigneeId}`);
          }
        }
      }
    } catch (error) {
      console.error('[ProjectsService] Failed to send project update notifications:', error);
      // Don't fail the update if notification fails
    }

    // Emit project updated event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitProjectUpdated(
          project.workspace_id,
          updatedProject,
          project,
          userId,
        );
      } catch (error) {
        console.error('[ProjectsService] Failed to emit project updated event:', error);
      }
    }

    return updatedProject;
  }

  async remove(id: string, userId: string) {
    const project = await this.getProjectWithAccess(id, userId);

    // Only owner can delete project
    if (project.owner_id !== userId) {
      throw new ForbiddenException('Only project owner can delete the project');
    }

    // Get all tasks for this project
    const tasksResult = await this.db
      .table('tasks')
      .select('*')
      .where('project_id', '=', id)
      .execute();

    const tasks = Array.isArray(tasksResult.data) ? tasksResult.data : [];
    const taskIds = tasks.map((t) => t.id);

    // Delete all task-related data
    if (taskIds.length > 0) {
      // Delete task comments
      const commentsResult = await this.db.table('task_comments').select('*').execute();
      const allComments = Array.isArray(commentsResult.data) ? commentsResult.data : [];
      const taskComments = allComments.filter((c) => taskIds.includes(c.task_id));

      for (const comment of taskComments) {
        await this.db.delete('task_comments', comment.id);
      }

      // Delete task dependencies
      const dependenciesResult = await this.db.table('task_dependencies').select('*').execute();
      const allDependencies = Array.isArray(dependenciesResult.data) ? dependenciesResult.data : [];
      const taskDependencies = allDependencies.filter(
        (d) => taskIds.includes(d.task_id) || taskIds.includes(d.depends_on_task_id),
      );

      for (const dependency of taskDependencies) {
        await this.db.delete('task_dependencies', dependency.id);
      }

      // Delete task assignees if they exist
      try {
        const assigneesResult = await this.db.table('task_assignees').select('*').execute();
        const allAssignees = Array.isArray(assigneesResult.data) ? assigneesResult.data : [];
        const taskAssignees = allAssignees.filter((a) => taskIds.includes(a.task_id));

        for (const assignee of taskAssignees) {
          await this.db.delete('task_assignees', assignee.id);
        }
      } catch (error) {
        // task_assignees table might not exist, skip
      }

      // Delete all tasks
      for (const task of tasks) {
        await this.db.delete('tasks', task.id);
      }
    }

    // Delete project members
    const membersResult = await this.db
      .table('project_members')
      .select('*')
      .where('project_id', '=', id)
      .execute();

    const members = Array.isArray(membersResult.data) ? membersResult.data : [];
    for (const member of members) {
      await this.db.delete('project_members', member.id);
    }

    // Delete the project (hard delete)
    const result = await this.db.delete('projects', id);

    // Emit project deleted event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitProjectDeleted(project.workspace_id, id, project, userId);
      } catch (error) {
        console.error('[ProjectsService] Failed to emit project deleted event:', error);
      }
    }

    return result;
  }

  // Task operations
  async createTask(projectId: string, createTaskDto: CreateTaskDto, userId: string) {
    const project = await this.getProjectWithAccess(projectId, userId);

    const taskData = {
      ...createTaskDto,
      project_id: projectId,
      assigned_to: createTaskDto.assigned_to ? JSON.stringify(createTaskDto.assigned_to) : null,
      labels: JSON.stringify(createTaskDto.labels || []),
      attachments: createTaskDto.attachments
        ? JSON.stringify({
            note_attachment: createTaskDto.attachments.note_attachment || [],
            file_attachment: createTaskDto.attachments.file_attachment || [],
            event_attachment: createTaskDto.attachments.event_attachment || [],
          })
        : JSON.stringify({
            note_attachment: [],
            file_attachment: [],
            event_attachment: [],
          }),
      // Per-task custom fields (array of { id, name, fieldType, value, options? })
      custom_fields: JSON.stringify(createTaskDto.custom_fields || []),
      collaborative_data: JSON.stringify({}),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const task = await this.db.insert('tasks', taskData);

    // Emit task created event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitTaskCreated(project.workspace_id, task, userId);
      } catch (error) {
        console.error('[ProjectsService] Failed to emit task created event:', error);
      }
    }

    // Send notification to assignees if task is assigned
    const assignees: string[] = createTaskDto.assigned_to || [];
    for (const assigneeId of assignees) {
      if (assigneeId !== userId) {
        try {
          await this.notificationsService.sendNotification({
            user_id: assigneeId,
            type: NotificationType.TASKS,
            title: 'New Task Assigned',
            message: `You've been assigned to task "${task.title}"`,
            action_url: `/workspaces/${project.workspace_id}/projects/${projectId}`,
            priority: (task.priority === 'high' || task.priority === 'urgent'
              ? 'high'
              : 'normal') as any,
            send_push: true, // Enable FCM push notification for mobile users
            data: {
              category: 'tasks',
              entity_type: 'task',
              entity_id: task.id,
              actor_id: userId,
              workspace_id: project.workspace_id,
              task_title: task.title,
              task_id: task.id,
              project_id: projectId,
              project_name: project.name,
              due_date: task.due_date,
              priority: task.priority,
            },
          });
        } catch (error) {
          console.error('Failed to send task assignment notification:', error);
          // Don't fail task creation if notification fails
        }
      }
    }

    return task;
  }

  async getTasks(projectId: string, userId: string, sprintId?: string, status?: string) {
    await this.getProjectWithAccess(projectId, userId);

    const allTasksResult = await this.db.table('tasks').select('*').execute();
    const allTasksData = Array.isArray(allTasksResult.data) ? allTasksResult.data : [];
    let tasks = allTasksData.filter((t) => t.project_id === projectId);

    if (sprintId) {
      tasks = tasks.filter((t) => t.sprint_id === sprintId);
    }

    if (status) {
      tasks = tasks.filter((t) => t.status === status);
    }

    // Map tasks and fetch user details for updated_by, created_by, and assignees
    return await Promise.all(
      tasks.map(async (task) => {
        const parsedAssignedTo =
          typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;

        // Get updated_by user details if available
        let updatedByUser = null;
        if (task.updated_by) {
          try {
            const userProfile = await this.db.getUserById(task.updated_by);
            if (userProfile) {
              const metadata = userProfile.metadata || {};
              updatedByUser = {
                id: userProfile.id,
                name:
                  metadata.name ||
                  (userProfile as any).fullName ||
                  userProfile.name ||
                  userProfile.username ||
                  userProfile.email ||
                  'Unknown User',
                email: userProfile.email,
                avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch updated_by user details for ${task.updated_by}:`, error);
          }
        }

        // Get created_by user details if available
        let createdByUser = null;
        if (task.created_by) {
          try {
            const userProfile = await this.db.getUserById(task.created_by);
            if (userProfile) {
              const metadata = userProfile.metadata || {};
              createdByUser = {
                id: userProfile.id,
                name:
                  metadata.name ||
                  (userProfile as any).fullName ||
                  userProfile.name ||
                  userProfile.username ||
                  userProfile.email ||
                  'Unknown User',
                email: userProfile.email,
                avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch created_by user details for ${task.created_by}:`, error);
          }
        }

        // Get assignee details
        let assigneesWithDetails = [];
        if (Array.isArray(parsedAssignedTo) && parsedAssignedTo.length > 0) {
          assigneesWithDetails = await Promise.all(
            parsedAssignedTo.map(async (assigneeId) => {
              try {
                const userProfile = await this.db.getUserById(assigneeId);
                if (userProfile) {
                  const metadata = userProfile.metadata || {};
                  return {
                    id: userProfile.id,
                    name:
                      metadata.name ||
                      (userProfile as any).fullName ||
                      userProfile.name ||
                      userProfile.username ||
                      userProfile.email ||
                      'Unknown User',
                    email: userProfile.email,
                    avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
                  };
                }
                return null;
              } catch (error) {
                console.error(`Failed to fetch assignee details for ${assigneeId}:`, error);
                return null;
              }
            }),
          );
          // Filter out null values
          assigneesWithDetails = assigneesWithDetails.filter((a) => a !== null);
        }

        return {
          ...task,
          labels: typeof task.labels === 'string' ? JSON.parse(task.labels) : task.labels,
          attachments:
            typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments,
          collaborative_data:
            typeof task.collaborative_data === 'string'
              ? JSON.parse(task.collaborative_data)
              : task.collaborative_data,
          // Per-task custom fields (array of { id, name, fieldType, value, options? })
          custom_fields:
            typeof task.custom_fields === 'string'
              ? JSON.parse(task.custom_fields)
              : task.custom_fields || [],
          assigned_to: parsedAssignedTo,
          assignees: assigneesWithDetails || [], // Return assignee details instead of just IDs
          updated_by_user: updatedByUser,
          created_by_user: createdByUser,
        };
      }),
    );
  }

  /**
   * Get all tasks across all projects in a workspace
   */
  async getAllWorkspaceTasks(
    workspaceId: string,
    userId: string,
    options?: { search?: string; status?: string; limit?: number },
  ) {
    // First get all projects the user has access to in this workspace
    const projects = await this.findAll(workspaceId, userId);
    if (!projects || projects.length === 0) {
      return [];
    }

    const projectIds = projects.map((p: any) => p.id);

    // Query all tasks from these projects
    const tasksResult = await this.db.table('tasks').select('*').execute();

    const allTasksData = Array.isArray(tasksResult.data) ? tasksResult.data : [];

    // Filter tasks by project IDs
    let tasks = allTasksData.filter((t: any) => projectIds.includes(t.project_id));

    // Apply search filter
    if (options?.search) {
      const searchLower = options.search.toLowerCase();
      tasks = tasks.filter(
        (t: any) =>
          t.title?.toLowerCase().includes(searchLower) ||
          t.description?.toLowerCase().includes(searchLower),
      );
    }

    // Apply status filter
    if (options?.status) {
      tasks = tasks.filter((t: any) => t.status === options.status);
    }

    // Sort by updated_at descending
    tasks.sort(
      (a: any, b: any) =>
        new Date(b.updated_at || b.created_at).getTime() -
        new Date(a.updated_at || a.created_at).getTime(),
    );

    // Apply limit
    if (options?.limit) {
      tasks = tasks.slice(0, options.limit);
    }

    // Map to response format
    return tasks.map((task: any) => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      projectId: task.project_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }));
  }

  async getTask(taskId: string, userId: string) {
    const taskQueryResult = await this.db
      .table('tasks')
      .select('*')
      .where('id', '=', taskId)
      .limit(1)
      .execute();

    const taskData = Array.isArray(taskQueryResult.data) ? taskQueryResult.data : [];
    if (taskData.length === 0) {
      throw new NotFoundException('Task not found');
    }

    const task = taskData[0];
    await this.getProjectWithAccess(task.project_id, userId);

    // Get updated_by user details if available
    let updatedByUser = null;
    if (task.updated_by) {
      try {
        const userProfile = await this.db.getUserById(task.updated_by);
        if (userProfile) {
          const metadata = userProfile.metadata || {};
          updatedByUser = {
            id: userProfile.id,
            name:
              metadata.name ||
              (userProfile as any).fullName ||
              userProfile.name ||
              userProfile.username ||
              userProfile.email ||
              'Unknown User',
            email: userProfile.email,
            avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
          };
        }
      } catch (error) {
        console.error(`Failed to fetch updated_by user details for ${task.updated_by}:`, error);
      }
    }

    // Get created_by user details if available
    let createdByUser = null;
    if (task.created_by) {
      try {
        const userProfile = await this.db.getUserById(task.created_by);
        if (userProfile) {
          const metadata = userProfile.metadata || {};
          createdByUser = {
            id: userProfile.id,
            name:
              metadata.name ||
              (userProfile as any).fullName ||
              userProfile.name ||
              userProfile.username ||
              userProfile.email ||
              'Unknown User',
            email: userProfile.email,
            avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
          };
        }
      } catch (error) {
        console.error(`Failed to fetch created_by user details for ${task.created_by}:`, error);
      }
    }

    const parsedAssignedTo =
      typeof task.assigned_to === 'string' ? JSON.parse(task.assigned_to) : task.assigned_to;
    return {
      ...task,
      labels: typeof task.labels === 'string' ? JSON.parse(task.labels) : task.labels,
      attachments:
        typeof task.attachments === 'string' ? JSON.parse(task.attachments) : task.attachments,
      collaborative_data:
        typeof task.collaborative_data === 'string'
          ? JSON.parse(task.collaborative_data)
          : task.collaborative_data,
      // Per-task custom fields (array of { id, name, fieldType, value, options? })
      custom_fields:
        typeof task.custom_fields === 'string'
          ? JSON.parse(task.custom_fields)
          : task.custom_fields || [],
      assigned_to: parsedAssignedTo,
      assignees: parsedAssignedTo || [], // Alias for frontend compatibility
      updated_by_user: updatedByUser,
      created_by_user: createdByUser,
    };
  }

  async updateTask(taskId: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.getTask(taskId, userId);

    // Get project to check kanban stages
    const project = await this.getProjectWithAccess(task.project_id, userId);
    const kanbanStages =
      typeof project.kanban_stages === 'string'
        ? JSON.parse(project.kanban_stages)
        : project.kanban_stages;

    // Find the last stage (completed stage) - the one with highest order
    const lastStage =
      kanbanStages && kanbanStages.length > 0
        ? kanbanStages.reduce(
            (max: any, stage: any) => (stage.order > max.order ? stage : max),
            kanbanStages[0],
          )
        : null;
    const completedStageId = lastStage?.id || 'done'; // fallback to 'done' if no stages defined

    const updateData = {
      ...updateTaskDto,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    };

    // Handle assigned_to as an array - store as JSON string in database
    if ('assigned_to' in updateTaskDto) {
      (updateData as any).assigned_to = updateTaskDto.assigned_to
        ? JSON.stringify(updateTaskDto.assigned_to)
        : null;
    }

    // If marking as completed (moving to last stage), set completion data
    const isBeingCompleted =
      updateTaskDto.status === completedStageId && task.status !== completedStageId;
    if (isBeingCompleted) {
      (updateData as any).completed_at = new Date().toISOString();
      (updateData as any).completed_by = updateTaskDto.completed_by || userId;
    }

    // If changing from completed to another status, clear completion data
    if (
      updateTaskDto.status &&
      updateTaskDto.status !== completedStageId &&
      task.status === completedStageId
    ) {
      (updateData as any).completed_at = null;
      (updateData as any).completed_by = null;
    }

    if (updateTaskDto.labels) {
      (updateData as any).labels = JSON.stringify(updateTaskDto.labels);
    }

    if (updateTaskDto.attachments) {
      (updateData as any).attachments = JSON.stringify({
        note_attachment: updateTaskDto.attachments.note_attachment || [],
        file_attachment: updateTaskDto.attachments.file_attachment || [],
        event_attachment: updateTaskDto.attachments.event_attachment || [],
      });
    }

    // Handle per-task custom fields (array of { id, name, fieldType, value, options? })
    if ('custom_fields' in updateTaskDto) {
      (updateData as any).custom_fields = JSON.stringify(updateTaskDto.custom_fields || []);
    }

    const updatedTask = await this.db.update('tasks', taskId, updateData);

    // Emit task updated event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitTaskUpdated(
          project.workspace_id,
          updatedTask,
          task,
          userId,
        );
      } catch (error) {
        console.error('[ProjectsService] Failed to emit task updated event:', error);
      }
    }

    // Send notifications for important changes
    try {
      // Parse current assignees from database (stored as JSON string)
      const currentAssignees: string[] = task.assigned_to
        ? typeof task.assigned_to === 'string'
          ? JSON.parse(task.assigned_to)
          : task.assigned_to
        : [];

      // Notify if assignees changed
      if ('assigned_to' in updateTaskDto) {
        const newAssignees: string[] = updateTaskDto.assigned_to || [];

        // Find newly added assignees
        const addedAssignees = newAssignees.filter((id) => !currentAssignees.includes(id));

        // Find removed assignees
        const removedAssignees = currentAssignees.filter((id) => !newAssignees.includes(id));

        // Notify newly added assignees (excluding the current user)
        for (const assigneeId of addedAssignees) {
          if (assigneeId !== userId) {
            await this.notificationsService.sendNotification({
              user_id: assigneeId,
              type: NotificationType.TASKS,
              title: 'Task Assigned to You',
              message: `Task "${task.title}" has been assigned to you`,
              action_url: `/workspaces/${project.workspace_id}/projects/${task.project_id}`,
              priority: 'high' as any,
              send_push: true, // Enable FCM push notification for mobile users
              data: {
                category: 'tasks',
                entity_type: 'task',
                entity_id: taskId,
                actor_id: userId,
                workspace_id: project.workspace_id,
                task_title: task.title,
                previous_assignees: currentAssignees,
                new_assignees: newAssignees,
                project_name: project.name,
              },
            });
          }
        }

        // Notify removed assignees (excluding the current user)
        for (const assigneeId of removedAssignees) {
          if (assigneeId !== userId) {
            await this.notificationsService.sendNotification({
              user_id: assigneeId,
              type: NotificationType.TASKS,
              title: 'Task Unassigned',
              message: `Task "${task.title}" has been unassigned from you`,
              action_url: `/workspaces/${project.workspace_id}/projects/${task.project_id}`,
              priority: 'normal' as any,
              send_push: true, // Enable FCM push notification for mobile users
              data: {
                category: 'tasks',
                entity_type: 'task',
                entity_id: taskId,
                actor_id: userId,
                workspace_id: project.workspace_id,
                task_title: task.title,
                previous_assignees: currentAssignees,
                new_assignees: newAssignees,
                project_name: project.name,
              },
            });
          }
        }
      }

      // Notify task creator/reporter if task is completed
      if (
        isBeingCompleted &&
        task.reporter_team_member_id &&
        task.reporter_team_member_id !== userId
      ) {
        await this.notificationsService.sendNotification({
          user_id: task.reporter_team_member_id,
          type: NotificationType.TASKS,
          title: 'Task Completed',
          message: `Task "${task.title}" has been marked as completed`,
          action_url: `/workspaces/${project.workspace_id}/projects/${task.project_id}`,
          priority: 'normal' as any,
          send_push: true, // Enable FCM push notification for mobile users
          data: {
            category: 'tasks',
            entity_type: 'task',
            entity_id: taskId,
            actor_id: userId,
            workspace_id: project.workspace_id,
            task_title: task.title,
            completed_by: userId,
            project_name: project.name,
          },
        });
      }
      console.log('isbeingcompleted', isBeingCompleted, project.lead_id);
      // Notify project lead if task is moved to final stage
      if (isBeingCompleted && project.lead_id && project.lead_id !== userId) {
        console.log('sending notification of task completion to ', project.lead_id);
        await this.notificationsService.sendNotification({
          user_id: project.lead_id,
          type: NotificationType.TASKS,
          title: 'Task Completed in Your Project',
          message: `Task "${task.title}" has been completed in project "${project.name}"`,
          action_url: `/workspaces/${project.workspace_id}/projects/${task.project_id}`,
          priority: 'normal' as any,
          send_push: true, // Enable FCM push notification for mobile users
          data: {
            category: 'tasks',
            entity_type: 'task',
            entity_id: taskId,
            actor_id: userId,
            workspace_id: project.workspace_id,
            task_title: task.title,
            completed_by: userId,
            project_id: task.project_id,
            project_name: project.name,
            project_lead: true,
          },
        });
      }
    } catch (error) {
      console.error('Failed to send task update notification:', error);
      // Don't fail task update if notification fails
    }

    return updatedTask;
  }

  async deleteTask(taskId: string, userId: string) {
    const task = await this.getTask(taskId, userId);
    const project = await this.getProjectWithAccess(task.project_id, userId);

    const result = await this.db.delete('tasks', taskId);

    // Emit task deleted event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitTaskDeleted(project.workspace_id, taskId, task, userId);
      } catch (error) {
        console.error('[ProjectsService] Failed to emit task deleted event:', error);
      }
    }

    return result;
  }

  async moveTask(taskId: string, newStatus: string, userId: string) {
    return await this.updateTask(taskId, { status: newStatus }, userId);
  }

  // Task assignment operations
  async assignTask(taskId: string, assigneeId: string, userId: string) {
    await this.getTask(taskId, userId);

    // Remove existing assignees
    const existingAssigneesResult = await this.db
      .table('task_assignees')
      .select('*')
      .where('task_id', '=', taskId)
      .execute();

    const existingAssignees = Array.isArray(existingAssigneesResult.data)
      ? existingAssigneesResult.data
      : [];
    for (const assignee of existingAssignees) {
      await this.db.delete('task_assignees', assignee.id);
    }

    // Add new assignee
    await this.db.insert('task_assignees', {
      task_id: taskId,
      user_id: assigneeId,
      assigned_at: new Date().toISOString(),
      assigned_by: userId,
    });

    // Update task assigned_to (as array)
    return await this.updateTask(taskId, { assigned_to: [assigneeId] }, userId);
  }

  // Task comments
  async getTaskComments(taskId: string, userId: string) {
    await this.getTask(taskId, userId);

    const commentsQueryResult = await this.db
      .table('task_comments')
      .select('*')
      .where('task_id', '=', taskId)
      .where('is_deleted', '=', false)
      .execute();

    const commentsData = Array.isArray(commentsQueryResult.data) ? commentsQueryResult.data : [];
    return commentsData.map((comment) => ({
      ...comment,
      attachments:
        typeof comment.attachments === 'string'
          ? JSON.parse(comment.attachments)
          : comment.attachments,
    }));
  }

  async createTaskComment(
    taskId: string,
    createTaskCommentDto: CreateTaskCommentDto,
    userId: string,
  ) {
    await this.getTask(taskId, userId);

    const commentData = {
      task_id: taskId,
      user_id: userId,
      content: createTaskCommentDto.content,
      content_html: createTaskCommentDto.content_html,
      attachments: JSON.stringify(createTaskCommentDto.attachments || []),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await this.db.insert('task_comments', commentData);
  }

  async updateTaskComment(
    commentId: string,
    updateTaskCommentDto: UpdateTaskCommentDto,
    userId: string,
  ) {
    const commentQueryResult = await this.db
      .table('task_comments')
      .select('*')
      .where('id', '=', commentId)
      .limit(1)
      .execute();

    const commentData = Array.isArray(commentQueryResult.data) ? commentQueryResult.data : [];
    if (commentData.length === 0) {
      throw new NotFoundException('Comment not found');
    }

    const comment = commentData[0];

    // Only comment author can update
    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updateData = {
      content: updateTaskCommentDto.content,
      content_html: updateTaskCommentDto.content_html,
      is_edited: true,
      updated_at: new Date().toISOString(),
    };

    return await this.db.update('task_comments', commentId, updateData);
  }

  async deleteTaskComment(commentId: string, userId: string) {
    const commentQueryResult = await this.db
      .table('task_comments')
      .select('*')
      .where('id', '=', commentId)
      .limit(1)
      .execute();

    const commentData = Array.isArray(commentQueryResult.data) ? commentQueryResult.data : [];
    if (commentData.length === 0) {
      throw new NotFoundException('Comment not found');
    }

    const comment = commentData[0];

    // Only comment author can delete
    if (comment.user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return await this.db.update('task_comments', commentId, {
      is_deleted: true,
      updated_at: new Date().toISOString(),
    });
  }

  // Sprint operations
  async createSprint(projectId: string, createSprintDto: CreateSprintDto, userId: string) {
    await this.getProjectWithAccess(projectId, userId);

    const sprintData = {
      ...createSprintDto,
      project_id: projectId,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return await this.db.insert('sprints', sprintData);
  }

  async getSprints(projectId: string, userId: string) {
    await this.getProjectWithAccess(projectId, userId);

    const sprintsQueryResult = await this.db
      .table('sprints')
      .select('*')
      .where('project_id', '=', projectId)
      .execute();

    return sprintsQueryResult;
  }

  // Kanban board operations
  async getKanbanBoard(projectId: string, userId: string) {
    const project = await this.findOne(projectId, userId);
    const tasks = await this.getTasks(projectId, userId);

    const kanbanStages = project.kanban_stages || [];

    // Group tasks by status
    const tasksByStatus = tasks.reduce((acc, task) => {
      if (!acc[task.status]) {
        acc[task.status] = [];
      }
      acc[task.status].push(task);
      return acc;
    }, {});

    // Create board structure
    const board = kanbanStages.map((stage) => ({
      ...stage,
      tasks: tasksByStatus[stage.id] || [],
    }));

    return {
      project,
      stages: board,
      totalTasks: tasks.length,
    };
  }

  // Helper methods
  private async getProjectWithAccess(projectId: string, userId: string) {
    const projectQueryResult = await this.db
      .table('projects')
      .select('*')
      .where('id', '=', projectId)
      .limit(1)
      .execute();

    const projectData = Array.isArray(projectQueryResult.data) ? projectQueryResult.data : [];
    if (projectData.length === 0) {
      throw new NotFoundException('Project not found');
    }

    const project = projectData[0];

    // Check if user is a member of the workspace
    const workspaceMembershipResult = await this.db
      .table('workspace_members')
      .select('*')
      .where('workspace_id', '=', project.workspace_id)
      .where('user_id', '=', userId)
      .execute();

    const workspaceMembershipData = Array.isArray(workspaceMembershipResult.data)
      ? workspaceMembershipResult.data
      : [];
    if (workspaceMembershipData.length === 0) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    // All workspace members can access all projects
    // Individual operations (edit/delete) will check for ownership
    return project;
  }

  async addProjectMember(projectId: string, memberId: string, userId: string) {
    const project = await this.getProjectWithAccess(projectId, userId);

    // Check if already a member
    const existingMemberResult = await this.db
      .table('project_members')
      .select('*')
      .where('project_id', '=', projectId)
      .where('user_id', '=', memberId)
      .execute();

    const existingMemberData = Array.isArray(existingMemberResult.data)
      ? existingMemberResult.data
      : [];
    if (existingMemberData.length > 0) {
      throw new BadRequestException('User is already a project member');
    }

    const member = await this.db.insert('project_members', {
      project_id: projectId,
      user_id: memberId,
      role: 'member',
      joined_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Send notification to the new member
    try {
      console.log(
        `[ProjectsService] Sending project member addition notification to user: ${memberId}`,
      );

      await this.notificationsService.sendNotification({
        user_id: memberId,
        type: NotificationType.TASKS,
        title: 'Added to Project',
        message: `You've been added to project "${project.name}"`,
        action_url: `/workspaces/${project.workspace_id}/projects/${projectId}`,
        priority: 'high' as any,
        send_push: true, // Enable FCM push notification
        data: {
          category: 'tasks',
          entity_type: 'project',
          entity_id: projectId,
          actor_id: userId,
          workspace_id: project.workspace_id,
          project_name: project.name,
          project_id: projectId,
          role: 'member',
          added_by: userId,
          action: 'project_member_added',
        },
      });

      console.log(
        `[ProjectsService] Project member addition notification sent to user: ${memberId}`,
      );
    } catch (error) {
      console.error('Failed to send project member addition notification:', error);
      // Don't fail the member addition if notification fails
    }

    return member;
  }

  async removeProjectMember(projectId: string, memberId: string, userId: string) {
    const project = await this.getProjectWithAccess(projectId, userId);

    // Cannot remove project owner
    if (project.owner_id === memberId) {
      throw new BadRequestException('Cannot remove project owner');
    }

    const memberQueryResult = await this.db
      .table('project_members')
      .select('*')
      .where('project_id', '=', projectId)
      .where('user_id', '=', memberId)
      .execute();

    const memberData = Array.isArray(memberQueryResult.data) ? memberQueryResult.data : [];
    if (memberData.length === 0) {
      throw new NotFoundException('Member not found');
    }

    return await this.db.delete('project_members', memberData[0].id);
  }

  async getProjectMembers(projectId: string, userId: string) {
    // First check if the project exists and user has access to the workspace
    const project = await this.getProjectWithAccess(projectId, userId);

    console.log('[ProjectsService] ====== GET PROJECT MEMBERS ======');
    console.log('[ProjectsService] Project ID:', projectId);
    console.log('[ProjectsService] User ID:', userId);
    console.log('[ProjectsService] =====================================');

    // Get all members for this project
    const membersResult = await this.db
      .table('project_members')
      .select('*')
      .where('project_id', '=', projectId)
      .execute();

    const members = Array.isArray(membersResult.data) ? membersResult.data : [];

    console.log('[ProjectsService] Found members:', members.length);
    console.log(
      '[ProjectsService] Members:',
      members.map((m) => ({ user_id: m.user_id, role: m.role })),
    );
    console.log('[ProjectsService] =====================================');

    // Get user details for each member using DatabaseService getUserById
    const membersWithDetails = await Promise.all(
      members.map(async (member) => {
        try {
          const userProfile = await this.db.getUserById(member.user_id);

          if (!userProfile) {
            return {
              id: member.id,
              project_id: member.project_id,
              user_id: member.user_id,
              role: member.role,
              joined_at: member.joined_at,
              user: null,
            };
          }

          // Extract metadata for additional profile fields
          const metadata = userProfile.metadata || {};

          return {
            id: member.id,
            project_id: member.project_id,
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            user: {
              id: userProfile.id,
              name:
                metadata.name ||
                (userProfile as any).fullName ||
                userProfile.name ||
                userProfile.username ||
                userProfile.email ||
                'Unknown User',
              email: userProfile.email,
              avatar_url: metadata.avatarUrl || userProfile.avatar_url || null,
            },
          };
        } catch (error) {
          console.error(`Failed to fetch user details for ${member.user_id}:`, error);
          return {
            id: member.id,
            project_id: member.project_id,
            user_id: member.user_id,
            role: member.role,
            joined_at: member.joined_at,
            user: null,
          };
        }
      }),
    );

    return membersWithDetails;
  }

  /**
   * Enrich attachments with their full details (titles, names, URLs)
   */
  private async enrichAttachments(attachments: any, workspaceId: string): Promise<any> {
    if (!attachments) {
      return {
        file_attachment: [],
        note_attachment: [],
        event_attachment: [],
      };
    }

    const enriched: any = {
      file_attachment: [],
      note_attachment: [],
      event_attachment: [],
    };

    // Enrich file attachments
    if (attachments.file_attachment && Array.isArray(attachments.file_attachment)) {
      for (const fileId of attachments.file_attachment) {
        try {
          const fileQuery = await this.db
            .table('files')
            .select('id, name, mime_type, size, url')
            .where('id', '=', fileId)
            .limit(1)
            .execute();

          const fileData = Array.isArray(fileQuery.data) ? fileQuery.data[0] : null;
          if (fileData) {
            enriched.file_attachment.push({
              id: fileData.id,
              name: fileData.name || 'Unknown file',
              type: fileData.mime_type,
              size: fileData.size,
              url: fileData.url,
            });
          } else {
            console.warn(`[ProjectsService] File attachment not found: ${fileId}`);
            enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
          }
        } catch (error) {
          console.warn(
            `[ProjectsService] Could not fetch file attachment ${fileId}:`,
            error.message,
          );
          enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
        }
      }
    }

    // Enrich note attachments (linked notes)
    if (attachments.note_attachment && Array.isArray(attachments.note_attachment)) {
      for (const linkedNoteId of attachments.note_attachment) {
        try {
          const noteQuery = await this.db
            .table('notes')
            .select('id, title, icon, updated_at')
            .where('id', '=', linkedNoteId)
            .where('workspace_id', '=', workspaceId)
            .where('deleted_at', 'is', null)
            .limit(1)
            .execute();

          const noteData = Array.isArray(noteQuery.data) ? noteQuery.data[0] : null;
          if (noteData) {
            enriched.note_attachment.push({
              id: noteData.id,
              title: noteData.title || 'Untitled Note',
              icon: noteData.icon || '📝',
              updated_at: noteData.updated_at,
            });
          } else {
            console.warn(`[ProjectsService] Note attachment not found: ${linkedNoteId}`);
            enriched.note_attachment.push({ id: linkedNoteId, title: 'Unknown note', icon: '📝' });
          }
        } catch (error) {
          console.warn(
            `[ProjectsService] Could not fetch note attachment ${linkedNoteId}:`,
            error.message,
          );
          enriched.note_attachment.push({ id: linkedNoteId, title: 'Unknown note', icon: '📝' });
        }
      }
    }

    // Enrich event attachments (linked calendar events)
    if (attachments.event_attachment && Array.isArray(attachments.event_attachment)) {
      for (const eventId of attachments.event_attachment) {
        try {
          const eventQuery = await this.db
            .table('calendar_events')
            .select('id, title, start_time, end_time, location')
            .where('id', '=', eventId)
            .where('workspace_id', '=', workspaceId)
            .limit(1)
            .execute();

          const eventData = Array.isArray(eventQuery.data) ? eventQuery.data[0] : null;
          if (eventData) {
            enriched.event_attachment.push({
              id: eventData.id,
              title: eventData.title || 'Untitled Event',
              start_time: eventData.start_time,
              end_time: eventData.end_time,
              location: eventData.location,
            });
          } else {
            console.warn(`[ProjectsService] Event attachment not found: ${eventId}`);
            enriched.event_attachment.push({ id: eventId, title: 'Unknown event' });
          }
        } catch (error) {
          console.warn(
            `[ProjectsService] Could not fetch event attachment ${eventId}:`,
            error.message,
          );
          enriched.event_attachment.push({ id: eventId, title: 'Unknown event' });
        }
      }
    }

    return enriched;
  }

  // ==================== CUSTOM FIELD OPERATIONS ====================

  /**
   * Get all custom field definitions for a project
   */
  async getCustomFields(projectId: string, userId: string) {
    // Verify project access
    await this.getProjectWithAccess(projectId, userId);

    const result = await this.db
      .table('task_custom_field_definitions')
      .select('*')
      .where('project_id', '=', projectId)
      .orderBy('sort_order', 'asc')
      .execute();

    const fields = Array.isArray(result.data) ? result.data : [];

    // Transform to camelCase and parse JSON fields
    return fields.map((field) => ({
      id: field.id,
      projectId: field.project_id,
      name: field.name,
      fieldType: field.field_type,
      description: field.description,
      options: typeof field.options === 'string' ? JSON.parse(field.options) : field.options || [],
      defaultValue:
        typeof field.default_value === 'string'
          ? JSON.parse(field.default_value)
          : field.default_value,
      isRequired: field.is_required,
      isVisible: field.is_visible,
      sortOrder: field.sort_order,
      settings:
        typeof field.settings === 'string' ? JSON.parse(field.settings) : field.settings || {},
      createdBy: field.created_by,
      createdAt: field.created_at,
      updatedAt: field.updated_at,
    }));
  }

  /**
   * Create a new custom field definition for a project
   */
  async createCustomField(projectId: string, createDto: any, userId: string) {
    // Verify project access
    await this.getProjectWithAccess(projectId, userId);

    // Get the highest sort_order for the project
    const existingFieldsResult = await this.db
      .table('task_custom_field_definitions')
      .select('sort_order')
      .where('project_id', '=', projectId)
      .orderBy('sort_order', 'desc')
      .limit(1)
      .execute();

    const existingFields = Array.isArray(existingFieldsResult.data)
      ? existingFieldsResult.data
      : [];
    const nextSortOrder = existingFields.length > 0 ? existingFields[0].sort_order + 1 : 0;

    // Generate IDs for select options if they don't have them
    let options = createDto.options || [];
    if (options.length > 0) {
      options = options.map((opt: any, index: number) => ({
        id: opt.id || `option-${Date.now()}-${index}`,
        label: opt.label,
        color: opt.color || this.getDefaultOptionColor(index),
      }));
    }

    const fieldData = {
      project_id: projectId,
      name: createDto.name,
      field_type: createDto.fieldType,
      description: createDto.description || null,
      options: JSON.stringify(options),
      default_value: createDto.defaultValue ? JSON.stringify(createDto.defaultValue) : null,
      is_required: createDto.isRequired ?? false,
      is_visible: createDto.isVisible ?? true,
      sort_order: createDto.sortOrder ?? nextSortOrder,
      settings: JSON.stringify(createDto.settings || {}),
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const field = await this.db.insert('task_custom_field_definitions', fieldData);

    return {
      id: field.id,
      projectId: field.project_id,
      name: field.name,
      fieldType: field.field_type,
      description: field.description,
      options: typeof field.options === 'string' ? JSON.parse(field.options) : field.options,
      defaultValue: field.default_value
        ? typeof field.default_value === 'string'
          ? JSON.parse(field.default_value)
          : field.default_value
        : null,
      isRequired: field.is_required,
      isVisible: field.is_visible,
      sortOrder: field.sort_order,
      settings: typeof field.settings === 'string' ? JSON.parse(field.settings) : field.settings,
      createdBy: field.created_by,
      createdAt: field.created_at,
      updatedAt: field.updated_at,
    };
  }

  /**
   * Update a custom field definition
   */
  async updateCustomField(fieldId: string, updateDto: any, userId: string) {
    // Get the field first
    const fieldResult = await this.db
      .table('task_custom_field_definitions')
      .select('*')
      .where('id', '=', fieldId)
      .limit(1)
      .execute();

    const fieldData = Array.isArray(fieldResult.data) ? fieldResult.data : [];
    if (fieldData.length === 0) {
      throw new NotFoundException('Custom field not found');
    }

    const existingField = fieldData[0];

    // Verify project access
    await this.getProjectWithAccess(existingField.project_id, userId);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updateDto.name !== undefined) updateData.name = updateDto.name;
    if (updateDto.description !== undefined) updateData.description = updateDto.description;
    if (updateDto.options !== undefined) updateData.options = JSON.stringify(updateDto.options);
    if (updateDto.defaultValue !== undefined)
      updateData.default_value = JSON.stringify(updateDto.defaultValue);
    if (updateDto.isRequired !== undefined) updateData.is_required = updateDto.isRequired;
    if (updateDto.isVisible !== undefined) updateData.is_visible = updateDto.isVisible;
    if (updateDto.sortOrder !== undefined) updateData.sort_order = updateDto.sortOrder;
    if (updateDto.settings !== undefined) updateData.settings = JSON.stringify(updateDto.settings);

    const updatedField = await this.db.update('task_custom_field_definitions', fieldId, updateData);

    return {
      id: updatedField.id,
      projectId: updatedField.project_id,
      name: updatedField.name,
      fieldType: updatedField.field_type,
      description: updatedField.description,
      options:
        typeof updatedField.options === 'string'
          ? JSON.parse(updatedField.options)
          : updatedField.options,
      defaultValue: updatedField.default_value
        ? typeof updatedField.default_value === 'string'
          ? JSON.parse(updatedField.default_value)
          : updatedField.default_value
        : null,
      isRequired: updatedField.is_required,
      isVisible: updatedField.is_visible,
      sortOrder: updatedField.sort_order,
      settings:
        typeof updatedField.settings === 'string'
          ? JSON.parse(updatedField.settings)
          : updatedField.settings,
      createdBy: updatedField.created_by,
      createdAt: updatedField.created_at,
      updatedAt: updatedField.updated_at,
    };
  }

  /**
   * Delete a custom field definition
   * Also removes the field values from all tasks in the project
   */
  async deleteCustomField(fieldId: string, userId: string) {
    // Get the field first
    const fieldResult = await this.db
      .table('task_custom_field_definitions')
      .select('*')
      .where('id', '=', fieldId)
      .limit(1)
      .execute();

    const fieldData = Array.isArray(fieldResult.data) ? fieldResult.data : [];
    if (fieldData.length === 0) {
      throw new NotFoundException('Custom field not found');
    }

    const existingField = fieldData[0];

    // Verify project access
    await this.getProjectWithAccess(existingField.project_id, userId);

    // Delete the field definition
    await this.db.delete('task_custom_field_definitions', fieldId);

    // Note: Task custom_fields values will still contain the old field ID
    // but they'll be ignored since the definition no longer exists
    // Could optionally clean up task custom_fields here

    return { success: true, message: 'Custom field deleted' };
  }

  /**
   * Reorder custom fields for a project
   */
  async reorderCustomFields(projectId: string, fieldIds: string[], userId: string) {
    // Verify project access
    await this.getProjectWithAccess(projectId, userId);

    // Update sort_order for each field
    await Promise.all(
      fieldIds.map((fieldId, index) =>
        this.db.update('task_custom_field_definitions', fieldId, {
          sort_order: index,
          updated_at: new Date().toISOString(),
        }),
      ),
    );

    // Return updated fields
    return this.getCustomFields(projectId, userId);
  }

  /**
   * Add an option to a select/multi-select field
   */
  async addSelectOption(
    fieldId: string,
    optionData: { label: string; color?: string },
    userId: string,
  ) {
    // Get the field first
    const fieldResult = await this.db
      .table('task_custom_field_definitions')
      .select('*')
      .where('id', '=', fieldId)
      .limit(1)
      .execute();

    const fieldDataArr = Array.isArray(fieldResult.data) ? fieldResult.data : [];
    if (fieldDataArr.length === 0) {
      throw new NotFoundException('Custom field not found');
    }

    const existingField = fieldDataArr[0];

    // Verify it's a select type
    if (!['select', 'multi_select'].includes(existingField.field_type)) {
      throw new BadRequestException('Can only add options to select or multi_select fields');
    }

    // Verify project access
    await this.getProjectWithAccess(existingField.project_id, userId);

    // Get current options
    const currentOptions =
      typeof existingField.options === 'string'
        ? JSON.parse(existingField.options)
        : existingField.options || [];

    // Add new option
    const newOption = {
      id: `option-${Date.now()}`,
      label: optionData.label,
      color: optionData.color || this.getDefaultOptionColor(currentOptions.length),
    };

    currentOptions.push(newOption);

    // Update field
    await this.db.update('task_custom_field_definitions', fieldId, {
      options: JSON.stringify(currentOptions),
      updated_at: new Date().toISOString(),
    });

    return newOption;
  }

  /**
   * Get default color for select option based on index
   */
  private getDefaultOptionColor(index: number): string {
    const colors = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
      '#6366F1', // indigo
      '#84CC16', // lime
    ];
    return colors[index % colors.length];
  }
}
