import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { ProjectsService } from './projects.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';
import {
  ProjectType,
  ProjectStatus,
  ProjectPriority,
  CreateProjectDto,
  KanbanStageDto,
} from './dto/create-project.dto';

// Workspace member interface for user lookup - simplified to focus on ID and name
interface WorkspaceMember {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
}

// Helper to map string to ProjectType enum
const mapToProjectType = (type?: string): ProjectType | undefined => {
  if (!type) return undefined;
  const typeMap: Record<string, ProjectType> = {
    kanban: ProjectType.KANBAN,
    scrum: ProjectType.SCRUM,
    bug_tracking: ProjectType.BUG_TRACKING,
    feature_development: ProjectType.FEATURE,
    feature: ProjectType.FEATURE,
    research: ProjectType.RESEARCH,
  };
  return typeMap[type.toLowerCase()];
};

// Helper to map string to ProjectPriority enum
const mapToProjectPriority = (priority?: string): ProjectPriority | undefined => {
  if (!priority) return undefined;
  const priorityMap: Record<string, ProjectPriority> = {
    low: ProjectPriority.LOW,
    medium: ProjectPriority.MEDIUM,
    high: ProjectPriority.HIGH,
    critical: ProjectPriority.CRITICAL,
  };
  return priorityMap[priority.toLowerCase()];
};

// Helper to map string to ProjectStatus enum
const mapToProjectStatus = (status?: string): ProjectStatus | undefined => {
  if (!status) return undefined;
  const statusMap: Record<string, ProjectStatus> = {
    active: ProjectStatus.ACTIVE,
    on_hold: ProjectStatus.ON_HOLD,
    completed: ProjectStatus.COMPLETED,
    archived: ProjectStatus.ARCHIVED,
  };
  return statusMap[status.toLowerCase()];
};

export interface ProjectAgentRequest {
  prompt: string;
  workspaceId: string;
}

export interface ProjectAgentResponse {
  success: boolean;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

// Complete project details matching CreateProjectDto
interface ProjectDetails {
  // Basic info
  name?: string;
  description?: string;

  // Classification
  type?: 'kanban' | 'scrum' | 'bug_tracking' | 'feature' | 'research';
  status?: 'active' | 'on_hold' | 'completed' | 'archived';
  priority?: 'low' | 'medium' | 'high' | 'critical';

  // People
  owner_id?: string;
  lead_id?: string;

  // Dates
  start_date?: string; // ISO date string
  end_date?: string; // ISO date string

  // Metrics
  estimated_hours?: number;
  budget?: number;

  // Configuration
  is_template?: boolean;

  // Kanban stages
  kanban_stages?: Array<{
    id: string;
    name: string;
    order: number;
    color: string;
  }>;

  // Attachments
  attachments?: {
    note_attachment?: string[];
    file_attachment?: string[];
    event_attachment?: string[];
  };

  // Collaborative data
  collaborative_data?: {
    default_assignee_ids?: string[];
    [key: string]: any;
  };
}

// Batch operation support
interface BatchCreateItem {
  details: ProjectDetails;
}

interface BatchUpdateItem {
  projectId: string;
  projectName: string;
  updates: Partial<ProjectDetails>;
}

interface BatchDeleteItem {
  projectId: string;
  projectName: string;
}

interface ParsedIntent {
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'unknown';

  // Single operation fields
  projectName?: string;
  projectId?: string;
  details?: ProjectDetails;

