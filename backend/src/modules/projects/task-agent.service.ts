import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { ProjectsService } from './projects.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';
import { TaskType, TaskPriority } from './dto/create-task.dto';

// Workspace member interface for user lookup
interface WorkspaceMember {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
}

// Helper to map string to TaskType enum
const mapToTaskType = (type?: string): TaskType | undefined => {
  if (!type) return undefined;
  const typeMap: Record<string, TaskType> = {
    task: TaskType.TASK,
    story: TaskType.STORY,
    bug: TaskType.BUG,
    epic: TaskType.EPIC,
    subtask: TaskType.SUBTASK,
  };
  return typeMap[type.toLowerCase()];
};

// Helper to map string to TaskPriority enum
const mapToTaskPriority = (priority?: string): TaskPriority | undefined => {
  if (!priority) return undefined;
  const priorityMap: Record<string, TaskPriority> = {
    lowest: TaskPriority.LOWEST,
    low: TaskPriority.LOW,
    medium: TaskPriority.MEDIUM,
    high: TaskPriority.HIGH,
    highest: TaskPriority.HIGHEST,
  };
  return priorityMap[priority.toLowerCase()];
};

export interface TaskAgentRequest {
  prompt: string;
  workspaceId: string;
  projectId: string; // Required - tasks always belong to a project
}

export interface TaskAgentResponse {
  success: boolean;
  action: 'create' | 'update' | 'delete' | 'move' | 'batch_create' | 'batch_update' | 'batch_delete' | 'list' | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

// Complete task details matching CreateTaskDto
interface TaskDetails {
  title?: string;
  description?: string;
  task_type?: 'task' | 'story' | 'bug' | 'epic' | 'subtask';
  status?: string; // Can be any kanban stage ID
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  sprint_id?: string;
  parent_task_id?: string;
  assigned_to?: string[]; // Array of user IDs
  assignee_team_member_id?: string;
  reporter_team_member_id?: string;
  due_date?: string; // ISO date string
  estimated_hours?: number;
  story_points?: number;
  labels?: string[];
  attachments?: {
    note_attachment?: string[];
    file_attachment?: string[];
    event_attachment?: string[];
  };
}

// Batch operation support
interface BatchCreateTaskItem {
  details: TaskDetails;
}

interface BatchUpdateTaskItem {
  taskId: string;
  taskTitle: string;
  updates: Partial<TaskDetails>;
}

interface BatchDeleteTaskItem {
  taskId: string;
  taskTitle: string;
}

interface ParsedTaskIntent {
  action: 'create' | 'update' | 'delete' | 'move' | 'batch_create' | 'batch_update' | 'batch_delete' | 'list' | 'unknown';

  // Single operation fields
  taskTitle?: string;
  taskId?: string;
  details?: TaskDetails;

  // Move operation
  newStatus?: string;

  // List operation
  filters?: {
    status?: string;
    assignee?: string;
    priority?: string;
  };

