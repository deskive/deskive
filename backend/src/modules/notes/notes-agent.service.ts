import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { NotesService } from './notes.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';
import { CreateNoteDto } from './dto/create-note.dto';

// Workspace member interface for user lookup
interface WorkspaceMember {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
}

export interface NoteAgentRequest {
  prompt: string;
  workspaceId: string;
}

export interface NoteAgentResponse {
  success: boolean;
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'share'
    | 'archive'
    | 'unarchive'
    | 'duplicate'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'batch_share'
    | 'search'
    | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

// Note details matching CreateNoteDto
interface NoteDetails {
  title?: string;
  content?: string;
  parent_id?: string;
  template_id?: string;
  tags?: string[];
  cover_image?: string;
  icon?: string;
  is_public?: boolean;
  attachments?: {
    note_attachment?: string[];
    file_attachment?: string[];
    event_attachment?: string[];
  };
}

// Batch operation support
interface BatchCreateItem {
  details: NoteDetails;
}

interface BatchUpdateItem {
  noteId: string;
  noteName: string;
  updates: Partial<NoteDetails>;
}

interface BatchDeleteItem {
  noteId: string;
  noteName: string;
}

interface BatchShareItem {
  noteId: string;
  noteName: string;
  userIds: string[];
}

interface ParsedIntent {
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'share'
    | 'archive'
    | 'unarchive'
    | 'duplicate'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'batch_share'
    | 'search'
    | 'unknown';

  // Single operation fields
  noteName?: string;
  noteId?: string;
  details?: NoteDetails;
  searchQuery?: string;

  // Share operation fields
  shareWith?: string[]; // User IDs to share with

  // Batch operation fields
  batch_create?: BatchCreateItem[];
  batch_update?: BatchUpdateItem[];
  batch_delete?: BatchDeleteItem[];
  batch_share?: BatchShareItem[];
}

@Injectable()
export class NotesAgentService {
  private readonly logger = new Logger(NotesAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notesService: NotesService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  /**
   * Main entry point for the Notes AI Agent
   * Receives natural language prompt and executes the appropriate action
   */
  async processCommand(request: NoteAgentRequest, userId: string): Promise<NoteAgentResponse> {
    const { prompt, workspaceId } = request;

    this.logger.log(`[NotesAgent] Processing command: "${prompt}" for workspace: ${workspaceId}`);

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
        `[NotesAgent] Found ${conversationHistory.length} relevant historical messages`,
      );

      // Step 3: Get existing notes for context
      const existingNotes = await this.getExistingNotes(workspaceId, userId);

      // Step 4: Get workspace members for user ID resolution (for sharing)
      const workspaceMembers = await this.getWorkspaceMembers(workspaceId, userId);

      // Step 5: Use AI to parse the user's intent
      const parsedIntent = await this.parseIntentWithAI(
        prompt,
        existingNotes,
        workspaceMembers,
        conversationHistory,
      );

      this.logger.log(`[NotesAgent] Parsed intent: ${JSON.stringify(parsedIntent)}`);

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
            'I could not understand your request. Please try commands like "Create a note called Meeting Notes" or "Update My Ideas to add the tag important".',
          error: 'INTENT_NOT_UNDERSTOOD',
        };
      }

      // Step 6: Resolve user names to IDs for share operations
      if (parsedIntent.action === 'share' && parsedIntent.shareWith) {
        parsedIntent.shareWith = this.resolveUserIds(parsedIntent.shareWith, workspaceMembers);
      } else if (parsedIntent.action === 'batch_share') {
        parsedIntent.batch_share?.forEach((item) => {
          item.userIds = this.resolveUserIds(item.userIds, workspaceMembers);
        });
      }

      // Step 7: Execute the action
      const result = await this.executeAction(parsedIntent, workspaceId, userId);

      // Step 8: Store AI response in conversation memory
      this.storeAssistantMessage(
        result.message,
        workspaceId,
        userId,
        result.action,
        result.success,
        this.extractNoteIds(result),
        this.extractNoteNames(result),
      );

