import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import { QuillBinding } from 'y-quill';
import * as awarenessProtocol from 'y-protocols/awareness';
import Quill from 'quill';

// Helper functions for base64 encoding/decoding in browser
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const uint8Array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }
  return uint8Array;
}

// Types for collaboration
export interface CollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursorIndex?: number;
  selectionLength?: number;
  joinedAt: string;
}

export interface CursorData {
  userId: string;
  userName: string;
  userColor: string;
  index: number;
  length?: number;
}

interface ContentChangedData {
  userId: string;
  userName: string;
  timestamp: string;
}

interface UseNoteCollaborationOptions {
  noteId: string;
  workspaceId: string;
  enabled?: boolean;
  onUsersChange?: (users: CollaborationUser[]) => void;
  onUserJoined?: (user: CollaborationUser) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdate?: (cursor: CursorData) => void;
  onContentChanged?: (data: ContentChangedData) => void;
  onError?: (error: Error) => void;
}

interface UseNoteCollaborationCallbacks {
  onUsersChange?: (users: CollaborationUser[]) => void;
  onUserJoined?: (user: CollaborationUser) => void;
  onUserLeft?: (userId: string) => void;
  onCursorUpdate?: (cursor: CursorData) => void;
  onContentChanged?: (data: ContentChangedData) => void;
  onError?: (error: Error) => void;
}

interface UseNoteCollaborationReturn {
  isConnected: boolean;
  isLoading: boolean;
  users: CollaborationUser[];
  cursors: Map<string, CursorData>;
  bindQuill: (quill: Quill, getQuillInstance?: () => any) => void;
  unbindQuill: () => void;
  updateCursor: (index: number, length?: number) => void;
  notifyContentChanged: () => void;
  disconnect: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
// Extract base URL without /api/v1
const WS_URL = API_URL.replace('/api/v1', '').replace('http://', 'ws://').replace('https://', 'wss://');

/**
 * Hook for real-time note collaboration using Yjs and Socket.IO
 */
export function useNoteCollaboration({
  noteId,
  workspaceId,
  enabled = true,
  onUsersChange,
  onUserJoined,
  onUserLeft,
  onCursorUpdate,
  onContentChanged,
  onError,
}: UseNoteCollaborationOptions): UseNoteCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [cursors, setCursors] = useState<Map<string, CursorData>>(new Map());

  const socketRef = useRef<Socket | null>(null);
  const socketIdRef = useRef<string | null>(null); // Store socket ID to filter own emissions
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const bindingRef = useRef<QuillBinding | null>(null);
  const quillRef = useRef<Quill | null>(null);
  const isConnectingRef = useRef(false);

  // Store callbacks in refs to avoid dependency changes causing reconnections
  const callbacksRef = useRef<UseNoteCollaborationCallbacks>({
    onUsersChange,
    onUserJoined,
    onUserLeft,
    onCursorUpdate,
    onContentChanged,
    onError,
  });

  // Update callbacks ref when they change
  useEffect(() => {
    callbacksRef.current = {
      onUsersChange,
      onUserJoined,
      onUserLeft,
      onCursorUpdate,
      onContentChanged,
      onError,
    };
  }, [onUsersChange, onUserJoined, onUserLeft, onCursorUpdate, onContentChanged, onError]);

