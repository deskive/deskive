// src/lib/api/notes-api.ts
import { api, fetchWithAuth, handleApiResponse } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export interface Note {
  id: string;
  workspaceId: string;
  title: string;
  content: any; // JSON content for block editor
  plainTextContent?: string; // For search indexing
  folderId?: string;
  tags: string[];
  isStarred: boolean;
  isArchived: boolean;
  sharedWith: string[];
  createdBy: string;
  lastEditedBy?: string;
  createdAt: string;
  updatedAt: string;
  // Backend snake_case fields
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  last_edited_by?: string;
  author_id?: string;
  deleted_at?: string | null;
  archived_at?: string | null;
  is_favorite?: boolean;
  collaborative_data?: any;
  // Enriched fields from backend
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
  collaborators?: Array<{
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  }>;
}

export interface NoteFolder {
  id: string;
  workspaceId: string;
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateNoteRequest {
  title: string;
  content?: any;
  folderId?: string;
  tags?: string[];
  parent_id?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: any;
  folderId?: string;
  tags?: string[];
  isStarred?: boolean;
  isArchived?: boolean;
  attachments?: {
    note_attachment?: string[];
    file_attachment?: string[];
    event_attachment?: string[];
  };
}

export interface MergeNotesRequest {
  note_ids: string[];
  title: string;
  include_headers?: boolean;
  add_dividers?: boolean;
  sort_by_date?: boolean;
}

export interface MergeNotesResponse {
  id: string;
  title: string;
  content: any;
  merged_note_ids: string[];
  created_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
  color?: string;
  icon?: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description?: string;
  content: any;
  category: string;
  thumbnail?: string;
}

// Query Keys
export const notesKeys = {
  all: ['notes'] as const,
  lists: () => [...notesKeys.all, 'list'] as const,
  list: (workspaceId: string, folderId?: string) => [...notesKeys.lists(), workspaceId, { folderId }] as const,
  details: () => [...notesKeys.all, 'detail'] as const,
  detail: (id: string) => [...notesKeys.details(), id] as const,
  folders: (workspaceId: string) => [...notesKeys.all, 'folders', workspaceId] as const,
  templates: () => [...notesKeys.all, 'templates'] as const,
  starred: (workspaceId: string) => [...notesKeys.all, 'starred', workspaceId] as const,
  recent: (workspaceId: string) => [...notesKeys.all, 'recent', workspaceId] as const,
  search: (query: string) => [...notesKeys.all, 'search', query] as const,
};

// API Functions
export const notesApi = {
  // Notes
  async getNotes(workspaceId: string, folderId?: string, isDeleted?: boolean): Promise<Note[]> {
    const params = new URLSearchParams();
    if (folderId) params.append('folderId', folderId);
    if (isDeleted !== undefined) params.append('is_deleted', String(isDeleted));
    const queryString = params.toString() ? `?${params.toString()}` : '';
    return api.get<Note[]>(`/workspaces/${workspaceId}/notes${queryString}`);
  },

  async getNote(noteId: string): Promise<Note> {
    return api.get<Note>(`/notes/${noteId}`);
  },

  async getNoteByWorkspace(workspaceId: string, noteId: string): Promise<Note> {
    return api.get<Note>(`/workspaces/${workspaceId}/notes/${noteId}`);
  },

  async createNote(workspaceId: string, data: CreateNoteRequest): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes`, data);
  },

  async updateNote(workspaceId: string, noteId: string, data: UpdateNoteRequest): Promise<Note> {
    return api.patch<Note>(`/workspaces/${workspaceId}/notes/${noteId}`, data);
  },

  async deleteNote(workspaceId: string, noteId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/notes/${noteId}`);
  },

  async bulkDeleteNotes(workspaceId: string, noteIds: string[]): Promise<void> {
    const response = await fetchWithAuth(`/workspaces/${workspaceId}/notes/bulk`, {
      method: 'DELETE',
      body: JSON.stringify({ note_ids: noteIds }),
    });
    await handleApiResponse<void>(response);
  },

  async permanentDeleteNote(workspaceId: string, noteId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/notes/${noteId}/permanent`);
  },

  async restoreNote(workspaceId: string, noteId: string): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes/${noteId}/restore`, null);
  },

  async bulkRestoreNotes(workspaceId: string, noteIds: string[]): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/notes/bulk/restore`, { note_ids: noteIds });
  },

  async archiveNote(workspaceId: string, noteId: string): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes/${noteId}/archive`, null);
  },

  async bulkArchiveNotes(workspaceId: string, noteIds: string[]): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/notes/bulk/archive`, { noteIds });
  },

  async unarchiveNote(workspaceId: string, noteId: string): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes/${noteId}/unarchive`, null);
  },

  async bulkUnarchiveNotes(workspaceId: string, noteIds: string[]): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/notes/bulk/unarchive`, { noteIds });
  },

  async duplicateNote(workspaceId: string, noteId: string, data?: { 
    title?: string; 
    includeSubNotes?: boolean; 
    parentId?: string 
  }): Promise<Note> {
    const endpoint = `/workspaces/${workspaceId}/notes/${noteId}/duplicate`;
    const requestData = data || {};
    
    console.log('📋 Duplicate Note API Call:', {
      endpoint,
      workspaceId,
      noteId,
      requestData,
      timestamp: new Date().toISOString()
    });
    
    try {
      const response = await api.post<Note>(endpoint, requestData);
      console.log('✅ Duplicate Note API Success:', response);
      return response;
    } catch (error) {
      console.error('❌ Duplicate Note API Error:', error);
      throw error;
    }
  },

  async mergeNotes(workspaceId: string, data: MergeNotesRequest): Promise<MergeNotesResponse> {
    return api.post<MergeNotesResponse>(`/workspaces/${workspaceId}/notes/merge`, data);
  },

  // Folders
  async getFolders(workspaceId: string): Promise<NoteFolder[]> {
    return api.get<NoteFolder[]>(`/workspaces/${workspaceId}/notes/folders`);
  },

  async createFolder(workspaceId: string, data: CreateFolderRequest): Promise<NoteFolder> {
    return api.post<NoteFolder>(`/workspaces/${workspaceId}/notes/folders`, data);
  },

  async updateFolder(folderId: string, data: Partial<CreateFolderRequest>): Promise<NoteFolder> {
    return api.patch<NoteFolder>(`/notes/folders/${folderId}`, data);
  },

  async deleteFolder(folderId: string): Promise<void> {
    await api.delete(`/notes/folders/${folderId}`);
  },

  // Special queries
  async getStarredNotes(workspaceId: string): Promise<Note[]> {
    return api.get<Note[]>(`/workspaces/${workspaceId}/notes/starred`);
  },

  async getRecentNotes(workspaceId: string, limit = 10): Promise<Note[]> {
    return api.get<Note[]>(`/workspaces/${workspaceId}/notes/recent?limit=${limit}`);
  },

  async searchNotes(workspaceId: string, query: string, options?: {
    mode?: 'keyword' | 'semantic' | 'hybrid';
    limit?: number;
    offset?: number;
  }): Promise<Note[]> {
    const params = new URLSearchParams();
    params.append('q', query);
    if (options?.mode) params.append('mode', options.mode);
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.offset) params.append('offset', String(options.offset));
    return api.get<Note[]>(`/workspaces/${workspaceId}/notes/search?${params.toString()}`);
  },

  // Templates
  async getTemplates(): Promise<NoteTemplate[]> {
    return api.get<NoteTemplate[]>('/notes/templates');
  },

  async createFromTemplate(workspaceId: string, templateId: string, data: {
    title: string;
    folderId?: string;
  }): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes/from-template`, {
      templateId,
      ...data,
    });
  },

  // Sharing
  async shareNote(workspaceId: string, noteId: string, data: { user_ids: string[]; permission?: 'read' | 'write' | 'admin' }): Promise<{ success: boolean; message: string; shared_count: number; total_shared_users: number }> {
    return api.post(`/workspaces/${workspaceId}/notes/${noteId}/share`, data);
  },

  async unshareNote(noteId: string, userId?: string): Promise<void> {
    const endpoint = userId 
      ? `/notes/${noteId}/share/${userId}`
      : `/notes/${noteId}/share`;
    await api.delete(endpoint);
  },

  // Export
  async exportNote(noteId: string, format: 'markdown' | 'pdf' | 'html'): Promise<Blob> {
    const response = await api.get<Blob>(
      `/notes/${noteId}/export?format=${format}`,
      { headers: { Accept: 'application/octet-stream' } }
    );
    return response;
  },

  // AI features
  async generateWithAI(workspaceId: string, prompt: string): Promise<Note> {
    return api.post<Note>(`/workspaces/${workspaceId}/notes/ai-generate`, { prompt });
  },

  async improveWriting(noteId: string, text: string, action: 'grammar' | 'clarity' | 'concise' | 'expand'): Promise<{
    improved: string;
    changes: Array<{ original: string; suggested: string }>;
  }> {
    return api.post(`/notes/${noteId}/ai-improve`, { text, action });
  },

  // PDF Import
  async importPdf(workspaceId: string, file: File, options: {
    title: string;
    parentId?: string;
    tags?: string[];
    extractImages?: boolean;
  }): Promise<{
    success: boolean;
    noteId: string;
    markdown: string;
    html: string;
    pageCount: number;
    hasTable: boolean;
    imageCount: number;
    message?: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', options.title);
    if (options.parentId) formData.append('parentId', options.parentId);
    if (options.tags) formData.append('tags', JSON.stringify(options.tags));
    if (options.extractImages !== undefined) formData.append('extractImages', String(options.extractImages));

    const response = await fetchWithAuth(`/workspaces/${workspaceId}/notes/import/pdf`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });

    return handleApiResponse(response);
  },

  // URL Import
  async importUrl(workspaceId: string, options: {
    url: string;
    title?: string;
    parentId?: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    noteId: string;
    title: string;
    excerpt?: string;
    siteName?: string;
    message?: string;
  }> {
    return api.post(`/workspaces/${workspaceId}/notes/import/url`, {
      url: options.url,
      title: options.title,
      parentId: options.parentId,
      tags: options.tags,
    });
  },

  // Google Drive Import
  async importFromGoogleDrive(workspaceId: string, options: {
    fileId: string;
    title: string;
    parentId?: string;
    tags?: string[];
  }): Promise<{
    success: boolean;
    noteId: string;
    title: string;
    message?: string;
  }> {
    return api.post(`/workspaces/${workspaceId}/notes/import/google-drive`, {
      fileId: options.fileId,
      title: options.title,
      parentId: options.parentId,
      tags: options.tags,
    });
  },
};

