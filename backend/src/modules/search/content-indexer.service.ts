import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { SemanticSearchService, IndexContentOptions, IndexableContentType } from './semantic-search.service';

/**
 * Service for automatically indexing content for semantic search
 * Can be called from other modules when content is created/updated/deleted
 */
@Injectable()
export class ContentIndexerService {
  private readonly logger = new Logger(ContentIndexerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly semanticSearchService: SemanticSearchService,
  ) {}

  // ============================================
  // Note Indexing
  // ============================================

  /**
   * Index a note for semantic search
   */
  async indexNote(noteId: string): Promise<boolean> {
    try {
      const note = await this.db.findOne('notes', { id: noteId });
      if (!note || note.deleted_at) {
        return false;
      }

      const content = note.content_text || this.stripHtml(note.content || '');

      await this.semanticSearchService.indexContent({
        content_type: 'note',
        content_id: noteId,
        workspace_id: note.workspace_id,
        title: note.title,
        content: content,
        metadata: {
          created_by: note.created_by,
          created_at: note.created_at,
          folder_id: note.folder_id,
          tags: note.tags || [],
          is_public: note.is_public,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to index note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Remove note from index
   */
  async removeNote(noteId: string): Promise<boolean> {
    return this.semanticSearchService.removeContent('note', noteId);
  }

  // ============================================
  // Message Indexing
  // ============================================

  /**
   * Index a message for semantic search
   */
  async indexMessage(messageId: string): Promise<boolean> {
    try {
      const message = await this.db.findOne('messages', { id: messageId });
      if (!message || message.is_deleted) {
        return false;
      }

      // Get channel info for workspace_id
      const channel = await this.db.findOne('channels', { id: message.channel_id });
      if (!channel) {
        return false;
      }

      const content = message.content || this.stripHtml(message.content_html || '');

      await this.semanticSearchService.indexContent({
        content_type: 'message',
        content_id: messageId,
        workspace_id: channel.workspace_id,
        content: content,
        metadata: {
          created_by: message.user_id,
          created_at: message.created_at,
          channel_id: message.channel_id,
          thread_id: message.thread_id,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to index message ${messageId}:`, error);
      return false;
    }
  }

  /**
   * Remove message from index
   */
  async removeMessage(messageId: string): Promise<boolean> {
    return this.semanticSearchService.removeContent('message', messageId);
  }

  // ============================================
  // File Indexing
  // ============================================

  /**
   * Index a file for semantic search
   */
  async indexFile(fileId: string): Promise<boolean> {
    try {
      const file = await this.db.findOne('files', { id: fileId });
      if (!file || file.is_deleted) {
        return false;
      }

      // Use extracted text if available, otherwise just use filename
      const content = file.extracted_text || file.name || '';

      await this.semanticSearchService.indexContent({
        content_type: 'file',
        content_id: fileId,
        workspace_id: file.workspace_id,
        title: file.name,
        content: content,
        metadata: {
          created_by: file.uploaded_by,
          created_at: file.created_at,
          folder_id: file.folder_id,
          mime_type: file.mime_type,
          size: file.size,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to index file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * Remove file from index
   */
  async removeFile(fileId: string): Promise<boolean> {
    return this.semanticSearchService.removeContent('file', fileId);
  }

  // ============================================
  // Task Indexing
  // ============================================

  /**
   * Index a task for semantic search
   */
  async indexTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.db.findOne('tasks', { id: taskId });
      if (!task) {
        return false;
      }

      // Get project for workspace_id
      const project = await this.db.findOne('projects', { id: task.project_id });
      if (!project) {
        return false;
      }

      const content = `${task.title}\n\n${task.description || ''}`;

      await this.semanticSearchService.indexContent({
        content_type: 'task',
        content_id: taskId,
        workspace_id: project.workspace_id,
        title: task.title,
        content: content,
        metadata: {
          created_by: task.created_by,
          created_at: task.created_at,
          project_id: task.project_id,
          assigned_to: task.assigned_to,
          status: task.status,
          priority: task.priority,
          tags: task.tags || [],
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to index task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * Remove task from index
   */
  async removeTask(taskId: string): Promise<boolean> {
    return this.semanticSearchService.removeContent('task', taskId);
  }

  // ============================================
  // Meeting Transcript Indexing
  // ============================================

  /**
   * Index a meeting transcript for semantic search
   */
  async indexMeetingTranscript(transcriptId: string): Promise<boolean> {
    try {
      const transcript = await this.db.findOne('video_call_transcripts', { id: transcriptId });
      if (!transcript) {
        return false;
      }

      // Get video call for title
      const videoCall = await this.db.findOne('video_calls', { id: transcript.video_call_id });

      await this.semanticSearchService.indexContent({
        content_type: 'meeting_transcript',
        content_id: transcriptId,
        workspace_id: transcript.workspace_id,
        title: videoCall?.title || 'Meeting Transcript',
        content: transcript.full_text,
        metadata: {
          video_call_id: transcript.video_call_id,
          created_at: transcript.created_at,
          language: transcript.language,
          duration_seconds: transcript.duration_seconds,
        },
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to index transcript ${transcriptId}:`, error);
      return false;
    }
  }

  /**
   * Remove transcript from index
   */
  async removeMeetingTranscript(transcriptId: string): Promise<boolean> {
    return this.semanticSearchService.removeContent('meeting_transcript', transcriptId);
  }

  // ============================================
  // Bulk Indexing
  // ============================================

  /**
   * Index all content in a workspace
   * Useful for initial indexing or re-indexing
   */
  async indexWorkspace(workspaceId: string): Promise<{
    notes: number;
    messages: number;
    files: number;
    tasks: number;
    transcripts: number;
  }> {
    this.logger.log(`Starting workspace indexing for ${workspaceId}`);

    const stats = {
      notes: 0,
      messages: 0,
      files: 0,
      tasks: 0,
      transcripts: 0,
    };

    // Index notes
    try {
      const notesResult = await this.db.findMany('notes', {
        workspace_id: workspaceId,
      });
      const notes = notesResult.data || [];
      for (const note of notes) {
        if (!note.deleted_at && await this.indexNote(note.id)) {
          stats.notes++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to index notes:', error);
    }

    // Index files
    try {
      const filesResult = await this.db.findMany('files', {
        workspace_id: workspaceId,
        is_deleted: false,
      });
      const files = filesResult.data || [];
      for (const file of files) {
        if (await this.indexFile(file.id)) {
          stats.files++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to index files:', error);
    }

    // Index tasks (via projects)
    try {
      const projectsResult = await this.db.findMany('projects', {
        workspace_id: workspaceId,
      });
      const projects = projectsResult.data || [];
      for (const project of projects) {
        const tasksResult = await this.db.findMany('tasks', {
          project_id: project.id,
        });
        const tasks = tasksResult.data || [];
        for (const task of tasks) {
          if (await this.indexTask(task.id)) {
            stats.tasks++;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to index tasks:', error);
    }

    // Index transcripts
    try {
      const transcriptsResult = await this.db.findMany('video_call_transcripts', {
        workspace_id: workspaceId,
      });
      const transcripts = transcriptsResult.data || [];
      for (const transcript of transcripts) {
        if (await this.indexMeetingTranscript(transcript.id)) {
          stats.transcripts++;
        }
      }
    } catch (error) {
      this.logger.error('Failed to index transcripts:', error);
    }

    // Index messages (via channels)
    try {
      const channelsResult = await this.db.findMany('channels', {
        workspace_id: workspaceId,
      });
      const channels = channelsResult.data || [];
      for (const channel of channels) {
        const messagesResult = await this.db.findMany('messages', {
          channel_id: channel.id,
          is_deleted: false,
        });
        const messages = messagesResult.data || [];
        // Only index messages with substantial content
        for (const message of messages) {
          if (message.content && message.content.length > 20 && await this.indexMessage(message.id)) {
            stats.messages++;
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to index messages:', error);
    }

    this.logger.log(`Workspace indexing complete:`, stats);
    return stats;
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
