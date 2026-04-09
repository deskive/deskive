import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Y from 'yjs';
import * as awarenessProtocol from 'y-protocols/awareness';

// Use 'any' types for Excalidraw since the type definitions are complex
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawImperativeAPI = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ExcalidrawElement = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Collaborator = any;

// Helper functions for base64 encoding/decoding
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

// Throttle function for limiting update frequency
function throttle(
  func: (elements: ExcalidrawElement[]) => void,
  limit: number
): (elements: ExcalidrawElement[]) => void {
  let inThrottle = false;
  let lastArgs: ExcalidrawElement[] | null = null;

  return (elements: ExcalidrawElement[]) => {
    if (!inThrottle) {
      func(elements);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          func(lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = elements;
    }
  };
}

// Generate a simple hash for element comparison (faster than JSON.stringify for large arrays)
function hashElements(elements: readonly ExcalidrawElement[]): string {
  if (!elements || elements.length === 0) return '';
  // Create a hash based on element ids, versions, and key properties
  return elements.map(el => `${el.id}:${el.version || 0}:${el.x}:${el.y}:${el.width}:${el.height}`).join('|');
}

// Sanitize elements for Excalidraw compatibility
// Ensures freedraw elements have valid points, and all required properties exist
function sanitizeElements(elements: ExcalidrawElement[]): ExcalidrawElement[] {
  if (!elements || !Array.isArray(elements)) return [];

  return elements
    .filter((el) => el && typeof el === 'object' && el.id && el.type)
    .map((el) => {
      const sanitized = { ...el };

      // Ensure freedraw elements have valid points array
      if (el.type === 'freedraw') {
        if (!el.points || !Array.isArray(el.points) || el.points.length === 0) {
          // Create minimal points array to prevent Excalidraw crash
          sanitized.points = [[0, 0, 0.5]];
          console.warn(`[Sanitize] Fixed freedraw element ${el.id} with missing points`);
        } else {
          // Ensure each point is valid [x, y, pressure?]
          sanitized.points = el.points
            .filter((p: unknown) => Array.isArray(p) && p.length >= 2)
            .map((p: number[]) => [
              typeof p[0] === 'number' ? p[0] : 0,
              typeof p[1] === 'number' ? p[1] : 0,
              typeof p[2] === 'number' ? p[2] : 0.5,
            ]);
          if (sanitized.points.length === 0) {
            sanitized.points = [[0, 0, 0.5]];
          }
        }
      }

      // Ensure line/arrow elements have valid points
      if ((el.type === 'line' || el.type === 'arrow') && el.points) {
        if (!Array.isArray(el.points) || el.points.length < 2) {
          // Lines/arrows need at least 2 points
          sanitized.points = [[0, 0], [el.width || 100, el.height || 0]];
        }
      }

      // Ensure opacity is valid (0-100 for Excalidraw)
      if (typeof el.opacity !== 'number' || el.opacity < 0 || el.opacity > 100) {
        sanitized.opacity = 100;
      }

      // Ensure required numeric properties exist
      sanitized.x = typeof el.x === 'number' ? el.x : 0;
      sanitized.y = typeof el.y === 'number' ? el.y : 0;
      sanitized.width = typeof el.width === 'number' ? el.width : 100;
      sanitized.height = typeof el.height === 'number' ? el.height : 100;
      sanitized.angle = typeof el.angle === 'number' ? el.angle : 0;
      sanitized.strokeWidth = typeof el.strokeWidth === 'number' ? el.strokeWidth : 2;

      return sanitized;
    });
}

// Merge local and remote elements intelligently
// Remote elements take precedence, but we preserve local elements that might be in-progress
function mergeElements(
  localElements: ExcalidrawElement[],
  remoteElements: ExcalidrawElement[]
): ExcalidrawElement[] {
  // Sanitize both inputs to ensure valid elements
  const sanitizedRemote = sanitizeElements(remoteElements || []);
  const sanitizedLocal = sanitizeElements(localElements || []);

  const remoteMap = new Map<string, ExcalidrawElement>();
  const localMap = new Map<string, ExcalidrawElement>();

  // Build maps for quick lookup
  sanitizedRemote.forEach(el => remoteMap.set(el.id, el));
  sanitizedLocal.forEach(el => localMap.set(el.id, el));

  const result: ExcalidrawElement[] = [];
  const processedIds = new Set<string>();

  // Process remote elements first (they take precedence)
  for (const remoteEl of sanitizedRemote) {
    const localEl = localMap.get(remoteEl.id);

    if (!localEl) {
      // Element only exists remotely, use remote
      result.push(remoteEl);
    } else {
      // Element exists in both - use the one with higher version
      // If versions are equal, prefer remote (it's more recent)
      const remoteVersion = remoteEl.version || 0;
      const localVersion = localEl.version || 0;

      if (localVersion > remoteVersion) {
        // Local is newer (user is actively editing), keep local
        result.push(localEl);
      } else {
        // Remote is same or newer, use remote
        result.push(remoteEl);
      }
    }
    processedIds.add(remoteEl.id);
  }

  // Add any local-only elements (newly created elements that haven't synced yet)
  for (const localEl of sanitizedLocal) {
    if (!processedIds.has(localEl.id) && !localEl.isDeleted) {
      result.push(localEl);
    }
  }

  return result;
}

// Types for collaboration
export interface WhiteboardCollaborationUser {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  pointer?: {
    x: number;
    y: number;
    tool?: string;
    pressing?: boolean;
  };
  joinedAt: string;
}

export interface PointerData {
  oderId: string;
  odername: string;
  pointer: { x: number; y: number };
  button: 'up' | 'down';
  username: string;
  color: { background: string; stroke: string };
  avatarUrl?: string;
}

interface UseWhiteboardCollaborationOptions {
  sessionId: string;
  workspaceId: string;
  currentUserId?: string;
  enabled?: boolean;
  onUsersChange?: (users: WhiteboardCollaborationUser[]) => void;
  onUserJoined?: (user: WhiteboardCollaborationUser) => void;
  onUserLeft?: (userId: string) => void;
  onElementsChange?: (elements: ExcalidrawElement[]) => void;
  onError?: (error: Error) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BinaryFiles = any;

interface UseWhiteboardCollaborationReturn {
  isConnected: boolean;
  isLoading: boolean;
  users: WhiteboardCollaborationUser[];
  collaborators: Map<string, Collaborator>;
  bindExcalidraw: (api: ExcalidrawImperativeAPI) => void;
  unbindExcalidraw: () => void;
  updateElements: (elements: readonly ExcalidrawElement[]) => void;
  updateFiles: (files: BinaryFiles) => void;
  updatePointer: (x: number, y: number, tool?: string, pressing?: boolean) => void;
  disconnect: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const WS_URL = API_URL.replace('/api/v1', '').replace('http://', 'ws://').replace('https://', 'wss://');

// Predefined collaborator colors
const COLLABORATOR_COLORS = [
  { background: '#E91E63', stroke: '#C2185B' },
  { background: '#9C27B0', stroke: '#7B1FA2' },
  { background: '#3F51B5', stroke: '#303F9F' },
  { background: '#2196F3', stroke: '#1976D2' },
  { background: '#00BCD4', stroke: '#0097A7' },
  { background: '#4CAF50', stroke: '#388E3C' },
  { background: '#FF9800', stroke: '#F57C00' },
  { background: '#795548', stroke: '#5D4037' },
  { background: '#607D8B', stroke: '#455A64' },
  { background: '#F44336', stroke: '#D32F2F' },
];

/**
 * Hook for real-time whiteboard collaboration using Yjs and Socket.IO
 */
export function useWhiteboardCollaboration({
  sessionId,
  workspaceId,
  currentUserId,
  enabled = true,
  onUsersChange,
  onUserJoined,
  onUserLeft,
  onElementsChange,
  onError,
}: UseWhiteboardCollaborationOptions): UseWhiteboardCollaborationReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<WhiteboardCollaborationUser[]>([]);
  const [collaborators, setCollaborators] = useState<Map<string, Collaborator>>(new Map());

  const socketRef = useRef<Socket | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
  const excalidrawAPIRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const isConnectingRef = useRef(false);
  const lastElementsHashRef = useRef<string>('');
  const isApplyingRemoteUpdateRef = useRef(false);
  const remoteUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLocalUpdateRef = useRef<ExcalidrawElement[] | null>(null);
  const throttledSendRef = useRef<((elements: ExcalidrawElement[]) => void) | null>(null);
  const lastPointerRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const lastFileIdsRef = useRef<Set<string>>(new Set());

  // Store callbacks in refs
  const callbacksRef = useRef({
    onUsersChange,
    onUserJoined,
    onUserLeft,
    onElementsChange,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onUsersChange,
      onUserJoined,
      onUserLeft,
      onElementsChange,
      onError,
    };
  }, [onUsersChange, onUserJoined, onUserLeft, onElementsChange, onError]);

  /**
   * Initialize Yjs document
   */
  const initYjs = useCallback(() => {
    if (ydocRef.current) {
      try {
        ydocRef.current.destroy();
      } catch (e) {
        console.warn('[WhiteboardCollaboration] Error destroying old Yjs doc:', e);
      }
      ydocRef.current = null;
    }

    if (awarenessRef.current) {
      try {
        awarenessRef.current.destroy();
      } catch (e) {
        console.warn('[WhiteboardCollaboration] Error destroying old awareness:', e);
      }
      awarenessRef.current = null;
    }

    console.log('[WhiteboardCollaboration] Creating new Yjs doc for session:', sessionId);
    const ydoc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(ydoc);

    ydocRef.current = ydoc;
    awarenessRef.current = awareness;

    // Initialize Yjs data structures
    ydoc.getArray('elements');
    ydoc.getMap('appState');

    // Listen for local document updates
    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin !== 'remote' && socketRef.current?.connected) {
        console.log('[WhiteboardCollaboration] Sending update to server');
        socketRef.current.emit('whiteboard:update', {
          sessionId,
          update: uint8ArrayToBase64(update),
        });
      }
    });

    // Listen for awareness updates
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      if (socketRef.current?.connected) {
        const update = awarenessProtocol.encodeAwarenessUpdate(
          awareness,
          [...added, ...updated, ...removed]
        );
        socketRef.current.emit('whiteboard:awareness', {
          sessionId,
          update: uint8ArrayToBase64(update),
        });
      }
    });

    return { ydoc, awareness };
  }, [sessionId]);

  /**
   * Connect to collaboration server
   */
  const connect = useCallback(() => {
    if (!enabled || !sessionId || !workspaceId) return;
    if (isConnectingRef.current) return;

    const token = localStorage.getItem('auth_token');
    if (!token) {
      callbacksRef.current.onError?.(new Error('No authentication token'));
      return;
    }

    if (socketRef.current?.connected) {
      console.log('[WhiteboardCollaboration] Already connected, disconnecting first');
      socketRef.current.emit('whiteboard:leave', { sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    isConnectingRef.current = true;
    setIsLoading(true);

    initYjs();

    // Create socket connection
    const socket = io(`${WS_URL}/whiteboards`, {
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
      console.log('[WhiteboardCollaboration] Connected to server');
      setIsConnected(true);
      isConnectingRef.current = false;

      // Join the whiteboard room
      socket.emit('whiteboard:join', { sessionId }, (response: { success: boolean; users?: WhiteboardCollaborationUser[]; elements?: ExcalidrawElement[]; error?: string }) => {
        if (response.success) {
          console.log('[WhiteboardCollaboration] Joined whiteboard:', sessionId);
          setUsers(response.users || []);
          callbacksRef.current.onUsersChange?.(response.users || []);

          // Update collaborators map for Excalidraw
          updateCollaboratorsFromUsers(response.users || []);

          // If we received elements, update Excalidraw
          if (response.elements && response.elements.length > 0 && excalidrawAPIRef.current) {
            console.log('[WhiteboardCollaboration] Received initial elements:', response.elements.length);

            // Set flag to prevent sending these initial elements back
            isApplyingRemoteUpdateRef.current = true;
            excalidrawAPIRef.current.updateScene({ elements: response.elements });
            lastElementsHashRef.current = hashElements(response.elements);

            // Reset flag after processing
            setTimeout(() => {
              isApplyingRemoteUpdateRef.current = false;
            }, 100);
          }
        } else {
          console.error('[WhiteboardCollaboration] Failed to join:', response.error);
          callbacksRef.current.onError?.(new Error(response.error || 'Failed to join whiteboard'));
        }
        setIsLoading(false);
      });
    });

    socket.on('disconnect', () => {
      console.log('[WhiteboardCollaboration] Disconnected from server');
      setIsConnected(false);
      isConnectingRef.current = false;
    });

    socket.on('connect_error', (error) => {
      console.error('[WhiteboardCollaboration] Connection error:', error);
      setIsLoading(false);
      isConnectingRef.current = false;
      callbacksRef.current.onError?.(error);
    });

    // Sync events
    socket.on('whiteboard:sync', (data: { sessionId: string; state: string }) => {
      if (data.sessionId !== sessionId || !ydocRef.current) return;

      try {
        const update = base64ToUint8Array(data.state);
        Y.applyUpdate(ydocRef.current, update, 'remote');
        console.log('[WhiteboardCollaboration] Applied sync from server');
      } catch (error) {
        console.error('[WhiteboardCollaboration] Failed to apply sync:', error);
      }
    });

    // Elements update from other users
    socket.on('whiteboard:elements', (data: { sessionId: string; elements: ExcalidrawElement[]; userId?: string }) => {
      if (data.sessionId !== sessionId) return;

      console.log('[WhiteboardCollaboration] Received elements update:', data.elements?.length);

      if (excalidrawAPIRef.current && data.elements) {
        // Set flag to prevent sending these elements back
        isApplyingRemoteUpdateRef.current = true;

        // Clear any existing timeout
        if (remoteUpdateTimeoutRef.current) {
          clearTimeout(remoteUpdateTimeoutRef.current);
        }

        // Get current local elements to merge with remote
        const currentElements = excalidrawAPIRef.current.getSceneElements() as ExcalidrawElement[];

        // Smart merge: prefer remote elements but keep local elements that are being actively edited
        // (elements with isDeleted: false that exist locally but not in remote should be preserved briefly)
        const mergedElements = mergeElements(currentElements, data.elements);

        // Update Excalidraw with merged elements
        excalidrawAPIRef.current.updateScene({ elements: mergedElements });

        // Update our hash to prevent re-sending
        lastElementsHashRef.current = hashElements(mergedElements);

        callbacksRef.current.onElementsChange?.(mergedElements);

        // Reset flag after a short delay to allow Excalidraw to process
        remoteUpdateTimeoutRef.current = setTimeout(() => {
          isApplyingRemoteUpdateRef.current = false;

          // If there was a pending local update while we were applying remote, send it now
          if (pendingLocalUpdateRef.current) {
            const pending = pendingLocalUpdateRef.current;
            pendingLocalUpdateRef.current = null;
            throttledSendRef.current?.(pending);
          }
        }, 100);
      }
    });

    // Document update events
    socket.on('whiteboard:update', (data: { sessionId: string; update: string; userId: string }) => {
      if (data.sessionId !== sessionId || !ydocRef.current) return;

      try {
        const update = base64ToUint8Array(data.update);
        Y.applyUpdate(ydocRef.current, update, 'remote');
      } catch (error) {
        console.error('[WhiteboardCollaboration] Failed to apply update:', error);
      }
    });

    // Awareness events
    socket.on('whiteboard:awareness', (data: { sessionId: string; update: string; userId: string }) => {
      if (data.sessionId !== sessionId || !awarenessRef.current) return;

      try {
        const update = base64ToUint8Array(data.update);
        awarenessProtocol.applyAwarenessUpdate(awarenessRef.current, update, 'remote');
      } catch (error) {
        console.error('[WhiteboardCollaboration] Failed to apply awareness update:', error);
      }
    });

    // Pointer events (for showing other users' cursors)
    socket.on('whiteboard:pointer', (data: PointerData & { sessionId: string }) => {
      if (data.sessionId !== sessionId) return;
      // Skip if this is the current user's pointer
      if (data.oderId === currentUserId) return;

      // Update collaborators map with pointer position
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(data.oderId, {
          pointer: data.pointer,
          button: data.button,
          username: data.username,
          color: data.color,
          avatarUrl: data.avatarUrl,
          id: data.oderId,
        });
        return next;
      });
    });

    // Files update from other users (for images)
    socket.on('whiteboard:files', (data: { sessionId: string; files: Record<string, { id: string; mimeType: string; dataURL: string }>; userId?: string }) => {
      if (data.sessionId !== sessionId) return;

      console.log('[WhiteboardCollaboration] Received files update:', Object.keys(data.files || {}).length);

      if (excalidrawAPIRef.current && data.files) {
        // Get current files and merge with received files
        const currentFiles = excalidrawAPIRef.current.getFiles() || {};
        const mergedFiles = { ...currentFiles };

        // Add new files from remote
        for (const [fileId, fileData] of Object.entries(data.files)) {
          if (!mergedFiles[fileId]) {
            mergedFiles[fileId] = fileData;
            lastFileIdsRef.current.add(fileId);
          }
        }

        // Update Excalidraw with merged files
        excalidrawAPIRef.current.addFiles(Object.values(data.files));
      }
    });

    // Presence events
    socket.on('whiteboard:presence', (data: { sessionId: string; users: WhiteboardCollaborationUser[] }) => {
      if (data.sessionId !== sessionId) return;
      setUsers(data.users);
      callbacksRef.current.onUsersChange?.(data.users);
      updateCollaboratorsFromUsers(data.users);
    });

    socket.on('whiteboard:user-joined', (data: { sessionId: string; user: WhiteboardCollaborationUser }) => {
      if (data.sessionId !== sessionId) return;
      setUsers((prev) => [...prev.filter((u) => u.id !== data.user.id), data.user]);
      callbacksRef.current.onUserJoined?.(data.user);

      // Add to collaborators
      const colorIndex = users.length % COLLABORATOR_COLORS.length;
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.set(data.user.id, {
          username: data.user.name,
          color: COLLABORATOR_COLORS[colorIndex],
          avatarUrl: data.user.avatar,
          id: data.user.id,
        });
        return next;
      });
    });

    socket.on('whiteboard:user-left', (data: { sessionId: string; userId: string }) => {
      if (data.sessionId !== sessionId) return;
      setUsers((prev) => prev.filter((u) => u.id !== data.userId));
      callbacksRef.current.onUserLeft?.(data.userId);

      // Remove from collaborators
      setCollaborators((prev) => {
        const next = new Map(prev);
        next.delete(data.userId);
        return next;
      });
    });

  }, [enabled, sessionId, workspaceId, initYjs, users.length]);

  /**
   * Update collaborators map from users list (excluding current user)
   */
  const updateCollaboratorsFromUsers = (usersList: WhiteboardCollaborationUser[]) => {
    const newCollaborators = new Map<string, Collaborator>();

    usersList
      .filter((user) => user.id !== currentUserId) // Filter out current user
      .forEach((user, index) => {
        const colorIndex = index % COLLABORATOR_COLORS.length;
        newCollaborators.set(user.id, {
          pointer: user.pointer ? { x: user.pointer.x, y: user.pointer.y } : undefined,
          button: user.pointer?.pressing ? 'down' : 'up',
          username: user.name,
          color: COLLABORATOR_COLORS[colorIndex],
          avatarUrl: user.avatar,
          id: user.id,
        });
      });

    setCollaborators(newCollaborators);
  };

  /**
   * Bind Excalidraw API
   */
  const bindExcalidraw = useCallback((api: ExcalidrawImperativeAPI) => {
    console.log('[WhiteboardCollaboration] Binding Excalidraw API');
    excalidrawAPIRef.current = api;
  }, []);

  /**
   * Unbind Excalidraw
   */
  const unbindExcalidraw = useCallback(() => {
    console.log('[WhiteboardCollaboration] Unbinding Excalidraw');
    excalidrawAPIRef.current = null;
  }, []);

  /**
   * Internal function to send elements to server
   */
  const sendElementsToServer = useCallback((elements: ExcalidrawElement[]) => {
    if (!socketRef.current?.connected || !sessionId) return;

    console.log('[WhiteboardCollaboration] Sending elements to server:', elements.length);
    socketRef.current.emit('whiteboard:elements-update', {
      sessionId,
      elements,
    });
  }, [sessionId]);

  /**
   * Initialize throttled send function
   */
  useEffect(() => {
    // Throttle sending updates to every 50ms to prevent overwhelming the server
    // while still maintaining smooth real-time updates
    throttledSendRef.current = throttle(sendElementsToServer, 50);
  }, [sendElementsToServer]);

  /**
   * Update elements (called on Excalidraw onChange)
   */
  const updateElements = useCallback((elements: readonly ExcalidrawElement[]) => {
    if (!socketRef.current?.connected || !sessionId) return;

    // If we're currently applying a remote update, queue this for later
    // This prevents the feedback loop of sending back elements we just received
    if (isApplyingRemoteUpdateRef.current) {
      pendingLocalUpdateRef.current = [...elements];
      return;
    }

    // Check if elements have actually changed using hash comparison
    const currentHash = hashElements(elements);
    if (currentHash === lastElementsHashRef.current) return;
    lastElementsHashRef.current = currentHash;

    // Use throttled send to prevent too many updates during active drawing
    const elementsArray = [...elements];
    throttledSendRef.current?.(elementsArray);
  }, [sessionId]);

  /**
   * Update files (for image sync)
   */
  const updateFiles = useCallback((files: BinaryFiles) => {
    if (!socketRef.current?.connected || !sessionId || !files) return;

    // Get current file IDs
    const currentFileIds = new Set(Object.keys(files));

    // Find new files that haven't been sent yet
    const newFiles: Record<string, { id: string; mimeType: string; dataURL: string }> = {};
    let hasNewFiles = false;

    for (const [fileId, fileData] of Object.entries(files)) {
      if (!lastFileIdsRef.current.has(fileId)) {
        // This is a new file, add it to send
        const file = fileData as { id: string; mimeType: string; dataURL: string };
        newFiles[fileId] = {
          id: file.id,
          mimeType: file.mimeType,
          dataURL: file.dataURL,
        };
        lastFileIdsRef.current.add(fileId);
        hasNewFiles = true;
      }
    }

    // Only send if there are new files
    if (hasNewFiles) {
      console.log('[WhiteboardCollaboration] Sending new files:', Object.keys(newFiles).length);
      socketRef.current.emit('whiteboard:files-update', {
        sessionId,
        files: newFiles,
      });
    }
  }, [sessionId]);

  /**
   * Update pointer position (throttled to 30ms to prevent overwhelming the server)
   */
  const updatePointer = useCallback((x: number, y: number, tool?: string, pressing?: boolean) => {
    if (!socketRef.current?.connected || !sessionId) return;

    const now = Date.now();
    const last = lastPointerRef.current;

    // Throttle pointer updates to every 30ms, but always send if pressing state changes
    // or if the pointer has moved significantly (more than 5 pixels)
    const timeDiff = now - last.time;
    const distanceMoved = Math.sqrt(Math.pow(x - last.x, 2) + Math.pow(y - last.y, 2));

    if (timeDiff < 30 && distanceMoved < 5) {
      return;
    }

    lastPointerRef.current = { x, y, time: now };

    socketRef.current.emit('whiteboard:pointer', {
      sessionId,
      x,
      y,
      tool,
      pressing,
    });
  }, [sessionId]);

  /**
   * Disconnect from collaboration
   */
  const disconnect = useCallback(() => {
    isConnectingRef.current = false;
    isApplyingRemoteUpdateRef.current = false;
    pendingLocalUpdateRef.current = null;

    // Clear any pending timeout
    if (remoteUpdateTimeoutRef.current) {
      clearTimeout(remoteUpdateTimeoutRef.current);
      remoteUpdateTimeoutRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.emit('whiteboard:leave', { sessionId });
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    unbindExcalidraw();

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
    setCollaborators(new Map());
    lastElementsHashRef.current = '';
  }, [sessionId, unbindExcalidraw]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    if (!sessionId || !workspaceId || !enabled) {
      return;
    }

    connect();

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, workspaceId, enabled]);

  return {
    isConnected,
    isLoading,
    users,
    collaborators,
    bindExcalidraw,
    unbindExcalidraw,
    updateElements,
    updateFiles,
    updatePointer,
    disconnect,
  };
}

export default useWhiteboardCollaboration;