// React Query Hooks
export const useNotes = (workspaceId: string, folderId?: string) => {
  return useQuery({
    queryKey: notesKeys.list(workspaceId, folderId),
    queryFn: () => notesApi.getNotes(workspaceId, folderId),
    enabled: !!workspaceId,
  });
};

export const useActiveNotes = (workspaceId: string, folderId?: string) => {
  return useQuery({
    queryKey: [...notesKeys.list(workspaceId, folderId), 'active'],
    queryFn: () => notesApi.getNotes(workspaceId, folderId, false), // isDeleted = false
    enabled: !!workspaceId,
  });
};

export const useNote = (noteId: string) => {
  return useQuery({
    queryKey: notesKeys.detail(noteId),
    queryFn: () => notesApi.getNote(noteId),
    enabled: !!noteId,
  });
};

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateNoteRequest }) =>
      notesApi.createNote(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.list(workspaceId) });
      queryClient.invalidateQueries({ queryKey: notesKeys.recent(workspaceId) });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, noteId, data }: { workspaceId: string; noteId: string; data: UpdateNoteRequest }) =>
      notesApi.updateNote(workspaceId, noteId, data),
    onSuccess: (updatedNote, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.detail(noteId) });
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
      if (updatedNote.isStarred !== undefined) {
        queryClient.invalidateQueries({ queryKey: notesKeys.starred(updatedNote.workspaceId) });
      }
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, noteId }: { workspaceId: string; noteId: string }) =>
      notesApi.deleteNote(workspaceId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKeys.lists() });
    },
  });
};

