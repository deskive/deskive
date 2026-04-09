// src/lib/api/autopilot-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface ExecuteCommandRequest {
  command: string;
  workspaceId: string;
  sessionId?: string;
  context?: Record<string, any>;
  executeActions?: boolean;
}

export interface ExecutedAction {
  tool: string;
  input: Record<string, any>;
  output: any;
  success: boolean;
  error?: string;
}

export interface AutoPilotResponse {
  success: boolean;
  sessionId: string;
  message: string;
  actions: ExecutedAction[];
  suggestions?: string[];
  reasoning?: string;
  error?: string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actions?: ExecutedAction[];
}

export interface AutoPilotCapability {
  name: string;
  description: string;
  examples: string[];
  category: string;
}

export interface SessionResponse {
  sessionId: string;
  isNew?: boolean;
}

export interface SessionListItem {
  id: string;
  sessionId: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// Stream Event Types
export interface StreamEvent {
  type: 'status' | 'action' | 'text' | 'text_delta' | 'complete' | 'error';
  data: any;
}

export interface StreamCallbacks {
  onStatus?: (status: string, message: string) => void;
  onAction?: (tool: string, success: boolean, message: string) => void;
  onText?: (content: string) => void;
  onTextDelta?: (content: string) => void;
  onComplete?: (result: AutoPilotResponse) => void;
  onError?: (error: string) => void;
}

// API Service
export const autopilotApi = {
  executeCommand: async (data: ExecuteCommandRequest): Promise<AutoPilotResponse> => {
    return api.post<AutoPilotResponse>('/autopilot/execute', data);
  },

  /**
   * Execute command with streaming response
   * Uses Server-Sent Events to stream status updates and text
   */
  executeCommandStream: async (
    data: ExecuteCommandRequest,
    callbacks: StreamCallbacks,
    token: string,
  ): Promise<void> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002';
    const apiVersion = import.meta.env.VITE_API_VERSION || '/api/v1';
    const baseUrl = `${apiUrl}${apiVersion}`;
    const url = `${baseUrl}/autopilot/execute/stream`;

    // Get user's current locale from localStorage or browser
    const userLocale = localStorage.getItem('deskive_locale') || navigator.language || 'en';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'Accept-Language': userLocale,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();

            if (data === '[DONE]') {
              return;
            }

            try {
              const event: StreamEvent = JSON.parse(data);

              switch (event.type) {
                case 'status':
                  callbacks.onStatus?.(event.data.status, event.data.message);
                  break;
                case 'action':
                  callbacks.onAction?.(event.data.tool, event.data.success, event.data.message);
                  break;
                case 'text':
                  callbacks.onText?.(event.data.content);
                  break;
                case 'text_delta':
                  callbacks.onTextDelta?.(event.data.content);
                  break;
                case 'complete':
                  callbacks.onComplete?.(event.data);
                  break;
                case 'error':
                  callbacks.onError?.(event.data.message);
                  break;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE event:', parseError);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  previewCommand: async (data: ExecuteCommandRequest): Promise<AutoPilotResponse> => {
    return api.post<AutoPilotResponse>('/autopilot/preview', {
      ...data,
      executeActions: false,
    });
  },

  getHistory: async (sessionId: string, limit?: number): Promise<ConversationMessage[]> => {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<ConversationMessage[]>(`/autopilot/history/${sessionId}${params}`);
  },

  getCapabilities: async (): Promise<AutoPilotCapability[]> => {
    return api.get<AutoPilotCapability[]>('/autopilot/capabilities');
  },

  createSession: async (workspaceId: string): Promise<SessionResponse> => {
    return api.post<SessionResponse>('/autopilot/sessions/new', { workspaceId });
  },

  getOrCreateSession: async (workspaceId: string): Promise<SessionResponse> => {
    return api.post<SessionResponse>('/autopilot/sessions/resume', { workspaceId });
  },

  clearSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>(`/autopilot/sessions/${sessionId}/clear`, {});
  },

  listSessions: async (workspaceId: string, limit?: number): Promise<SessionListItem[]> => {
    const params = new URLSearchParams({ workspaceId });
    if (limit) params.append('limit', limit.toString());
    return api.get<SessionListItem[]>(`/autopilot/sessions?${params.toString()}`);
  },

  deleteSession: async (sessionId: string): Promise<{ success: boolean }> => {
    return api.post<{ success: boolean }>(`/autopilot/sessions/${sessionId}/delete`, {});
  },

  /**
   * Extract text from a PDF file
   */
  extractPdfText: async (file: File): Promise<{ text: string; numPages: number; info: any }> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ text: string; numPages: number; info: any }>('/autopilot/extract-pdf', formData);
  },
};

// Query Keys
export const autopilotKeys = {
  all: ['autopilot'] as const,
  capabilities: () => [...autopilotKeys.all, 'capabilities'] as const,
  history: (sessionId: string) => [...autopilotKeys.all, 'history', sessionId] as const,
  session: (workspaceId: string) => [...autopilotKeys.all, 'session', workspaceId] as const,
  sessions: (workspaceId: string) => [...autopilotKeys.all, 'sessions', workspaceId] as const,
};

// React Query Hooks
export function useAutopilotCapabilities() {
  return useQuery({
    queryKey: autopilotKeys.capabilities(),
    queryFn: () => autopilotApi.getCapabilities(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useExecuteCommand() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ExecuteCommandRequest) => autopilotApi.executeCommand(data),
    onSuccess: (data) => {
      if (data.sessionId) {
        queryClient.invalidateQueries({ queryKey: autopilotKeys.history(data.sessionId) });
      }
      data.actions?.forEach(action => {
        if (action.success) {
          switch (action.tool) {
            case 'create_task':
            case 'list_tasks':
            case 'update_task':
              queryClient.invalidateQueries({ queryKey: ['projects'] });
              queryClient.invalidateQueries({ queryKey: ['tasks'] });
              break;
            case 'create_calendar_event':
            case 'list_calendar_events':
              queryClient.invalidateQueries({ queryKey: ['calendar'] });
              break;
            case 'send_channel_message':
            case 'send_direct_message':
              queryClient.invalidateQueries({ queryKey: ['chat'] });
              queryClient.invalidateQueries({ queryKey: ['conversations'] });
              break;
            case 'create_note':
            case 'update_note':
              queryClient.invalidateQueries({ queryKey: ['notes'] });
              break;
            case 'create_video_meeting':
            case 'schedule_video_meeting':
              queryClient.invalidateQueries({ queryKey: ['video-calls'] });
              break;
          }
        }
      });
    },
  });
}

export function useGetOrCreateSession(workspaceId: string) {
  return useQuery({
    queryKey: autopilotKeys.session(workspaceId),
    queryFn: () => autopilotApi.getOrCreateSession(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 30,
  });
}

export function useListSessions(workspaceId: string) {
  return useQuery({
    queryKey: autopilotKeys.sessions(workspaceId),
    queryFn: () => autopilotApi.listSessions(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 5,
  });
}

export function useSessionHistory(sessionId: string | null) {
  return useQuery({
    queryKey: autopilotKeys.history(sessionId || ''),
    queryFn: () => autopilotApi.getHistory(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 2,
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => autopilotApi.deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: autopilotKeys.all });
    },
  });
}
