import { api, fetchWithAuth } from '@/lib/fetch';

// Types
export enum FieldType {
  SHORT_TEXT = 'short_text',
  LONG_TEXT = 'long_text',
  EMAIL = 'email',
  PHONE = 'phone',
  URL = 'url',
  NUMBER = 'number',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  DROPDOWN = 'dropdown',
  CHECKBOX = 'checkbox',
  FILE_UPLOAD = 'file_upload',
  RATING = 'rating',
  SCALE = 'scale',
  MATRIX = 'matrix',
  SECTION_HEADER = 'section_header',
  PAGE_BREAK = 'page_break',
}

export enum FormStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CLOSED = 'closed',
  ARCHIVED = 'archived',
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  placeholder?: string;
  page: number;
  order: number;
  validation?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
    errorMessage?: string;
  };
  options?: string[];
  allowOther?: boolean;
  maxFiles?: number;
  allowedFileTypes?: string[];
  scale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  rows?: string[];
  columns?: string[];
}

export interface FormPage {
  id: string;
  title: string;
  description?: string;
  order: number;
}

export interface FormSettings {
  allowMultipleSubmissions: boolean;
  requireLogin: boolean;
  showProgressBar: boolean;
  shuffleQuestions: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  collectEmail: boolean;
  closeDate?: string;
  maxResponses?: number;
  notifyOnSubmission: boolean;
  notifyEmails?: string[];
  formLanguage?: string;
}

export interface FormBranding {
  headerImage?: string;
  backgroundColor?: string;
  primaryColor?: string;
  font?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: string;
  textColor?: string;
  buttonColor?: string;
  buttonTextColor?: string;
}

export interface Form {
  id: string;
  workspaceId?: string;
  title: string;
  description?: string;
  slug: string;
  fields: FormField[];
  pages: FormPage[];
  settings: FormSettings;
  branding: FormBranding;
  status: FormStatus;
  publishedAt?: string;
  closedAt?: string;
  viewCount: number;
  responseCount: number;
  isDeleted: boolean;
  deletedAt?: string;
  deletedBy?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormResponse {
  id: string;
  formId: string;
  workspaceId?: string;
  respondentId?: string;
  respondentEmail?: string;
  respondentName?: string;
  responses: Record<string, { value: any; label: string }>;
  ipAddress?: string;
  userAgent?: string;
  submissionTimeSeconds?: number;
  status: string;
  isComplete: boolean;
  submittedAt: string;
  updatedAt?: string;
}

export interface CreateFormDto {
  title: string;
  description?: string;
  fields?: FormField[];
  pages?: FormPage[];
  settings?: FormSettings;
  branding?: FormBranding;
  status?: FormStatus;
}

export interface UpdateFormDto extends Partial<CreateFormDto> {}

export interface SubmitResponseDto {
  respondentEmail?: string;
  respondentName?: string;
  responses: Record<string, { value: any; label: string }>;
  submissionTimeSeconds?: number;
  isComplete?: boolean;
}

export interface CreateShareLinkDto {
  accessLevel: 'view_only' | 'respond';
  requirePassword?: boolean;
  password?: string;
  expiresAt?: string;
  maxResponses?: number;
}

export interface FormShareLink {
  id: string;
  formId: string;
  shareToken: string;
  accessLevel: string;
  requirePassword: boolean;
  expiresAt?: string;
  maxResponses?: number;
  responseCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

// Forms API
export const formsApi = {
  // Get all forms in workspace
  async getForms(workspaceId: string, status?: FormStatus): Promise<Form[]> {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<{ data: Form[] }>(`/workspaces/${workspaceId}/forms${params}`);
    return response.data;
  },

  // Create a new form
  async createForm(workspaceId: string, data: CreateFormDto): Promise<Form> {
    const response = await api.post<{ data: Form }>(`/workspaces/${workspaceId}/forms`, data);
    return response.data;
  },

  // Get a single form
  async getForm(workspaceId: string, formId: string): Promise<Form> {
    const response = await api.get<{ data: Form }>(`/workspaces/${workspaceId}/forms/${formId}`);
    return response.data;
  },

  // Update a form
  async updateForm(workspaceId: string, formId: string, data: UpdateFormDto): Promise<Form> {
    const response = await api.put<{ data: Form }>(`/workspaces/${workspaceId}/forms/${formId}`, data);
    return response.data;
  },

  // Delete a form
  async deleteForm(workspaceId: string, formId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/forms/${formId}`);
  },

  // Duplicate a form
  async duplicateForm(workspaceId: string, formId: string): Promise<Form> {
    const response = await api.post<{ data: Form }>(`/workspaces/${workspaceId}/forms/${formId}/duplicate`, {});
    return response.data;
  },

  // Publish a form
  async publishForm(workspaceId: string, formId: string): Promise<Form> {
    const response = await api.post<{ data: Form }>(`/workspaces/${workspaceId}/forms/${formId}/publish`, {});
    return response.data;
  },

  // Close a form
  async closeForm(workspaceId: string, formId: string): Promise<Form> {
    const response = await api.post<{ data: Form }>(`/workspaces/${workspaceId}/forms/${formId}/close`, {});
    return response.data;
  },

  // Share links
  async createShareLink(workspaceId: string, formId: string, data: CreateShareLinkDto): Promise<FormShareLink> {
    const response = await api.post<{ data: FormShareLink }>(`/workspaces/${workspaceId}/forms/${formId}/share`, data);
    return response.data;
  },

  async getShareLinks(workspaceId: string, formId: string): Promise<FormShareLink[]> {
    const response = await api.get<{ data: FormShareLink[] }>(`/workspaces/${workspaceId}/forms/${formId}/shares`);
    return response.data;
  },

  async deleteShareLink(workspaceId: string, shareId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/forms/shares/${shareId}`);
  },

