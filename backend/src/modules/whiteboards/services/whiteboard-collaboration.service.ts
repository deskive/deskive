import { Injectable, Logger } from '@nestjs/common';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { WhiteboardCollaborationUser, COLLABORATOR_COLORS } from '../dto/whiteboard-collaboration.dto';
import { WhiteboardsService } from '../whiteboards.service';

/**
 * Represents a collaboration session for a whiteboard
 */
interface WhiteboardSession {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  users: Map<string, WhiteboardCollaborationUser>;
  colorIndex: number;
  lastSaveTime: number;
  pendingSave: boolean;
}

/**
 * Service for managing Yjs document collaboration for whiteboards
 */
@Injectable()
export class WhiteboardCollaborationService {
  private logger = new Logger('WhiteboardCollaborationService');

  // Map of sessionId -> WhiteboardSession
  private sessions = new Map<string, WhiteboardSession>();

  // Map of socketId -> { sessionId, userId }
  private socketToSession = new Map<string, { sessionId: string; userId: string }>();

  // Debounce time for saving (5 seconds)
  private readonly SAVE_DEBOUNCE_MS = 5000;

  constructor(private whiteboardsService: WhiteboardsService) {}

  /**
   * Get or create a session for a whiteboard
   */
  async getOrCreateSession(sessionId: string): Promise<WhiteboardSession> {
    let session = this.sessions.get(sessionId);

    if (!session) {
      this.logger.log(`Creating new collaboration session for whiteboard: ${sessionId}`);

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

      // Initialize Yjs data structures for Excalidraw
      // Elements are stored as a Y.Array
      doc.getArray('elements');
      // App state is stored as a Y.Map
      doc.getMap('appState');

      // Load existing whiteboard content into the Yjs document
      await this.loadWhiteboardContent(sessionId, doc);

      // Set up document update handler for persistence
      doc.on('update', (update: Uint8Array) => {
        this.handleDocumentUpdate(sessionId, update);
      });

      this.sessions.set(sessionId, session);
    }

    return session;
  }

  /**
   * Load existing whiteboard content into Yjs document
   */
  private async loadWhiteboardContent(sessionId: string, doc: Y.Doc): Promise<void> {
    try {
      // Try to load existing whiteboard data
      const whiteboard = await this.whiteboardsService.getWhiteboardSession(sessionId);

      if (whiteboard && whiteboard.elements && Array.isArray(whiteboard.elements)) {
        const yElements = doc.getArray('elements');

        doc.transact(() => {
          // Clear and set initial elements
          yElements.delete(0, yElements.length);
          if (whiteboard.elements.length > 0) {
            // Insert all elements at once using insert method
            yElements.insert(0, whiteboard.elements as any[]);
          }
        });

        this.logger.log(`Loaded ${whiteboard.elements.length} elements for whiteboard ${sessionId}`);
      } else {
        this.logger.log(`Created empty collaboration session for whiteboard ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to load whiteboard content for ${sessionId}:`, error);
    }
  }

  /**
   * Handle document updates (for persistence)
   */
  private handleDocumentUpdate(sessionId: string, update: Uint8Array): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Mark as pending save
    session.pendingSave = true;

    // Debounce save
    const timeSinceLastSave = Date.now() - session.lastSaveTime;
    if (timeSinceLastSave > this.SAVE_DEBOUNCE_MS) {
      this.saveWhiteboardContent(sessionId);
    } else {
      setTimeout(() => {
        if (session.pendingSave) {
          this.saveWhiteboardContent(sessionId);
        }
      }, this.SAVE_DEBOUNCE_MS - timeSinceLastSave);
    }
  }

  /**
   * Save whiteboard content to database
   */
  private async saveWhiteboardContent(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    try {
      const yElements = session.doc.getArray('elements');
      const elements = yElements.toJSON();

      // Get the first user as the one who made the update
      const firstUser = session.users.values().next().value;
      const userId = firstUser?.id;

      if (userId) {
        await this.whiteboardsService.updateWhiteboardSession(sessionId, userId, {
          elements,
        });

        session.lastSaveTime = Date.now();
        session.pendingSave = false;

        this.logger.log(`Saved ${elements.length} elements for whiteboard ${sessionId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to save whiteboard content for ${sessionId}:`, error);
    }
  }

  /**
   * Add a user to a whiteboard session
   */
  async addUser(
    sessionId: string,
    socketId: string,
    userId: string,
    userName: string,
    userAvatar?: string,
  ): Promise<{ session: WhiteboardSession; user: WhiteboardCollaborationUser }> {
    const session = await this.getOrCreateSession(sessionId);

    // Assign a color to the user
    const colorSet = COLLABORATOR_COLORS[session.colorIndex % COLLABORATOR_COLORS.length];
    session.colorIndex++;

    const user: WhiteboardCollaborationUser = {
      id: userId,
      name: userName,
      avatar: userAvatar,
      color: colorSet.background,
      joinedAt: new Date().toISOString(),
    };

    session.users.set(userId, user);
    this.socketToSession.set(socketId, { sessionId, userId });

    // Set awareness state for this user
    session.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      avatar: userAvatar,
      color: colorSet,
    });

    this.logger.log(`User ${userName} (${userId}) joined whiteboard ${sessionId}`);

