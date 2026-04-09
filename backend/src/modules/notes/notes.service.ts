import { Injectable, NotFoundException, BadRequestException, Optional, Inject, forwardRef } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';
import { EntityEventIntegrationService } from '../workflows/entity-event-integration.service';
import {
  CreateNoteDto,
  UpdateNoteDto,
  ShareNoteDto,
  MergeNotesDto,
  BulkDeleteDto,
  DuplicateNoteDto,
  BulkArchiveDto
} from './dto';

@Injectable()
export class NotesService {
  constructor(
    private readonly db: DatabaseService,
    private notificationsService: NotificationsService,
    @Optional() @Inject(forwardRef(() => EntityEventIntegrationService))
    private entityEventIntegration?: EntityEventIntegrationService,
  ) {}

  /**
   * Parse collaborative_data - handles both string and object formats
   * Also handles potential double-encoding from older data
   */
  private parseCollaborativeData(data: any): any {
    if (!data) return {};

    let result = data;
    if (typeof result === 'string') {
      try {
        result = JSON.parse(result);
        // Check if it was double-encoded (string after first parse)
        if (typeof result === 'string') {
          result = JSON.parse(result);
        }
      } catch (e) {
        console.warn('[NotesService] Failed to parse collaborative_data:', e);
        return {};
      }
    }
    return result;
  }

  async createNote(workspaceId: string, createNoteDto: CreateNoteDto, userId: string) {
    const noteData = {
      workspace_id: workspaceId,
      title: createNoteDto.title,
      content: createNoteDto.content,
      content_text: null,
      parent_id: createNoteDto.parent_id,
      template_id: createNoteDto.template_id,
      created_by: userId,
      author_id: userId,
      tags: createNoteDto.tags || [],
      attachments: createNoteDto.attachments || {
        note_attachment: [],
        file_attachment: [],
        event_attachment: []
      },
      cover_image: createNoteDto.cover_image,
      icon: createNoteDto.icon,
      is_public: createNoteDto.is_public || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const note = await this.db.insert('notes', noteData);

    // Emit note created event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitNoteCreated(workspaceId, note, userId);
      } catch (error) {
        console.error('[NotesService] Failed to emit note created event:', error);
      }
    }

