import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AiProviderService } from '../ai-provider/ai-provider.service';
import { FilesService } from './files.service';
import {
  ConversationMemoryService,
  ConversationSearchResult,
} from '../conversation-memory/conversation-memory.service';

// Workspace member interface for user lookup
interface WorkspaceMember {
  user_id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  role: string;
}

export interface FileAgentRequest {
  prompt: string;
  workspaceId: string;
}

export interface FileAgentResponse {
  success: boolean;
  action:
    | 'create_folder'
    | 'rename_folder'
    | 'rename_file'
    | 'rename_auto'
    | 'delete_folder'
    | 'delete_file'
    | 'move_file'
    | 'move_folder'
    | 'copy_file'
    | 'copy_folder'
    | 'share_file'
    | 'star_file'
    | 'unstar_file'
    | 'search'
    | 'restore_file'
    | 'restore_folder'
    | 'batch_create_folders'
    | 'batch_delete_files'
    | 'batch_delete_folders'
    | 'batch_move_files'
    | 'batch_move_folders'
    | 'batch_restore_files'
    | 'batch_restore_folders'
    | 'unknown';
  message: string;
  data?: any;
  error?: string;
}

// Folder details
interface FolderDetails {
  name?: string;
  parent_id?: string | null;
  description?: string;
}

// Batch operation support
interface BatchCreateFolderItem {
  details: FolderDetails;
}

interface BatchDeleteFileItem {
  fileId: string;
  fileName: string;
}

interface BatchDeleteFolderItem {
  folderId: string;
  folderName: string;
}

interface BatchMoveFileItem {
  fileId: string;
  fileName: string;
  targetFolderId: string | null;
}

interface BatchMoveFolderItem {
  folderId: string;
  folderName: string;
  targetParentId: string | null;
}

interface BatchRestoreFileItem {
  fileId: string;
  fileName: string;
}

interface BatchRestoreFolderItem {
  folderId: string;
  folderName: string;
}

interface ParsedIntent {
  action:
    | 'create_folder'
    | 'rename_folder'
    | 'rename_file'
    | 'rename_auto'  // Auto-detect file or folder for rename
    | 'delete_folder'
    | 'delete_file'
    | 'move_file'
    | 'move_folder'
    | 'copy_file'
    | 'copy_folder'
    | 'share_file'
    | 'star_file'
    | 'unstar_file'
    | 'search'
    | 'restore_file'
    | 'restore_folder'
    | 'batch_create_folders'
    | 'batch_delete_files'
    | 'batch_delete_folders'
    | 'batch_move_files'
    | 'batch_move_folders'
    | 'batch_restore_files'
    | 'batch_restore_folders'
    | 'unknown';

  // Single operation fields
  folderName?: string;
  folderId?: string;
  fileName?: string;
  fileId?: string;
  newName?: string;
  targetFolderId?: string | null;
  targetParentId?: string | null;
  details?: FolderDetails;
  searchQuery?: string;

  // Share operation fields
  shareWith?: string[]; // User IDs to share with

  // Batch operation fields
  batch_create_folders?: BatchCreateFolderItem[];
  batch_delete_files?: BatchDeleteFileItem[];
  batch_delete_folders?: BatchDeleteFolderItem[];
  batch_move_files?: BatchMoveFileItem[];
  batch_move_folders?: BatchMoveFolderItem[];
  batch_restore_files?: BatchRestoreFileItem[];
  batch_restore_folders?: BatchRestoreFolderItem[];
}

@Injectable()
export class FilesAgentService {
  private readonly logger = new Logger(FilesAgentService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly filesService: FilesService,
    private readonly conversationMemoryService: ConversationMemoryService,
  ) {}

  /**
   * Main entry point for the Files AI Agent
   * Receives natural language prompt and executes the appropriate action
   */
  async processCommand(
    request: FileAgentRequest,
    userId: string,
  ): Promise<FileAgentResponse> {
    const { prompt, workspaceId } = request;

    this.logger.log(
      `[FilesAgent] Processing command: "${prompt}" for workspace: ${workspaceId}`,
    );

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
        `[FilesAgent] Found ${conversationHistory.length} relevant historical messages`,
      );

      // Step 3: Get existing files and folders for context
      const existingItems = await this.getExistingFilesAndFolders(workspaceId, userId);

      // Step 4: Get workspace members for user ID resolution (for sharing)
      const workspaceMembers = await this.getWorkspaceMembers(
        workspaceId,
        userId,
      );

      // Step 5: Use AI to parse the user's intent
      const parsedIntent = await this.parseIntentWithAI(
        prompt,
        existingItems,
        workspaceMembers,
        conversationHistory,
      );

