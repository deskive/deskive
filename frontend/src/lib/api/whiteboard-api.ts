// src/lib/api/whiteboard-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface WhiteboardSession {
  id: string;
  workspaceId: string;
  name: string;
  data: any;
  participants: string[];
  createdAt: string;
  updatedAt: string;
  state?: SessionState;
  isLocked?: boolean;
}

export interface WhiteboardElement {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'text' | 'image';
  x: number;
  y: number;
  width?: number;
  height?: number;
  color?: string;
  text?: string;
  data?: any;
}

export interface CursorPosition {
  userId: string;
  userName?: string;
  userColor?: string;
  x: number;
  y: number;
  color: string;
  timestamp?: number;
  tool?: DrawingTool;
}

export interface DrawingPoint {
  x: number;
  y: number;
  timestamp?: number;
}

export interface DrawingStroke {
  id: string;
  points: DrawingPoint[];
  color: string;
  width: number;
  strokeWidth: number;
  opacity: number;
  tool: DrawingTool;
}

export interface WhiteboardShape {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'rectangle' | 'arrow';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  opacity: number;
  fillColor?: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
}

export interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontFamily?: string;
  position?: { x: number; y: number };
}

export type DrawingTool = 'select' | 'pen' | 'rect' | 'circle' | 'line' | 'text' | 'eraser' | 'rectangle' | 'arrow';

export const COLORS = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
export const STROKE_WIDTHS = [1, 2, 4, 8, 16];

// Export Options
export interface ExportOptions {
  format: 'png' | 'jpg' | 'svg' | 'pdf';
  quality?: number;
  backgroundColor?: string;
  background?: string; // Alias for backgroundColor
  scale?: number;
}

// Participant Info
export interface Participant {
  id: string;
  name: string;
  color: string;
  cursor?: CursorPosition;
}

// Session State
export interface SessionState {
  id: string;
  name: string;
  backgroundColor: string;
  strokes: DrawingStroke[];
  shapes: WhiteboardShape[];
  texts: TextAnnotation[];
  state: {
    backgroundColor: string;
    strokes: DrawingStroke[];
    shapes: WhiteboardShape[];
    texts: TextAnnotation[];
  };
}

// Whiteboard service for real-time drawing
class WhiteboardService {
  private currentSession: SessionState | null = null;
  private participants: Map<string, Participant> = new Map();
  private cursors: Map<string, CursorPosition> = new Map();
  private currentTool: DrawingTool = 'pen';
  private currentColor = '#000000';
  private currentStrokeWidth = 2;
  private history: SessionState[] = [];
  private historyIndex = -1;
  private eventHandlers: Map<string, Set<Function>> = new Map();

  initialize(): void {
    this.currentSession = null;
    this.participants.clear();
    this.cursors.clear();
    this.history = [];
    this.historyIndex = -1;
  }

  getCurrentSession(): SessionState | null {
    return this.currentSession;
  }

  async joinSession(sessionId: string): Promise<SessionState> {
    // In a real implementation, this would connect to WebSocket and load session
    const session: SessionState = {
      id: sessionId,
      name: `Session ${sessionId}`,
      backgroundColor: '#ffffff',
      strokes: [],
      shapes: [],
      texts: [],
      state: {
        backgroundColor: '#ffffff',
        strokes: [],
        shapes: [],
        texts: [],
      },
    };
    this.currentSession = session;
    return session;
  }

  async createSession(name: string): Promise<SessionState> {
    const session: SessionState = {
      id: Math.random().toString(36).substring(7),
      name,
      backgroundColor: '#ffffff',
      strokes: [],
      shapes: [],
      texts: [],
      state: {
        backgroundColor: '#ffffff',
        strokes: [],
        shapes: [],
        texts: [],
      },
    };
    this.currentSession = session;
    this.history = [{ ...session }];
    this.historyIndex = 0;
    return session;
  }

  leaveSession(): void {
    this.currentSession = null;
    this.participants.clear();
    this.cursors.clear();
    this.emit('session_left', {});
  }

  getParticipants(): Map<string, Participant> {
    return this.participants;
  }

  getCursors(): Map<string, CursorPosition> {
    return this.cursors;
  }