  // Responses
  async submitResponse(workspaceId: string, formId: string, data: SubmitResponseDto): Promise<FormResponse> {
    const response = await api.post<{ data: FormResponse }>(`/workspaces/${workspaceId}/forms/${formId}/responses`, data);
    return response.data;
  },

  async getResponses(workspaceId: string, formId: string, limit = 100, offset = 0): Promise<{ data: FormResponse[]; total: number }> {
    const response = await api.get<{ data: FormResponse[]; total: number }>(`/workspaces/${workspaceId}/forms/${formId}/responses?limit=${limit}&offset=${offset}`);
    return response;
  },

  async getResponse(workspaceId: string, formId: string, responseId: string): Promise<FormResponse> {
    const response = await api.get<{ data: FormResponse }>(`/workspaces/${workspaceId}/forms/${formId}/responses/${responseId}`);
    return response.data;
  },

  async deleteResponse(workspaceId: string, formId: string, responseId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/forms/${formId}/responses/${responseId}`);
  },

  async exportResponses(workspaceId: string, formId: string): Promise<Blob> {
    // For CSV export, we need to handle the response differently
    // Use fetchWithAuth like all other API calls - it handles URL construction with /api/v1
    const response = await fetchWithAuth(`/workspaces/${workspaceId}/forms/${formId}/responses/export`, {
      method: 'GET',
    });
    return response.blob();
  },

  // Analytics
  async getAnalytics(workspaceId: string, formId: string): Promise<any> {
    const response = await api.get<{ data: any }>(`/workspaces/${workspaceId}/forms/${formId}/analytics`);
    return response.data;
  },

  async calculateAnalytics(workspaceId: string, formId: string): Promise<any> {
    const response = await api.post<{ data: any }>(`/workspaces/${workspaceId}/forms/${formId}/analytics/calculate`, {});
    return response.data;
  },

  async getSummary(workspaceId: string, formId: string): Promise<any> {
    const response = await api.get<{ data: any }>(`/workspaces/${workspaceId}/forms/${formId}/summary`);
    return response.data;
  },

  async getTimeline(workspaceId: string, formId: string, groupBy: 'day' | 'week' | 'month' = 'day'): Promise<any[]> {
    const response = await api.get<{ data: any[] }>(`/workspaces/${workspaceId}/forms/${formId}/timeline?groupBy=${groupBy}`);
    return response.data;
  },
};

// Public Forms API (no auth required)
export const publicFormsApi = {
  // Get form by slug
  async getFormBySlug(slug: string): Promise<Form> {
    const response = await api.get<{ data: Form }>(`/public/forms/${slug}`, { requireAuth: false });
    return response.data;
  },

  // Submit response to public form
  async submitPublicResponse(slug: string, data: SubmitResponseDto): Promise<FormResponse> {
    const response = await api.post<{ data: FormResponse }>(`/public/forms/${slug}/responses`, data, { requireAuth: false });
    return response.data;
  },

  // Get form by share token
  async getFormByShareToken(shareToken: string): Promise<Form> {
    const response = await api.get<{ data: Form }>(`/public/forms/share/${shareToken}`, { requireAuth: false });
    return response.data;
  },

  // Submit response via share token
  async submitShareResponse(shareToken: string, data: SubmitResponseDto): Promise<FormResponse> {
    const response = await api.post<{ data: FormResponse }>(`/public/forms/share/${shareToken}/responses`, data, { requireAuth: false });
    return response.data;
  },

  // Verify share password
  async verifySharePassword(shareToken: string, password: string): Promise<boolean> {
    const result = await api.post<{ data: { valid: boolean } }>(`/public/forms/share/${shareToken}/verify`, { password }, { requireAuth: false });
    return result.data.valid;
  },
};