  // Batch operation fields
  batch_create?: BatchCreateItem[];
  batch_update?: BatchUpdateItem[];
  batch_delete?: BatchDeleteItem[];
}

@Injectable()
export class ProjectAgentService {
  private readonly logger = new Logger(ProjectAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly projectsService: ProjectsService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Main entry point for the Project AI Agent
   * Receives natural language prompt and executes the appropriate action
   */
  async processCommand(
    request: ProjectAgentRequest,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    const { prompt, workspaceId } = request;

    this.logger.log(`[ProjectAgent] Processing command: "${prompt}" for workspace: ${workspaceId}`);

    try {
      // Step 1: Store user message in conversation memory (async, don't wait)
      this.storeUserMessage(prompt, workspaceId, userId);

      // Step 2: Search for relevant conversation history from Qdrant
      const conversationHistory = await this.getRelevantConversationHistory(
        prompt,
        workspaceId,
        userId,
      );

      this.logger.log(
        `[ProjectAgent] Found ${conversationHistory.length} relevant historical messages`,
      );

      // Step 3: Get existing projects for context
      const existingProjects = await this.getExistingProjects(workspaceId, userId);

      // Step 4: Get workspace members for user ID resolution
      const workspaceMembers = await this.getWorkspaceMembers(workspaceId, userId);

      // Step 5: Use AI to parse the user's intent (with members context AND conversation history)
      const parsedIntent = await this.parseIntentWithAI(
        prompt,
        existingProjects,
        workspaceMembers,
        conversationHistory,
      );

      this.logger.log(`[ProjectAgent] Parsed intent: ${JSON.stringify(parsedIntent)}`);

      if (parsedIntent.action === 'unknown') {
        // Store failed response in memory
        this.storeAssistantMessage(
          'I could not understand your request.',
          workspaceId,
          userId,
          'unknown',
          false,
        );

        return {
          success: false,
          action: 'unknown',
          message:
            'I could not understand your request. Please try commands like "Create a project called Marketing Campaign with high priority" or "Update Website Redesign to set start date to 2024-01-15".',
          error: 'INTENT_NOT_UNDERSTOOD',
        };
      }

      // Step 6: Resolve user names to IDs before executing
      if (
        parsedIntent.action === 'create' ||
        parsedIntent.action === 'update' ||
        parsedIntent.action === 'delete'
      ) {
        // Single operation
        if (parsedIntent.details) {
          this.resolveUserIds(parsedIntent.details, workspaceMembers);
        }
      } else if (parsedIntent.action === 'batch_create') {
        // Batch create
        parsedIntent.batch_create?.forEach((item) => {
          this.resolveUserIds(item.details, workspaceMembers);
        });
      } else if (parsedIntent.action === 'batch_update') {
        // Batch update
        parsedIntent.batch_update?.forEach((item) => {
          this.resolveUserIds(item.updates as ProjectDetails, workspaceMembers);
        });
      }
      // batch_delete doesn't need user ID resolution

      // Step 7: Execute the action
      const result = await this.executeAction(parsedIntent, workspaceId, userId);

      // Step 8: Store AI response in conversation memory
      this.storeAssistantMessage(
        result.message,
        workspaceId,
        userId,
        result.action,
        result.success,
        this.extractProjectIds(result),
        this.extractProjectNames(result),
      );

      return result;
    } catch (error) {
      this.logger.error(`[ProjectAgent] Error processing command: ${error.message}`, error.stack);
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
  private storeUserMessage(content: string, workspaceId: string, userId: string): void {
    // Fire and forget - don't block the main flow
    this.conversationMemoryService
      .storeMessage({
        role: 'user',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'project',
      })
      .catch((error) => {
        this.logger.warn(`[ProjectAgent] Failed to store user message: ${error.message}`);
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
    projectIds?: string[],
    projectNames?: string[],
  ): void {
    // Fire and forget - don't block the main flow
    this.conversationMemoryService
      .storeMessage({
        role: 'assistant',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        action,
        success,
        project_ids: projectIds,
        project_names: projectNames,
        entity_type: 'project',
      })
      .catch((error) => {
        this.logger.warn(`[ProjectAgent] Failed to store assistant message: ${error.message}`);
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
        this.logger.warn('[ProjectAgent] Conversation memory not ready, skipping history lookup');
        return [];
      }

      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        10, // Get top 10 most relevant messages
      );
    } catch (error) {
      this.logger.warn(`[ProjectAgent] Failed to get conversation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract project IDs from operation result
   */
  private extractProjectIds(result: ProjectAgentResponse): string[] {
    const ids: string[] = [];

    if (result.data?.project?.id) {
      ids.push(result.data.project.id);
    }

    if (result.data?.deletedProjectId) {
      ids.push(result.data.deletedProjectId);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.project?.id) ids.push(r.project.id);
        if (r.projectId) ids.push(r.projectId);
      });
    }

    return ids;
  }

  /**
   * Extract project names from operation result
   */
  private extractProjectNames(result: ProjectAgentResponse): string[] {
    const names: string[] = [];

    if (result.data?.project?.name) {
      names.push(result.data.project.name);
    }

    if (result.data?.deletedProjectName) {
      names.push(result.data.deletedProjectName);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.name) names.push(r.name);
        if (r.project?.name) names.push(r.project.name);
      });
    }

    return names;
  }

  /**
   * Get existing projects in the workspace for context
   */
  private async getExistingProjects(workspaceId: string, userId: string): Promise<any[]> {
    try {
      const projects = await this.projectsService.findAll(workspaceId, userId);
      return projects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: p.type || 'kanban',
        status: p.status || 'active',
        priority: p.priority || 'medium',
        start_date: p.start_date,
        end_date: p.end_date,
        estimated_hours: p.estimated_hours,
        budget: p.budget,
      }));
    } catch (error) {
      this.logger.warn(`[ProjectAgent] Could not fetch existing projects: ${error.message}`);
      return [];
    }
  }

  /**
   * Get workspace members with their user_id and names resolved via database getUserById
   * This fetches member IDs from workspace_members table and resolves names
   */
  private async getWorkspaceMembers(
    workspaceId: string,
    _userId: string,
  ): Promise<WorkspaceMember[]> {
    try {
      // Step 1: Get member IDs from workspace_members table
      const membersResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      const members = membersResult.data || [];
      this.logger.log(`[ProjectAgent] Found ${members.length} workspace members`);

      // Step 2: For each member, get user details using database getUserById
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
            this.logger.warn(
              `[ProjectAgent] Could not fetch user details for ${member.user_id}: ${error.message}`,
            );
            return {
              user_id: member.user_id,
              name: null,
              username: null,
              email: null,
              role: member.role,
            };
          }
        }),
      );

      this.logger.log(
        `[ProjectAgent] Resolved names for members: ${JSON.stringify(membersWithNames.map((m) => ({ id: m.user_id, name: m.name })))}`,
      );
      return membersWithNames;
    } catch (error) {
      this.logger.warn(`[ProjectAgent] Could not fetch workspace members: ${error.message}`);
      return [];
    }
  }

  /**
   * Validate and resolve user IDs in the parsed details
   * AI should return user_ids directly, but this serves as validation and fallback
   * Note: owner_id is NOT handled here - it's always set to the current user in createProject
   */
  private resolveUserIds(details: ProjectDetails, members: WorkspaceMember[]): void {
    // Remove any owner_id from AI response - owner is always the creating user
    if (details.owner_id) {
      this.logger.log(`[ProjectAgent] Ignoring owner_id from AI - will use current user as owner`);
      delete details.owner_id;
    }

    // Validate/resolve lead_id
    if (details.lead_id) {
      if (this.isValidUUID(details.lead_id)) {
        // Verify this UUID exists in workspace members
        const memberExists = members.some((m) => m.user_id === details.lead_id);
        if (memberExists) {
          this.logger.log(`[ProjectAgent] lead_id "${details.lead_id}" is valid workspace member`);
        } else {
          this.logger.warn(
            `[ProjectAgent] lead_id "${details.lead_id}" is not a workspace member, removing`,
          );
          delete details.lead_id;
        }
      } else {
        // AI returned a name instead of UUID - try to resolve it (fallback)
        const resolvedId = this.findUserIdByNameOrEmail(details.lead_id, members);
        if (resolvedId) {
          this.logger.log(
            `[ProjectAgent] Resolved lead name "${details.lead_id}" to user ID: ${resolvedId}`,
          );
          details.lead_id = resolvedId;
        } else {
          this.logger.warn(
            `[ProjectAgent] Could not resolve lead "${details.lead_id}" to a workspace member`,
          );
          delete details.lead_id;
        }
      }
    }

    // Validate/resolve default_assignee_ids in collaborative_data
    if (details.collaborative_data?.default_assignee_ids) {
      const resolvedAssignees = details.collaborative_data.default_assignee_ids
        .map((idOrName: string) => {
          if (this.isValidUUID(idOrName)) {
            // Verify this UUID exists in workspace members
            const memberExists = members.some((m) => m.user_id === idOrName);
            if (memberExists) {
              return idOrName;
            }
            this.logger.warn(`[ProjectAgent] Assignee "${idOrName}" is not a workspace member`);
            return null;
          }
          // AI returned a name instead of UUID - try to resolve it (fallback)
          const resolvedId = this.findUserIdByNameOrEmail(idOrName, members);
          if (resolvedId) {
            this.logger.log(
              `[ProjectAgent] Resolved assignee name "${idOrName}" to user ID: ${resolvedId}`,
            );
            return resolvedId;
          }
          this.logger.warn(
            `[ProjectAgent] Could not resolve assignee "${idOrName}" to a workspace member`,
          );
          return null;
        })
        .filter((id: string | null): id is string => id !== null);

      details.collaborative_data.default_assignee_ids = resolvedAssignees;
    }
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Find user ID by name, username, or email (case-insensitive, partial match)
   */
  private findUserIdByNameOrEmail(searchTerm: string, members: WorkspaceMember[]): string | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    // First try exact match on name
    for (const member of members) {
      if (member.name?.toLowerCase() === normalizedSearch) {
        return member.user_id;
      }
    }

    // Try exact match on username
    for (const member of members) {
      if (member.username?.toLowerCase() === normalizedSearch) {
        return member.user_id;
      }
    }

    // Try exact match on email
    for (const member of members) {
      if (member.email?.toLowerCase() === normalizedSearch) {
        return member.user_id;
      }
    }

    // Try partial match on name (contains)
    for (const member of members) {
      if (member.name?.toLowerCase().includes(normalizedSearch)) {
        return member.user_id;
      }
    }

    // Try partial match on username
    for (const member of members) {
      if (member.username?.toLowerCase().includes(normalizedSearch)) {
        return member.user_id;
      }
    }

    // Try if search term contains part of the name (e.g., "sohag" matches "Sohag Abdullah")
    for (const member of members) {
      const nameParts = member.name?.toLowerCase().split(/\s+/) || [];
      if (
        nameParts.some(
          (part: string) => part === normalizedSearch || normalizedSearch.includes(part),
        )
      ) {
        return member.user_id;
      }
    }

    return null;
  }

  /**
   * Use database AI to parse the user's natural language intent
   */
  private async parseIntentWithAI(
    prompt: string,
    existingProjects: any[],
    workspaceMembers: WorkspaceMember[],
    conversationHistory: ConversationSearchResult[] = [],
  ): Promise<ParsedIntent> {
    const projectsList =
      existingProjects.length > 0
        ? existingProjects
            .map(
              (p) =>
                `- "${p.name}" (ID: ${p.id}, Type: ${p.type}, Status: ${p.status}, Priority: ${p.priority}, Start: ${p.start_date || 'not set'}, End: ${p.end_date || 'not set'})`,
            )
            .join('\n')
        : 'No projects available';

    // Build workspace members list for context - showing user_id WITH name so AI can return the correct ID
    const membersList =
      workspaceMembers.length > 0
        ? workspaceMembers
            .map(
              (m) =>
                `- USER_ID: "${m.user_id}", Name: "${m.name || 'Unknown'}", Username: "${m.username || 'N/A'}", Email: "${m.email || 'N/A'}", Role: ${m.role}`,
            )
            .join('\n')
        : 'No members available';

    // Build conversation history context from Qdrant semantic search results
    const conversationContext =
      this.conversationMemoryService.buildContextFromHistory(conversationHistory);

    const aiPrompt = `You are a project management assistant with access to conversation history. Analyze the user's command and extract their intent to create, update, or delete projects. You can handle SINGLE or BATCH operations.

User command: "${prompt}"
${conversationContext}
Available projects in workspace:
${projectsList}

Workspace members (IMPORTANT: Use the USER_ID when assigning lead or assignees):
${membersList}

You must respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation. Just the JSON:

// FOR SINGLE OPERATION (one project):
{
  "action": "create" | "update" | "delete" | "unknown",
  "projectName": "project name",
  "projectId": "project UUID if update/delete",
  "details": { /* project fields */ }
}

// FOR BATCH CREATE (multiple new projects):
{
  "action": "batch_create",
  "batch_create": [
    { "details": { "name": "Project 1", "priority": "high", "lead_id": "USER_ID", ... } },
    { "details": { "name": "Project 2", "type": "scrum", ... } }
  ]
}

// FOR BATCH UPDATE (update multiple projects or update one project with multiple fields):
{
  "action": "batch_update",
  "batch_update": [
    { "projectId": "uuid-1", "projectName": "Project Name 1", "updates": { "priority": "high", "status": "on_hold" } },
    { "projectId": "uuid-2", "projectName": "Project Name 2", "updates": { "lead_id": "USER_ID", "end_date": "2025-12-31" } }
  ]
}

// FOR BATCH DELETE (multiple projects):
{
  "action": "batch_delete",
  "batch_delete": [
    { "projectId": "uuid-1", "projectName": "Project Name 1" },
    { "projectId": "uuid-2", "projectName": "Project Name 2" }
  ]
}

Project Details Fields (for "details" or "updates"):
- name: string
- description: string
- type: "kanban" | "scrum" | "bug_tracking" | "feature" | "research"
- status: "active" | "on_hold" | "completed" | "archived"
- priority: "low" | "medium" | "high" | "critical"
- lead_id: USER_ID (UUID) from workspace members list
- start_date: "YYYY-MM-DD"
- end_date: "YYYY-MM-DD"
- estimated_hours: number
- budget: number
- is_template: boolean
- kanban_stages: [{ "id": "stage-id", "name": "Stage Name", "order": 1, "color": "#hexcolor" }]
- collaborative_data: { "default_assignee_ids": ["USER_ID-1", "USER_ID-2"] }

IMPORTANT RULES:

1. DETECT BATCH vs SINGLE OPERATIONS:
   - Batch indicators: "create 3 projects", "delete ProjectA and ProjectB", "update both X and Y", "change priority of all active projects"
   - Single indicators: "create a project", "delete ProjectA", "update ProjectX to set priority high"

2. BATCH CREATE: User wants to create 2+ projects
   - Set action to "batch_create"
   - Create array of project details
   - Each item needs at least "name"
   - If user doesn't provide explicit names, generate descriptive names like "New Project 1", "New Project 2", etc.

3. BATCH UPDATE: User wants to update 2+ projects OR update 1 project with multiple fields
   - Set action to "batch_update"
   - Find project IDs from available projects list
   - Include ONLY fields user wants to change in "updates"
   - Example: "update ProjectA and ProjectB to high priority" -> batch_update with 2 items
   - Example: "change ProjectX priority to high and set lead to john" -> batch_update with 1 item having multiple field updates

4. BATCH DELETE: User wants to delete 2+ projects
   - Set action to "batch_delete"
   - Find project IDs from available projects list

5. SINGLE OPERATIONS: Use "create", "update", or "delete" actions for single project operations

6. DEFAULTS (for create/batch_create):
   - type: defaults to "kanban" if not specified
   - status: defaults to "active" if not specified
   - priority: defaults to "medium" if not specified
   - description: defaults to "Created via AI Assistant" if not specified

7. FLEXIBLE MATCHING:
   - Project names: partial match OK, case insensitive
   - Dates: "next Monday", "Jan 15", "2024-01-15" -> convert to "YYYY-MM-DD"
   - Durations: "40 hours", "2 weeks" -> convert to number (hours)
   - Budget: "$5000", "5k" -> convert to number (5000)

8. CRITICAL FOR PEOPLE FIELDS (lead_id, default_assignee_ids):
   - Find member from workspace members list above
   - ALWAYS use the USER_ID (UUID), NOT the name
   - Example: "sohag as lead" -> find member with name containing "sohag" -> use their USER_ID

9. Common phrases:
   - Create: "create", "add", "make", "start", "new"
   - Update: "change", "set", "update", "modify", "rename"
   - Delete: "delete", "remove", "get rid of"
   - Batch: "create 3", "create 2", "both", "all", "and", "multiple", "several"
   - Priority: "urgent", "important", "low priority", "critical", "high priority"
   - Status: "complete", "on hold", "pause", "archive", "activate"
   - People: "assign to", "lead is", "project lead", "managed by"

10. EXAMPLE BATCH CREATE PARSING:
   User: "create 2 new projects, in one create sohag abdullah the lead, and in another make test user 1 the lead"
   Response: {
     "action": "batch_create",
     "batch_create": [
       { "details": { "name": "New Project 1", "lead_id": "USER_ID_OF_SOHAG" } },
       { "details": { "name": "New Project 2", "lead_id": "USER_ID_OF_TEST_USER_1" } }
     ]
   }`;

    try {
      const response = await this.aiProvider.generateText(aiPrompt, {
        saveToDatabase: false,
      });

      // Extract text content from response
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

      // Clean up the response - remove any markdown formatting
      const cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      this.logger.debug(`[ProjectAgent] AI response: ${cleanedContent}`);

      const parsed = JSON.parse(cleanedContent);

      this.logger.log(`[ProjectAgent] Parsed AI response action: ${parsed.action}`);
      if (parsed.batch_create) {
        this.logger.log(`[ProjectAgent] Batch create items count: ${parsed.batch_create.length}`);
      }
      if (parsed.batch_update) {
        this.logger.log(`[ProjectAgent] Batch update items count: ${parsed.batch_update.length}`);
      }
      if (parsed.batch_delete) {
        this.logger.log(`[ProjectAgent] Batch delete items count: ${parsed.batch_delete.length}`);
      }

      return {
        action: parsed.action || 'unknown',
        projectName: parsed.projectName,
        projectId: parsed.projectId,
        details: parsed.details || {},
        batch_create: parsed.batch_create,
        batch_update: parsed.batch_update,
        batch_delete: parsed.batch_delete,
      };
    } catch (error) {
      this.logger.error(`[ProjectAgent] AI parsing failed: ${error.message}`);
      return {
        action: 'unknown',
        details: {},
      };
    }
  }

  /**
   * Execute the parsed action
   */
  private async executeAction(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    switch (intent.action) {
      case 'create':
        return this.createProject(intent, workspaceId, userId);

      case 'update':
        return this.updateProject(intent, userId);

      case 'delete':
        return this.deleteProject(intent, userId);

      case 'batch_create':
        return this.batchCreateProjects(intent, workspaceId, userId);

      case 'batch_update':
        return this.batchUpdateProjects(intent, userId);

      case 'batch_delete':
        return this.batchDeleteProjects(intent, userId);

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
   * Build CreateProjectDto from parsed details with proper defaults
   * Ensures all required/non-nullable fields have values
   * owner_id is always set to the current user (userId)
   */
  private buildCreateProjectDto(details: ProjectDetails, userId: string): CreateProjectDto {
    const dto: CreateProjectDto = {
      // Required field
      name: details.name!,

      // Always set defaults for fields that should not be null
      description: details.description || 'Created via AI Assistant',
      type: mapToProjectType(details.type) || ProjectType.KANBAN,
      status: mapToProjectStatus(details.status) || ProjectStatus.ACTIVE,
      priority: mapToProjectPriority(details.priority) || ProjectPriority.MEDIUM,
      is_template: details.is_template ?? false,
    };

    // Owner is always the current user creating the project
    dto.owner_id = userId;

    // Lead - optional, resolved from workspace members
    if (details.lead_id) dto.lead_id = details.lead_id;

    // Dates - optional, can be undefined
    if (details.start_date) dto.start_date = details.start_date;
    if (details.end_date) dto.end_date = details.end_date;

    // Metrics - optional, can be undefined
    if (details.estimated_hours !== undefined) dto.estimated_hours = details.estimated_hours;
    if (details.budget !== undefined) dto.budget = details.budget;

    // Kanban stages - provide default stages if not specified
    if (details.kanban_stages && details.kanban_stages.length > 0) {
      dto.kanban_stages = details.kanban_stages.map((stage, index) => {
        const stageDto = new KanbanStageDto();
        stageDto.id = stage.id || this.generateStageId(stage.name);
        stageDto.name = stage.name;
        stageDto.order = stage.order ?? index + 1;
        stageDto.color = stage.color || this.getDefaultStageColor(index);
        return stageDto;
      });
    }
    // Note: Default kanban stages are handled by ProjectsService if not provided

    // Attachments - optional, ProjectsService handles defaults
    if (details.attachments) {
      dto.attachments = {
        note_attachment: details.attachments.note_attachment || [],
        file_attachment: details.attachments.file_attachment || [],
        event_attachment: details.attachments.event_attachment || [],
      };
    }

    // Collaborative data - optional, ProjectsService handles defaults
    if (details.collaborative_data) {
      dto.collaborative_data = details.collaborative_data;
    }

    return dto;
  }

  /**
   * Generate a slug-like ID from stage name
   */
  private generateStageId(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Get default color for kanban stage
   */
  private getDefaultStageColor(index: number): string {
    const colors = ['#6B7280', '#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'];
    return colors[index % colors.length];
  }

  /**
   * Create a new project
   */
  private async createProject(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    const { details } = intent;

    if (!details.name) {
      return {
        success: false,
        action: 'create',
        message:
          'Please provide a name for the project. For example: "Create a project called Marketing Campaign"',
        error: 'MISSING_PROJECT_NAME',
      };
    }

    try {
      // Build the complete DTO with proper defaults (owner_id is always set to current user)
      const createDto = this.buildCreateProjectDto(details, userId);

      this.logger.log(`[ProjectAgent] Creating project with DTO: ${JSON.stringify(createDto)}`);

      const project = await this.projectsService.create(workspaceId, createDto, userId);

      // Build a human-readable summary of what was created
      const summary = this.buildCreationSummary(createDto);

      return {
        success: true,
        action: 'create',
        message: `Project "${project.name}" has been created successfully!${summary}`,
        data: {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            status: project.status,
            priority: project.priority,
            owner_id: project.owner_id,
            lead_id: project.lead_id,
            start_date: project.start_date,
            end_date: project.end_date,
            estimated_hours: project.estimated_hours,
            budget: project.budget,
            is_template: project.is_template,
            kanban_stages: project.kanban_stages,
            attachments: project.attachments,
            collaborative_data: project.collaborative_data,
            created_at: project.created_at,
            updated_at: project.updated_at,
          },
        },
      };
    } catch (error) {
      this.logger.error(`[ProjectAgent] Create project failed: ${error.message}`);
      return {
        success: false,
        action: 'create',
        message: `Failed to create project: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Build human-readable summary of created project details
   */
  private buildCreationSummary(dto: CreateProjectDto): string {
    const parts: string[] = [];

    if (dto.type) parts.push(`Type: ${dto.type}`);
    if (dto.priority) parts.push(`Priority: ${dto.priority}`);
    if (dto.status) parts.push(`Status: ${dto.status}`);
    if (dto.start_date) parts.push(`Start: ${dto.start_date}`);
    if (dto.end_date) parts.push(`End: ${dto.end_date}`);
    if (dto.estimated_hours) parts.push(`Estimated: ${dto.estimated_hours} hours`);
    if (dto.budget) parts.push(`Budget: $${dto.budget}`);
    if (dto.kanban_stages && dto.kanban_stages.length > 0) {
      parts.push(`Stages: ${dto.kanban_stages.map((s) => s.name).join(', ')}`);
    }

    return parts.length > 0 ? ` (${parts.join(', ')})` : '';
  }

  /**
   * Update an existing project
   */
  private async updateProject(intent: ParsedIntent, userId: string): Promise<ProjectAgentResponse> {
    const { projectId, projectName, details } = intent;

    if (!projectId) {
      return {
        success: false,
        action: 'update',
        message: `Could not find project "${projectName || 'Unknown'}". Please make sure the project exists.`,
        error: 'PROJECT_NOT_FOUND',
      };
    }

    // Build update fields from details
    const updateFields: any = {};

    // Basic fields
    if (details.name) updateFields.name = details.name;
    if (details.description) updateFields.description = details.description;
    if (details.type) updateFields.type = mapToProjectType(details.type);
    if (details.status) updateFields.status = mapToProjectStatus(details.status);
    if (details.priority) updateFields.priority = mapToProjectPriority(details.priority);

    // People
    if (details.owner_id) updateFields.owner_id = details.owner_id;
    if (details.lead_id) updateFields.lead_id = details.lead_id;

    // Dates
    if (details.start_date) updateFields.start_date = details.start_date;
    if (details.end_date) updateFields.end_date = details.end_date;

    // Metrics
    if (details.estimated_hours !== undefined)
      updateFields.estimated_hours = details.estimated_hours;
    if (details.budget !== undefined) updateFields.budget = details.budget;

    // Configuration
    if (details.is_template !== undefined) updateFields.is_template = details.is_template;

    // Kanban stages
    if (details.kanban_stages && details.kanban_stages.length > 0) {
      updateFields.kanban_stages = details.kanban_stages.map((stage, index) => ({
        id: stage.id || `stage-${index + 1}`,
        name: stage.name,
        order: stage.order ?? index + 1,
        color: stage.color || this.getDefaultStageColor(index),
      }));
    }

    // Attachments
    if (details.attachments) {
      updateFields.attachments = details.attachments;
    }

    // Collaborative data
    if (details.collaborative_data) {
      updateFields.collaborative_data = details.collaborative_data;
    }

    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        action: 'update',
        message:
          'Please specify what you want to update. For example: "Change Marketing Campaign priority to high" or "Set deadline to January 15th"',
        error: 'NO_UPDATES_SPECIFIED',
      };
    }

    try {
      const project = await this.projectsService.update(projectId, updateFields, userId);

      const changesDescription = Object.entries(updateFields)
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return `${key}: updated`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');

      return {
        success: true,
        action: 'update',
        message: `Project "${projectName}" has been updated! Changes: ${changesDescription}`,
        data: {
          project: {
            id: project.id,
            name: project.name,
            description: project.description,
            type: project.type,
            status: project.status,
            priority: project.priority,
            owner_id: project.owner_id,
            lead_id: project.lead_id,
            start_date: project.start_date,
            end_date: project.end_date,
            estimated_hours: project.estimated_hours,
            budget: project.budget,
            is_template: project.is_template,
            kanban_stages: project.kanban_stages,
            attachments: project.attachments,
            collaborative_data: project.collaborative_data,
            updated_at: project.updated_at,
          },
          updatedFields: updateFields,
        },
      };
    } catch (error) {
      this.logger.error(`[ProjectAgent] Update project failed: ${error.message}`);
      return {
        success: false,
        action: 'update',
        message: `Failed to update project: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete a project
   */
  private async deleteProject(intent: ParsedIntent, userId: string): Promise<ProjectAgentResponse> {
    const { projectId, projectName } = intent;

    if (!projectId) {
      return {
        success: false,
        action: 'delete',
        message: `Could not find project "${projectName || 'Unknown'}". Please make sure the project exists.`,
        error: 'PROJECT_NOT_FOUND',
      };
    }

    try {
      await this.projectsService.remove(projectId, userId);

      return {
        success: true,
        action: 'delete',
        message: `Project "${projectName}" has been deleted successfully.`,
        data: {
          deletedProjectId: projectId,
          deletedProjectName: projectName,
        },
      };
    } catch (error) {
      this.logger.error(`[ProjectAgent] Delete project failed: ${error.message}`);
      return {
        success: false,
        action: 'delete',
        message: `Failed to delete project: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Batch create multiple projects
   */
  private async batchCreateProjects(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    const items = intent.batch_create || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_create',
        message: 'No projects specified to create.',
        error: 'NO_PROJECTS_SPECIFIED',
      };
    }

    this.logger.log(`[ProjectAgent] Batch creating ${items.length} projects`);

    const results: Array<{ success: boolean; project?: any; error?: string; name?: string }> = [];

    // Create projects sequentially to avoid overwhelming the system
    for (const item of items) {
      try {
        if (!item.details.name) {
          results.push({
            success: false,
            error: 'Missing project name',
            name: 'Unknown',
          });
          continue;
        }

        const createDto = this.buildCreateProjectDto(item.details, userId);
        const project = await this.projectsService.create(workspaceId, createDto, userId);

        results.push({
          success: true,
          project: {
            id: project.id,
            name: project.name,
            type: project.type,
            status: project.status,
            priority: project.priority,
          },
          name: project.name,
        });

        this.logger.log(`[ProjectAgent] Created project: ${project.name}`);
      } catch (error) {
        this.logger.error(
          `[ProjectAgent] Failed to create project ${item.details.name}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          name: item.details.name,
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
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch update multiple projects
   */
  private async batchUpdateProjects(
    intent: ParsedIntent,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    const items = intent.batch_update || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_update',
        message: 'No projects specified to update.',
        error: 'NO_PROJECTS_SPECIFIED',
      };
    }

    this.logger.log(`[ProjectAgent] Batch updating ${items.length} projects`);

    const results: Array<{ success: boolean; project?: any; error?: string; name?: string }> = [];

    // Update projects sequentially
    for (const item of items) {
      try {
        if (!item.projectId) {
          results.push({
            success: false,
            error: 'Project not found',
            name: item.projectName || 'Unknown',
          });
          continue;
        }

        // Build update fields from item.updates
        const updateFields: any = {};

        if (item.updates.name) updateFields.name = item.updates.name;
        if (item.updates.description) updateFields.description = item.updates.description;
        if (item.updates.type) updateFields.type = mapToProjectType(item.updates.type);
        if (item.updates.status) updateFields.status = mapToProjectStatus(item.updates.status);
        if (item.updates.priority)
          updateFields.priority = mapToProjectPriority(item.updates.priority);
        if (item.updates.lead_id) updateFields.lead_id = item.updates.lead_id;
        if (item.updates.start_date) updateFields.start_date = item.updates.start_date;
        if (item.updates.end_date) updateFields.end_date = item.updates.end_date;
        if (item.updates.estimated_hours !== undefined)
          updateFields.estimated_hours = item.updates.estimated_hours;
        if (item.updates.budget !== undefined) updateFields.budget = item.updates.budget;
        if (item.updates.is_template !== undefined)
          updateFields.is_template = item.updates.is_template;
        if (item.updates.kanban_stages) updateFields.kanban_stages = item.updates.kanban_stages;
        if (item.updates.attachments) updateFields.attachments = item.updates.attachments;
        if (item.updates.collaborative_data)
          updateFields.collaborative_data = item.updates.collaborative_data;

        if (Object.keys(updateFields).length === 0) {
          results.push({
            success: false,
            error: 'No updates specified',
            name: item.projectName,
          });
          continue;
        }

        const project = await this.projectsService.update(item.projectId, updateFields, userId);

        results.push({
          success: true,
          project: {
            id: project.id,
            name: project.name,
            type: project.type,
            status: project.status,
            priority: project.priority,
          },
          name: project.name,
        });

        this.logger.log(`[ProjectAgent] Updated project: ${project.name}`);
      } catch (error) {
        this.logger.error(
          `[ProjectAgent] Failed to update project ${item.projectName}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          name: item.projectName,
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
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch delete multiple projects
   */
  private async batchDeleteProjects(
    intent: ParsedIntent,
    userId: string,
  ): Promise<ProjectAgentResponse> {
    const items = intent.batch_delete || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_delete',
        message: 'No projects specified to delete.',
        error: 'NO_PROJECTS_SPECIFIED',
      };
    }

    this.logger.log(`[ProjectAgent] Batch deleting ${items.length} projects`);

    const results: Array<{ success: boolean; projectId?: string; error?: string; name?: string }> =
      [];

    // Delete projects sequentially
    for (const item of items) {
      try {
        if (!item.projectId) {
          results.push({
            success: false,
            error: 'Project not found',
            name: item.projectName || 'Unknown',
          });
          continue;
        }

        await this.projectsService.remove(item.projectId, userId);

        results.push({
          success: true,
          projectId: item.projectId,
          name: item.projectName,
        });

        this.logger.log(`[ProjectAgent] Deleted project: ${item.projectName}`);
      } catch (error) {
        this.logger.error(
          `[ProjectAgent] Failed to delete project ${item.projectName}: ${error.message}`,
        );
        results.push({
          success: false,
          error: error.message,
          name: item.projectName,
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
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }
}