  // Event emitter methods
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)?.add(handler);
  }

  off(event: string, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  private emit(event: string, data: unknown): void {
    this.eventHandlers.get(event)?.forEach(handler => handler(data));
  }

  // Drawing tool methods
  setCurrentTool(tool: DrawingTool): void {
    this.currentTool = tool;
    this.emit('tool_changed', { tool });
  }

  setCurrentColor(color: string): void {
    this.currentColor = color;
    this.emit('color_changed', { color });
  }

  setCurrentStrokeWidth(width: number): void {
    this.currentStrokeWidth = width;
    this.emit('stroke_width_changed', { width });
  }

  getCurrentTool(): DrawingTool {
    return this.currentTool;
  }

  getCurrentColor(): string {
    return this.currentColor;
  }

  getCurrentStrokeWidth(): number {
    return this.currentStrokeWidth;
  }

  getCurrentOpacity(): number {
    return 1; // Default opacity
  }

  // Drawing methods
  startStroke(point: DrawingPoint): void {
    // Start a new stroke
    const stroke: DrawingStroke = {
      id: Math.random().toString(36).substring(7),
      points: [point],
      color: this.currentColor,
      width: this.currentStrokeWidth,
      strokeWidth: this.currentStrokeWidth,
      opacity: 1,
      tool: this.currentTool,
    };
    this.currentSession?.strokes.push(stroke);
    this.emit('stroke_started', stroke);
  }

  addPointToStroke(point: DrawingPoint): void {
    if (this.currentSession && this.currentSession.strokes.length > 0) {
      const currentStroke = this.currentSession.strokes[this.currentSession.strokes.length - 1];
      currentStroke.points.push(point);
      this.emit('point_added', { strokeId: currentStroke.id, point });
    }
  }

  completeStroke(): void {
    if (this.currentSession && this.currentSession.strokes.length > 0) {
      const completedStroke = this.currentSession.strokes[this.currentSession.strokes.length - 1];
      this.saveToHistory();
      this.emit('stroke_completed', completedStroke);
    }
  }

  createShape(shapeType: WhiteboardShape['type'], start: DrawingPoint, end: DrawingPoint): void {
    if (this.currentSession) {
      const shape: WhiteboardShape = {
        id: Math.random().toString(36).substring(7),
        type: shapeType,
        x: start.x,
        y: start.y,
        width: end.x - start.x,
        height: end.y - start.y,
        color: this.currentColor,
        strokeWidth: this.currentStrokeWidth,
        opacity: 1,
        startPoint: { x: start.x, y: start.y },
        endPoint: { x: end.x, y: end.y },
      };
      this.currentSession.shapes.push(shape);
      this.saveToHistory();
      this.emit('shape_created', shape);
    }
  }

  createText(text: string, position: { x: number; y: number }): void {
    if (this.currentSession) {
      const textAnnotation: TextAnnotation = {
        id: Math.random().toString(36).substring(7),
        text,
        x: position.x,
        y: position.y,
        fontSize: 16,
        color: this.currentColor,
        position,
      };
      this.currentSession.texts.push(textAnnotation);
      this.saveToHistory();
      this.emit('text_created', textAnnotation);
    }
  }

  updateCursor(point: DrawingPoint): void {
    const cursor: CursorPosition = {
      userId: 'current-user',
      x: point.x,
      y: point.y,
      color: this.currentColor,
      tool: this.currentTool,
    };
    this.cursors.set(cursor.userId, cursor);
    this.emit('cursor_updated', cursor);
  }

  // History methods
  undo(): boolean {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.currentSession = { ...this.history[this.historyIndex] };
      this.emit('undo', {});
      return true;
    }
    return false;
  }

  redo(): boolean {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentSession = { ...this.history[this.historyIndex] };
      this.emit('redo', {});
      return true;
    }
    return false;
  }

  clearBoard(): void {
    if (this.currentSession) {
      this.currentSession.strokes = [];
      this.currentSession.shapes = [];
      this.currentSession.texts = [];
      this.saveToHistory();
      this.emit('board_cleared', {});
    }
  }

  private saveToHistory(): void {
    if (this.currentSession) {
      // Remove any future history if we're not at the end
      this.history = this.history.slice(0, this.historyIndex + 1);
      // Add current state
      this.history.push({ ...this.currentSession });
      this.historyIndex = this.history.length - 1;
      // Limit history size
      if (this.history.length > 50) {
        this.history.shift();
        this.historyIndex--;
      }
    }
  }

  async saveSession(): Promise<void> {
    // In a real implementation, this would save to the backend
    console.log('Saving session', this.currentSession);
  }

  async exportBoard(canvas: HTMLCanvasElement, options: ExportOptions): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const { format, quality = 0.92, backgroundColor = '#ffffff', background } = options;
        const bgColor = background || backgroundColor;

        if (format === 'svg') {
          // For SVG, we'd need to implement SVG export logic
          reject(new Error('SVG export not yet implemented'));
          return;
        }

        // For raster formats (PNG, JPG)
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

        // If background color is specified and not transparent, add it
        if (bgColor && bgColor !== 'transparent') {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');

          if (tempCtx) {
            tempCtx.fillStyle = bgColor;
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.drawImage(canvas, 0, 0);
            resolve(tempCanvas.toDataURL(mimeType, quality));
            return;
          }
        }

        resolve(canvas.toDataURL(mimeType, quality));
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const whiteboardService = new WhiteboardService();

