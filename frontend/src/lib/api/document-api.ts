// src/lib/api/document-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types
export enum DocumentType {
  PROPOSAL = 'proposal',
  CONTRACT = 'contract',
  INVOICE = 'invoice',
  SOW = 'sow',
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURE = 'pendingSignature',
  PARTIALLY_SIGNED = 'partiallySigned',
  SIGNED = 'signed',
  EXPIRED = 'expired',
  DECLINED = 'declined',
  ARCHIVED = 'archived',
}

export interface Document {
  id: string;
  workspaceId: string;
  templateId?: string;
  documentNumber: string;
  title: string;
  description?: string;
  documentType: DocumentType;
  content: any;
  contentHtml?: string;
  placeholderValues: Record<string, any>;
  status: DocumentStatus;
  version: number;
  expiresAt?: string;
  signedAt?: string;
  settings: Record<string, any>;
  metadata: Record<string, any>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentStats {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface PaginatedDocuments {
  data: Document[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateDocumentData {
  title: string;
  documentType: DocumentType;
  content: any;
  templateId?: string;
  description?: string;
  contentHtml?: string;
  placeholderValues?: Record<string, any>;
  expiresAt?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateDocumentData {
  title?: string;
  description?: string;
  content?: any;
  contentHtml?: string;
  placeholderValues?: Record<string, any>;
  expiresAt?: string;
  settings?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  documentType: DocumentType;
  category: string;
  content: any;
  contentHtml: string;
  placeholders: string[];
  thumbnailUrl?: string;
  isSystem: boolean;
  isFeatured: boolean;
}

export interface PaginatedTemplates {
  data: DocumentTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Query Keys
export const documentKeys = {
  all: (workspaceId: string) => ['documents', workspaceId] as const,
  lists: (workspaceId: string) => [...documentKeys.all(workspaceId), 'list'] as const,
  list: (workspaceId: string, filters: any) => [...documentKeys.lists(workspaceId), filters] as const,
  details: (workspaceId: string) => [...documentKeys.all(workspaceId), 'detail'] as const,
  detail: (workspaceId: string, id: string) => [...documentKeys.details(workspaceId), id] as const,
  stats: (workspaceId: string) => [...documentKeys.all(workspaceId), 'stats'] as const,
};

// API Functions
export const documentApi = {
  async getDocuments(
    workspaceId: string,
    params?: {
      documentType?: DocumentType;
      status?: DocumentStatus;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedDocuments> {
    const queryParams = new URLSearchParams();
    if (params?.documentType) queryParams.append('documentType', params.documentType);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return api.get(`/workspaces/${workspaceId}/documents?${queryParams}`);
  },

  async getStats(workspaceId: string): Promise<DocumentStats> {
    const response = await api.get<{ data: DocumentStats }>(`/workspaces/${workspaceId}/documents/stats`);
    return response.data;
  },

  async getDocument(workspaceId: string, documentId: string): Promise<Document> {
    const response = await api.get<{ data: Document }>(`/workspaces/${workspaceId}/documents/${documentId}`);
    return response.data;
  },

  async createDocument(workspaceId: string, data: CreateDocumentData): Promise<Document> {
    const response = await api.post<{ data: Document }>(`/workspaces/${workspaceId}/documents`, data);
    return response.data;
  },

  async updateDocument(workspaceId: string, documentId: string, data: UpdateDocumentData): Promise<Document> {
    const response = await api.patch<{ data: Document }>(`/workspaces/${workspaceId}/documents/${documentId}`, data);
    return response.data;
  },

  async deleteDocument(workspaceId: string, documentId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/documents/${documentId}`);
  },

  async getPreview(workspaceId: string, documentId: string): Promise<string> {
    const response = await api.get<{ data: { html: string } }>(`/workspaces/${workspaceId}/documents/${documentId}/preview`);
    return response.data.html;
  },

  async getTemplates(
    workspaceId: string,
    params?: {
      documentType?: DocumentType;
      category?: string;
      search?: string;
      systemOnly?: boolean;
      featured?: boolean;
      page?: number;
      limit?: number;
    }
  ): Promise<PaginatedTemplates> {
    const queryParams: Record<string, string> = {};
    if (params?.documentType) queryParams.documentType = params.documentType;
    if (params?.category) queryParams.category = params.category;
    if (params?.search) queryParams.search = params.search;
    if (params?.systemOnly !== undefined) queryParams.systemOnly = String(params.systemOnly);
    if (params?.featured !== undefined) queryParams.featured = String(params.featured);
    if (params?.page) queryParams.page = String(params.page);
    if (params?.limit) queryParams.limit = String(params.limit);

    const queryString = new URLSearchParams(queryParams).toString();
    return api.get(`/workspaces/${workspaceId}/document-templates?${queryString}`);
  },

  async getTemplate(workspaceId: string, templateId: string): Promise<DocumentTemplate> {
    const response = await api.get<{ data: DocumentTemplate }>(`/workspaces/${workspaceId}/document-templates/${templateId}`);
    return response.data;
  },
};

// React Query Hooks
export const useDocuments = (workspaceId: string, filters?: {
  documentType?: DocumentType;
  status?: DocumentStatus;
  search?: string;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: documentKeys.list(workspaceId, filters),
    queryFn: () => documentApi.getDocuments(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

export const useDocumentStats = (workspaceId: string) => {
  return useQuery({
    queryKey: documentKeys.stats(workspaceId),
    queryFn: () => documentApi.getStats(workspaceId),
    enabled: !!workspaceId,
  });
};

export const useDocument = (workspaceId: string, documentId: string) => {
  return useQuery({
    queryKey: documentKeys.detail(workspaceId, documentId),
    queryFn: () => documentApi.getDocument(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId,
  });
};

export const useCreateDocument = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocumentData) => documentApi.createDocument(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists(workspaceId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats(workspaceId) });
    },
  });
};

export const useUpdateDocument = (workspaceId: string, documentId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateDocumentData) => documentApi.updateDocument(workspaceId, documentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(workspaceId, documentId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.lists(workspaceId) });
    },
  });
};

export const useDeleteDocument = (workspaceId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => documentApi.deleteDocument(workspaceId, documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists(workspaceId) });
      queryClient.invalidateQueries({ queryKey: documentKeys.stats(workspaceId) });
    },
  });
};

export const useDocumentPreview = (workspaceId: string, documentId: string) => {
  return useQuery({
    queryKey: [...documentKeys.detail(workspaceId, documentId), 'preview'],
    queryFn: () => documentApi.getPreview(workspaceId, documentId),
    enabled: !!workspaceId && !!documentId,
  });
};

export const useDocumentTemplates = (workspaceId: string, filters?: {
  documentType?: DocumentType;
  category?: string;
  search?: string;
  systemOnly?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}) => {
  return useQuery({
    queryKey: [...documentKeys.all(workspaceId), 'templates', filters],
    queryFn: () => documentApi.getTemplates(workspaceId, filters),
    enabled: !!workspaceId,
  });
};

export const useDocumentTemplate = (workspaceId: string, templateId: string) => {
  return useQuery({
    queryKey: [...documentKeys.all(workspaceId), 'template', templateId],
    queryFn: () => documentApi.getTemplate(workspaceId, templateId),
    enabled: !!workspaceId && !!templateId,
  });
};