export const useFolders = (workspaceId: string) => {
  return useQuery({
    queryKey: notesKeys.folders(workspaceId),
    queryFn: () => notesApi.getFolders(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useCreateFolder = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: CreateFolderRequest }) =>
      notesApi.createFolder(workspaceId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.folders(workspaceId) });
    },
  });
};

export const useStarredNotes = (workspaceId: string) => {
  return useQuery({
    queryKey: notesKeys.starred(workspaceId),
    queryFn: () => notesApi.getStarredNotes(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useRecentNotes = (workspaceId: string, limit?: number) => {
  return useQuery({
    queryKey: notesKeys.recent(workspaceId),
    queryFn: () => notesApi.getRecentNotes(workspaceId, limit),
    enabled: !!workspaceId,
  });
};

export const useSearchNotes = (workspaceId: string, query: string, options?: {
  mode?: 'keyword' | 'semantic' | 'hybrid';
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: [...notesKeys.search(query), options?.mode || 'hybrid'],
    queryFn: () => notesApi.searchNotes(workspaceId, query, options),
    enabled: !!workspaceId && query.length > 2,
  });
};

export const useTemplates = () => {
  return useQuery({
    queryKey: notesKeys.templates(),
    queryFn: notesApi.getTemplates,
  });
};

export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, templateId, data }: {
      workspaceId: string;
      templateId: string;
      data: { title: string; folderId?: string };
    }) => notesApi.createFromTemplate(workspaceId, templateId, data),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.list(workspaceId) });
    },
  });
};