// Query Keys
export const whiteboardKeys = {
  all: ['whiteboard'] as const,
  sessions: (workspaceId: string) => [...whiteboardKeys.all, 'sessions', workspaceId] as const,
  session: (id: string) => [...whiteboardKeys.all, 'session', id] as const,
};

// API Functions
// Collaborator types
export interface WhiteboardCollaborator {
  id: string;
  whiteboardId: string;
  userId: string;
  permission: 'view' | 'edit';
  addedAt: string;
  user?: {
    id: string;
    name?: string;
    email?: string;
    avatar?: string;
  };
}

export interface ShareWhiteboardRequest {
  user_ids: string[];
  permission: 'view' | 'edit';
}

export interface ShareWhiteboardResponse {
  shared_count: number;
  collaborators: WhiteboardCollaborator[];
}

export const whiteboardApi = {
  async getSessions(workspaceId: string): Promise<WhiteboardSession[]> {
    return api.get<WhiteboardSession[]>(`/workspaces/${workspaceId}/whiteboards`);
  },

  async getSession(id: string): Promise<WhiteboardSession> {
    return api.get<WhiteboardSession>(`/whiteboards/${id}`);
  },

  async createSession(workspaceId: string, name: string): Promise<WhiteboardSession> {
    return api.post<WhiteboardSession>(`/workspaces/${workspaceId}/whiteboards`, { name });
  },

  async updateSession(id: string, data: Partial<WhiteboardSession>): Promise<WhiteboardSession> {
    return api.patch<WhiteboardSession>(`/whiteboards/${id}`, data);
  },

  async deleteSession(id: string): Promise<void> {
    await api.delete(`/whiteboards/${id}`);
  },

  // Collaborator management
  async shareWhiteboard(
    workspaceId: string,
    whiteboardId: string,
    data: ShareWhiteboardRequest,
  ): Promise<ShareWhiteboardResponse> {
    // Add collaborators one by one and collect results
    const collaborators: WhiteboardCollaborator[] = [];
    for (const userId of data.user_ids) {
      const result = await api.post<WhiteboardCollaborator>(
        `/workspaces/${workspaceId}/whiteboards/${whiteboardId}/collaborators`,
        { userId, permission: data.permission },
      );
      collaborators.push(result);
    }
    return { shared_count: collaborators.length, collaborators };
  },

  async getCollaborators(
    workspaceId: string,
    whiteboardId: string,
  ): Promise<WhiteboardCollaborator[]> {
    return api.get<WhiteboardCollaborator[]>(
      `/workspaces/${workspaceId}/whiteboards/${whiteboardId}/collaborators`,
    );
  },

  async removeCollaborator(
    workspaceId: string,
    whiteboardId: string,
    collaboratorUserId: string,
  ): Promise<void> {
    await api.delete(
      `/workspaces/${workspaceId}/whiteboards/${whiteboardId}/collaborators/${collaboratorUserId}`,
    );
  },
};

// React Query Hooks
export const useWhiteboardSessions = (workspaceId: string) => {
  return useQuery({
    queryKey: whiteboardKeys.sessions(workspaceId),
    queryFn: () => whiteboardApi.getSessions(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useWhiteboardSession = (id: string) => {
  return useQuery({
    queryKey: whiteboardKeys.session(id),
    queryFn: () => whiteboardApi.getSession(id),
    enabled: !!id,
  });
};

export const useCreateWhiteboardSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, name }: { workspaceId: string; name: string }) =>
      whiteboardApi.createSession(workspaceId, name),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: whiteboardKeys.sessions(workspaceId) });
    },
  });
};

export const useUpdateWhiteboardSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<WhiteboardSession> }) =>
      whiteboardApi.updateSession(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: whiteboardKeys.session(id) });
    },
  });
};

export const useDeleteWhiteboardSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: whiteboardApi.deleteSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: whiteboardKeys.all });
    },
  });
};