      this.logger.log(
        `[FilesAgent] AI parsed intent: ${JSON.stringify(parsedIntent)}`,
      );

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
            'I could not understand your request. Please try commands like "Create a folder called Documents" or "Move report.pdf to the Archive folder".',
          error: 'INTENT_NOT_UNDERSTOOD',
        };
      }

      // Step 6: Resolve user names to IDs for share operations
      if (parsedIntent.action === 'share_file' && parsedIntent.shareWith) {
        parsedIntent.shareWith = this.resolveUserIds(
          parsedIntent.shareWith,
          workspaceMembers,
        );
        this.logger.log(
          `[FilesAgent] Resolved share users: ${parsedIntent.shareWith}`,
        );
      }

      // Step 7: Execute the action
      const result = await this.executeAction(
        parsedIntent,
        workspaceId,
        userId,
        existingItems,
      );

      // Step 8: Store successful response in memory
      if (result.success) {
        this.storeAssistantMessage(
          result.message,
          workspaceId,
          userId,
          result.action,
          true,
          this.extractItemIds(result),
          this.extractItemNames(result),
        );
      } else {
        this.storeAssistantMessage(
          result.message,
          workspaceId,
          userId,
          result.action,
          false,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `[FilesAgent] Error processing command: ${error.message}`,
        error.stack,
      );

      // Store error in memory
      this.storeAssistantMessage(
        `Error: ${error.message}`,
        workspaceId,
        userId,
        'unknown',
        false,
      );

      return {
        success: false,
        action: 'unknown',
        message: `An error occurred while processing your request: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Store user message in conversation memory
   */
  private async storeUserMessage(
    message: string,
    workspaceId: string,
    userId: string,
  ): Promise<void> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        this.logger.warn(
          '[FilesAgent] Conversation memory not ready, skipping message storage',
        );
        return;
      }

      await this.conversationMemoryService.storeMessage({
        role: 'user',
        content: message,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'file',
      });
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Failed to store user message: ${error.message}`,
      );
    }
  }

  /**
   * Store assistant message in conversation memory
   */
  private async storeAssistantMessage(
    message: string,
    workspaceId: string,
    userId: string,
    action: string,
    success: boolean,
    entityIds?: string[],
    entityNames?: string[],
  ): Promise<void> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        this.logger.warn(
          '[FilesAgent] Conversation memory not ready, skipping message storage',
        );
        return;
      }

      await this.conversationMemoryService.storeMessage({
        role: 'assistant',
        content: message,
        workspace_id: workspaceId,
        user_id: userId,
        entity_type: 'file',
        project_ids: entityIds,
        project_names: entityNames,
        action,
        success,
      });
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Failed to store assistant message: ${error.message}`,
      );
    }
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
        this.logger.warn(
          '[FilesAgent] Conversation memory not ready, skipping history lookup',
        );
        return [];
      }

      return await this.conversationMemoryService.searchRelevantHistory(
        query,
        workspaceId,
        userId,
        10,
      );
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Failed to get conversation history: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Extract item IDs from operation result
   */
  private extractItemIds(result: FileAgentResponse): string[] {
    const ids: string[] = [];

    if (result.data?.folder?.id) {
      ids.push(result.data.folder.id);
    }

    if (result.data?.file?.id) {
      ids.push(result.data.file.id);
    }

    if (result.data?.deletedFileId) {
      ids.push(result.data.deletedFileId);
    }

    if (result.data?.deletedFolderId) {
      ids.push(result.data.deletedFolderId);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.folder?.id) ids.push(r.folder.id);
        if (r.file?.id) ids.push(r.file.id);
        if (r.folderId) ids.push(r.folderId);
        if (r.fileId) ids.push(r.fileId);
      });
    }

    return ids;
  }

  /**
   * Extract item names from operation result
   */
  private extractItemNames(result: FileAgentResponse): string[] {
    const names: string[] = [];

    if (result.data?.folder?.name) {
      names.push(result.data.folder.name);
    }

    if (result.data?.file?.name) {
      names.push(result.data.file.name);
    }

    if (result.data?.deletedFileName) {
      names.push(result.data.deletedFileName);
    }

    if (result.data?.deletedFolderName) {
      names.push(result.data.deletedFolderName);
    }

    if (result.data?.results) {
      result.data.results.forEach((r: any) => {
        if (r.name) names.push(r.name);
        if (r.folder?.name) names.push(r.folder.name);
        if (r.file?.name) names.push(r.file.name);
      });
    }

    return names;
  }

  /**
   * Get existing files and folders in the workspace for context
   */
  private async getExistingFilesAndFolders(
    workspaceId: string,
    userId: string,
  ): Promise<{ files: any[]; folders: any[] }> {
    try {
      const [filesResult, foldersResult] = await Promise.all([
        this.filesService.getFiles(workspaceId, undefined, 1, 100, false, userId),
        this.filesService.getFolders(workspaceId, undefined, false, userId),
      ]);

      const files = (filesResult.data || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        mime_type: f.mime_type,
        folder_id: f.folder_id,
        size: f.size,
        starred: f.starred,
        created_at: f.created_at,
      }));

      const folders = (foldersResult || []).map((f: any) => ({
        id: f.id,
        name: f.name,
        parent_id: f.parent_id,
        created_at: f.created_at,
      }));

      return { files, folders };
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Could not fetch existing items: ${error.message}`,
      );
      return { files: [], folders: [] };
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
      this.logger.log(
        `[FilesAgent] Found ${members.length} workspace members`,
      );

      const membersWithNames: WorkspaceMember[] = await Promise.all(
        members.map(async (member: any) => {
          try {
            const userProfile = await this.db.getUserById(
              member.user_id,
            );
            const metadata = (userProfile as any)?.metadata || {};

            return {
              user_id: member.user_id,
              name:
                metadata.name ||
                (userProfile as any)?.fullName ||
                (userProfile as any)?.name ||
                null,
              username:
                (userProfile as any)?.username || metadata.username || null,
              email: (userProfile as any)?.email || null,
              role: member.role,
            };
          } catch (error) {
            this.logger.warn(
              `[FilesAgent] Could not fetch user details for ${member.user_id}: ${error.message}`,
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
      this.logger.warn(
        `[FilesAgent] Could not fetch workspace members: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Resolve user names/emails to user IDs
   */
  private resolveUserIds(
    userIdentifiers: string[],
    members: WorkspaceMember[],
  ): string[] {
    return userIdentifiers
      .map((identifier) => {
        // If already a UUID, validate it exists
        if (this.isValidUUID(identifier)) {
          const memberExists = members.some((m) => m.user_id === identifier);
          if (memberExists) {
            return identifier;
          }
          this.logger.warn(
            `[FilesAgent] User ID "${identifier}" is not a workspace member`,
          );
          return null;
        }

        // Try to find by name/username/email
        const resolvedId = this.findUserIdByNameOrEmail(identifier, members);
        if (resolvedId) {
          this.logger.log(
            `[FilesAgent] Resolved user "${identifier}" to ID: ${resolvedId}`,
          );
          return resolvedId;
        }

        this.logger.warn(
          `[FilesAgent] Could not resolve user "${identifier}" to a workspace member`,
        );
        return null;
      })
      .filter((id): id is string => id !== null);
  }

  /**
   * Check if a string is a valid UUID
   */
  private isValidUUID(str: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    existingItems: { files: any[]; folders: any[] },
    workspaceMembers: WorkspaceMember[],
    conversationHistory: ConversationSearchResult[] = [],
  ): Promise<ParsedIntent> {
    const filesList =
      existingItems.files.length > 0
        ? existingItems.files
            .map(
              (f) =>
                `- "${f.name}" (ID: ${f.id}, Type: ${f.mime_type || 'unknown'}, Folder: ${f.folder_id || 'root'}, Starred: ${f.starred})`,
            )
            .join('\n')
        : 'No files available';

    const foldersList =
      existingItems.folders.length > 0
        ? existingItems.folders
            .map(
              (f) =>
                `- "${f.name}" (ID: ${f.id}, Parent: ${f.parent_id || 'root'})`,
            )
            .join('\n')
        : 'No folders available';

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

    const aiPrompt = `You are a file management assistant with access to conversation history. Analyze the user's command and extract their intent to create folders, rename, delete, move, copy, share, or search files and folders. You can handle SINGLE or BATCH operations.

User command: "${prompt}"
${conversationContext}
Available files in workspace:
${filesList}

Available folders in workspace:
${foldersList}

Workspace members (for sharing - use USER_ID):
${membersList}

You must respond with ONLY a valid JSON object. No markdown, no code blocks, no explanation. Just the JSON:

// FOR SINGLE FOLDER OPERATIONS:
{
  "action": "create_folder" | "rename_folder" | "delete_folder" | "move_folder" | "copy_folder",
  "folderName": "folder name",
  "folderId": "folder UUID if update/delete/move/copy",
  "newName": "new name for rename",
  "targetParentId": "target parent folder ID for move/copy (null for root)",
  "details": { "name": "folder name", "parent_id": "parent folder UUID or null", "description": "optional description" }
}

// FOR SINGLE FILE OPERATIONS:
{
  "action": "rename_file" | "delete_file" | "move_file" | "copy_file" | "share_file",
  "fileName": "file name",
  "fileId": "file UUID",
  "newName": "new name for rename",
  "targetFolderId": "target folder ID for move/copy (null for root)",
  "shareWith": ["USER_ID-1", "USER_ID-2"] // for share action
}

// FOR STAR/UNSTAR FILE:
{
  "action": "star_file" | "unstar_file",
  "fileName": "file name",
  "fileId": "file UUID"
}

// FOR GENERIC RENAME (when user doesn't specify file or folder):
{
  "action": "rename_auto",
  "fileName": "current name (same as folderName)",
  "folderName": "current name (same as fileName)",
  "newName": "new name"
}

// FOR SEARCH:
{
  "action": "search",
  "searchQuery": "search terms"
}

// FOR BATCH CREATE FOLDERS:
{
  "action": "batch_create_folders",
  "batch_create_folders": [
    { "details": { "name": "Folder 1", "parent_id": null } },
    { "details": { "name": "Folder 2", "parent_id": "parent-uuid" } }
  ]
}

// FOR BATCH DELETE FILES:
{
  "action": "batch_delete_files",
  "batch_delete_files": [
    { "fileId": "uuid-1", "fileName": "file1.pdf" },
    { "fileId": "uuid-2", "fileName": "file2.docx" }
  ]
}

// FOR BATCH DELETE FOLDERS:
{
  "action": "batch_delete_folders",
  "batch_delete_folders": [
    { "folderId": "uuid-1", "folderName": "Folder 1" },
    { "folderId": "uuid-2", "folderName": "Folder 2" }
  ]
}

// FOR BATCH MOVE FILES:
{
  "action": "batch_move_files",
  "batch_move_files": [
    { "fileId": "uuid-1", "fileName": "file1.pdf", "targetFolderId": "folder-uuid" },
    { "fileId": "uuid-2", "fileName": "file2.docx", "targetFolderId": null }
  ]
}

// FOR BATCH MOVE FOLDERS:
{
  "action": "batch_move_folders",
  "batch_move_folders": [
    { "folderId": "uuid-1", "folderName": "Folder 1", "targetParentId": "parent-uuid" },
    { "folderId": "uuid-2", "folderName": "Folder 2", "targetParentId": null }
  ]
}

// FOR RESTORE FILE (from trash):
{
  "action": "restore_file",
  "fileName": "file name",
  "fileId": "file UUID"
}

// FOR RESTORE FOLDER (from trash):
{
  "action": "restore_folder",
  "folderName": "folder name",
  "folderId": "folder UUID"
}

// FOR BATCH RESTORE FILES:
{
  "action": "batch_restore_files",
  "batch_restore_files": [
    { "fileId": "uuid-1", "fileName": "file1.pdf" },
    { "fileId": "uuid-2", "fileName": "file2.docx" }
  ]
}

// FOR BATCH RESTORE FOLDERS:
{
  "action": "batch_restore_folders",
  "batch_restore_folders": [
    { "folderId": "uuid-1", "folderName": "Folder 1" },
    { "folderId": "uuid-2", "folderName": "Folder 2" }
  ]
}

IMPORTANT RULES:

1. DETECT SINGLE vs BATCH OPERATIONS:
   - Single: "create a folder", "delete report.pdf", "move document to Archive"
   - Batch: "create 3 folders", "delete all PDF files", "move all files to Backup"

2. FOR CREATE FOLDER OPERATIONS - BE FLEXIBLE:
   - SIMPLE COMMANDS ALLOWED: "create a folder", "make a folder", "new folder" -> Generate a name like "New Folder"
   - If user provides a name like "create a folder called Documents", use that as the name
   - NEVER return "unknown" for simple create folder commands

3. FOR DELETE OPERATIONS:
   - CRITICAL: If user says "delete a file/folder" WITHOUT specifying which one, return action: "unknown"
   - Only delete when user clearly specifies which file(s) or folder(s) to delete by name
   - Match names from the available files/folders list

4. FOR MOVE/COPY OPERATIONS:
   - Find the target folder from the available folders list
   - Use null for targetFolderId/targetParentId to move to root

5. FOR SHARE OPERATIONS:
   - Find users from workspace members list
   - Use USER_ID (UUID) in shareWith array

6. FOR STAR/UNSTAR OPERATIONS:
   - "star X", "favorite X", "mark X as favorite" -> action: "star_file"
   - "unstar X", "unfavorite X", "remove star from X" -> action: "unstar_file"
   - Find the file by name from available files list
   - Return the fileId from the matching file

7. FOR RENAME OPERATIONS:
   - If user says "rename file X to Y" -> action: "rename_file"
   - If user says "rename folder X to Y" -> action: "rename_folder"
   - If user says "rename X to Y" (no file/folder keyword) -> action: "rename_auto"
   - For rename_auto, set BOTH fileName and folderName to the current name
   - Find the item by name from available files/folders list

8. FOR SEARCH:
   - Extract search terms from user's query
   - Example: "find files about marketing" -> searchQuery: "marketing"

9. FOR RESTORE OPERATIONS (from trash/deleted items):
   - "restore X", "recover X", "undelete X", "bring back X" -> restore_file or restore_folder
   - "restore all files", "recover all", "restore everything" -> batch_restore_files or batch_restore_folders
   - Find the file/folder by name from available (deleted) files/folders list
   - If user says "restore all files" without specifying names, restore ALL deleted files

10. FLEXIBLE MATCHING:
    - File/folder names: partial match OK, case insensitive
    - "the documents folder" matches "Documents"
    - "report file" matches "Report.pdf"

11. UNKNOWN:
    - Return action: "unknown" ONLY if you truly cannot determine the intent
    - Do NOT guess or make up file/folder IDs
    - But DO try to match partial names from the available lists

Return ONLY the JSON object, nothing else.`;

    try {
      this.logger.log('[FilesAgent] Calling AI for intent parsing...');
      const response = await this.aiProvider.generateText(aiPrompt, {
        saveToDatabase: false,
      });
      this.logger.log(`[FilesAgent] AI raw response type: ${typeof response}`);
      this.logger.log(`[FilesAgent] AI raw response: ${JSON.stringify(response)}`);

      // Check if response indicates an error
      if (!response) {
        this.logger.error('[FilesAgent] AI returned null/undefined response');
        return { action: 'unknown' };
      }

      // Parse AI response
      let parsedResponse: ParsedIntent;

      // Extract text content from response (handle multiple response formats)
      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response?.text) {
        responseText = response.text;
      } else if (response?.content) {
        responseText = response.content;
      } else if (response?.choices?.[0]?.message?.content) {
        responseText = response.choices[0].message.content;
      } else if (response?.data?.text) {
        responseText = response.data.text;
      } else if (response?.data) {
        responseText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      } else {
        responseText = JSON.stringify(response);
      }
      this.logger.log(`[FilesAgent] Extracted response text: ${responseText}`);

      try {
        // Clean up potential markdown code blocks
        let cleanResponse = responseText
          .trim()
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        parsedResponse = JSON.parse(cleanResponse);
      } catch (parseError) {
        this.logger.warn(
          `[FilesAgent] Failed to parse AI response: ${responseText}`,
        );
        return { action: 'unknown' };
      }

      // Validate action
      const validActions = [
        'create_folder',
        'rename_folder',
        'rename_file',
        'rename_auto',
        'delete_folder',
        'delete_file',
        'move_file',
        'move_folder',
        'copy_file',
        'copy_folder',
        'share_file',
        'star_file',
        'unstar_file',
        'search',
        'restore_file',
        'restore_folder',
        'batch_create_folders',
        'batch_delete_files',
        'batch_delete_folders',
        'batch_move_files',
        'batch_move_folders',
        'batch_restore_files',
        'batch_restore_folders',
        'unknown',
      ];

      if (!validActions.includes(parsedResponse.action)) {
        this.logger.warn(
          `[FilesAgent] Invalid action from AI: ${parsedResponse.action}`,
        );
        return { action: 'unknown' };
      }

      return parsedResponse;
    } catch (error) {
      this.logger.error(
        `[FilesAgent] AI parsing failed: ${error.message}`,
        error.stack,
      );
      this.logger.error(`[FilesAgent] Original prompt was: "${prompt}"`);
      return { action: 'unknown' };
    }
  }

  /**
   * Execute the parsed action
   */
  private async executeAction(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingItems: { files: any[]; folders: any[] },
  ): Promise<FileAgentResponse> {
    const { action } = intent;

    switch (action) {
      case 'create_folder':
        return this.handleCreateFolder(intent, workspaceId, userId);

      case 'rename_folder':
        return this.handleRenameFolder(intent, workspaceId, userId, existingItems.folders);

      case 'rename_file':
        return this.handleRenameFile(intent, workspaceId, userId, existingItems.files);

      case 'rename_auto':
        return this.handleRenameAuto(intent, workspaceId, userId, existingItems);

      case 'delete_folder':
        return this.handleDeleteFolder(intent, workspaceId, userId, existingItems.folders);

      case 'delete_file':
        return this.handleDeleteFile(intent, workspaceId, userId, existingItems.files);

      case 'move_file':
        return this.handleMoveFile(intent, workspaceId, userId, existingItems);

      case 'move_folder':
        return this.handleMoveFolder(intent, workspaceId, userId, existingItems.folders);

      case 'copy_file':
        return this.handleCopyFile(intent, workspaceId, userId, existingItems);

      case 'copy_folder':
        return this.handleCopyFolder(intent, workspaceId, userId, existingItems.folders);

      case 'share_file':
        return this.handleShareFile(intent, workspaceId, userId, existingItems.files);

      case 'star_file':
        return this.handleStarFile(intent, workspaceId, userId, existingItems.files, true);

      case 'unstar_file':
        return this.handleStarFile(intent, workspaceId, userId, existingItems.files, false);

      case 'search':
        return this.handleSearch(intent, workspaceId, userId);

      case 'batch_create_folders':
        return this.handleBatchCreateFolders(intent, workspaceId, userId);

      case 'batch_delete_files':
        return this.handleBatchDeleteFiles(intent, workspaceId, userId);

      case 'batch_delete_folders':
        return this.handleBatchDeleteFolders(intent, workspaceId, userId);

      case 'batch_move_files':
        return this.handleBatchMoveFiles(intent, workspaceId, userId);

      case 'batch_move_folders':
        return this.handleBatchMoveFolders(intent, workspaceId, userId);

      case 'restore_file':
        return this.handleRestoreFile(intent, workspaceId, userId, existingItems.files);

      case 'restore_folder':
        return this.handleRestoreFolder(intent, workspaceId, userId, existingItems.folders);

      case 'batch_restore_files':
        return this.handleBatchRestoreFiles(intent, workspaceId, userId);

      case 'batch_restore_folders':
        return this.handleBatchRestoreFolders(intent, workspaceId, userId);

      default:
        return {
          success: false,
          action: 'unknown',
          message: 'I could not understand your request. Please try again.',
          error: 'UNKNOWN_ACTION',
        };
    }
  }

  /**
   * Handle create folder action
   */
  private async handleCreateFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const folderName = intent.details?.name || intent.folderName || 'New Folder';
    const parentId = intent.details?.parent_id || null;

    try {
      const folder = await this.filesService.createFolder(
        workspaceId,
        {
          name: folderName,
          parent_id: parentId,
          description: intent.details?.description,
        },
        userId,
      );

      return {
        success: true,
        action: 'create_folder',
        message: `✅ Created folder "${folderName}"${parentId ? ' inside the specified folder' : ' in root'}.`,
        data: { folder },
      };
    } catch (error) {
      return {
        success: false,
        action: 'create_folder',
        message: `Failed to create folder "${folderName}": ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle rename folder action
   */
  private async handleRenameFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFolders: any[],
  ): Promise<FileAgentResponse> {
    const folderId = intent.folderId || this.findFolderByName(intent.folderName, existingFolders);
    const newName = intent.newName;

    if (!folderId) {
      return {
        success: false,
        action: 'rename_folder',
        message: `Could not find a folder matching "${intent.folderName}".`,
        error: 'FOLDER_NOT_FOUND',
      };
    }

    if (!newName) {
      return {
        success: false,
        action: 'rename_folder',
        message: 'Please specify a new name for the folder.',
        error: 'NEW_NAME_REQUIRED',
      };
    }

    try {
      const folder = await this.filesService.updateFolder(
        folderId,
        workspaceId,
        { name: newName },
        userId,
      );

      return {
        success: true,
        action: 'rename_folder',
        message: `✅ Renamed folder to "${newName}".`,
        data: { folder },
      };
    } catch (error) {
      return {
        success: false,
        action: 'rename_folder',
        message: `Failed to rename folder: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle rename file action
   */
  private async handleRenameFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFiles: any[],
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingFiles);
    const newName = intent.newName;

    if (!fileId) {
      return {
        success: false,
        action: 'rename_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    if (!newName) {
      return {
        success: false,
        action: 'rename_file',
        message: 'Please specify a new name for the file.',
        error: 'NEW_NAME_REQUIRED',
      };
    }

    try {
      const file = await this.filesService.updateFile(
        fileId,
        workspaceId,
        { name: newName },
        userId,
      );

      return {
        success: true,
        action: 'rename_file',
        message: `✅ Renamed file to "${newName}".`,
        data: { file },
      };
    } catch (error) {
      return {
        success: false,
        action: 'rename_file',
        message: `Failed to rename file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle rename auto action - tries to find file first, then folder
   */
  private async handleRenameAuto(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingItems: { files: any[]; folders: any[] },
  ): Promise<FileAgentResponse> {
    const searchName = intent.fileName || intent.folderName;
    const newName = intent.newName;

    if (!newName) {
      return {
        success: false,
        action: 'rename_auto',
        message: 'Please specify a new name.',
        error: 'NEW_NAME_REQUIRED',
      };
    }

    // Try to find as file first
    const fileId = this.findFileByName(searchName, existingItems.files);
    if (fileId) {
      this.logger.log(`[FilesAgent] rename_auto: Found as file, renaming file "${searchName}" to "${newName}"`);
      return this.handleRenameFile(
        { ...intent, action: 'rename_file', fileId, fileName: searchName },
        workspaceId,
        userId,
        existingItems.files,
      );
    }

    // Try to find as folder
    const folderId = this.findFolderByName(searchName, existingItems.folders);
    if (folderId) {
      this.logger.log(`[FilesAgent] rename_auto: Found as folder, renaming folder "${searchName}" to "${newName}"`);
      return this.handleRenameFolder(
        { ...intent, action: 'rename_folder', folderId, folderName: searchName },
        workspaceId,
        userId,
        existingItems.folders,
      );
    }

    // Neither file nor folder found
    return {
      success: false,
      action: 'rename_auto',
      message: `Could not find a file or folder matching "${searchName}".`,
      error: 'NOT_FOUND',
    };
  }

  /**
   * Handle delete folder action
   */
  private async handleDeleteFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFolders: any[],
  ): Promise<FileAgentResponse> {
    const folderId = intent.folderId || this.findFolderByName(intent.folderName, existingFolders);
    const folderName = intent.folderName || existingFolders.find(f => f.id === folderId)?.name || 'the folder';

    if (!folderId) {
      return {
        success: false,
        action: 'delete_folder',
        message: `Could not find a folder matching "${intent.folderName}".`,
        error: 'FOLDER_NOT_FOUND',
      };
    }

    try {
      await this.filesService.deleteFolderRecursive(folderId, workspaceId, userId);

      return {
        success: true,
        action: 'delete_folder',
        message: `✅ Deleted folder "${folderName}" and all its contents.`,
        data: { deletedFolderId: folderId, deletedFolderName: folderName },
      };
    } catch (error) {
      return {
        success: false,
        action: 'delete_folder',
        message: `Failed to delete folder: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle delete file action
   */
  private async handleDeleteFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFiles: any[],
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingFiles);
    const fileName = intent.fileName || existingFiles.find(f => f.id === fileId)?.name || 'the file';

    if (!fileId) {
      return {
        success: false,
        action: 'delete_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    try {
      await this.filesService.deleteFile(fileId, workspaceId, userId);

      return {
        success: true,
        action: 'delete_file',
        message: `✅ Deleted file "${fileName}".`,
        data: { deletedFileId: fileId, deletedFileName: fileName },
      };
    } catch (error) {
      return {
        success: false,
        action: 'delete_file',
        message: `Failed to delete file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle move file action
   */
  private async handleMoveFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingItems: { files: any[]; folders: any[] },
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingItems.files);
    const targetFolderId = intent.targetFolderId;
    const fileName = intent.fileName || existingItems.files.find(f => f.id === fileId)?.name || 'the file';
    const targetFolderName = targetFolderId
      ? existingItems.folders.find(f => f.id === targetFolderId)?.name || 'the folder'
      : 'root';

    if (!fileId) {
      return {
        success: false,
        action: 'move_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    try {
      const file = await this.filesService.moveFile(
        fileId,
        workspaceId,
        { target_folder_id: targetFolderId || null },
        userId,
      );

      return {
        success: true,
        action: 'move_file',
        message: `✅ Moved "${fileName}" to ${targetFolderName}.`,
        data: { file },
      };
    } catch (error) {
      return {
        success: false,
        action: 'move_file',
        message: `Failed to move file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle move folder action
   */
  private async handleMoveFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFolders: any[],
  ): Promise<FileAgentResponse> {
    const folderId = intent.folderId || this.findFolderByName(intent.folderName, existingFolders);
    const targetParentId = intent.targetParentId;
    const folderName = intent.folderName || existingFolders.find(f => f.id === folderId)?.name || 'the folder';
    const targetFolderName = targetParentId
      ? existingFolders.find(f => f.id === targetParentId)?.name || 'the folder'
      : 'root';

    if (!folderId) {
      return {
        success: false,
        action: 'move_folder',
        message: `Could not find a folder matching "${intent.folderName}".`,
        error: 'FOLDER_NOT_FOUND',
      };
    }

    try {
      const folder = await this.filesService.moveFolder(
        folderId,
        workspaceId,
        { target_parent_id: targetParentId || null },
        userId,
      );

      return {
        success: true,
        action: 'move_folder',
        message: `✅ Moved "${folderName}" to ${targetFolderName}.`,
        data: { folder },
      };
    } catch (error) {
      return {
        success: false,
        action: 'move_folder',
        message: `Failed to move folder: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle copy file action
   */
  private async handleCopyFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingItems: { files: any[]; folders: any[] },
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingItems.files);
    const targetFolderId = intent.targetFolderId;
    const fileName = intent.fileName || existingItems.files.find(f => f.id === fileId)?.name || 'the file';
    const targetFolderName = targetFolderId
      ? existingItems.folders.find(f => f.id === targetFolderId)?.name || 'the folder'
      : 'root';

    if (!fileId) {
      return {
        success: false,
        action: 'copy_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    try {
      const file = await this.filesService.copyFile(
        fileId,
        workspaceId,
        {
          target_folder_id: targetFolderId || null,
          new_name: `${fileName} (Copy)`,
        },
        userId,
      );

      return {
        success: true,
        action: 'copy_file',
        message: `✅ Copied "${fileName}" to ${targetFolderName}.`,
        data: { file },
      };
    } catch (error) {
      return {
        success: false,
        action: 'copy_file',
        message: `Failed to copy file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle copy folder action
   */
  private async handleCopyFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFolders: any[],
  ): Promise<FileAgentResponse> {
    const folderId = intent.folderId || this.findFolderByName(intent.folderName, existingFolders);
    const targetParentId = intent.targetParentId;
    const folderName = intent.folderName || existingFolders.find(f => f.id === folderId)?.name || 'the folder';
    const targetFolderName = targetParentId
      ? existingFolders.find(f => f.id === targetParentId)?.name || 'the folder'
      : 'root';

    if (!folderId) {
      return {
        success: false,
        action: 'copy_folder',
        message: `Could not find a folder matching "${intent.folderName}".`,
        error: 'FOLDER_NOT_FOUND',
      };
    }

    try {
      const folder = await this.filesService.copyFolder(
        folderId,
        workspaceId,
        {
          target_parent_id: targetParentId || null,
          new_name: `${folderName} (Copy)`,
        },
        userId,
      );

      return {
        success: true,
        action: 'copy_folder',
        message: `✅ Copied "${folderName}" to ${targetFolderName}.`,
        data: { folder },
      };
    } catch (error) {
      return {
        success: false,
        action: 'copy_folder',
        message: `Failed to copy folder: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle share file action
   */
  private async handleShareFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFiles: any[],
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingFiles);
    const shareWith = intent.shareWith || [];
    const fileName = intent.fileName || existingFiles.find(f => f.id === fileId)?.name || 'the file';

    if (!fileId) {
      return {
        success: false,
        action: 'share_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    if (shareWith.length === 0) {
      return {
        success: false,
        action: 'share_file',
        message: 'Please specify who you want to share the file with.',
        error: 'NO_USERS_SPECIFIED',
      };
    }

    try {
      await this.filesService.shareFile(
        fileId,
        workspaceId,
        {
          user_ids: shareWith,
          permissions: { read: true, download: true },
        },
        userId,
      );

      return {
        success: true,
        action: 'share_file',
        message: `✅ Shared "${fileName}" with ${shareWith.length} user(s).`,
        data: { fileId, sharedWith: shareWith },
      };
    } catch (error) {
      return {
        success: false,
        action: 'share_file',
        message: `Failed to share file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle star/unstar file action
   */
  private async handleStarFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFiles: any[],
    starred: boolean,
  ): Promise<FileAgentResponse> {
    const fileId = intent.fileId || this.findFileByName(intent.fileName, existingFiles);
    const fileName = intent.fileName || existingFiles.find(f => f.id === fileId)?.name || 'the file';

    if (!fileId) {
      return {
        success: false,
        action: starred ? 'star_file' : 'unstar_file',
        message: `Could not find a file matching "${intent.fileName}".`,
        error: 'FILE_NOT_FOUND',
      };
    }

    try {
      const file = await this.filesService.updateFile(
        fileId,
        workspaceId,
        { starred },
        userId,
      );

      return {
        success: true,
        action: starred ? 'star_file' : 'unstar_file',
        message: starred
          ? `⭐ Starred "${fileName}".`
          : `Removed star from "${fileName}".`,
        data: { file },
      };
    } catch (error) {
      return {
        success: false,
        action: starred ? 'star_file' : 'unstar_file',
        message: `Failed to ${starred ? 'star' : 'unstar'} file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle search action
   */
  private async handleSearch(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const query = intent.searchQuery;

    if (!query) {
      return {
        success: false,
        action: 'search',
        message: 'Please specify what you want to search for.',
        error: 'NO_SEARCH_QUERY',
      };
    }

    try {
      const results = await this.filesService.searchFiles(
        workspaceId,
        query,
        undefined,
        1,
        20,
        userId,
      );

      const fileCount = results.data?.length || 0;

      return {
        success: true,
        action: 'search',
        message: fileCount > 0
          ? `🔍 Found ${fileCount} file(s) matching "${query}".`
          : `No files found matching "${query}".`,
        data: {
          query,
          count: fileCount,
          files: results.data || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        action: 'search',
        message: `Search failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle batch create folders action
   */
  private async handleBatchCreateFolders(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const folders = intent.batch_create_folders || [];
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of folders) {
      try {
        const folder = await this.filesService.createFolder(
          workspaceId,
          {
            name: item.details.name || 'New Folder',
            parent_id: item.details.parent_id || null,
            description: item.details.description,
          },
          userId,
        );
        results.push({ success: true, folder });
        successCount++;
      } catch (error) {
        results.push({ success: false, error: error.message, name: item.details.name });
        failedCount++;
      }
    }

    return {
      success: successCount > 0,
      action: 'batch_create_folders',
      message: `✅ Created ${successCount} folder(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      data: { results, successful: successCount, failed: failedCount },
    };
  }

  /**
   * Handle batch delete files action
   */
  private async handleBatchDeleteFiles(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const files = intent.batch_delete_files || [];
    const fileIds = files.map(f => f.fileId);

    if (fileIds.length === 0) {
      return {
        success: false,
        action: 'batch_delete_files',
        message: 'No files specified for deletion.',
        error: 'NO_FILES_SPECIFIED',
      };
    }

    try {
      const result = await this.filesService.deleteMultipleFiles(
        fileIds,
        workspaceId,
        userId,
      );

      return {
        success: true,
        action: 'batch_delete_files',
        message: `✅ Deleted ${result.deleted_count} file(s)${result.failed_count > 0 ? `, ${result.failed_count} failed` : ''}.`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        action: 'batch_delete_files',
        message: `Batch delete failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle batch delete folders action
   */
  private async handleBatchDeleteFolders(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const folders = intent.batch_delete_folders || [];
    const folderIds = folders.map(f => f.folderId);

    if (folderIds.length === 0) {
      return {
        success: false,
        action: 'batch_delete_folders',
        message: 'No folders specified for deletion.',
        error: 'NO_FOLDERS_SPECIFIED',
      };
    }

    try {
      const result = await this.filesService.deleteMultipleFolders(
        folderIds,
        workspaceId,
        userId,
      );

      return {
        success: true,
        action: 'batch_delete_folders',
        message: `✅ Deleted ${result.deleted_folders_count} folder(s) and ${result.deleted_files_count} file(s).`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        action: 'batch_delete_folders',
        message: `Batch delete failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle batch move files action
   */
  private async handleBatchMoveFiles(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const files = intent.batch_move_files || [];
    const results: any[] = [];
    let successCount = 0;
    let failedCount = 0;

    for (const item of files) {
      try {
        const file = await this.filesService.moveFile(
          item.fileId,
          workspaceId,
          { target_folder_id: item.targetFolderId },
          userId,
        );
        results.push({ success: true, file, fileName: item.fileName });
        successCount++;
      } catch (error) {
        results.push({ success: false, error: error.message, fileName: item.fileName });
        failedCount++;
      }
    }

    return {
      success: successCount > 0,
      action: 'batch_move_files',
      message: `✅ Moved ${successCount} file(s)${failedCount > 0 ? `, ${failedCount} failed` : ''}.`,
      data: { results, successful: successCount, failed: failedCount },
    };
  }

  /**
   * Handle batch move folders action
   */
  private async handleBatchMoveFolders(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const folders = intent.batch_move_folders || [];
    const folderIds = folders.map(f => f.folderId);
    const targetParentId = folders[0]?.targetParentId || null;

    if (folderIds.length === 0) {
      return {
        success: false,
        action: 'batch_move_folders',
        message: 'No folders specified for moving.',
        error: 'NO_FOLDERS_SPECIFIED',
      };
    }

    try {
      const result = await this.filesService.moveMultipleFolders(
        folderIds,
        workspaceId,
        targetParentId,
        userId,
      );

      return {
        success: true,
        action: 'batch_move_folders',
        message: `✅ Moved ${result.moved_count} folder(s)${result.failed_count > 0 ? `, ${result.failed_count} failed` : ''}.`,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        action: 'batch_move_folders',
        message: `Batch move failed: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Find folder ID by name (case-insensitive partial match)
   */
  private findFolderByName(folderName: string | undefined, folders: any[]): string | null {
    if (!folderName) return null;
    const normalizedName = folderName.toLowerCase().trim();

    // Try exact match first
    for (const folder of folders) {
      if (folder.name?.toLowerCase() === normalizedName) {
        return folder.id;
      }
    }

    // Try partial match
    for (const folder of folders) {
      if (folder.name?.toLowerCase().includes(normalizedName)) {
        return folder.id;
      }
    }

    return null;
  }

  /**
   * Find file ID by name (case-insensitive partial match)
   */
  private findFileByName(fileName: string | undefined, files: any[]): string | null {
    if (!fileName) return null;
    const normalizedName = fileName.toLowerCase().trim();

    // Try exact match first
    for (const file of files) {
      if (file.name?.toLowerCase() === normalizedName) {
        return file.id;
      }
    }

    // Try partial match
    for (const file of files) {
      if (file.name?.toLowerCase().includes(normalizedName)) {
        return file.id;
      }
    }

    return null;
  }

  /**
   * Get conversation history for the Files AI agent
   */
  async getConversationHistory(
    workspaceId: string,
    userId: string,
    limit?: number,
  ): Promise<any[]> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        return [];
      }

      return await this.conversationMemoryService.getRecentHistory(
        workspaceId,
        userId,
        limit || 50,
      );
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Failed to get conversation history: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Clear conversation history for the Files AI agent
   */
  async clearConversationHistory(
    workspaceId: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        return { success: false, message: 'Conversation memory not available' };
      }

      await this.conversationMemoryService.deleteUserHistory(
        workspaceId,
        userId,
      );

      return { success: true, message: 'Conversation history cleared' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Get conversation statistics for the Files AI agent
   */
  async getConversationStats(
    workspaceId: string,
    userId: string,
  ): Promise<any> {
    try {
      if (!this.conversationMemoryService.isReady()) {
        return { totalMessages: 0, userMessages: 0, assistantMessages: 0 };
      }

      return await this.conversationMemoryService.getConversationStats(
        workspaceId,
        userId,
      );
    } catch (error) {
      this.logger.warn(
        `[FilesAgent] Failed to get conversation stats: ${error.message}`,
      );
      return { totalMessages: 0, userMessages: 0, assistantMessages: 0 };
    }
  }

  /**
   * Handle restore file action
   */
  private async handleRestoreFile(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFiles: any[],
  ): Promise<FileAgentResponse> {
    const { fileId, fileName } = intent;

    // Try to find the file
    let targetFileId = fileId;
    let targetFileName = fileName;

    if (!targetFileId && fileName) {
      const file = existingFiles.find(
        (f) => f.name.toLowerCase() === fileName.toLowerCase() ||
               f.name.toLowerCase().includes(fileName.toLowerCase())
      );
      if (file) {
        targetFileId = file.id;
        targetFileName = file.name;
      }
    }

    if (!targetFileId) {
      return {
        success: false,
        action: 'restore_file',
        message: `Could not find file "${fileName || 'unknown'}" to restore.`,
        error: 'FILE_NOT_FOUND',
      };
    }

    try {
      const result = await this.filesService.restoreFile(
        targetFileId,
        workspaceId,
        userId,
      );

      return {
        success: true,
        action: 'restore_file',
        message: `File "${targetFileName}" has been restored successfully.`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`[FilesAgent] Restore file failed: ${error.message}`);
      return {
        success: false,
        action: 'restore_file',
        message: `Failed to restore file: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle restore folder action
   */
  private async handleRestoreFolder(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
    existingFolders: any[],
  ): Promise<FileAgentResponse> {
    const { folderId, folderName } = intent;

    // Try to find the folder
    let targetFolderId = folderId;
    let targetFolderName = folderName;

    if (!targetFolderId && folderName) {
      const folder = existingFolders.find(
        (f) => f.name.toLowerCase() === folderName.toLowerCase() ||
               f.name.toLowerCase().includes(folderName.toLowerCase())
      );
      if (folder) {
        targetFolderId = folder.id;
        targetFolderName = folder.name;
      }
    }

    if (!targetFolderId) {
      return {
        success: false,
        action: 'restore_folder',
        message: `Could not find folder "${folderName || 'unknown'}" to restore.`,
        error: 'FOLDER_NOT_FOUND',
      };
    }

    try {
      const result = await this.filesService.restoreFolderRecursive(
        targetFolderId,
        workspaceId,
        userId,
      );

      return {
        success: true,
        action: 'restore_folder',
        message: `Folder "${targetFolderName}" and all its contents have been restored successfully.`,
        data: result,
      };
    } catch (error) {
      this.logger.error(`[FilesAgent] Restore folder failed: ${error.message}`);
      return {
        success: false,
        action: 'restore_folder',
        message: `Failed to restore folder: ${error.message}`,
        error: error.message,
      };
    }
  }

  /**
   * Handle batch restore files action
   */
  private async handleBatchRestoreFiles(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const items = intent.batch_restore_files || [];

    // If no specific files specified, get all deleted files
    if (items.length === 0) {
      try {
        // Get all deleted files using getFiles with isDeleted=true
        const deletedFilesResult = await this.filesService.getFiles(workspaceId, undefined, 1, 1000, true, userId);
        const deletedFiles = deletedFilesResult?.data || [];

        if (deletedFiles.length === 0) {
          return {
            success: false,
            action: 'batch_restore_files',
            message: 'No deleted files found to restore.',
            error: 'NO_DELETED_FILES',
          };
        }

        // Restore all deleted files
        const results: Array<{ success: boolean; fileName: string; error?: string }> = [];

        for (const file of deletedFiles) {
          try {
            await this.filesService.restoreFile(file.id, workspaceId, userId);
            results.push({ success: true, fileName: file.name });
          } catch (error) {
            results.push({ success: false, fileName: file.name, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
          success: successCount > 0,
          action: 'batch_restore_files',
          message: `Restored ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
          data: { results, total: deletedFiles.length, successful: successCount, failed: failCount },
        };
      } catch (error) {
        this.logger.error(`[FilesAgent] Batch restore files failed: ${error.message}`);
        return {
          success: false,
          action: 'batch_restore_files',
          message: `Failed to restore files: ${error.message}`,
          error: error.message,
        };
      }
    }

    // Restore specified files
    const results: Array<{ success: boolean; fileName: string; error?: string }> = [];

    for (const item of items) {
      try {
        await this.filesService.restoreFile(item.fileId, workspaceId, userId);
        results.push({ success: true, fileName: item.fileName });
      } catch (error) {
        results.push({ success: false, fileName: item.fileName, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_restore_files',
      message: `Restored ${successCount} file(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      data: { results, total: items.length, successful: successCount, failed: failCount },
    };
  }

  /**
   * Handle batch restore folders action
   */
  private async handleBatchRestoreFolders(
    intent: ParsedIntent,
    workspaceId: string,
    userId: string,
  ): Promise<FileAgentResponse> {
    const items = intent.batch_restore_folders || [];

    // If no specific folders specified, get all deleted folders
    if (items.length === 0) {
      try {
        // Get all deleted folders using getFolders with isDeleted=true
        const deletedFolders = await this.filesService.getFolders(workspaceId, undefined, true, userId);

        if (!deletedFolders || deletedFolders.length === 0) {
          return {
            success: false,
            action: 'batch_restore_folders',
            message: 'No deleted folders found to restore.',
            error: 'NO_DELETED_FOLDERS',
          };
        }

        // Restore all deleted folders
        const results: Array<{ success: boolean; folderName: string; error?: string }> = [];

        for (const folder of deletedFolders) {
          try {
            await this.filesService.restoreFolderRecursive(folder.id, workspaceId, userId);
            results.push({ success: true, folderName: folder.name });
          } catch (error) {
            results.push({ success: false, folderName: folder.name, error: error.message });
          }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return {
          success: successCount > 0,
          action: 'batch_restore_folders',
          message: `Restored ${successCount} folder(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
          data: { results, total: deletedFolders.length, successful: successCount, failed: failCount },
        };
      } catch (error) {
        this.logger.error(`[FilesAgent] Batch restore folders failed: ${error.message}`);
        return {
          success: false,
          action: 'batch_restore_folders',
          message: `Failed to restore folders: ${error.message}`,
          error: error.message,
        };
      }
    }

    // Restore specified folders
    const results: Array<{ success: boolean; folderName: string; error?: string }> = [];

    for (const item of items) {
      try {
        await this.filesService.restoreFolderRecursive(item.folderId, workspaceId, userId);
        results.push({ success: true, folderName: item.folderName });
      } catch (error) {
        results.push({ success: false, folderName: item.folderName, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return {
      success: successCount > 0,
      action: 'batch_restore_folders',
      message: `Restored ${successCount} folder(s)${failCount > 0 ? `, ${failCount} failed` : ''}.`,
      data: { results, total: items.length, successful: successCount, failed: failCount },
    };
  }
}