      return result;
    } catch (error) {
      this.logger.error(`[NotesAgent] Error processing command: ${error.message}`, error.stack);
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
    this.conversationMemoryService
      .storeMessage({
        role: 'user',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'note',
      })
      .catch((error) => {
        this.logger.warn(`[NotesAgent] Failed to store user message: ${error.message}`);
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
    noteIds?: string[],
    noteNames?: string[],
  ): void {
    this.conversationMemoryService
      .storeMessage({
        role: 'assistant',
        content,
        workspace_id: workspaceId,
        user_id: userId,
        action,
        success,
        project_ids: noteIds, // Reusing project_ids field for note_ids
        project_names: noteNames, // Reusing project_names field for note_names
        entity_type: 'note',
      })
      .catch((error) => {
        this.logger.warn(`[NotesAgent] Failed to store assistant message: ${error.message}`);
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
        this.logger.warn('[NotesAgent] Conversation memory not ready, skipping history lookup');
        return [];
      }

      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        10,
      );
    } catch (error) {
      this.logger.warn(`[NotesAgent] Failed to get conversation history: ${error.message}`);
      return [];
    }
  }

  /**
   * Extract note IDs from operation result
   */
  private extractNoteIds(result: NoteAgentResponse): string[] {
    const ids: string[] = [];

    if (result.data?.note?.id) {
      ids.push(result.data.note.id);
    }

    if (result.data?.deletedNoteId) {
      ids.push(result.data.deletedNoteId);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.note?.id) ids.push(r.note.id);
        if (r.noteId) ids.push(r.noteId);
      });
    }

    return ids;
  }

  /**
   * Extract note names from operation result
   */
  private extractNoteNames(result: NoteAgentResponse): string[] {
    const names: string[] = [];

    if (result.data?.note?.title) {
      names.push(result.data.note.title);
    }

    if (result.data?.deletedNoteName) {
      names.push(result.data.deletedNoteName);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.name) names.push(r.name);
        if (r.title) names.push(r.title);
        if (r.note?.title) names.push(r.note.title);
      });
    }

    return names;
  }

  /**
   * Get existing notes in the workspace for context
   */
  private async getExistingNotes(workspaceId: string, userId: string): Promise<any[]> {
    try {
      const notes = await this.notesService.getNotes(workspaceId, undefined, userId, false);
      return notes.map((n: any) => ({
        id: n.id,
        title: n.title,
        tags: n.tags || [],
        is_public: n.is_public,
        parent_id: n.parent_id,
        icon: n.icon,
        created_at: n.created_at,
        updated_at: n.updated_at,
      }));
    } catch (error) {
      this.logger.warn(`[NotesAgent] Could not fetch existing notes: ${error.message}`);
      return [];
    }
  }

  /**
   * Get workspace members for user ID resolution
   */
  private async getWorkspaceMembers(
    workspaceId: string,
    _userId: string,
  ): Promise<WorkspaceMember[]> {
    try {
      const membersResult = await this.db
        .table('workspace_members')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('is_active', '=', true)
        .execute();

      const members = membersResult.data || [];
      this.logger.log(`[NotesAgent] Found ${members.length} workspace members`);

      const membersWithNames: WorkspaceMember[] = await Promise.all(
        members.map(async (member: any) => {
          try {
            const userProfile = await this.db.getUserById(member.user_id);
            const metadata = (userProfile as any)?.metadata || {};

            return {
              user_id: member.user_id,
              name:
                metadata.name ||
                (userProfile as any)?.fullName ||
                (userProfile as any)?.name ||
                null,
              username: (userProfile as any)?.username || metadata.username || null,
              email: (userProfile as any)?.email || null,
              role: member.role,
            };
          } catch (error) {
            this.logger.warn(
              `[NotesAgent] Could not fetch user details for ${member.user_id}: ${error.message}`,
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

      return membersWithNames;
    } catch (error) {
      this.logger.warn(`[NotesAgent] Could not fetch workspace members: ${error.message}`);
      return [];
    }
  }

  /**
   * Resolve user names/emails to user IDs
   */
  private resolveUserIds(userIdentifiers: string[], members: WorkspaceMember[]): string[] {
    return userIdentifiers
      .map((identifier) => {
        // If already a UUID, validate it exists
        if (this.isValidUUID(identifier)) {
          const memberExists = members.some((m) => m.user_id === identifier);
          if (memberExists) {
            return identifier;
          }
          this.logger.warn(`[NotesAgent] User ID "${identifier}" is not a workspace member`);
          return null;
        }

        // Try to find by name/username/email
        const resolvedId = this.findUserIdByNameOrEmail(identifier, members);
        if (resolvedId) {
          this.logger.log(`[NotesAgent] Resolved user "${identifier}" to ID: ${resolvedId}`);
          return resolvedId;
        }

        this.logger.warn(
          `[NotesAgent] Could not resolve user "${identifier}" to a workspace member`,
        );
        return null;
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
  private findUserIdByNameOrEmail(searchTerm: string, members: WorkspaceMember[]): string | null {
    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Try exact match on name
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

    // Try partial match on name
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

    return null;
  }

  /**
   * Use database AI to parse the user's natural language intent
   */
  private async parseIntentWithAI(
    prompt: string,
    existingNotes: any[],
    workspaceMembers: WorkspaceMember[],
    conversationHistory: ConversationSearchResult[] = [],
  ): Promise<ParsedIntent> {
    const notesList =
      existingNotes.length > 0
        ? existingNotes
            .map(
              (n) =>
                `- "${n.title}" (ID: ${n.id}, Tags: [${(n.tags || []).join(', ')}], Public: ${n.is_public}, Parent: ${n.parent_id || 'none'})`,
            )
            .join('\n')
        : 'No notes available';

    const membersList =
      workspaceMembers.length > 0
        ? workspaceMembers
            .map(
              (m) =>
                `- USER_ID: "${m.user_id}", Name: "${m.name || 'Unknown'}", Username: "${m.username || 'N/A'}", Email: "${m.email || 'N/A'}"`,
            )
            .join('\n')
        : 'No members available';

    const conversationContext =
      this.conversationMemoryService.buildContextFromHistory(conversationHistory);

    const aiPrompt = `You are a notes management assistant with access to conversation history. Analyze the user's command and extract their intent to create, update, delete, share, archive, or search notes. You can handle SINGLE or BATCH operations.

User command: "${prompt}"
${conversationContext}
Available notes in workspace:
${notesList}

Workspace members (for sharing - use USER_ID):
${membersList}

You must respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation. Just the JSON:

// FOR SINGLE OPERATIONS:
{
  "action": "create" | "update" | "delete" | "share" | "archive" | "unarchive" | "duplicate" | "search" | "unknown",
  "noteName": "note title",
  "noteId": "note UUID if update/delete/share",
  "details": { /* note fields for create/update */ },
  "shareWith": ["USER_ID-1", "USER_ID-2"], // for share action
  "searchQuery": "search terms" // for search action
}

// FOR BATCH CREATE:
{
  "action": "batch_create",
  "batch_create": [
    { "details": { "title": "Note 1", "content": "<p>Content</p>", "tags": ["tag1"] } },
    { "details": { "title": "Note 2", "content": "<p>Content 2</p>" } }
  ]
}

// FOR BATCH UPDATE:
{
  "action": "batch_update",
  "batch_update": [
    { "noteId": "uuid-1", "noteName": "Note 1", "updates": { "tags": ["important"], "is_public": true } },
    { "noteId": "uuid-2", "noteName": "Note 2", "updates": { "title": "New Title" } }
  ]
}

// FOR BATCH DELETE:
{
  "action": "batch_delete",
  "batch_delete": [
    { "noteId": "uuid-1", "noteName": "Note 1" },
    { "noteId": "uuid-2", "noteName": "Note 2" }
  ]
}

// FOR BATCH SHARE:
{
  "action": "batch_share",
  "batch_share": [
    { "noteId": "uuid-1", "noteName": "Note 1", "userIds": ["USER_ID-1"] },
    { "noteId": "uuid-2", "noteName": "Note 2", "userIds": ["USER_ID-1", "USER_ID-2"] }
  ]
}

Note Details Fields (for "details" or "updates"):
- title: string (the note title)
- content: string (HTML content, wrap in <p> tags)
- parent_id: string (UUID of parent note for sub-notes)
- tags: string[] (array of tag strings)
- icon: string (emoji icon like "📝", "💡", "📋")
- is_public: boolean (true = visible to all workspace members)
- cover_image: string (URL of cover image)

IMPORTANT RULES:

1. DETECT SINGLE vs BATCH OPERATIONS:
   - Single: "create a note", "delete Meeting Notes", "share My Ideas with John"
   - Batch: "create 3 notes", "delete all notes with tag 'old'", "share multiple notes"

2. FOR CREATE OPERATIONS - BE FLEXIBLE:
   - SIMPLE COMMANDS ALLOWED: "create a note", "make a note", "new note", "add note" -> Generate a title like "New Note", "Untitled Note", or based on current date/time
   - If user provides a name like "create a note called Ideas", use that as the title
   - If user says "create a note about X" or "note for X", use X as the title or generate "X Note"
   - Default content: "<p>Created via AI Assistant</p>" if not specified
   - Generate appropriate icon based on title if not specified
   - NEVER return "unknown" for simple create commands - always create the note with a generated title

3. FOR UPDATE OPERATIONS:
   - Find the note by name (partial match OK, case insensitive)
   - Only include fields that user wants to change in "updates"

4. FOR DELETE OPERATIONS:
   - CRITICAL: If user says "delete a note" WITHOUT specifying which note, return action: "unknown"
   - Only delete when user clearly specifies which note(s) to delete by name
   - Match note names from the available notes list
   - IMPORTANT: "remove X from note Y" is NOT a delete - it's an UPDATE to modify content
   - "remove bullet point", "remove text", "remove line from" = UPDATE operation
   - Only "delete note X", "remove note X", "trash X" = DELETE operation

5. FOR SHARE OPERATIONS:
   - Find users from workspace members list
   - Use USER_ID (UUID) in shareWith array
   - Example: "share Meeting Notes with John" -> find John's USER_ID

6. FOR ARCHIVE/UNARCHIVE:
   - Archive moves notes to archived state
   - Unarchive restores archived notes

7. FOR SEARCH:
   - Extract search terms from user's query
   - Example: "find notes about marketing" -> searchQuery: "marketing"

8. FLEXIBLE MATCHING:
   - Note names: partial match OK, case insensitive
   - "the meeting note" matches "Meeting Notes"
   - "my ideas" matches "My Ideas List"

9. COMMON PHRASES - RECOGNIZE ALL VARIATIONS:
   - Create: "create", "add", "make", "write", "new note", "create a note", "make a note", "add a note", "new", "start a note"
   - Update: "change", "edit", "update", "modify", "rename", "add tag", "set", "remove X from", "remove bullet", "remove line", "remove text from"
   - Delete: "delete note", "delete the note", "remove note", "trash note" (ONLY when targeting the whole note, NOT content modification)
   - Share: "share", "give access", "invite to"
   - Archive: "archive", "hide", "put away"
   - Search: "find", "search", "look for", "show notes about"
   - Tags: "tag", "label", "categorize"
   - Public: "make public", "share with everyone", "make visible"

   CRITICAL DISTINCTION:
   - "remove bullet point about X from note Y" = UPDATE (modify content)
   - "remove the third line from class notes" = UPDATE (modify content)
   - "delete class notes" = DELETE (remove entire note)
   - "remove class notes" = DELETE (remove entire note)

10. ICONS SUGGESTIONS:
   - Meeting/notes: 📝
   - Ideas: 💡
   - Tasks/todo: ✅
   - Important: ⭐
   - Project: 📁
   - Research: 🔍
   - Personal: 👤
   - Team: 👥

11. DEFAULT TITLE GENERATION:
   - For simple commands without title, generate contextual titles:
   - "create a note" -> "New Note" or "Untitled"
   - "make a note" -> "New Note"
   - "new note" -> "New Note"
   - "create note for meeting" -> "Meeting Note"
   - "note about project" -> "Project Notes"

12. IF TRULY AMBIGUOUS (only for destructive actions):
   - Return action: "unknown" ONLY for delete/share without specifying which note
   - Example: "delete a note" without specifying which -> unknown
   - NEVER return unknown for create operations - always try to create`;

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

      // Clean up the response
      const cleanedContent = responseText
        .trim()
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();

      this.logger.debug(`[NotesAgent] AI response: ${cleanedContent}`);

      const parsed = JSON.parse(cleanedContent);

      this.logger.log(`[NotesAgent] Parsed AI response action: ${parsed.action}`);

      return {
        action: parsed.action || 'unknown',
        noteName: parsed.noteName,
        noteId: parsed.noteId,
        details: parsed.details || {},
        searchQuery: parsed.searchQuery,
        shareWith: parsed.shareWith,
        batch_create: parsed.batch_create,
        batch_update: parsed.batch_update,
        batch_delete: parsed.batch_delete,
        batch_share: parsed.batch_share,
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] AI parsing failed: ${error.message}`);
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
  ): Promise<NoteAgentResponse> {
    switch (intent.action) {
      case 'create':
        return this.createNote(intent, workspaceId, userId);

      case 'update':
        return this.updateNote(intent, workspaceId, userId);

      case 'delete':
        return this.deleteNote(intent, workspaceId, userId);

      case 'share':
        return this.shareNote(intent, workspaceId, userId);

      case 'archive':
        return this.archiveNote(intent, workspaceId, userId);

      case 'unarchive':
        return this.unarchiveNote(intent, workspaceId, userId);

      case 'duplicate':
        return this.duplicateNote(intent, workspaceId, userId);

      case 'search':
        return this.searchNotes(intent, workspaceId, userId);

      case 'batch_create':
        return this.batchCreateNotes(intent, workspaceId, userId);

      case 'batch_update':
        return this.batchUpdateNotes(intent, workspaceId, userId);

      case 'batch_delete':
        return this.batchDeleteNotes(intent, workspaceId, userId);

      case 'batch_share':
        return this.batchShareNotes(intent, workspaceId, userId);

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
   * Create a new note
   */
  private async createNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { details } = intent;

    // Generate a default title if none provided
    const noteTitle = details?.title || this.generateDefaultTitle();

    try {
      const createDto: CreateNoteDto = {
        title: noteTitle,
        content: details?.content || '<p>Created via AI Assistant</p>',
        parent_id: details?.parent_id,
        template_id: details?.template_id,
        tags: details?.tags || [],
        cover_image: details?.cover_image,
        icon: details?.icon || this.suggestIcon(noteTitle),
        is_public: details?.is_public || false,
        attachments: details?.attachments,
      };

      this.logger.log(`[NotesAgent] Creating note with DTO: ${JSON.stringify(createDto)}`);

      const note = await this.notesService.createNote(workspaceId, createDto, userId);

      return {
        success: true,
        action: 'create',
        message: `Note "${note.title}" has been created successfully!`,
        data: {
          note: {
            id: note.id,
            title: note.title,
            content: note.content,
            tags: note.tags,
            icon: note.icon,
            is_public: note.is_public,
            created_at: note.created_at,
          },
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Create note failed: ${error.message}`);
      return {
        success: false,
        action: 'create',
        message: `Failed to create note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing note
   */
  private async updateNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName, details } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'update',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    const updateFields: any = {};

    if (details?.title) updateFields.title = details.title;
    if (details?.content) updateFields.content = details.content;
    if (details?.tags) updateFields.tags = details.tags;
    if (details?.icon) updateFields.icon = details.icon;
    if (details?.cover_image) updateFields.cover_image = details.cover_image;
    if (details?.is_public !== undefined) updateFields.is_public = details.is_public;
    if (details?.parent_id !== undefined) updateFields.parent_id = details.parent_id;
    if (details?.attachments) updateFields.attachments = details.attachments;

    if (Object.keys(updateFields).length === 0) {
      return {
        success: false,
        action: 'update',
        message:
          'Please specify what you want to update. For example: "Add tag important to Meeting Notes" or "Make My Ideas public"',
        error: 'NO_UPDATES_SPECIFIED',
      };
    }

    try {
      const note = await this.notesService.updateNote(noteId, workspaceId, updateFields, userId);

      const changesDescription = Object.entries(updateFields)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}: [${value.join(', ')}]`;
          }
          return `${key}: ${value}`;
        })
        .join(', ');

      return {
        success: true,
        action: 'update',
        message: `Note "${noteName}" has been updated! Changes: ${changesDescription}`,
        data: {
          note,
          updatedFields: updateFields,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Update note failed: ${error.message}`);
      return {
        success: false,
        action: 'update',
        message: `Failed to update note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Delete a note
   */
  private async deleteNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'delete',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists and specify which note to delete.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    try {
      const result = await this.notesService.deleteNote(noteId, workspaceId, userId);

      return {
        success: true,
        action: 'delete',
        message: `Note "${noteName}" has been deleted successfully.`,
        data: {
          deletedNoteId: noteId,
          deletedNoteName: noteName,
          deletedCount: result.deletedCount,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Delete note failed: ${error.message}`);
      return {
        success: false,
        action: 'delete',
        message: `Failed to delete note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Share a note with users
   */
  private async shareNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName, shareWith } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'share',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    if (!shareWith || shareWith.length === 0) {
      return {
        success: false,
        action: 'share',
        message:
          'Please specify who to share the note with. For example: "Share Meeting Notes with John"',
        error: 'NO_USERS_SPECIFIED',
      };
    }

    try {
      const result = await this.notesService.shareNote(
        noteId,
        workspaceId,
        { user_ids: shareWith },
        userId,
      );

      return {
        success: true,
        action: 'share',
        message: `Note "${noteName}" has been shared with ${shareWith.length} user(s).`,
        data: {
          noteId,
          noteName,
          sharedWith: shareWith,
          totalSharedUsers: result.total_shared_users,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Share note failed: ${error.message}`);
      return {
        success: false,
        action: 'share',
        message: `Failed to share note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Archive a note
   */
  private async archiveNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'archive',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    try {
      const result = await this.notesService.archiveNote(noteId, workspaceId, userId);

      return {
        success: true,
        action: 'archive',
        message: `Note "${noteName}" has been archived.`,
        data: {
          noteId,
          noteName,
          archivedCount: result.archivedCount,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Archive note failed: ${error.message}`);
      return {
        success: false,
        action: 'archive',
        message: `Failed to archive note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Unarchive a note
   */
  private async unarchiveNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'unarchive',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    try {
      const result = await this.notesService.unarchiveNote(noteId, workspaceId, userId);

      return {
        success: true,
        action: 'unarchive',
        message: `Note "${noteName}" has been restored from archive.`,
        data: {
          noteId,
          noteName,
          unarchivedCount: result.unarchivedCount,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Unarchive note failed: ${error.message}`);
      return {
        success: false,
        action: 'unarchive',
        message: `Failed to unarchive note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Duplicate a note
   */
  private async duplicateNote(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { noteId, noteName, details } = intent;

    if (!noteId) {
      return {
        success: false,
        action: 'duplicate',
        message: `Could not find note "${noteName || 'Unknown'}". Please make sure the note exists.`,
        error: 'NOTE_NOT_FOUND',
      };
    }

    try {
      const result = await this.notesService.duplicateNote(
        noteId,
        workspaceId,
        {
          title: details?.title,
          parentId: details?.parent_id,
          includeSubNotes: true,
        },
        userId,
      );

      return {
        success: true,
        action: 'duplicate',
        message: `Note "${noteName}" has been duplicated.`,
        data: {
          originalNoteId: noteId,
          originalNoteName: noteName,
          note: result.note,
          duplicatedCount: result.duplicatedCount,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Duplicate note failed: ${error.message}`);
      return {
        success: false,
        action: 'duplicate',
        message: `Failed to duplicate note: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Search for notes
   */
  private async searchNotes(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const { searchQuery } = intent;

    if (!searchQuery) {
      return {
        success: false,
        action: 'search',
        message: 'Please specify what to search for. For example: "Find notes about marketing"',
        error: 'NO_SEARCH_QUERY',
      };
    }

    try {
      const notes = await this.notesService.searchNotes(workspaceId, searchQuery, userId);

      if (notes.length === 0) {
        return {
          success: true,
          action: 'search',
          message: `No notes found matching "${searchQuery}".`,
          data: {
            query: searchQuery,
            results: [],
            count: 0,
          },
        };
      }

      const notesSummary = notes
        .slice(0, 5)
        .map((n: any) => `- "${n.title}"`)
        .join('\n');

      return {
        success: true,
        action: 'search',
        message: `Found ${notes.length} note(s) matching "${searchQuery}":\n${notesSummary}${notes.length > 5 ? `\n... and ${notes.length - 5} more` : ''}`,
        data: {
          query: searchQuery,
          results: notes,
          count: notes.length,
        },
      };
    } catch (error) {
      this.logger.error(`[NotesAgent] Search notes failed: ${error.message}`);
      return {
        success: false,
        action: 'search',
        message: `Failed to search notes: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Batch create multiple notes
   */
  private async batchCreateNotes(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const items = intent.batch_create || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_create',
        message: 'No notes specified to create.',
        error: 'NO_NOTES_SPECIFIED',
      };
    }

    this.logger.log(`[NotesAgent] Batch creating ${items.length} notes`);

    const results: Array<{
      success: boolean;
      note?: any;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.details.title) {
          results.push({
            success: false,
            error: 'Missing note title',
            title: 'Unknown',
          });
          continue;
        }

        const createDto: CreateNoteDto = {
          title: item.details.title,
          content: item.details.content || '<p>Created via AI Assistant</p>',
          tags: item.details.tags || [],
          icon: item.details.icon || this.suggestIcon(item.details.title),
          is_public: item.details.is_public || false,
        };

        const note = await this.notesService.createNote(workspaceId, createDto, userId);

        results.push({
          success: true,
          note: {
            id: note.id,
            title: note.title,
          },
          title: note.title,
        });

        this.logger.log(`[NotesAgent] Created note: ${note.title}`);
      } catch (error) {
        this.logger.error(
          `[NotesAgent] Failed to create note ${item.details.title}: ${error.message}`,
        );
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
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Batch update multiple notes
   */
  private async batchUpdateNotes(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const items = intent.batch_update || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_update',
        message: 'No notes specified to update.',
        error: 'NO_NOTES_SPECIFIED',
      };
    }

    this.logger.log(`[NotesAgent] Batch updating ${items.length} notes`);

    const results: Array<{
      success: boolean;
      note?: any;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.noteId) {
          results.push({
            success: false,
            error: 'Note not found',
            title: item.noteName || 'Unknown',
          });
          continue;
        }

        const updateFields: any = {};
        if (item.updates.title) updateFields.title = item.updates.title;
        if (item.updates.content) updateFields.content = item.updates.content;
        if (item.updates.tags) updateFields.tags = item.updates.tags;
        if (item.updates.icon) updateFields.icon = item.updates.icon;
        if (item.updates.is_public !== undefined) updateFields.is_public = item.updates.is_public;

        if (Object.keys(updateFields).length === 0) {
          results.push({
            success: false,
            error: 'No updates specified',
            title: item.noteName,
          });
          continue;
        }

        const note = await this.notesService.updateNote(
          item.noteId,
          workspaceId,
          updateFields,
          userId,
        );

        results.push({
          success: true,
          note: {
            id: note.id,
            title: note.title,
          },
          title: note.title,
        });

        this.logger.log(`[NotesAgent] Updated note: ${note.title}`);
      } catch (error) {
        this.logger.error(`[NotesAgent] Failed to update note ${item.noteName}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.noteName,
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
   * Batch delete multiple notes
   */
  private async batchDeleteNotes(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const items = intent.batch_delete || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_delete',
        message: 'No notes specified to delete.',
        error: 'NO_NOTES_SPECIFIED',
      };
    }

    this.logger.log(`[NotesAgent] Batch deleting ${items.length} notes`);

    const results: Array<{
      success: boolean;
      noteId?: string;
      error?: string;
      title?: string;
    }> = [];

    for (const item of items) {
      try {
        if (!item.noteId) {
          results.push({
            success: false,
            error: 'Note not found',
            title: item.noteName || 'Unknown',
          });
          continue;
        }

        await this.notesService.deleteNote(item.noteId, workspaceId, userId);

        results.push({
          success: true,
          noteId: item.noteId,
          title: item.noteName,
        });

        this.logger.log(`[NotesAgent] Deleted note: ${item.noteName}`);
      } catch (error) {
        this.logger.error(`[NotesAgent] Failed to delete note ${item.noteName}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.noteName,
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

  /**
   * Batch share multiple notes
   */
  private async batchShareNotes(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<NoteAgentResponse> {
    const items = intent.batch_share || [];

    if (items.length === 0) {
      return {
        success: false,
        action: 'batch_share',
        message: 'No notes specified to share.',
        error: 'NO_NOTES_SPECIFIED',
      };
    }

    this.logger.log(`[NotesAgent] Batch sharing ${items.length} notes`);

    const results: Array<{
      success: boolean;
      noteId?: string;
      error?: string;
      title?: string;
      sharedWith?: string[];
    }> = [];

    for (const item of items) {
      try {
        if (!item.noteId) {
          results.push({
            success: false,
            error: 'Note not found',
            title: item.noteName || 'Unknown',
          });
          continue;
        }

        if (!item.userIds || item.userIds.length === 0) {
          results.push({
            success: false,
            error: 'No users specified to share with',
            title: item.noteName,
          });
          continue;
        }

        await this.notesService.shareNote(
          item.noteId,
          workspaceId,
          { user_ids: item.userIds },
          userId,
        );

        results.push({
          success: true,
          noteId: item.noteId,
          title: item.noteName,
          sharedWith: item.userIds,
        });

        this.logger.log(`[NotesAgent] Shared note: ${item.noteName}`);
      } catch (error) {
        this.logger.error(`[NotesAgent] Failed to share note ${item.noteName}: ${error.message}`);
        results.push({
          success: false,
          error: error.message,
          title: item.noteName,
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_share',
      message: `Batch share completed: ${successCount} successful, ${failCount} failed.`,
      data: {
        total: items.length,
        successful: successCount,
        failed: failCount,
        results,
      },
    };
  }

  /**
   * Suggest an icon based on note title
   */
  private suggestIcon(title: string): string {
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('meeting') || lowerTitle.includes('notes')) {
      return '📝';
    }
    if (lowerTitle.includes('idea') || lowerTitle.includes('brainstorm')) {
      return '💡';
    }
    if (
      lowerTitle.includes('task') ||
      lowerTitle.includes('todo') ||
      lowerTitle.includes('to-do')
    ) {
      return '✅';
    }
    if (lowerTitle.includes('important') || lowerTitle.includes('urgent')) {
      return '⭐';
    }
    if (lowerTitle.includes('project') || lowerTitle.includes('plan')) {
      return '📁';
    }
    if (lowerTitle.includes('research') || lowerTitle.includes('study')) {
      return '🔍';
    }
    if (lowerTitle.includes('personal') || lowerTitle.includes('private')) {
      return '👤';
    }
    if (lowerTitle.includes('team') || lowerTitle.includes('shared')) {
      return '👥';
    }
    if (lowerTitle.includes('code') || lowerTitle.includes('development')) {
      return '💻';
    }
    if (lowerTitle.includes('bug') || lowerTitle.includes('issue')) {
      return '🐛';
    }
    if (lowerTitle.includes('design') || lowerTitle.includes('ui')) {
      return '🎨';
    }
    if (lowerTitle.includes('marketing') || lowerTitle.includes('campaign')) {
      return '📣';
    }
    if (lowerTitle.includes('sales') || lowerTitle.includes('revenue')) {
      return '💰';
    }
    if (lowerTitle.includes('hr') || lowerTitle.includes('hiring')) {
      return '👔';
    }
    if (lowerTitle.includes('training') || lowerTitle.includes('learning')) {
      return '📚';
    }

    // Default icon
    return '📄';
  }

  /**
   * Generate a default title for notes when none is provided
   */
  private generateDefaultTitle(): string {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Generate a friendly default title with date/time
    return `New Note - ${dateStr} ${timeStr}`;
  }
}