  /**
   * Initialize Yjs document and awareness
   * Always creates a fresh document for each noteId
   */
  const initYjs = useCallback(() => {
    // CRITICAL: Always destroy existing doc before creating a new one
    // This prevents content from bleeding between notes
    if (ydocRef.current) {
      console.log('[NoteCollaboration] Destroying existing Yjs doc before creating new one');
      try {
        ydocRef.current.destroy();
      } catch (e) {
        console.warn('[NoteCollaboration] Error destroying old Yjs doc:', e);
      }
      ydocRef.current = null;
    }

    if (awarenessRef.current) {
      try {
        awarenessRef.current.destroy();
      } catch (e) {
        console.warn('[NoteCollaboration] Error destroying old awareness:', e);
      }
      awarenessRef.current = null;
    }

    console.log('[NoteCollaboration] Creating new Yjs doc for noteId:', noteId);
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    ydocRef.current = ydoc;
    awarenessRef.current = awareness;

    // Listen for local document updates
    ydoc.on('update', (update: Uint8Array, origin: any) => {
      console.log('[NoteCollaboration] Yjs update event', { origin, socketConnected: socketRef.current?.connected, updateLength: update.length });
      // Only send updates that originate locally (not from remote)
      if (origin !== 'remote' && socketRef.current?.connected) {
        console.log('[NoteCollaboration] Sending update to server');
        socketRef.current.emit('note:update', {
          noteId,
          update: uint8ArrayToBase64(update),
        });
      }
    });

    // Listen for awareness updates
    awareness.on('update', ({ added, updated, removed }: any) => {
      if (socketRef.current?.connected) {
        const update = awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          [...added, ...updated, ...removed]
        );
        socketRef.current.emit('note:awareness', {
          noteId,
          update: uint8ArrayToBase64(update),
        });
      }
    });

    return { ydoc, awareness };
  }, [noteId]);

  /**
   * Connect to collaboration server
   */
  const connect = useCallback(() => {
    if (!enabled || !noteId || !workspaceId) return;
    if (isConnectingRef.current) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      callbacksRef.current.onError?.(new Error('No authentication token'));
      return;
    }

    // If already connected, disconnect first to ensure clean state
    if (socketRef.current?.connected) {
      console.log('[NoteCollaboration] Already connected, disconnecting first for clean state');
      socketRef.current.emit('note:leave', { noteId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setIsLoading(true);

    // Initialize Yjs - this will destroy any existing doc first
    initYjs();

    // Create socket connection
    const socket = io(`${WS_URL}/notes`, {
      auth: { token },
      query: { workspaceId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('[NoteCollaboration] Connected to server');
      // Store socket ID to filter own emissions for cross-device sync
      socketIdRef.current = socket.id || null;
      console.log('[NoteCollaboration] Socket ID:', socketIdRef.current);
      setIsConnected(true);
      isConnectingRef.current = false;

      // Join the note room
      socket.emit('note:join', { noteId }, (response: any) => {
        if (response.success) {
          console.log('[NoteCollaboration] Joined note:', noteId);
          setUsers(response.users || []);
          callbacksRef.current.onUsersChange?.(response.users || []);
        } else {
          console.error('[NoteCollaboration] Failed to join note:', response.error);
          callbacksRef.current.onError?.(new Error(response.error || 'Failed to join note'));
        }
        setIsLoading(false);
      });
    });

    socket.on('disconnect', () => {
      console.log('[NoteCollaboration] Disconnected from server');
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('[NoteCollaboration] Connection error:', error);
      setIsLoading(false);
      isConnectingRef.current = false;
      callbacksRef.current.onError?.(error);
    });

    // Sync events
    socket.on('note:sync', (data: { noteId: string; state: string }) => {
      if (data.noteId !== noteId || !ydocRef.current) return;

      try {
        const update = base64ToUint8Array(data.state);

        // Check if server is sending meaningful content
        // If server state is empty/minimal but we have local content (from Quill/database),
        // skip applying the empty server state to preserve local content
        const serverStateSize = update.length;
        const localYtext = ydocRef.current.getText('content');
        const localContent = localYtext.toString();

        console.log('[NoteCollaboration] Sync received:', {
          serverStateSize,
          localContentLength: localContent.length,
          hasBinding: !!bindingRef.current
        });

        // If server state is very small (likely empty) and we have local content,
        // don't overwrite local content with empty server state
        // A minimal Yjs doc is around 2-20 bytes, real content would be larger
        if (serverStateSize < 50 && localContent.length === 0) {
          // Both empty - safe to apply
          Y.applyUpdate(ydocRef.current, update, 'remote');
          console.log('[NoteCollaboration] Applied initial sync (both empty)');
        } else if (serverStateSize < 50 && localContent.length > 0) {
          // Server empty but we have local - skip server sync, keep local
          console.log('[NoteCollaboration] Skipping empty server sync - preserving local content');
        } else {
          // Server has meaningful content - apply it
          Y.applyUpdate(ydocRef.current, update, 'remote');
          console.log('[NoteCollaboration] Applied initial sync with server content');
        }
      } catch (error) {
        console.error('[NoteCollaboration] Failed to apply sync:', error);
      }
    });

    // Document update events
    socket.on('note:update', (data: { noteId: string; update: string; userId: string }) => {
      console.log('[NoteCollaboration] Received update from server', { fromUserId: data.userId, noteId: data.noteId });
      if (data.noteId !== noteId || !ydocRef.current) {
        console.log('[NoteCollaboration] Ignoring update - noteId mismatch or no ydoc');
        return;
      }

      try {
        const update = base64ToUint8Array(data.update);

        // Log binding state BEFORE applying update
        console.log('[NoteCollaboration] Before applying update:', {
          updateLength: update.length,
          hasBinding: !!bindingRef.current,
          hasQuill: !!quillRef.current,
          ytextLength: ydocRef.current.getText('content').length
        });

        Y.applyUpdate(ydocRef.current, update, 'remote');

        // Log after update
        const ytextAfter = ydocRef.current.getText('content');
        console.log('[NoteCollaboration] After applying update:', {
          ytextContent: ytextAfter.toString().substring(0, 100),
          hasBinding: !!bindingRef.current
        });

        // If binding doesn't exist, try to rebind with fresh Quill instance
        if (!bindingRef.current) {
          console.warn('[NoteCollaboration] Binding lost! Attempting to rebind...');

          // Try to get fresh Quill instance
          let freshQuill = null;
          if (getQuillInstanceRef.current) {
            try {
              freshQuill = getQuillInstanceRef.current();
            } catch (e) {
              console.warn('[NoteCollaboration] Could not get fresh Quill instance:', e);
            }
          }

          // Fallback to stored quill ref
          const quillToUse = freshQuill || quillRef.current;

          if (quillToUse && awarenessRef.current && ydocRef.current) {
            try {
              const ytext = ydocRef.current.getText('content');
              bindingRef.current = new QuillBinding(ytext, quillToUse, awarenessRef.current);
              quillRef.current = quillToUse;
              console.log('[NoteCollaboration] Rebinding successful');
            } catch (e) {
              console.error('[NoteCollaboration] Rebinding failed:', e);
            }
          }
        }
      } catch (error) {
        console.error('[NoteCollaboration] Failed to apply update:', error);
      }
    });

    // Awareness events
    socket.on('note:awareness', (data: { noteId: string; update: string; userId: string }) => {
      if (data.noteId !== noteId || !awarenessRef.current) return;

      try {
        const update = base64ToUint8Array(data.update);
        awarenessProtocol.applyAwarenessUpdate(awarenessRef.current, update, 'remote');
      } catch (error) {
        console.error('[NoteCollaboration] Failed to apply awareness update:', error);
      }
    });

    // Cursor events
    socket.on('note:cursor', (data: CursorData & { noteId: string }) => {
      console.log('[NoteCollaboration] Received cursor update', { userId: data.userId, userName: data.userName, index: data.index });
      if (data.noteId !== noteId) return;

      setCursors((prev) => {
        const next = new Map(prev);
        next.set(data.userId, {
          userId: data.userId,
          userName: data.userName,
          userColor: data.userColor,
          index: data.index,
          length: data.length,
        });
        return next;
      });

      callbacksRef.current.onCursorUpdate?.(data);
    });

    // Presence events
    socket.on('note:presence', (data: { noteId: string; users: CollaborationUser[] }) => {
      if (data.noteId !== noteId) return;
      setUsers(data.users);
      callbacksRef.current.onUsersChange?.(data.users);
    });

    socket.on('note:user-joined', (data: { noteId: string; user: CollaborationUser }) => {
      if (data.noteId !== noteId) return;
      setUsers((prev) => [...prev.filter((u) => u.id !== data.user.id), data.user]);
      callbacksRef.current.onUserJoined?.(data.user);
    });

    socket.on('note:user-left', (data: { noteId: string; userId: string }) => {
      if (data.noteId !== noteId) return;
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      setCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
      callbacksRef.current.onUserLeft?.(data.userId);
    });

    // Content changed event (from non-Yjs clients like Flutter)
    // When Flutter saves content to API, it sends this notification
    // The frontend should refresh content from API
    socket.on('note:content-changed', (data: { noteId: string; userId: string; userName: string; socketId?: string; timestamp: string }) => {
      console.log('[NoteCollaboration] Content changed notification from:', data.userName);
      if (data.noteId !== noteId) return;

      // Filter out our own emissions to prevent refresh loop
      // This is important because backend now broadcasts to ALL clients including sender
      if (data.socketId && data.socketId === socketIdRef.current) {
        console.log('[NoteCollaboration] Ignoring own content-changed notification');
        return;
      }

      // Notify the editor to refresh content from API
      callbacksRef.current.onContentChanged?.({
        userId: data.userId,
        userName: data.userName,
        timestamp: data.timestamp,
      });
    });

    // Delta event (from Flutter clients for real-time character-by-character sync)
    // Flutter sends full document deltas, we replace the editor content
    socket.on('note:delta', (data: { noteId: string; userId: string; userName: string; socketId?: string; delta: any[]; fullContent?: string; timestamp: string }) => {
      console.log('[NoteCollaboration] Delta received from Flutter:', data.userName, 'ops:', data.delta?.length);
      if (data.noteId !== noteId) return;

      // Filter out our own emissions to prevent applying our own changes
      // This is important because backend now broadcasts to ALL clients including sender
      if (data.socketId && data.socketId === socketIdRef.current) {
        console.log('[NoteCollaboration] Ignoring own delta');
        return;
      }

      // Apply the delta directly to Quill (bypassing Yjs for Flutter interop)
      if (quillRef.current && data.delta) {
        try {
          const quill = quillRef.current;

          // Store current selection
          const currentSelection = quill.getSelection();
          const currentIndex = currentSelection?.index || 0;

          // Create a Delta object from the received operations
          const Delta = Quill.import('delta');
          const delta = new Delta(data.delta);

          console.log('[NoteCollaboration] Applying Flutter delta to Quill');

          // Replace the entire content with the new delta
          // Use setContents for full document replacement
          quill.setContents(delta, 'api');

          // Restore cursor position
          const length = quill.getLength();
          const newIndex = Math.min(currentIndex, length > 0 ? length - 1 : 0);
          quill.setSelection(newIndex, 0, 'api');

          console.log('[NoteCollaboration] Flutter delta applied successfully');
        } catch (e) {
          console.error('[NoteCollaboration] Failed to apply Flutter delta:', e);

          // Fallback: if delta application fails and we have full content, reload from API
          if (data.fullContent) {
            console.log('[NoteCollaboration] Falling back to full content sync');
            callbacksRef.current.onContentChanged?.({
              userId: data.userId,
              userName: data.userName,
              timestamp: data.timestamp,
            });
          }
        }
      }
    });

    // Sync request event (Flutter client wants our current content)
    socket.on('note:sync-request', (data: { noteId: string; requesterId: string; requesterName: string }) => {
      console.log('[NoteCollaboration] Sync request from Flutter:', data.requesterName);
      if (data.noteId !== noteId || !quillRef.current) return;

      // Send our current content to the requester
      try {
        const quill = quillRef.current;
        const content = quill.root.innerHTML;

        socket.emit('note:sync-response', {
          noteId,
          requesterId: data.requesterId,
          content,
        });

        console.log('[NoteCollaboration] Sent sync response to Flutter client');
      } catch (e) {
        console.error('[NoteCollaboration] Failed to send sync response:', e);
      }
    });

  }, [enabled, noteId, workspaceId, initYjs]);

  // Track if we've already set up cursor tracking to prevent duplicate listeners
  const cursorTrackingSetupRef = useRef(false);

  // Store a getter function to get fresh Quill instance from the editor
  const getQuillInstanceRef = useRef<(() => any) | null>(null);

  /**
   * Bind Quill editor to Yjs
   * @param quill - The Quill editor instance
   * @param getQuillInstance - Optional getter function to get fresh Quill instance for rebinding
   */
  const bindQuill = useCallback((quill: Quill, getQuillInstance?: () => any) => {
    console.log('[NoteCollaboration] bindQuill called', {
      hasYdoc: !!ydocRef.current,
      hasAwareness: !!awarenessRef.current,
      hasQuill: !!quill,
      hasExistingBinding: !!bindingRef.current
    });

    if (!ydocRef.current || !awarenessRef.current) {
      console.warn('[NoteCollaboration] Yjs not initialized');
      return;
    }

    // Store the getter function for rebinding
    if (getQuillInstance) {
      getQuillInstanceRef.current = getQuillInstance;
    }

    // If we already have a valid binding for this quill instance, don't recreate
    if (bindingRef.current && quillRef.current === quill) {
      console.log('[NoteCollaboration] Binding already exists for this quill instance, skipping');
      return;
    }

    // Unbind existing binding if it's for a different quill instance
    if (bindingRef.current) {
      console.log('[NoteCollaboration] Destroying existing binding for different quill instance');
      try {
        bindingRef.current.destroy();
      } catch (e) {
        console.warn('[NoteCollaboration] Error destroying binding:', e);
      }
      bindingRef.current = null;
      cursorTrackingSetupRef.current = false;
    }

    quillRef.current = quill;

    // Get the Yjs text type
    const ytext = ydocRef.current.getText('content');
    const ytextContent = ytext.toString();
    const quillContent = quill.root.innerHTML;
    const quillTextLength = quill.getText().trim().length;

    console.log('[NoteCollaboration] Content comparison:', {
      yjsLength: ytext.length,
      yjsPreview: ytextContent.substring(0, 100),
      quillTextLength,
      quillHtmlPreview: quillContent.substring(0, 100)
    });

    // CRITICAL: Handle the sync direction properly to avoid content duplication
    // - If Yjs is empty but Quill has content → Quill → Yjs (first user scenario)
    // - If Yjs has content → Yjs → Quill (joining existing session - Yjs is authoritative)
    //
    // The key insight: Yjs is the authoritative source for collaborative content.
    // When joining an existing session, Yjs content should REPLACE local Quill content.

    const yjsIsEmpty = ytext.length === 0;
    const quillHasContent = quillTextLength > 0;

    if (!yjsIsEmpty) {
      // SCENARIO: Joining an existing collaborative session
      // Yjs has content (from other collaborators) - it is the authoritative source
      // We must clear Quill's local content to prevent duplication when binding
      console.log('[NoteCollaboration] Yjs has content - clearing Quill to let Yjs be authoritative');

      try {
        // Clear Quill content BEFORE binding
        // The QuillBinding will then populate Quill with Yjs content
        const currentLength = quill.getLength();
        if (currentLength > 1) { // Quill always has at least 1 char (newline)
          quill.deleteText(0, currentLength);
          console.log('[NoteCollaboration] Cleared Quill content, will sync from Yjs');
        }
      } catch (e) {
        console.warn('[NoteCollaboration] Failed to clear Quill:', e);
      }
    } else if (quillHasContent) {
      // SCENARIO: First user joining - Yjs is empty but Quill has DB content
      // We need to sync Quill → Yjs BEFORE creating the binding
      // because QuillBinding only syncs Yjs→Quill initially
      console.log('[NoteCollaboration] Yjs empty, Quill has content - pre-syncing Quill to Yjs');

      try {
        const quillText = quill.getText();
        if (quillText.trim().length > 0) {
          ydocRef.current.transact(() => {
            ytext.insert(0, quillText);
          });
          console.log('[NoteCollaboration] Pre-synced Quill text to Yjs:', quillText.substring(0, 50));
        }
      } catch (e) {
        console.warn('[NoteCollaboration] Failed to pre-sync Quill to Yjs:', e);
      }
    }

    // Create QuillBinding
    // Now both Yjs and Quill should have matching content
    try {
      const binding = new QuillBinding(ytext, quill, awarenessRef.current);
      bindingRef.current = binding;
      console.log('[NoteCollaboration] Bound Quill to Yjs successfully');
    } catch (e) {
      console.error('[NoteCollaboration] Failed to create QuillBinding:', e);
      return;
    }

    // Set up cursor tracking and delta sending only once per quill instance
    if (!cursorTrackingSetupRef.current) {
      cursorTrackingSetupRef.current = true;

      // Set up cursor tracking
      const handleSelectionChange = (range: any) => {
        if (range && socketRef.current?.connected) {
          socketRef.current.emit('note:cursor', {
            noteId,
            index: range.index,
            length: range.length,
          });
        }
      };

      // Set up delta sending for Flutter clients
      // When user types, send the full document delta so Flutter can replace its content
      let lastSentContent = '';
      const handleTextChange = (delta: any, oldDelta: any, source: string) => {
        // Only send user-initiated changes, not programmatic ones
        if (source === 'user' && socketRef.current?.connected && quillRef.current) {
          // Get full document contents
          const fullDelta = quillRef.current.getContents();
          const fullDeltaJson = JSON.stringify(fullDelta.ops);

          // Skip if content hasn't changed
          if (fullDeltaJson === lastSentContent) return;
          lastSentContent = fullDeltaJson;

          console.log('[NoteCollaboration] Sending full delta to Flutter clients:', fullDelta.ops.length, 'ops');
          socketRef.current.emit('note:delta', {
            noteId,
            delta: fullDelta.ops,
          });
        }
      };

      quill.on('selection-change', handleSelectionChange);
      quill.on('text-change', handleTextChange);
    }
  }, [noteId]);

  /**
   * Unbind Quill from Yjs
   */
  const unbindQuill = useCallback(() => {
    console.log('[NoteCollaboration] unbindQuill called', { hasBinding: !!bindingRef.current });
    if (bindingRef.current) {
      bindingRef.current.destroy();
      bindingRef.current = null;
    }
    quillRef.current = null;
    cursorTrackingSetupRef.current = false;
  }, []);

  /**
   * Update cursor position
   */
  const updateCursor = useCallback((index: number, length?: number) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('note:cursor', {
        noteId,
        index,
        length,
      });
    }
  }, [noteId]);

  /**
   * Notify other clients that content has been saved to database
   * This allows non-Yjs clients (like Flutter) to fetch the latest content from API
   */
  const notifyContentChanged = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[NoteCollaboration] Notifying content changed for note:', noteId);
      socketRef.current.emit('note:content-changed', {
        noteId,
      });
    }
  }, [noteId]);

  /**
   * Disconnect from collaboration
   */
  const disconnect = useCallback(() => {
    isConnectingRef.current = false;

    if (socketRef.current) {
      socketRef.current.emit('note:leave', { noteId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    unbindQuill();

    if (ydocRef.current) {
      ydocRef.current.destroy();
      ydocRef.current = null;
    }

    if (awarenessRef.current) {
      awarenessRef.current.destroy();
      awarenessRef.current = null;
    }

    setIsConnected(false);
    setIsLoading(false);
    setUsers([]);
    setCursors(new Map());
  }, [noteId, unbindQuill]);

  // Connect on mount, disconnect on unmount or when noteId/workspaceId changes
  useEffect(() => {
    // Only connect if we have valid noteId and workspaceId
    if (!noteId || !workspaceId || !enabled) {
      return;
    }

    connect();

    // Periodic check to ensure binding stays valid
    // Use socketRef to check connection status (avoids closure issue with isConnected state)
    const bindingCheckInterval = setInterval(() => {
      const isCurrentlyConnected = socketRef.current?.connected;
      if (isCurrentlyConnected && !bindingRef.current && getQuillInstanceRef.current) {
        console.warn('[NoteCollaboration] Periodic check: Binding lost, attempting rebind...');
        try {
          const quill = getQuillInstanceRef.current();
          if (quill && ydocRef.current && awarenessRef.current) {
            const ytext = ydocRef.current.getText('content');
            bindingRef.current = new QuillBinding(ytext, quill, awarenessRef.current);
            quillRef.current = quill;
            console.log('[NoteCollaboration] Periodic rebind successful');
          }
        } catch (e) {
          console.error('[NoteCollaboration] Periodic rebind failed:', e);
        }
      }
    }, 2000); // Check every 2 seconds

    return () => {
      clearInterval(bindingCheckInterval);
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, workspaceId, enabled]);

  return {
    isConnected,
    isLoading,
    users,
    cursors,
    bindQuill,
    unbindQuill,
    updateCursor,
    notifyContentChanged,
    disconnect,
  };
}

export default useNoteCollaboration;