export const useGenerateWithAI = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, prompt }: { workspaceId: string; prompt: string }) =>
      notesApi.generateWithAI(workspaceId, prompt),
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: notesKeys.list(workspaceId) });
    },
  });
};

export const useImproveWriting = () => {
  return useMutation({
    mutationFn: ({ noteId, text, action }: {
      noteId: string;
      text: string;
      action: 'grammar' | 'clarity' | 'concise' | 'expand';
    }) => notesApi.improveWriting(noteId, text, action),
  });
};
// AI Agent Types
export interface NoteAgentResponse {
  success: boolean;
  action: 'create' | 'update' | 'delete' | 'share' | 'archive' | 'unarchive' | 'duplicate' | 'batch_create' | 'batch_update' | 'batch_delete' | 'batch_share' | 'search' | 'unknown';
  message: string;
  data?: {
    note?: Note;
    notes?: Note[];
    deletedNoteId?: string;
    deletedNoteName?: string;
    deletedCount?: number;
    results?: any[];
    total?: number;
    successful?: number;
    failed?: number;
    query?: string;
    count?: number;
  };
  error?: string;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  action?: string;
  success?: boolean;
}

export interface ConversationStats {
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  actionCounts: Record<string, number>;
  entityTypes: Record<string, number>;
}

// AI Agent API Functions
export const notesAgentApi = {
  /**
   * Process a natural language command for notes management
   */
  async processCommand(workspaceId: string, prompt: string): Promise<NoteAgentResponse> {
    return api.post<NoteAgentResponse>(`/workspaces/${workspaceId}/notes/ai`, { prompt });
  },

  /**
   * Get conversation history for the notes AI agent
   */
  async getConversationHistory(workspaceId: string, limit?: number): Promise<ConversationMessage[]> {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<ConversationMessage[]>(`/workspaces/${workspaceId}/notes/ai/history${params}`);
  },

  /**
   * Clear conversation history for the notes AI agent
   */
  async clearConversationHistory(workspaceId: string): Promise<{ success: boolean; message: string }> {
    return api.delete<{ success: boolean; message: string }>(`/workspaces/${workspaceId}/notes/ai/history`);
  },

  /**
   * Get conversation statistics for the notes AI agent
   */
  async getConversationStats(workspaceId: string): Promise<ConversationStats> {
    return api.get<ConversationStats>(`/workspaces/${workspaceId}/notes/ai/stats`);
  },
};

// Backward compatibility: export as notesService
export const notesService = notesApi;