  // Batch operation fields
  batch_create?: BatchCreateTaskItem[];
  batch_update?: BatchUpdateTaskItem[];
  batch_delete?: BatchDeleteTaskItem[];
}

@Injectable()
export class TaskAgentService {
  private readonly logger = new Logger(TaskAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  /**
   * Main entry point for the Task AI Agent
   * Receives natural language prompt and executes the appropriate task action
   */
  async processCommand(
    request: TaskAgentRequest,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const { prompt, workspaceId, projectId } = request;

    this.logger.log(
      `[TaskAgent] Processing command: "${prompt}" for project: ${projectId}`,
    );

    try {
      // Step 1: Store user message in conversation memory (async, don't wait)
      this.storeUserMessage(prompt, workspaceId, userId, projectId);

      // Step 2: Search for relevant conversation history from Qdrant
      const conversationHistory = await this.getRelevantConversationHistory(
        prompt,
        workspaceId,
        userId,
      );

      this.logger.log(
        `[TaskAgent] Found ${conversationHistory.length} relevant historical messages`,
      );

      // Step 3: Get project details including kanban stages
      const project = await this.projectsService.findOne(projectId, userId);
      if (!project) {
        return {
          success: false,
          action: 'unknown',
          message: 'Project not found or you do not have access.',
          error: 'PROJECT_NOT_FOUND',
        };
      }

      // Step 4: Get existing tasks in the project for context
      const existingTasks = await this.getExistingTasks(projectId, userId);

      // Step 5: Get workspace members for user ID resolution
      const workspaceMembers = await this.getWorkspaceMembers(workspaceId, userId);

      // Step 6: Use AI to parse the user's intent
      const parsedIntent = await this.parseIntentWithAI(
        prompt,
        project,
        existingTasks,
        workspaceMembers,
        conversationHistory,
      );

      this.logger.log(
        `[TaskAgent] Parsed intent: ${JSON.stringify(parsedIntent)}`,
      );

      if (parsedIntent.action === 'unknown') {
        this.storeAssistantMessage(
          'I could not understand your request.',
          workspaceId,
          userId,
          'unknown',
          false,
          projectId,
        );

        return {
          success: false,
          action: 'unknown',
          message:
            'I could not understand your request. Please try commands like "Create a task called Fix login bug with high priority" or "Move task to done" or "Assign task to John".',
          error: 'INTENT_NOT_UNDERSTOOD',
        };
      }

      // Step 7: Resolve user names to IDs before executing
      this.resolveUserIdsInIntent(parsedIntent, workspaceMembers);

      // Step 8: Execute the action
      const result = await this.executeAction(parsedIntent, projectId, userId);

      // Step 9: Store AI response in conversation memory
      this.storeAssistantMessage(
        result.message,
        workspaceId,
        userId,
        result.action,
        result.success,
        projectId,
        this.extractTaskIds(result),
        this.extractTaskTitles(result),
      );

      return result;
    } catch (error) {
      this.logger.error(
        `[TaskAgent] Error processing command: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        action: 'unknown',
        message: 'An error occurred while processing your request.',
        error: error.message,
      };
    }
  }

  /**
   * Store user message in conversation memory (fire and forget)
   */
  private storeUserMessage(
    content: string,
    workspaceId: string,
    userId: string,
    projectId: string,
  ): void {
    this.conversationMemoryService
      .storeMessage({
        role: 'user',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'task',
        metadata: { project_id: projectId },
      })
      .catch((error) => {
        this.logger.warn(`[TaskAgent] Failed to store user message: ${error.message}`);
      });
  }

  /**
   * Store assistant message in conversation memory (fire and forget)
   */
  private storeAssistantMessage(
    content: string,
    workspaceId: string,
    userId: string,
    action: string,
    success: boolean,
    projectId: string,
    taskIds?: string[],
    taskTitles?: string[],
  ): void {
    this.conversationMemoryService
      .storeMessage({
        role: 'assistant',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        action,
        success,
        entity_type: 'task',
        metadata: {
          project_id: projectId,
          task_ids: taskIds,
          task_titles: taskTitles,
        },
      })
      .catch((error) => {
        this.logger.warn(`[TaskAgent] Failed to store assistant message: ${error.message}`);
      });
  }

  /**
   * Get relevant conversation history from Qdrant
   */
  private async getRelevantConversationHistory(
    query: string,
    workspaceId: string,
    userId: string,
  ): Promise<ConversationSearchResult[]> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        this.logger.warn('[TaskAgent] Conversation memory not ready, skipping history lookup');
        return [];
      }

      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        10,
      );
    } catch (error) {
      this.logger.warn(`[TaskAgent] Failed to get conversation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Get existing tasks in the project for context
   */
  private async getExistingTasks(
    projectId: string,
    userId: string,
  ): Promise<any[]> {
    try {
      const tasks = await this.projectsService.getTasks(projectId, userId);
      return tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        task_type: t.task_type || 'task',
        status: t.status || 'todo',
        priority: t.priority || 'medium',
        assigned_to: t.assigned_to || [],
        assignees: t.assignees || [],
        due_date: t.due_date,
        labels: t.labels || [],
      }));
    } catch (error) {
      this.logger.warn(
        `[TaskAgent] Could not fetch existing tasks: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Get workspace members with their user_id and names resolved
   */
  private async getWorkspaceMembers(
    workspaceId: string,
    _userId: string,
  ): Promise<WorkspaceMember[]> {
    try {
      const membersResult = await this.db.table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      const members = membersResult.data || [];
      this.logger.log(`[TaskAgent] Found ${members.length} workspace members`);

      const membersWithNames: WorkspaceMember[] = await Promise.all(
        members.map(async (member: any) => {
          try {
            const userProfile = await this.db.getUserById(member.user_id);
            const metadata = userProfile?.metadata || {};

            return {
              user_id: member.user_id,
              name: metadata.name || (userProfile as any)?.fullName || userProfile?.name || null,
              username: userProfile?.username || metadata.username || null,
              email: userProfile?.email || null,
              role: member.role,
            };
          } catch (error) {
            return {
              user_id: member.user_id,
              name: null,
              username: null,
              email: null,
              role: member.role,
            };
          }
        })
      );

      return membersWithNames;
    } catch (error) {
      this.logger.warn(
        `[TaskAgent] Could not fetch workspace members: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Extract task IDs from operation result
   */
  private extractTaskIds(result: TaskAgentResponse): string[] {
    const ids: string[] = [];

    if (result.data?.task?.id) {
      ids.push(result.data.task.id);
    }

    if (result.data?.deletedTaskId) {
      ids.push(result.data.deletedTaskId);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.task?.id) ids.push(r.task.id);
        if (r.taskId) ids.push(r.taskId);
      });
    }

    return ids;
  }

  /**
   * Extract task titles from operation result
   */
  private extractTaskTitles(result: TaskAgentResponse): string[] {
    const titles: string[] = [];

    if (result.data?.task?.title) {
      titles.push(result.data.task.title);
    }

    if (result.data?.deletedTaskTitle) {
      titles.push(result.data.deletedTaskTitle);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.title) titles.push(r.title);
        if (r.task?.title) titles.push(r.task.title);
      });
    }