    return { session, user };
  }

  /**
   * Remove a user from a whiteboard session
   */
  removeUser(socketId: string): { sessionId: string; userId: string } | null {
    const mapping = this.socketToSession.get(socketId);
    if (!mapping) return null;

    const { sessionId, userId } = mapping;
    const session = this.sessions.get(sessionId);

    if (session) {
      session.users.delete(userId);

      // Clean up session if no users left
      if (session.users.size === 0) {
        // Save any pending changes before cleanup
        if (session.pendingSave) {
          this.saveWhiteboardContent(sessionId);
        }

        // Keep session for a while in case user reconnects
        setTimeout(() => {
          const currentSession = this.sessions.get(sessionId);
          if (currentSession && currentSession.users.size === 0) {
            currentSession.doc.destroy();
            this.sessions.delete(sessionId);
            this.logger.log(`Cleaned up session for whiteboard ${sessionId}`);
          }
        }, 60000); // 1 minute grace period
      }
    }

    this.socketToSession.delete(socketId);
    this.logger.log(`User ${userId} left whiteboard ${sessionId}`);

    return mapping;
  }

  /**
   * Apply a Yjs update to a document
   */
  applyUpdate(sessionId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      Y.applyUpdate(session.doc, update);
      return true;
    } catch (error) {
      this.logger.error(`Failed to apply update for whiteboard ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get the full state of a document
   */
  getDocState(sessionId: string): Uint8Array | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return Y.encodeStateAsUpdate(session.doc);
  }

  /**
   * Get elements from the Yjs document
   */
  getElements(sessionId: string): any[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const yElements = session.doc.getArray('elements');
    const elements = yElements.toJSON();

    // Sanitize elements before returning to clients
    return this.sanitizeElementsForExcalidraw(elements);
  }

  /**
   * Sanitize elements for Excalidraw compatibility
   * Ensures freedraw elements have valid points, converts opacity, etc.
   */
  private sanitizeElementsForExcalidraw(elements: any[]): any[] {
    if (!Array.isArray(elements)) return [];

    return elements
      .filter((el) => el && typeof el === 'object' && el.id)
      .map((el) => {
        // Ensure freedraw elements have valid points array
        if (el.type === 'freedraw') {
          if (!el.points || !Array.isArray(el.points) || el.points.length === 0) {
            // Create minimal points array to prevent Excalidraw crash
            el.points = [[0, 0, 0.5]]; // [x, y, pressure]
          } else {
            // Ensure each point has at least [x, y] (pressure is optional)
            el.points = el.points
              .filter((p: any) => Array.isArray(p) && p.length >= 2)
              .map((p: any[]) => [
                typeof p[0] === 'number' ? p[0] : 0,
                typeof p[1] === 'number' ? p[1] : 0,
                typeof p[2] === 'number' ? p[2] : 0.5,
              ]);
            if (el.points.length === 0) {
              el.points = [[0, 0, 0.5]];
            }
          }
        }

        // Ensure opacity is in Excalidraw format (0-100)
        if (typeof el.opacity === 'number') {
          if (el.opacity <= 1) {
            el.opacity = Math.round(el.opacity * 100);
          }
          el.opacity = Math.max(0, Math.min(100, el.opacity));
        } else {
          el.opacity = 100;
        }

        return el;
      });
  }

  /**
   * Update elements in the Yjs document
   */
  updateElements(sessionId: string, elements: any[]): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      // Sanitize incoming elements before storing
      const sanitizedElements = this.sanitizeElementsForExcalidraw(elements);
      const yElements = session.doc.getArray('elements');

      session.doc.transact(() => {
        yElements.delete(0, yElements.length);
        if (sanitizedElements.length > 0) {
          // Insert all elements at once using insert method
          yElements.insert(0, sanitizedElements);
        }
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to update elements for whiteboard ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Apply awareness update
   */
  applyAwarenessUpdate(sessionId: string, update: Uint8Array): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    try {
      awarenessProtocol.applyAwarenessUpdate(session.awareness, update, null);
      return true;
    } catch (error) {
      this.logger.error(`Failed to apply awareness update for whiteboard ${sessionId}:`, error);
      return false;
    }
  }

  /**
   * Get all users in a whiteboard session
   */
  getUsers(sessionId: string): WhiteboardCollaborationUser[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    return Array.from(session.users.values());
  }

  /**
   * Update user pointer position
   */
  updatePointer(
    sessionId: string,
    userId: string,
    x: number,
    y: number,
    tool?: string,
    pressing?: boolean,
  ): WhiteboardCollaborationUser | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const user = session.users.get(userId);
    if (!user) return null;

    user.pointer = { x, y, tool, pressing };

    return user;
  }

  /**
   * Get the session ID for a socket
   */
  getSessionIdForSocket(socketId: string): string | null {
    const mapping = this.socketToSession.get(socketId);
    return mapping?.sessionId || null;
  }

  /**
   * Check if a user is in a session
   */
  isUserInSession(sessionId: string, userId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.users.has(userId) || false;
  }

  /**
   * Get sync step 1 message (state vector request)
   */
  getSyncStep1(sessionId: string): Uint8Array | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const encoder = encoding.createEncoder();
    syncProtocol.writeSyncStep1(encoder, session.doc);
    return encoding.toUint8Array(encoder);
  }

  /**
   * Handle sync step 1 from client and return sync step 2
   */
  handleSyncStep1(sessionId: string, stateVector: Uint8Array): Uint8Array | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const encoder = encoding.createEncoder();
    const decoder = decoding.createDecoder(stateVector);

    // Read the client's state vector
    const clientStateVector = decoding.readVarUint8Array(decoder);

    // Write sync step 2 (diff based on client's state)
    syncProtocol.writeSyncStep2(encoder, session.doc, clientStateVector);

    return encoding.toUint8Array(encoder);
  }
}
