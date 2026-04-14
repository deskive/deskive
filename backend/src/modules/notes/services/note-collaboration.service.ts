import { Injectable, Logger } from '@nestjs/common';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { CollaborationUser, CURSOR_COLORS } from '../dto';
import { NotesService } from '../notes.service';

/**
 * Represents a collaboration session for a note
 */
interface NoteSession {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  users: Map<string, CollaborationUser>;
  colorIndex: number;
  lastSaveTime: number;
  pendingSave: boolean;
}

/**
 * Service for managing Yjs document collaboration
 */
@Injectable()
export class NoteCollaborationService {
  private logger = new Logger('NoteCollaborationService');

  // Map of noteId -> NoteSession
  private sessions = new Map<string, NoteSession>();

  // Map of socketId -> { noteId, userId }
  private socketToNote = new Map<string, { noteId: string; userId: string }>();

  // Debounce time for saving (5 seconds)
  private readonly SAVE_DEBOUNCE_MS = 5000;

  constructor(private notesService: NotesService) {}

  /**
   * Get or create a session for a note
   */
  async getOrCreateSession(noteId: string): Promise<NoteSession> {
    let session = this.sessions.get(noteId);

    if (!session) {
      this.logger.log(`Creating new session for note: ${noteId}`);

      const doc = new Y.Doc();
      const awareness = new awarenessProtocol.Awareness(doc);

      session = {
        doc,
        awareness,
        users: new Map(),
        colorIndex: 0,
        lastSaveTime: Date.now(),
        pendingSave: false,
      };

      // Load existing note content into the Yjs document
      await this.loadNoteContent(noteId, doc);

      // Set up document update handler for persistence
      doc.on('update', (update: Uint8Array) => {
        this.handleDocumentUpdate(noteId, update);
      });

      this.sessions.set(noteId, session);
    }

    return session;
  }

  /**
   * Load existing note content into Yjs document
   *
   * NOTE: We intentionally do NOT pre-load HTML content into Yjs.
   * The QuillBinding on the frontend handles syncing properly:
   * - First user's Quill editor has content from database
   * - QuillBinding syncs Quill → Yjs (as Delta format, not HTML)
   * - When other users join, they receive the proper Yjs state
   *
   * Pre-loading HTML would cause it to appear as raw text because
   * Yjs Text type stores plain text, not HTML.
   */
  private async loadNoteContent(noteId: string, doc: Y.Doc): Promise<void> {
    try {
      // Just log that the session was created - content comes from first client's Quill
      this.logger.log(
        `Created collaboration session for note ${noteId} - content will sync from client`,
      );
    } catch (error) {
      this.logger.error(`Failed to initialize note session for ${noteId}:`, error);
    }
  }

  /**
   * Handle document updates (for persistence)
   *
   * NOTE: We do NOT save content from the backend collaboration service.
   * The frontend handles saving with proper HTML format through its auto-save mechanism.
   * Yjs yText.toString() only returns plain text, losing all HTML formatting.
   *
   * The collaboration service only handles real-time sync between clients.
   */
  private handleDocumentUpdate(noteId: string, update: Uint8Array): void {
    const session = this.sessions.get(noteId);
    if (!session) return;

    // Log update for debugging but don't save
    // Frontend handles saving with proper HTML content
    this.logger.debug(`Document update received for note ${noteId} - frontend will handle save`);
  }

  /**
   * Save note content to database
   *
   * @deprecated Content saving is now handled by the frontend to preserve HTML formatting.
   * Yjs yText.toString() only returns plain text, which loses all formatting.
   * This method is kept for reference but should not be called.
   */
  private async saveNoteContent(noteId: string): Promise<void> {
    // DISABLED: Frontend handles saving with proper HTML format
    // The Yjs text representation loses HTML formatting
    this.logger.debug(`saveNoteContent called for ${noteId} - skipping (frontend handles save)`);
    return;

    /* Original implementation preserved for reference:
    const session = this.sessions.get(noteId);
    if (!session) return;

    try {
      const yText = session.doc.getText('content');
      const content = yText.toString();

      await this.notesService.updateNoteContent(noteId, content);

      session.lastSaveTime = Date.now();
      session.pendingSave = false;

      this.logger.log(`Saved content for note ${noteId}`);
    } catch (error) {
      this.logger.error(`Failed to save note content for ${noteId}:`, error);
    }
    */
  }