    return titles;
  }

  /**
   * Use database AI to parse the user's natural language intent for tasks
   */
  private async parseIntentWithAI(
    prompt: string,
    project: any,
    existingTasks: any[],
    workspaceMembers: WorkspaceMember[],
    conversationHistory: ConversationSearchResult[] = [],
  ): Promise<ParsedTaskIntent> {
    // Build kanban stages context
    const kanbanStages = project.kanban_stages || [
      { id: 'todo', name: 'To Do' },
      { id: 'in_progress', name: 'In Progress' },
      { id: 'done', name: 'Done' },
    ];
    const stagesList = kanbanStages
      .map((s: any) => `- "${s.name}" (ID: ${s.id})`)
      .join('\n');

    // Build existing tasks context
    const tasksList =
      existingTasks.length > 0
        ? existingTasks
            .map(
              (t) =>
                `- "${t.title}" (ID: ${t.id}, Status: ${t.status}, Priority: ${t.priority}, Type: ${t.task_type}, Assignees: ${t.assignees?.map((a: any) => a.name).join(', ') || 'unassigned'})`,
            )
            .join('\n')
        : 'No tasks in this project yet';

    // Build workspace members list
    const membersList =
      workspaceMembers.length > 0
        ? workspaceMembers
            .map(
              (m) =>
                `- USER_ID: "${m.user_id}", Name: "${m.name || 'Unknown'}", Username: "${m.username || 'N/A'}", Email: "${m.email || 'N/A'}"`,
            )
            .join('\n')
        : 'No members available';

    // Build conversation history context
    const conversationContext = this.conversationMemoryService.buildContextFromHistory(conversationHistory);

    const aiPrompt = `You are a task management assistant for project "${project.name}". Analyze the user's command and extract their intent to create, update, delete, or move tasks. You can handle SINGLE or BATCH operations.

User command: "${prompt}"
${conversationContext}
Project: "${project.name}" (ID: ${project.id})

Kanban Stages (use stage ID for status):
${stagesList}

Existing tasks in this project:
${tasksList}

Workspace members (IMPORTANT: Use the USER_ID when assigning tasks):
${membersList}

You must respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation. Just the JSON:

// FOR SINGLE TASK CREATE:
{
  "action": "create",
  "details": {
    "title": "Task title",
    "description": "Task description",
    "task_type": "task" | "story" | "bug" | "epic" | "subtask",
    "status": "stage_id",
    "priority": "lowest" | "low" | "medium" | "high" | "highest",
    "assigned_to": ["USER_ID_1", "USER_ID_2"],
    "due_date": "YYYY-MM-DD",
    "estimated_hours": number,
    "story_points": number,
    "labels": ["label1", "label2"]
  }
}

// FOR SINGLE TASK UPDATE:
{
  "action": "update",
  "taskId": "task-uuid",
  "taskTitle": "Task Title",
  "details": { /* only fields to update */ }
}

// FOR TASK MOVE (change status/stage):
{
  "action": "move",
  "taskId": "task-uuid",
  "taskTitle": "Task Title",
  "newStatus": "stage_id"
}

// FOR SINGLE TASK DELETE:
{
  "action": "delete",
  "taskId": "task-uuid",
  "taskTitle": "Task Title"
}

// FOR BATCH CREATE:
{
  "action": "batch_create",
  "batch_create": [
    { "details": { "title": "Task 1", "priority": "high", ... } },
    { "details": { "title": "Task 2", "assigned_to": ["USER_ID"], ... } }
  ]
}

// FOR BATCH UPDATE:
{
  "action": "batch_update",
  "batch_update": [
    { "taskId": "uuid-1", "taskTitle": "Task 1", "updates": { "priority": "high" } },
    { "taskId": "uuid-2", "taskTitle": "Task 2", "updates": { "status": "done" } }
  ]
}

// FOR BATCH DELETE:
{
  "action": "batch_delete",
  "batch_delete": [
    { "taskId": "uuid-1", "taskTitle": "Task 1" },
    { "taskId": "uuid-2", "taskTitle": "Task 2" }
  ]
}

// FOR LIST TASKS (with optional filters):
{
  "action": "list",
  "filters": {
    "status": "stage_id",
    "assignee": "USER_ID",
    "priority": "high"
  }
}

IMPORTANT RULES:

1. TASK TYPES:
   - "task": General work item (default)
   - "story": User story for agile workflows
   - "bug": Bug or defect to fix
   - "epic": Large feature/initiative
   - "subtask": Child task under another task

2. PRIORITIES (lowercase):
   - "lowest", "low", "medium" (default), "high", "highest"

3. STATUS/STAGE:
   - Use the stage ID from the Kanban Stages list above
   - Default to first stage (usually "todo") if not specified

4. ASSIGNEES:
   - Use USER_IDs from the workspace members list
   - assigned_to is an ARRAY of user IDs
   - "assign to John" -> find John's USER_ID in members list

5. MOVE ACTION:
   - Use for changing task status/stage
   - "move task to done", "mark as complete", "move to in progress"
   - Map stage names to stage IDs

6. FLEXIBLE MATCHING:
   - Task names: partial match OK, case insensitive
   - "the login task" -> find task with "login" in title
   - "that bug" -> use conversation history to identify the task
   - Dates: "tomorrow", "next Monday", "Jan 15" -> convert to "YYYY-MM-DD"

7. BATCH OPERATIONS:
   - "create 3 tasks", "delete all completed tasks", "move all bugs to testing"
   - Look for keywords: "all", "multiple", "several", numbers

8. Common phrases:
   - Create: "create", "add", "make", "new task"
   - Update: "change", "set", "update", "modify", "rename", "edit"
   - Delete: "delete", "remove", "get rid of"
   - Move: "move", "change status", "mark as", "complete", "start", "finish"
   - Assign: "assign to", "give to", "for [name]"
   - Priority: "urgent", "important", "critical" -> "highest"/"high"
   - Labels: "tag with", "label as", "add tag"

9. DEFAULTS (for create):
   - task_type: "task"
   - status: first kanban stage ID
   - priority: "medium"

10. CONTEXT USAGE:
    - Use conversation history to resolve "the task", "that one", "the last task"
    - If user says "mark it as done", find the task from recent context`;

    try {
      const response = await this.aiProvider.generateText(aiPrompt, {
        saveToDatabase: false,
      });

      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.text) {
        responseText = response.text;
      } else if (response?.content) {
        responseText = response.content;
      } else if (response?.choices?.[0]?.message?.content) {
        responseText = response.choices[0].message.content;
      } else {
        responseText = JSON.stringify(response);
      }

      // Clean up the response
      let cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      this.logger.debug(`[TaskAgent] AI response: ${cleanedContent}`);

      const parsed = JSON.parse(cleanedContent);

      return {
        action: parsed.action || 'unknown',
        taskTitle: parsed.taskTitle,
        taskId: parsed.taskId,
        details: parsed.details || {},
        newStatus: parsed.newStatus,
        filters: parsed.filters,
        batch_create: parsed.batch_create,
        batch_update: parsed.batch_update,
        batch_delete: parsed.batch_delete,
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] AI parsing failed: ${error.message}`);
      return {
        action: 'unknown',
        details: {},
      };
    }
  }

  /**
   * Resolve user names to IDs in the parsed intent
   */
  private resolveUserIdsInIntent(
    intent: ParsedTaskIntent,
    members: WorkspaceMember[],
  ): void {
    // Single operation
    if (intent.details?.assigned_to) {
      intent.details.assigned_to = this.resolveAssigneeIds(
        intent.details.assigned_to,
        members,
      );
    }

    // Batch create
    intent.batch_create?.forEach((item) => {
      if (item.details.assigned_to) {
        item.details.assigned_to = this.resolveAssigneeIds(
          item.details.assigned_to,
          members,
        );
      }
    });

    // Batch update
    intent.batch_update?.forEach((item) => {
      if (item.updates.assigned_to) {
        item.updates.assigned_to = this.resolveAssigneeIds(
          item.updates.assigned_to,
          members,
        );
      }
    });
  }

  /**
   * Resolve array of assignee IDs/names to valid user IDs
   */
  private resolveAssigneeIds(
    assignees: string[],
    members: WorkspaceMember[],
  ): string[] {
    return assignees
      .map((idOrName) => {
        if (this.isValidUUID(idOrName)) {
          const memberExists = members.some((m) => m.user_id === idOrName);
          return memberExists ? idOrName : null;
        }
        return this.findUserIdByNameOrEmail(idOrName, members);
      })
      .filter((id): id is string => id !== null);
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Find user ID by name, username, or email
   */
  private findUserIdByNameOrEmail(
    searchTerm: string,
    members: WorkspaceMember[],
  ): string | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Exact match on name
    for (const member of members) {
      if (member.name?.toLowerCase() === normalizedSearch) {
        return member.user_id;
      }
    }

    // Exact match on username
    for (const member of members) {
      if (member.username?.toLowerCase() === normalizedSearch) {
        return member.user_id;
      }
    }

    // Partial match on name
    for (const member of members) {
      if (member.name?.toLowerCase().includes(normalizedSearch)) {
        return member.user_id;
      }
    }

    // Try if search term contains part of the name
    for (const member of members) {
      const nameParts = member.name?.toLowerCase().split(/\s+/) || [];
      if (nameParts.some((part) => part === normalizedSearch)) {
        return member.user_id;
      }
    }

    return null;
  }

  /**
   * Execute the parsed action
   */
  private async executeAction(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    switch (intent.action) {
      case 'create':
        return this.createTask(intent, projectId, userId);

      case 'update':
        return this.updateTask(intent, projectId, userId);

      case 'move':
        return this.moveTask(intent, projectId, userId);

      case 'delete':
        return this.deleteTask(intent, projectId, userId);

      case 'batch_create':
        return this.batchCreateTasks(intent, projectId, userId);

      case 'batch_update':
        return this.batchUpdateTasks(intent, projectId, userId);

      case 'batch_delete':
        return this.batchDeleteTasks(intent, projectId, userId);

      case 'list':
        return this.listTasks(intent, projectId, userId);

      default:
        return {
          success: false,
          action: 'unknown',
          message:
            'I could not understand what you want to do. Please try again with a clearer command.',
          error: 'UNKNOWN_ACTION',
        };
    }
  }

  /**
   * Create a new task
   */
  private async createTask(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const { details } = intent;

    if (!details?.title) {
      return {
        success: false,
        action: 'create',
        message:
          'Please provide a title for the task. For example: "Create a task called Fix login bug"',
        error: 'MISSING_TASK_TITLE',
      };
    }

    try {
      const createDto: any = {
        title: details.title,
        description: details.description || '',
        task_type: mapToTaskType(details.task_type) || TaskType.TASK,
        status: details.status || 'todo',
        priority: mapToTaskPriority(details.priority) || TaskPriority.MEDIUM,
        assigned_to: details.assigned_to || [],
        labels: details.labels || [],
      };

      if (details.sprint_id) createDto.sprint_id = details.sprint_id;
      if (details.parent_task_id) createDto.parent_task_id = details.parent_task_id;
      if (details.due_date) createDto.due_date = details.due_date;
      if (details.estimated_hours !== undefined) createDto.estimated_hours = details.estimated_hours;
      if (details.story_points !== undefined) createDto.story_points = details.story_points;
      if (details.attachments) createDto.attachments = details.attachments;

      this.logger.log(`[TaskAgent] Creating task with DTO: ${JSON.stringify(createDto)}`);

      const task = await this.projectsService.createTask(projectId, createDto, userId);

      const summary = this.buildTaskSummary(createDto);

      return {
        success: true,
        action: 'create',
        message: `Task "${task.title}" has been created successfully!${summary}`,
        data: {
          projectId,
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            task_type: task.task_type,
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to,
            due_date: task.due_date,
            labels: task.labels,
            created_at: task.created_at,
          },
        },
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] Create task failed: ${error.message}`);
      return {
        success: false,
        action: 'create',
        message: `Failed to create task: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Build human-readable summary of task details
   */
  private buildTaskSummary(dto: any): string {
    const parts: string[] = [];

    if (dto.task_type && dto.task_type !== 'task') parts.push(`Type: ${dto.task_type}`);
    if (dto.priority && dto.priority !== 'medium') parts.push(`Priority: ${dto.priority}`);
    if (dto.status && dto.status !== 'todo') parts.push(`Status: ${dto.status}`);
    if (dto.due_date) parts.push(`Due: ${dto.due_date}`);
    if (dto.assigned_to?.length > 0) parts.push(`Assignees: ${dto.assigned_to.length}`);
    if (dto.labels?.length > 0) parts.push(`Labels: ${dto.labels.join(', ')}`);

    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  /**
   * Update an existing task
   */
  private async updateTask(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const { taskId, taskTitle, details } = intent;

    if (!taskId) {
      return {
        success: false,
        action: 'update',
        message: `Could not find task "${taskTitle || 'Unknown'}". Please make sure the task exists.`,
        error: 'TASK_NOT_FOUND',
      };
    }

    const updateFields: any = {};

    if (details?.title) updateFields.title = details.title;
    if (details?.description) updateFields.description = details.description;
    if (details?.task_type) updateFields.task_type = mapToTaskType(details.task_type);
    if (details?.status) updateFields.status = details.status;
    if (details?.priority) updateFields.priority = mapToTaskPriority(details.priority);
    if (details?.assigned_to) updateFields.assigned_to = details.assigned_to;
    if (details?.due_date) updateFields.due_date = details.due_date;
    if (details?.estimated_hours !== undefined) updateFields.estimated_hours = details.estimated_hours;
    if (details?.story_points !== undefined) updateFields.story_points = details.story_points;
    if (details?.labels) updateFields.labels = details.labels;
    if (details?.sprint_id) updateFields.sprint_id = details.sprint_id;
    if (details?.attachments) updateFields.attachments = details.attachments;

    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        action: 'update',
        message:
          'Please specify what you want to update. For example: "Change priority to high" or "Assign to John"',
        error: 'NO_UPDATES_SPECIFIED',
      };
    }

    try {
      const task = await this.projectsService.updateTask(taskId, updateFields, userId);

      const changesDescription = Object.entries(updateFields)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: ${value.length} items`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');

      return {
        success: true,
        action: 'update',
        message: `Task "${taskTitle}" has been updated! Changes: ${changesDescription}`,
        data: {
          projectId,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            updated_at: task.updated_at,
          },
          updatedFields: updateFields,
        },
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] Update task failed: ${error.message}`);
      return {
        success: false,
        action: 'update',
        message: `Failed to update task: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Move a task to a different status/stage
   */
  private async moveTask(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const { taskId, taskTitle, newStatus } = intent;

    if (!taskId) {
      return {
        success: false,
        action: 'move',
        message: `Could not find task "${taskTitle || 'Unknown'}". Please make sure the task exists.`,
        error: 'TASK_NOT_FOUND',
      };
    }

    if (!newStatus) {
      return {
        success: false,
        action: 'move',
        message: 'Please specify where to move the task. For example: "Move to done" or "Move to in progress"',
        error: 'MISSING_STATUS',
      };
    }

    try {
      const task = await this.projectsService.moveTask(taskId, newStatus, userId);

      return {
        success: true,
        action: 'move',
        message: `Task "${taskTitle}" has been moved to "${newStatus}"!`,
        data: {
          projectId,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            updated_at: task.updated_at,
          },
          previousStatus: taskTitle,
          newStatus,
        },
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] Move task failed: ${error.message}`);
      return {
        success: false,
        action: 'move',
        message: `Failed to move task: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete a task
   */
  private async deleteTask(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const { taskId, taskTitle } = intent;

    if (!taskId) {
      return {
        success: false,
        action: 'delete',
        message: `Could not find task "${taskTitle || 'Unknown'}". Please make sure the task exists.`,
        error: 'TASK_NOT_FOUND',
      };
    }

    try {
      await this.projectsService.deleteTask(taskId, userId);

      return {
        success: true,
        action: 'delete',
        message: `Task "${taskTitle}" has been deleted successfully.`,
        data: {
          projectId,
          deletedTaskId: taskId,
          deletedTaskTitle: taskTitle,
        },
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] Delete task failed: ${error.message}`);
      return {
        success: false,
        action: 'delete',
        message: `Failed to delete task: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * List tasks with optional filters
   */
  private async listTasks(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    try {
      const tasks = await this.projectsService.getTasks(
        projectId,
        userId,
        undefined, // sprintId
        intent.filters?.status,
      );

      // Apply additional filters
      let filteredTasks = tasks;

      if (intent.filters?.priority) {
        filteredTasks = filteredTasks.filter(
          (t) => t.priority === intent.filters?.priority,
        );
      }

      if (intent.filters?.assignee) {
        filteredTasks = filteredTasks.filter((t) =>
          t.assigned_to?.includes(intent.filters?.assignee),
        );
      }

      const taskSummaries = filteredTasks.map(
        (t) =>
          `• ${t.title} (${t.status}, ${t.priority}${t.assignees?.length > 0 ? `, assigned to ${t.assignees.map((a: any) => a.name).join(', ')}` : ''})`,
      );

      return {
        success: true,
        action: 'list',
        message:
          filteredTasks.length > 0
            ? `Found ${filteredTasks.length} task(s):\n${taskSummaries.join('\n')}`
            : 'No tasks found matching your criteria.',
        data: {
          tasks: filteredTasks,
          count: filteredTasks.length,
        },
      };
    } catch (error) {
      this.logger.error(`[TaskAgent] List tasks failed: ${error.message}`);
      return {
        success: false,
        action: 'list',
        message: `Failed to list tasks: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Batch create multiple tasks
   */
  private async batchCreateTasks(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const items = intent.batch_create || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_create',
        message: 'No tasks specified to create.',
        error: 'NO_TASKS_SPECIFIED',
      };
    }

    this.logger.log(`[TaskAgent] Batch creating ${items.length} tasks`);

    const results: Array<{ success: boolean; task?: any; error?: string; title?: string }> = [];

    for (const item of items) {
      try {
        if (!item.details.title) {
          results.push({
            success: false,
            error: 'Missing task title',
            title: 'Unknown',
          });
          continue;
        }

        const createDto: any = {
          title: item.details.title,
          description: item.details.description || '',
          task_type: mapToTaskType(item.details.task_type) || TaskType.TASK,
          status: item.details.status || 'todo',
          priority: mapToTaskPriority(item.details.priority) || TaskPriority.MEDIUM,
          assigned_to: item.details.assigned_to || [],
          labels: item.details.labels || [],
        };

        if (item.details.due_date) createDto.due_date = item.details.due_date;
        if (item.details.estimated_hours !== undefined) createDto.estimated_hours = item.details.estimated_hours;
        if (item.details.story_points !== undefined) createDto.story_points = item.details.story_points;

        const task = await this.projectsService.createTask(projectId, createDto, userId);

        results.push({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
          title: task.title,
        });

        this.logger.log(`[TaskAgent] Created task: ${task.title}`);
      } catch (error) {
        this.logger.error(`[TaskAgent] Failed to create task ${item.details.title}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.details.title,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_create',
      message: `Batch create completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        projectId,
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch update multiple tasks
   */
  private async batchUpdateTasks(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const items = intent.batch_update || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_update',
        message: 'No tasks specified to update.',
        error: 'NO_TASKS_SPECIFIED',
      };
    }

    this.logger.log(`[TaskAgent] Batch updating ${items.length} tasks`);

    const results: Array<{ success: boolean; task?: any; error?: string; title?: string }> = [];

    for (const item of items) {
      try {
        if (!item.taskId) {
          results.push({
            success: false,
            error: 'Task not found',
            title: item.taskTitle || 'Unknown',
          });
          continue;
        }

        const updateFields: any = {};

        if (item.updates.title) updateFields.title = item.updates.title;
        if (item.updates.description) updateFields.description = item.updates.description;
        if (item.updates.task_type) updateFields.task_type = mapToTaskType(item.updates.task_type);
        if (item.updates.status) updateFields.status = item.updates.status;
        if (item.updates.priority) updateFields.priority = mapToTaskPriority(item.updates.priority);
        if (item.updates.assigned_to) updateFields.assigned_to = item.updates.assigned_to;
        if (item.updates.due_date) updateFields.due_date = item.updates.due_date;
        if (item.updates.labels) updateFields.labels = item.updates.labels;

        if (Object.keys(updateFields).length === 0) {
          results.push({
            success: false,
            error: 'No updates specified',
            title: item.taskTitle,
          });
          continue;
        }

        const task = await this.projectsService.updateTask(item.taskId, updateFields, userId);

        results.push({
          success: true,
          task: {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
          },
          title: task.title,
        });

        this.logger.log(`[TaskAgent] Updated task: ${task.title}`);
      } catch (error) {
        this.logger.error(`[TaskAgent] Failed to update task ${item.taskTitle}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.taskTitle,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_update',
      message: `Batch update completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        projectId,
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch delete multiple tasks
   */
  private async batchDeleteTasks(
    intent: ParsedTaskIntent,
    projectId: string,
    userId: string,
  ): Promise<TaskAgentResponse> {
    const items = intent.batch_delete || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_delete',
        message: 'No tasks specified to delete.',
        error: 'NO_TASKS_SPECIFIED',
      };
    }

    this.logger.log(`[TaskAgent] Batch deleting ${items.length} tasks`);

    const results: Array<{ success: boolean; taskId?: string; error?: string; title?: string }> = [];

    for (const item of items) {
      try {
        if (!item.taskId) {
          results.push({
            success: false,
            error: 'Task not found',
            title: item.taskTitle || 'Unknown',
          });
          continue;
        }

        await this.projectsService.deleteTask(item.taskId, userId);

        results.push({
          success: true,
          taskId: item.taskId,
          title: item.taskTitle,
        });

        this.logger.log(`[TaskAgent] Deleted task: ${item.taskTitle}`);
      } catch (error) {
        this.logger.error(`[TaskAgent] Failed to delete task ${item.taskTitle}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.taskTitle,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_delete',
      message: `Batch delete completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        projectId,
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }
}
