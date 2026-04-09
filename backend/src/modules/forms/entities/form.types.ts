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

export enum ResponseStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
}

export enum ShareAccessLevel {
  VIEW_ONLY = 'view_only',
  RESPOND = 'respond',
}

export enum NotificationEventType {
  NEW_RESPONSE = 'new_response',
  FORM_CLOSED = 'form_closed',
  RESPONSE_LIMIT_REACHED = 'response_limit_reached',
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  errorMessage?: string;
}

export interface FieldScale {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
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
  validation?: FieldValidation;
  options?: string[];
  allowOther?: boolean;
  maxFiles?: number;
  allowedFileTypes?: string[];
  scale?: FieldScale;
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
}

export interface FormBranding {
  headerImage?: string;
  backgroundColor?: string;
  primaryColor?: string;
  font?: string;
}

export interface FormTemplate {
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
  publishedAt?: Date;
  closedAt?: Date;
  viewCount: number;
  responseCount: number;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
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
  status: ResponseStatus;
  isComplete: boolean;
  submittedAt: Date;
  updatedAt?: Date;
}

export interface FormFileUpload {
  id: string;
  formId: string;
  responseId: string;
  fieldId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface FormShareLink {
  id: string;
  formId: string;
  shareToken: string;
  accessLevel: ShareAccessLevel;
  requirePassword: boolean;
  passwordHash?: string;
  expiresAt?: Date;
  maxResponses?: number;
  responseCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
}

export interface FormAnalytics {
  id: string;
  formId: string;
  totalViews: number;
  totalResponses: number;
  completionRate: number;
  avgCompletionTimeSeconds?: number;
  fieldStats: Record<string, any>;
  lastCalculatedAt: Date;
  updatedAt: Date;
}