    return note;
  }

  async getNotes(workspaceId: string, parentId?: string, userId?: string, isDeleted?: boolean, isArchived?: boolean) {
    console.log('[NotesService] getNotes called:', { workspaceId, parentId, userId, isDeleted, isArchived });

    // Using new SDK pattern
    const allNotesResult = await this.db.table('notes')
      .select('*')
      .execute();
    const allNotesData = Array.isArray(allNotesResult.data) ? allNotesResult.data : [];

    console.log('[NotesService] Total notes in database:', allNotesData.length);

    // Debug: Log notes with shared_with data
    allNotesData.forEach(note => {
      if (note.collaborative_data) {
        const collaborativeData = this.parseCollaborativeData(note.collaborative_data);
        if (collaborativeData?.shared_with?.length > 0) {
          console.log('[NotesService] Note with sharing:', {
            noteId: note.id,
            noteTitle: note.title,
            createdBy: note.created_by,
            sharedWith: collaborativeData.shared_with,
            currentUserId: userId,
            isUserInSharedWith: collaborativeData.shared_with.includes(userId)
          });
        }
      }
    });

    // Filter by workspace, deletion status, and archive status
    let notes = allNotesData.filter(n => {
      const matchesWorkspace = n.workspace_id === workspaceId;

      // Handle deletion status filtering
      let matchesDeletion = true;
      if (isDeleted === true) {
        // Only return deleted notes
        matchesDeletion = !!n.deleted_at;
      } else if (isDeleted === false) {
        // Only return non-deleted notes
        matchesDeletion = !n.deleted_at;
      } else {
        // Default: return non-deleted notes (backward compatibility)
        matchesDeletion = !n.deleted_at;
      }

      // Handle archive status filtering
      // IMPORTANT: When fetching deleted notes (trash), ignore archive status
      // This ensures all deleted notes show in trash regardless of archive status
      // When restored, notes with archived_at will return to archive tab
      let matchesArchive = true;
      if (isDeleted === true) {
        // For trash tab: show ALL deleted notes (archived or not)
        matchesArchive = true;
      } else if (isArchived === true) {
        // Only return archived notes (that are not deleted)
        matchesArchive = !!n.archived_at;
      } else if (isArchived === false) {
        // Only return non-archived notes
        matchesArchive = !n.archived_at;
      } else {
        // Default: return non-archived notes (exclude archived from regular list)
        matchesArchive = !n.archived_at;
      }

      return matchesWorkspace && matchesDeletion && matchesArchive;
    });

    // Filter by parent
    if (parentId !== undefined) {
      notes = notes.filter(n => n.parent_id === parentId);
    }

    // Filter by access permissions
    if (userId) {
      console.log('[NotesService] Filtering notes for userId:', userId, 'type:', typeof userId);

      notes = notes.filter(n => {
        // User created the note
        if (n.created_by === userId) {
          console.log('[NotesService] Note included - user is creator:', n.id, n.title);
          return true;
        }

        // Note is public
        if (n.is_public || n.visibility === 'public') {
          console.log('[NotesService] Note included - note is public:', n.id, n.title);
          return true;
        }

        // Note is shared with the user (check collaborative_data.shared_with)
        if (n.collaborative_data) {
          const collaborativeData = this.parseCollaborativeData(n.collaborative_data);
          const sharedWith = collaborativeData?.shared_with || [];

          console.log('[NotesService] Checking shared_with for note:', {
            noteId: n.id,
            noteTitle: n.title,
            sharedWith,
            userId,
            sharedWithTypes: sharedWith.map(id => typeof id),
            userIdType: typeof userId,
            includes: sharedWith.includes(userId)
          });

          if (Array.isArray(sharedWith) && sharedWith.includes(userId)) {
            console.log('[NotesService] Note included - user in shared_with:', n.id, n.title);
            return true;
          }
        }

        return false;
      });

      console.log('[NotesService] After filtering, notes count:', notes.length);
    }

    // Enrich notes with author and collaborators information
    const enrichedNotes = await Promise.all(
      notes.map(async (note) => {
        // Get author information
        let authorInfo = null;
        if (note.author_id || note.created_by) {
          const authorId = note.author_id || note.created_by;
          try {
            const authorUser: any = await this.db.getUserById(authorId);
            if (authorUser) {
              const metadata = authorUser.metadata || {};
              authorInfo = {
                id: authorUser.id,
                name: metadata.name || authorUser.fullName || authorUser.name || authorUser.email?.split('@')[0] || 'User',
                email: authorUser.email,
                avatarUrl: authorUser.avatar_url || authorUser.avatarUrl || null,
              };
            }
          } catch (error) {
            console.warn('[NotesService] Could not fetch author info:', error.message);
          }
        }

        // Get collaborators information
        const collaborators: any[] = [];
        if (note.collaborative_data) {
          const collaborativeData = this.parseCollaborativeData(note.collaborative_data);
          const sharedWith = collaborativeData?.shared_with || [];
          if (Array.isArray(sharedWith)) {
            for (const collaboratorId of sharedWith) {
              try {
                const collaboratorUser: any = await this.db.getUserById(collaboratorId);
                if (collaboratorUser) {
                  const metadata = collaboratorUser.metadata || {};
                  collaborators.push({
                    id: collaboratorUser.id,
                    name: metadata.name || collaboratorUser.fullName || collaboratorUser.name || collaboratorUser.email?.split('@')[0] || 'User',
                    email: collaboratorUser.email,
                    avatarUrl: collaboratorUser.avatar_url || collaboratorUser.avatarUrl || null,
                  });
                }
              } catch (error) {
                console.warn('[NotesService] Could not fetch collaborator info:', error.message);
              }
            }
          }
        }

        return {
          ...note,
          author: authorInfo,
          collaborators: collaborators
        };
      })
    );

    return enrichedNotes.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  async getNote(noteId: string, workspaceId: string, userId: string) {
    const noteQuery = await this.db.table('notes')
      .select('*')
      .where('id', '=', noteId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
    if (noteData.length === 0 || noteData[0]?.deleted_at) {
      throw new NotFoundException('Note not found');
    }

    const note = noteData[0];

    // Update view count
    await this.db.update('notes', noteId, {
      view_count: (note.view_count || 0) + 1
    });

    // Enrich with author and collaborators information
    let authorInfo = null;
    if (note.author_id || note.created_by) {
      const authorId = note.author_id || note.created_by;
      try {
        const authorUser: any = await this.db.getUserById(authorId);
        if (authorUser) {
          const metadata = authorUser.metadata || {};
          authorInfo = {
            id: authorUser.id,
            name: metadata.name || authorUser.fullName || authorUser.name || authorUser.email?.split('@')[0] || 'User',
            email: authorUser.email,
            avatarUrl: authorUser.avatar_url || authorUser.avatarUrl || null,
          };
        }
      } catch (error) {
        console.warn('[NotesService] Could not fetch author info:', error.message);
      }
    }

    // Get collaborators information
    const collaborators: any[] = [];
    if (note.collaborative_data) {
      const collaborativeData = this.parseCollaborativeData(note.collaborative_data);
      const sharedWith = collaborativeData?.shared_with || [];
      if (Array.isArray(sharedWith)) {
        for (const collaboratorId of sharedWith) {
          try {
            const collaboratorUser: any = await this.db.getUserById(collaboratorId);
            if (collaboratorUser) {
              const metadata = collaboratorUser.metadata || {};
              collaborators.push({
                id: collaboratorUser.id,
                name: metadata.name || collaboratorUser.fullName || collaboratorUser.name || collaboratorUser.email?.split('@')[0] || 'User',
                email: collaboratorUser.email,
                avatarUrl: collaboratorUser.avatar_url || collaboratorUser.avatarUrl || null,
              });
            }
          } catch (error) {
            console.warn('[NotesService] Could not fetch collaborator info:', error.message);
          }
        }
      }
    }

    // Enrich attachments with details (titles, names, etc.)
    console.log('[NotesService] Raw note attachments:', JSON.stringify(note.attachments));
    const enrichedAttachments = await this.enrichAttachments(note.attachments, workspaceId);
    console.log('[NotesService] Enriched attachments:', JSON.stringify(enrichedAttachments));

    return {
      ...note,
      attachments: enrichedAttachments,
      author: authorInfo,
      collaborators: collaborators
    };
  }

  /**
   * Get a note by ID (for internal use, e.g., collaboration service)
   * Does not check permissions or increment view count
   */
  async getNoteById(noteId: string) {
    const noteQuery = await this.db.table('notes')
      .select('*')
      .where('id', '=', noteId)
      .limit(1)
      .execute();

    const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
    if (noteData.length === 0) {
      return null;
    }

    return noteData[0];
  }

  /**
   * Update note content (for collaboration service)
   * Only updates the content field
   */
  async updateNoteContent(noteId: string, content: string) {
    return await this.db.update('notes', noteId, {
      content,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Enrich attachments with their full details (titles, names, URLs)
   */
  private async enrichAttachments(attachments: any, workspaceId: string): Promise<any> {
    if (!attachments) {
      return {
        file_attachment: [],
        note_attachment: [],
        event_attachment: []
      };
    }

    const enriched: any = {
      file_attachment: [],
      note_attachment: [],
      event_attachment: []
    };

    // Enrich file attachments
    if (attachments.file_attachment && Array.isArray(attachments.file_attachment)) {
      for (const fileId of attachments.file_attachment) {
        try {
          // Query file without is_deleted filter to include all files
          // (files attached to notes should be accessible even if "deleted" from file manager)
          const fileQuery = await this.db.table('files')
            .select('id, name, mime_type, size, url, is_deleted')
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
              url: fileData.url
            });
            console.log(`[NotesService] Enriched file attachment: ${fileId} -> ${fileData.name}`);
          } else {
            console.warn(`[NotesService] File attachment not found in database: ${fileId}`);
            enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
          }
        } catch (error) {
          console.warn(`[NotesService] Could not fetch file attachment ${fileId}:`, error.message);
          // Keep the ID if we can't fetch details
          enriched.file_attachment.push({ id: fileId, name: 'Unknown file' });
        }
      }
    }

    // Enrich note attachments (linked notes)
    if (attachments.note_attachment && Array.isArray(attachments.note_attachment)) {
      for (const linkedNoteId of attachments.note_attachment) {
        try {
          const noteQuery = await this.db.table('notes')
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
              updated_at: noteData.updated_at
            });
          }
        } catch (error) {
          console.warn(`[NotesService] Could not fetch note attachment ${linkedNoteId}:`, error.message);
          // Keep the ID if we can't fetch details
          enriched.note_attachment.push({ id: linkedNoteId, title: 'Unknown note', icon: '📝' });
        }
      }
    }

    // Enrich event attachments (linked calendar events)
    if (attachments.event_attachment && Array.isArray(attachments.event_attachment)) {
      for (const eventId of attachments.event_attachment) {
        try {
          const eventQuery = await this.db.table('calendar_events')
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
              location: eventData.location
            });
          }
        } catch (error) {
          console.warn(`[NotesService] Could not fetch event attachment ${eventId}:`, error.message);
          // Keep the ID if we can't fetch details
          enriched.event_attachment.push({ id: eventId, title: 'Unknown event' });
        }
      }
    }

    return enriched;
  }

  async updateNote(noteId: string, workspaceId: string, updateNoteDto: UpdateNoteDto, userId: string) {
    const note = await this.getNoteWithAccess(noteId, workspaceId, userId);

    const updateData: any = {
      ...updateNoteDto,
      last_edited_by: userId,
      updated_at: new Date().toISOString()
    };

    // Handle attachments update - merge with existing if provided
    if (updateNoteDto.attachments) {
      updateData.attachments = {
        note_attachment: updateNoteDto.attachments.note_attachment || [],
        file_attachment: updateNoteDto.attachments.file_attachment || [],
        event_attachment: updateNoteDto.attachments.event_attachment || []
      };
    }

    // Create version history
    // TODO: Uncomment when note_versions table is created
    // await this.createNoteVersion(noteId, note.content, userId);

    const updatedNote = await this.db.update('notes', noteId, updateData);

    // Emit note updated event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitNoteUpdated(workspaceId, updatedNote, note, userId);
      } catch (error) {
        console.error('[NotesService] Failed to emit note updated event:', error);
      }
    }

    return updatedNote;
  }

  async deleteNote(noteId: string, workspaceId: string, userId: string) {
    const note = await this.getNoteWithAccess(noteId, workspaceId, userId);

    // Get all descendant note IDs (children, grandchildren, etc.)
    const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId);

    // Delete the parent note
    await this.db.update('notes', noteId, {
      deleted_at: new Date().toISOString()
    });

    // Recursively delete all descendant notes
    const deletionTime = new Date().toISOString();
    for (const descendantId of descendantIds) {
      await this.db.update('notes', descendantId, {
        deleted_at: deletionTime
      });
    }

    // Emit note deleted event for workflow automation
    if (this.entityEventIntegration) {
      try {
        this.entityEventIntegration.emitNoteDeleted(workspaceId, noteId, note, userId);
      } catch (error) {
        console.error('[NotesService] Failed to emit note deleted event:', error);
      }
    }

    return {
      success: true,
      message: 'Note and all sub-notes deleted successfully',
      deletedCount: descendantIds.length + 1
    };
  }

  async restoreNote(noteId: string, workspaceId: string, userId: string) {
    // Check if note exists and is actually deleted
    const noteQuery = await this.db.table('notes')
      .select('*')
      .where('id', '=', noteId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
    if (noteData.length === 0) {
      throw new NotFoundException('Note not found');
    }

    const note = noteData[0];

    // Check if user has permission to restore
    if (note.created_by !== userId) {
      throw new BadRequestException('You can only restore your own notes');
    }

    // Check if note is actually deleted
    if (!note.deleted_at) {
      throw new BadRequestException('Note is not deleted');
    }

    // Get all descendant note IDs (children, grandchildren, etc.)
    const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId, true);

    // Restore the parent note
    await this.db.update('notes', noteId, {
      deleted_at: null
    });

    // Restore all descendant notes
    for (const descendantId of descendantIds) {
      await this.db.update('notes', descendantId, {
        deleted_at: null
      });
    }

    return {
      success: true,
      message: 'Note and all sub-notes restored successfully',
      restoredCount: descendantIds.length + 1
    };
  }

  async bulkRestoreNotes(workspaceId: string, bulkDeleteDto: BulkDeleteDto, userId: string) {
    const { note_ids } = bulkDeleteDto;
    const results = [];
    const errors = [];
    let totalRestoredCount = 0;

    for (const noteId of note_ids) {
      try {
        // Check if note exists and is actually deleted
        const noteQuery = await this.db.table('notes')
          .select('*')
          .where('id', '=', noteId)
          .where('workspace_id', '=', workspaceId)
          .limit(1)
          .execute();

        const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
        if (noteData.length === 0) {
          errors.push({ noteId, error: 'Note not found' });
          continue;
        }

        const note = noteData[0];

        // Check if user has permission to restore
        if (note.created_by !== userId) {
          errors.push({ noteId, error: 'You can only restore your own notes' });
          continue;
        }

        // Check if note is actually deleted
        if (!note.deleted_at) {
          errors.push({ noteId, error: 'Note is not deleted' });
          continue;
        }

        // Get all descendant note IDs (children, grandchildren, etc.)
        const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId, true);

        // Restore the parent note
        await this.db.update('notes', noteId, {
          deleted_at: null
        });

        // Restore all descendant notes
        for (const descendantId of descendantIds) {
          await this.db.update('notes', descendantId, {
            deleted_at: null
          });
        }

        const restoredCount = descendantIds.length + 1;
        totalRestoredCount += restoredCount;
        
        results.push({
          noteId,
          title: note.title,
          success: true,
          restoredCount
        });

      } catch (error) {
        errors.push({ 
          noteId, 
          error: error.message || 'Failed to restore note' 
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `Bulk restore completed. ${results.length} notes processed successfully, ${errors.length} errors`,
      totalRestoredCount,
      processedCount: results.length,
      errorCount: errors.length,
      results,
      errors
    };
  }

  async permanentlyDeleteNote(noteId: string, workspaceId: string, userId: string) {
    // Check if note exists
    const noteQuery = await this.db.table('notes')
      .select('*')
      .where('id', '=', noteId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
    if (noteData.length === 0) {
      throw new NotFoundException('Note not found');
    }

    const note = noteData[0];

    // Check if user has permission to permanently delete
    if (note.created_by !== userId) {
      throw new BadRequestException('You can only delete your own notes');
    }

    // Get all descendant note IDs (children, grandchildren, etc.)
    const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId, true);

    // Permanently delete all descendant notes first
    for (const descendantId of descendantIds) {
      await this.db.delete('notes', descendantId);
    }

    // Permanently delete the parent note
    await this.db.delete('notes', noteId);

    return {
      success: true,
      message: 'Note and all sub-notes permanently deleted',
      deletedCount: descendantIds.length + 1
    };
  }

  async bulkDeleteNotes(workspaceId: string, bulkDeleteDto: BulkDeleteDto, userId: string) {
    const { note_ids } = bulkDeleteDto;
    const results = [];
    const errors = [];
    let totalDeletedCount = 0;

    for (const noteId of note_ids) {
      try {
        // Check if note exists and user has permission
        const noteQuery = await this.db.table('notes')
          .select('*')
          .where('id', '=', noteId)
          .where('workspace_id', '=', workspaceId)
          .limit(1)
          .execute();

        const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
        if (noteData.length === 0) {
          errors.push({ noteId, error: 'Note not found' });
          continue;
        }

        const note = noteData[0];

        // Check if user has permission to delete
        if (note.created_by !== userId) {
          errors.push({ noteId, error: 'You can only delete your own notes' });
          continue;
        }

        // Get all descendant note IDs (children, grandchildren, etc.)
        const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId);

        // Delete the parent note
        await this.db.update('notes', noteId, {
          deleted_at: new Date().toISOString()
        });

        // Recursively delete all descendant notes
        const deletionTime = new Date().toISOString();
        for (const descendantId of descendantIds) {
          await this.db.update('notes', descendantId, {
            deleted_at: deletionTime
          });
        }

        const deletedCount = descendantIds.length + 1;
        totalDeletedCount += deletedCount;
        
        results.push({
          noteId,
          title: note.title,
          success: true,
          deletedCount
        });

      } catch (error) {
        errors.push({ 
          noteId, 
          error: error.message || 'Failed to delete note' 
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `Bulk delete completed. ${results.length} notes processed successfully, ${errors.length} errors`,
      totalDeletedCount,
      processedCount: results.length,
      errorCount: errors.length,
      results,
      errors
    };
  }

  async bulkPermanentlyDeleteNotes(workspaceId: string, bulkDeleteDto: BulkDeleteDto, userId: string) {
    const { note_ids } = bulkDeleteDto;
    const results = [];
    const errors = [];
    let totalDeletedCount = 0;

    for (const noteId of note_ids) {
      try {
        // Check if note exists and user has permission
        const noteQuery = await this.db.table('notes')
          .select('*')
          .where('id', '=', noteId)
          .where('workspace_id', '=', workspaceId)
          .limit(1)
          .execute();

        const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
        if (noteData.length === 0) {
          errors.push({ noteId, error: 'Note not found' });
          continue;
        }

        const note = noteData[0];

        // Check if user has permission to permanently delete
        if (note.created_by !== userId) {
          errors.push({ noteId, error: 'You can only delete your own notes' });
          continue;
        }

        // Get all descendant note IDs (children, grandchildren, etc.)
        const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId, true);

        // Permanently delete all descendant notes first
        for (const descendantId of descendantIds) {
          await this.db.delete('notes', descendantId);
        }

        // Permanently delete the parent note
        await this.db.delete('notes', noteId);

        const deletedCount = descendantIds.length + 1;
        totalDeletedCount += deletedCount;
        
        results.push({
          noteId,
          title: note.title,
          success: true,
          deletedCount
        });

      } catch (error) {
        errors.push({ 
          noteId, 
          error: error.message || 'Failed to permanently delete note' 
        });
      }
    }

    return {
      success: errors.length === 0,
      message: `Bulk permanent delete completed. ${results.length} notes processed successfully, ${errors.length} errors`,
      totalDeletedCount,
      processedCount: results.length,
      errorCount: errors.length,
      results,
      errors
    };
  }

  async shareNote(noteId: string, workspaceId: string, shareNoteDto: ShareNoteDto, userId: string) {
    const note = await this.getNoteWithAccess(noteId, workspaceId, userId);

    console.log('[NotesService] Sharing note with users:', {
      noteId,
      userIds: shareNoteDto.user_ids,
      sharedBy: userId
    });

    // Verify all users exist in workspace
    const userVerifications = await Promise.all(
      shareNoteDto.user_ids.map(async (targetUserId) => {
        const targetUserResult = await this.db.table('workspace_members')
          .select('*')
          .where('workspace_id', '=', workspaceId)
          .where('user_id', '=', targetUserId)
          .where('is_active', '=', true)
          .limit(1)
          .execute();

        const targetUser = Array.isArray(targetUserResult.data) && targetUserResult.data.length > 0
          ? targetUserResult.data[0]
          : null;

        if (!targetUser) {
          throw new BadRequestException(`User ${targetUserId} is not a member of this workspace`);
        }

        return targetUserId;
      })
    );

    console.log('[NotesService] All users verified as workspace members');

    // Parse existing collaborative_data using helper function
    const existingCollaborativeData = this.parseCollaborativeData(note.collaborative_data);

    // Get existing shared_with array or create new one
    const existingSharedWith = Array.isArray(existingCollaborativeData.shared_with)
      ? existingCollaborativeData.shared_with
      : [];

    // Create new shared_with array with unique user IDs
    const newSharedWith = Array.from(new Set([...existingSharedWith, ...shareNoteDto.user_ids]));

    // Update collaborative_data with new shared_with array
    const updatedCollaborativeData = {
      ...existingCollaborativeData,
      shared_with: newSharedWith
    };

    // Update the note - store collaborative_data as object (JSONB column handles serialization)
    await this.db.update('notes', noteId, {
      collaborative_data: updatedCollaborativeData,
      updated_at: new Date().toISOString()
    });

    console.log('[NotesService] Note shared successfully with users:', newSharedWith);

    // Send notifications to newly shared users
    const newlySharedUsers = shareNoteDto.user_ids.filter(id => id !== userId);
    console.log(`[NotesService] Sending notifications to ${newlySharedUsers.length} newly shared users`);

    for (const targetUserId of newlySharedUsers) {
      try {
        console.log(`[NotesService] Sending note share notification to user: ${targetUserId}`);

        await this.notificationsService.sendNotification({
          user_id: targetUserId,
          type: NotificationType.WORKSPACE,
          title: 'Note Shared with You',
          message: `A note "${note.title}" has been shared with you`,
          action_url: `/workspaces/${workspaceId}/notes/${noteId}`,
          priority: 'high' as any,
          send_push: true, // ← Enable FCM push notification for mobile users!
          data: {
            category: 'workspace',
            entity_type: 'note',
            entity_id: noteId,
            actor_id: userId,
            workspace_id: workspaceId,
            note_title: note.title,
            note_id: noteId,
            action: 'note_shared'
          }
        });

        console.log(`[NotesService] ✅ Note share notification sent to user: ${targetUserId}`);
      } catch (error) {
        console.error(`[NotesService] ❌ Failed to send note share notification to user ${targetUserId}:`, error);
        // Don't fail note sharing if notification fails
      }
    }

    return {
      success: true,
      message: 'Note shared successfully',
      shared_count: shareNoteDto.user_ids.length,
      total_shared_users: newSharedWith.length
    };
  }

  async searchNotes(workspaceId: string, query: string, userId: string, options?: {
    mode?: 'keyword' | 'semantic' | 'hybrid';
    limit?: number;
    offset?: number;
  }) {
    // If no query, return all accessible notes
    if (!query || query.trim() === '') {
      const allNotes = await this.db.table('notes')
        .select('*')
        .execute();
      const allNotesData = Array.isArray(allNotes.data) ? allNotes.data : [];
      return allNotesData.filter(n =>
        n.workspace_id === workspaceId &&
        !n.deleted_at &&
        (n.created_by === userId || n.is_public)
      );
    }

    try {
      // Use unified search with PostgreSQL pg_trgm + pgvector
      const searchResult = await /* TODO: use QdrantService */ this.db.unifiedSearch('notes', query, {
        mode: options?.mode || 'hybrid',
        columns: ['title', 'content_text', 'tags'],
        limit: options?.limit || 50,
        offset: options?.offset || 0,
        filters: {
          workspace_id: workspaceId,
          deleted_at: null,
        },
        highlight: true,
        threshold: 0.3,
      });

      console.log('[NotesService] Unified search result:', {
        total: searchResult.total,
        mode: searchResult.mode,
        executionTimeMs: searchResult.executionTimeMs,
        resultsCount: searchResult.results?.length || 0
      });

      // Filter results by access permissions and enrich with highlights
      const accessibleResults = searchResult.results
        .filter(result => {
          const note = result.data;
          return note.created_by === userId || note.is_public;
        })
        .map(result => ({
          ...result.data,
          _searchScore: result.score,
          _matchType: result.matchType,
          _highlights: result.highlights,
        }));

      return accessibleResults;
    } catch (error) {
      console.error('[NotesService] Unified search failed, falling back to basic search:', error);

      // Fallback to basic in-memory search
      const allNotes = await this.db.table('notes')
        .select('*')
        .execute();
      const allNotesData = Array.isArray(allNotes.data) ? allNotes.data : [];
      const notes = allNotesData.filter(n =>
        n.workspace_id === workspaceId &&
        !n.deleted_at &&
        (n.created_by === userId || n.is_public)
      );

      const searchTerm = query.toLowerCase();
      return notes.filter(n =>
        n.title.toLowerCase().includes(searchTerm) ||
        (n.content_text && n.content_text.toLowerCase().includes(searchTerm)) ||
        (n.tags && n.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))
      );
    }
  }

  async mergeNotes(workspaceId: string, mergeNotesDto: MergeNotesDto, userId: string) {
    const { note_ids, title, include_headers, add_dividers, sort_by_date } = mergeNotesDto;

    // Fetch all notes
    const notesPromises = note_ids.map(noteId =>
      this.db.table('notes')
        .select('*')
        .where('id', '=', noteId)
        .where('workspace_id', '=', workspaceId)
        .limit(1)
        .execute()
    );

    const notesResults = await Promise.all(notesPromises);

    // Extract and validate notes
    const notes = [];
    for (let i = 0; i < notesResults.length; i++) {
      const noteData = Array.isArray(notesResults[i].data) ? notesResults[i].data : [];

      if (noteData.length === 0 || noteData[0]?.deleted_at) {
        throw new NotFoundException(`Note with ID ${note_ids[i]} not found`);
      }

      const note = noteData[0];

      // Check access permissions
      if (note.created_by !== userId && !note.is_public) {
        throw new BadRequestException(`You don't have access to note: ${note.title}`);
      }

      notes.push(note);
    }

    // Sort notes by creation date if requested (oldest first)
    if (sort_by_date) {
      notes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    // Build merged content
    const mergedContentParts: string[] = [];
    const allTags = new Set<string>();

    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];

      // Add note header if requested
      if (include_headers) {
        const createdDate = new Date(note.created_at).toLocaleString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const headerHtml = `
          <div style="margin-bottom: 20px; padding: 10px; background-color: #f5f5f5; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 5px 0;">${note.title}</h3>
            <p style="margin: 0; font-size: 0.9em; color: #666;">
              Created: ${createdDate} | Author: ${note.created_by}
            </p>
          </div>
        `;
        mergedContentParts.push(headerHtml);
      }

      // Add note content
      mergedContentParts.push(note.content);

      // Collect tags
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => allTags.add(tag));
      }

      // Add divider between notes (except after the last note)
      if (add_dividers && i < notes.length - 1) {
        mergedContentParts.push('<hr style="margin: 30px 0; border: none; border-top: 2px solid #ddd;" />');
      }
    }

    // Create the merged note
    const mergedNoteData = {
      workspace_id: workspaceId,
      title: title || 'Merged Note',
      content: mergedContentParts.join('\n\n'),
      content_text: null,
      created_by: userId,
      author_id: userId,
      tags: Array.from(allTags),
      is_public: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const mergedNote = await this.db.insert('notes', mergedNoteData);

    return {
      ...mergedNote,
      merged_count: notes.length,
      source_note_titles: notes.map(n => n.title),
      merged_from_ids: note_ids,
      merge_options: {
        include_headers,
        add_dividers,
        sort_by_date
      }
    };
  }

  // Template operations
  async createTemplate(workspaceId: string, templateData: any, userId: string) {
    const template = {
      workspace_id: workspaceId,
      ...templateData,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return await this.db.insert('note_templates', template);
  }

  async getTemplates(workspaceId: string) {
    return await this.db.table('note_templates')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();
  }

  // Helper methods

  private async getAllDescendantNoteIds(parentId: string, workspaceId: string, includeDeleted = false): Promise<string[]> {
    const allNotes = await this.db.table('notes')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const notesData = Array.isArray(allNotes.data) ? allNotes.data : [];
    const descendantIds: string[] = [];

    const findChildren = (currentParentId: string) => {
      const children = includeDeleted
        ? notesData.filter(n => n.parent_id === currentParentId)
        : notesData.filter(n => n.parent_id === currentParentId && !n.deleted_at);

      for (const child of children) {
        descendantIds.push(child.id);
        // Recursively find children of this child
        findChildren(child.id);
      }
    };

    findChildren(parentId);
    return descendantIds;
  }

  private async createNoteVersion(noteId: string, content: any, userId: string) {
    const existingVersions = await this.db.table('note_versions')
      .select('*')
      .where('note_id', '=', noteId)
      .execute();

    const existingVersionsData = Array.isArray(existingVersions.data) ? existingVersions.data : [];
    const versionNumber = existingVersionsData.length + 1;

    return await this.db.insert('note_versions', {
      note_id: noteId,
      content,
      version_number: versionNumber,
      created_by: userId,
      created_at: new Date().toISOString()
    });
  }

  private async getNoteWithAccess(noteId: string, workspaceId: string, userId: string) {
    const noteQuery = await this.db.table('notes')
      .select('*')
      .where('id', '=', noteId)
      .where('workspace_id', '=', workspaceId)
      .limit(1)
      .execute();

    const noteData = Array.isArray(noteQuery.data) ? noteQuery.data : [];
    if (noteData.length === 0 || noteData[0]?.deleted_at) {
      throw new NotFoundException('Note not found');
    }

    const note = noteData[0];

    // Check if user is the owner
    const isOwner = note.created_by === userId;

    // Check if user is in the shared_with list (from collaborative_data)
    let isSharedWithUser = false;
    if (note.collaborative_data) {
      const collaborativeData = typeof note.collaborative_data === 'string'
        ? JSON.parse(note.collaborative_data)
        : note.collaborative_data;
      const sharedWith = Array.isArray(collaborativeData?.shared_with)
        ? collaborativeData.shared_with
        : [];
      isSharedWithUser = sharedWith.includes(userId);
    }

    // Allow access if user is owner or the note is shared with them
    if (!isOwner && !isSharedWithUser) {
      throw new BadRequestException('You do not have permission to edit this note');
    }

    return note;
  }

  async duplicateNote(noteId: string, workspaceId: string, duplicateNoteDto: DuplicateNoteDto, userId: string) {
    // Get the original note
    const originalNote = await this.getNoteWithAccess(noteId, workspaceId, userId);
    
    // Prepare new note data
    const newNoteData = {
      ...originalNote,
      id: undefined, // Let DB generate new ID
      title: duplicateNoteDto.title || `${originalNote.title} (Copy)`,
      parent_id: duplicateNoteDto.parentId !== undefined ? duplicateNoteDto.parentId : originalNote.parent_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      created_by: userId,
      author_id: userId,
      view_count: 0,
      deleted_at: null,
      archived_at: null
    };

    // Create the duplicated note
    const duplicatedNote = await this.db.insert('notes', newNoteData);
    
    let duplicatedCount = 1;

    // Duplicate sub-notes if requested
    if (duplicateNoteDto.includeSubNotes !== false) {
      const subNotesCount = await this.duplicateSubNotes(
        noteId, 
        duplicatedNote.id, 
        workspaceId, 
        userId
      );
      duplicatedCount += subNotesCount;
    }

    return {
      success: true,
      message: 'Note duplicated successfully',
      note: duplicatedNote,
      duplicatedCount
    };
  }

  async archiveNote(noteId: string, workspaceId: string, userId: string) {
    const note = await this.getNoteWithAccess(noteId, workspaceId, userId);
    
    if (note.archived_at) {
      throw new BadRequestException('Note is already archived');
    }

    // Archive the note and all its sub-notes
    const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId);
    const allNoteIds = [noteId, ...descendantIds];
    
    let archivedCount = 0;
    const archiveTime = new Date().toISOString();
    
    for (const id of allNoteIds) {
      await this.db.update('notes', id, {
        archived_at: archiveTime,
        updated_at: archiveTime
      });
      archivedCount++;
    }

    return {
      success: true,
      message: 'Note and all sub-notes archived successfully',
      archivedCount
    };
  }

  async bulkArchiveNotes(workspaceId: string, bulkArchiveDto: BulkArchiveDto, userId: string) {
    const results = [];
    const errors = [];
    let totalArchivedCount = 0;

    for (const noteId of bulkArchiveDto.noteIds) {
      try {
        const result = await this.archiveNote(noteId, workspaceId, userId);
        
        const noteQuery = await this.db.table('notes')
          .select('title')
          .where('id', '=', noteId)
          .limit(1)
          .execute();
        const noteTitle = noteQuery.data?.[0]?.title || 'Unknown';

        results.push({
          noteId,
          title: noteTitle,
          success: true,
          archivedCount: result.archivedCount
        });
        totalArchivedCount += result.archivedCount;
      } catch (error) {
        errors.push({
          noteId,
          error: error.message
        });
        results.push({
          noteId,
          success: false,
          error: error.message
        });
      }
    }

    const processedCount = results.filter(r => r.success).length;
    const errorCount = errors.length;

    return {
      success: true,
      message: `Bulk archive completed. ${processedCount} notes processed successfully, ${errorCount} errors`,
      totalArchivedCount,
      processedCount,
      errorCount,
      results,
      errors
    };
  }

  async unarchiveNote(noteId: string, workspaceId: string, userId: string) {
    const note = await this.getNoteWithAccess(noteId, workspaceId, userId);
    
    if (!note.archived_at) {
      throw new BadRequestException('Note is not archived');
    }

    // Unarchive the note and all its sub-notes
    const descendantIds = await this.getAllDescendantNoteIds(noteId, workspaceId);
    const allNoteIds = [noteId, ...descendantIds];
    
    let unarchivedCount = 0;
    
    for (const id of allNoteIds) {
      await this.db.update('notes', id, {
        archived_at: null,
        updated_at: new Date().toISOString()
      });
      unarchivedCount++;
    }

    return {
      success: true,
      message: 'Note and all sub-notes unarchived successfully',
      unarchivedCount
    };
  }

  async bulkUnarchiveNotes(workspaceId: string, bulkArchiveDto: BulkArchiveDto, userId: string) {
    const results = [];
    const errors = [];
    let totalUnarchivedCount = 0;

    for (const noteId of bulkArchiveDto.noteIds) {
      try {
        const result = await this.unarchiveNote(noteId, workspaceId, userId);
        
        const noteQuery = await this.db.table('notes')
          .select('title')
          .where('id', '=', noteId)
          .limit(1)
          .execute();
        const noteTitle = noteQuery.data?.[0]?.title || 'Unknown';

        results.push({
          noteId,
          title: noteTitle,
          success: true,
          unarchivedCount: result.unarchivedCount
        });
        totalUnarchivedCount += result.unarchivedCount;
      } catch (error) {
        errors.push({
          noteId,
          error: error.message
        });
        results.push({
          noteId,
          success: false,
          error: error.message
        });
      }
    }

    const processedCount = results.filter(r => r.success).length;
    const errorCount = errors.length;

    return {
      success: true,
      message: `Bulk unarchive completed. ${processedCount} notes processed successfully, ${errorCount} errors`,
      totalUnarchivedCount,
      processedCount,
      errorCount,
      results,
      errors
    };
  }

  private async duplicateSubNotes(
    originalParentId: string,
    newParentId: string,
    workspaceId: string,
    userId: string
  ): Promise<number> {
    const subNotesQuery = await this.db.table('notes')
      .select('*')
      .where('parent_id', '=', originalParentId)
      .where('workspace_id', '=', workspaceId)
      .execute();
    
    const subNotes = Array.isArray(subNotesQuery.data) ? subNotesQuery.data : [];
    let count = 0;

    for (const subNote of subNotes) {
      if (!subNote.deleted_at) {
        const newSubNoteData = {
          ...subNote,
          id: undefined,
          parent_id: newParentId,
          title: `${subNote.title} (Copy)`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: userId,
          author_id: userId,
          view_count: 0,
          deleted_at: null,
          archived_at: null
        };

        const duplicatedSubNote = await this.db.insert('notes', newSubNoteData);
        count++;

        // Recursively duplicate children of this sub-note
        const childCount = await this.duplicateSubNotes(
          subNote.id,
          duplicatedSubNote.id,
          workspaceId,
          userId
        );
        count += childCount;
      }
    }

    return count;
  }
}