  /**
   * Add a user to a note session
   */
  async addUser(
    noteId: string,
    socketId: string,
    userId: string,
    userName: string,
    userAvatar?: string,
  ): Promise<{ session: NoteSession; user: CollaborationUser }> {
    const session = await this.getOrCreateSession(noteId);

    // Assign a color to the user
    const color = CURSOR_COLORS[session.colorIndex % CURSOR_COLORS.length];
    session.colorIndex++;

    const user: CollaborationUser = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      color,
      joinedAt: new Date().toISOString(),
    };

    session.users.set(userId, user);
    this.socketToNote.set(socketId, { noteId, userId });

    // Set awareness state for this user
    session.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      avatar: userAvatar,
      color,
    });

    this.logger.log(`User ${userName} (${userId}) joined note ${noteId}`);

    return { session, user };
  }

  /**
   * Remove a user from a note session
   */
  removeUser(socketId: string): { noteId: string; userId: string } | null {
    const mapping = this.socketToNote.get(socketId);
    if (!mapping) return null;

    const { noteId, userId } = mapping;
    const session = this.sessions.get(noteId);

    if (session) {
      session.users.delete(userId);

      // Clean up session if no users left
      if (session.users.size === 0) {
        // Save any pending changes before cleanup
        if (session.pendingSave) {
          this.saveNoteContent(noteId);
        }

        // Keep session for a while in case user reconnects
        setTimeout(() => {
          const currentSession = this.sessions.get(noteId);
          if (currentSession && currentSession.users.size === 0) {
            currentSession.doc.destroy();
            this.sessions.delete(noteId);
            this.logger.log(`Cleaned up session for note ${noteId}`);
          }
        }, 60000); // 1 minute grace period
      }
    }

    this.socketToNote.delete(socketId);
    this.logger.log(`User ${userId} left note ${noteId}`);

    return mapping;
  }

  /**
   * Get sync step 1 message (state vector request)
   */
  getSyncStep1(noteId: string): Uint8Array | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;

    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, session.doc);
    return encoding.toUint8Array(encoder);
  }

  /**
   * Handle sync step 1 from client and return sync step 2
   */
  handleSyncStep1(noteId: string, stateVector: Uint8Array): Uint8Array | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;

    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(stateVector);

    // Read the client's state vector
    const clientStateVector = decoding.readVarUint8Array(decoder);

    // Write sync step 2 (diff based on client's state)
    syncProtocol.writeSyncStep2(encoder, session.doc, clientStateVector);

    return encoding.toUint8Array(encoder);
  }

  /**
   * Apply a Yjs update to a document
   */
  applyUpdate(noteId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    try {
      Y.applyUpdate(session.doc, update);
      return true;
    } catch (error) {
      this.logger.error(`Failed to apply update for note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Get the full state of a document
   */
  getDocState(noteId: string): Uint8Array | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;

    return Y.encodeStateAsUpdate(session.doc);
  }

  /**
   * Get awareness state for a note
   */
  getAwarenessState(noteId: string): Map<number, any> | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;

    return session.awareness.getStates();
  }

  /**
   * Apply awareness update
   */
  applyAwarenessUpdate(noteId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(noteId);
    if (!session) return false;

    try {
      awarenessProtocol.applyAwarenessUpdate(session.awareness, update, null);
      return true;
    } catch (error) {
      this.logger.error(`Failed to apply awareness update for note ${noteId}:`, error);
      return false;
    }
  }

  /**
   * Get all users in a note session
   */
  getUsers(noteId: string): CollaborationUser[] {
    const session = this.sessions.get(noteId);
    if (!session) return [];

    return Array.from(session.users.values());
  }

  /**
   * Update user cursor position
   */
  updateCursor(
    noteId: string,
    userId: string,
    cursorIndex: number,
    selectionLength?: number,
  ): CollaborationUser | null {
    const session = this.sessions.get(noteId);
    if (!session) return null;

    const user = session.users.get(userId);
    if (!user) return null;

    user.cursorIndex = cursorIndex;
    user.selectionLength = selectionLength;

    return user;
  }

  /**
   * Get the note ID for a socket
   */
  getNoteIdForSocket(socketId: string): string | null {
    const mapping = this.socketToNote.get(socketId);
    return mapping?.noteId || null;
  }

  /**
   * Check if a user is in a note session
   */
  isUserInSession(noteId: string, userId: string): boolean {
    const session = this.sessions.get(noteId);
    return session?.users.has(userId) || false;
  }
}
