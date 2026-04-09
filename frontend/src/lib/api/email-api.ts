// src/lib/api/email-api.ts
import { api } from '@/lib/fetch';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';

// ==================== Types ====================

export type EmailProvider = 'gmail' | 'smtp_imap';

export interface EmailConnection {
  id: string;
  workspaceId: string;
  userId: string;
  provider: EmailProvider;
  emailAddress: string;
  displayName?: string;
  profilePicture?: string;
  isActive: boolean;
  notificationsEnabled: boolean;
  autoCreateEvents: boolean;
  lastSyncedAt?: string;
  createdAt: string;
}

export interface UpdateEmailConnectionSettings {
  notificationsEnabled?: boolean;
  autoCreateEvents?: boolean;
}

export interface ConnectionSettings {
  notificationsEnabled: boolean;
  autoCreateEvents: boolean;
}

// SMTP/IMAP Configuration Types
export interface SmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  password: string;
}

export interface ImapConfig {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  password: string;
}

export interface ConnectSmtpImapRequest {
  emailAddress: string;
  displayName?: string;
  smtp: SmtpConfig;
  imap: ImapConfig;
}

export interface TestSmtpImapRequest {
  smtp: SmtpConfig;
  imap: ImapConfig;
}

export interface TestConnectionResult {
  success: boolean;
  smtp: {
    success: boolean;
    message: string;
  };
  imap: {
    success: boolean;
    message: string;
  };
}

export interface AllConnectionsResponse {
  gmail: EmailConnection | null;
  smtpImap: EmailConnection | null;
}

export interface ProvidersStatus {
  gmail: boolean;
  smtpImap: boolean;
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface Email {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  from?: EmailAddress;
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  date?: string;
  internalDate: string;
  isRead: boolean;
  isStarred: boolean;
  attachments?: EmailAttachment[];
}

export interface EmailListItem {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  from?: EmailAddress;
  subject?: string;
  date?: string;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
}

export interface EmailListResponse {
  emails: EmailListItem[];
  nextPageToken?: string;
  resultSizeEstimate?: number;
}

export interface Label {
  id: string;
  name: string;
  type?: string;
  messagesTotal?: number;
  messagesUnread?: number;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: {
    filename: string;
    content: string;
    mimeType: string;
  }[];
}

export interface ReplyEmailRequest {
  body: string;
  isHtml?: boolean;
  replyAll?: boolean;
  attachments?: {
    filename: string;
    content: string;
    mimeType: string;
  }[];
}

export interface CreateDraftRequest {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  isHtml?: boolean;
  threadId?: string;
  replyToMessageId?: string;
}

export interface SendEmailResponse {
  messageId: string;
  threadId: string;
  labelIds: string[];
}

export interface DraftResponse {
  draftId: string;
  messageId: string;
  threadId?: string;
}

// ==================== Email Priority Types ====================

export type EmailPriorityLevel = 'high' | 'medium' | 'low' | 'none';

export interface EmailPriority {
  level: EmailPriorityLevel;
  score: number; // 0-10
  reason: string;
  factors: string[];
}

export interface EmailPriorityRequest {
  emails: {
    id: string;
    from?: EmailAddress;
    subject?: string;
    snippet: string;
    date?: string;
    isRead: boolean;
    hasAttachments: boolean;
  }[];
  connectionId?: string; // For storing results in backend
}

export interface GetStoredPrioritiesRequest {
  emailIds: string[];
}

export interface EmailPriorityResponse {
  priorities: {
    emailId: string;
    priority: EmailPriority;
  }[];
}

// ==================== Travel Ticket Types ====================

export type TravelType = 'flight' | 'train' | 'bus' | 'other';

export interface TravelTicketInfo {
  travelType: TravelType;
  found: boolean;
  bookingReference?: string;
  passengerName?: string;
  departureLocation?: string;
  arrivalLocation?: string;
  departureDateTime?: string;
  arrivalDateTime?: string;
  departureTimezone?: string;
  vehicleNumber?: string;
  seatInfo?: string;
  carrier?: string;
  notes?: string;
}

export interface ExtractTravelInfoRequest {
  subject: string;
  body: string;
  senderEmail?: string;
  messageId?: string;
  attachmentId?: string;
  provider?: string;
  connectionId?: string;
  mailbox?: string;
}

export interface ExtractTravelInfoResponse {
  ticketInfo: TravelTicketInfo;
  suggestedTitle: string;
  suggestedDescription: string;
}

// ==================== Query Keys ====================

export const emailKeys = {
  all: ['email'] as const,
  connection: (workspaceId: string) => [...emailKeys.all, 'connection', workspaceId] as const,
  messages: (workspaceId: string, labelId?: string, query?: string) =>
    [...emailKeys.all, 'messages', workspaceId, labelId, query] as const,
  message: (workspaceId: string, messageId: string) =>
    [...emailKeys.all, 'message', workspaceId, messageId] as const,
  labels: (workspaceId: string) => [...emailKeys.all, 'labels', workspaceId] as const,
  drafts: (workspaceId: string) => [...emailKeys.all, 'drafts', workspaceId] as const,
};

// ==================== API Response Wrapper ====================

interface ApiResponse<T> {
  data: T;
  message?: string;
}

// ==================== Service Functions ====================

export const emailService = {
  // Connection
  getAuthUrl: async (workspaceId: string, returnUrl?: string) => {
    const params = returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : '';
    return api.get<{ authorizationUrl: string }>(`/workspaces/${workspaceId}/email/auth/url${params}`);
  },

  getConnection: async (workspaceId: string) => {
    return api.get<{ connected: boolean; data?: EmailConnection }>(`/workspaces/${workspaceId}/email/connection`);
  },

  disconnect: async (workspaceId: string) => {
    return api.delete<{ success: boolean }>(`/workspaces/${workspaceId}/email/connection`);
  },

  // Messages
  getMessages: async (
    workspaceId: string,
    options?: { labelId?: string; query?: string; pageToken?: string; maxResults?: number; connectionId?: string }
  ): Promise<EmailListResponse> => {
    const params = new URLSearchParams();
    if (options?.labelId) params.set('labelId', options.labelId);
    if (options?.query) params.set('query', options.query);
    if (options?.pageToken) params.set('pageToken', options.pageToken);
    if (options?.maxResults) params.set('maxResults', options.maxResults.toString());
    if (options?.connectionId) params.set('connectionId', options.connectionId);

    const queryString = params.toString();
    const result = await api.get<ApiResponse<EmailListResponse>>(
      `/workspaces/${workspaceId}/email/messages${queryString ? `?${queryString}` : ''}`
    );
    return result.data;
  },

  getMessage: async (workspaceId: string, messageId: string, connectionId?: string): Promise<Email> => {
    const params = connectionId ? `?connectionId=${connectionId}` : '';
    const result = await api.get<ApiResponse<Email>>(`/workspaces/${workspaceId}/email/messages/${messageId}${params}`);
    return result.data;
  },

  sendEmail: async (workspaceId: string, data: SendEmailRequest, connectionId?: string): Promise<SendEmailResponse> => {
    const params = connectionId ? `?connectionId=${connectionId}` : '';
    const result = await api.post<ApiResponse<SendEmailResponse>>(`/workspaces/${workspaceId}/email/messages${params}`, data);
    return result.data;
  },

  replyToEmail: async (workspaceId: string, messageId: string, data: ReplyEmailRequest, connectionId?: string): Promise<SendEmailResponse> => {
    const params = connectionId ? `?connectionId=${connectionId}` : '';
    const result = await api.post<ApiResponse<SendEmailResponse>>(`/workspaces/${workspaceId}/email/messages/${messageId}/reply${params}`, data);
    return result.data;
  },

  // Get attachment download URL for Gmail
  getAttachmentUrl: (workspaceId: string, messageId: string, attachmentId: string, connectionId?: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const params = connectionId ? `?connectionId=${connectionId}` : '';
    return `${baseUrl}/workspaces/${workspaceId}/email/messages/${messageId}/attachments/${attachmentId}${params}`;
  },

  // Get attachment download URL for SMTP/IMAP
  getSmtpImapAttachmentUrl: (workspaceId: string, messageId: string, attachmentId: string, mailbox?: string, connectionId?: string): string => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const params = new URLSearchParams();
    if (mailbox) params.set('mailbox', mailbox);
    if (connectionId) params.set('connectionId', connectionId);
    const queryString = params.toString();
    return `${baseUrl}/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}/attachments/${attachmentId}${queryString ? `?${queryString}` : ''}`;
  },

  deleteEmail: async (workspaceId: string, messageId: string, permanent = false): Promise<void> => {
    await api.delete<void>(
      `/workspaces/${workspaceId}/email/messages/${messageId}${permanent ? '?permanent=true' : ''}`
    );
  },

  markAsRead: async (workspaceId: string, messageId: string, isRead: boolean): Promise<void> => {
    await api.patch<void>(`/workspaces/${workspaceId}/email/messages/${messageId}/read`, {
      isRead,
    });
  },

  starEmail: async (workspaceId: string, messageId: string, isStarred: boolean): Promise<void> => {
    await api.patch<void>(`/workspaces/${workspaceId}/email/messages/${messageId}/star`, {
      isStarred,
    });
  },

  updateLabels: async (
    workspaceId: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[]
  ): Promise<void> => {
    await api.patch<void>(`/workspaces/${workspaceId}/email/messages/${messageId}/labels`, {
      addLabelIds,
      removeLabelIds,
    });
  },

  // Labels
  getLabels: async (workspaceId: string): Promise<Label[]> => {
    const result = await api.get<ApiResponse<Label[]>>(`/workspaces/${workspaceId}/email/labels`);
    return result.data;
  },

  createLabel: async (
    workspaceId: string,
    name: string,
    color?: { textColor: string; backgroundColor: string }
  ): Promise<Label> => {
    const result = await api.post<ApiResponse<Label>>(`/workspaces/${workspaceId}/email/labels`, { name, color });
    return result.data;
  },

  // Drafts
  getDrafts: async (workspaceId: string, pageToken?: string) => {
    const params = pageToken ? `?pageToken=${pageToken}` : '';
    const result = await api.get<ApiResponse<DraftResponse[]>>(`/workspaces/${workspaceId}/email/drafts${params}`);
    return result.data;
  },

  createDraft: async (workspaceId: string, data: CreateDraftRequest): Promise<DraftResponse> => {
    const result = await api.post<ApiResponse<DraftResponse>>(`/workspaces/${workspaceId}/email/drafts`, data);
    return result.data;
  },

  updateDraft: async (workspaceId: string, draftId: string, data: CreateDraftRequest): Promise<DraftResponse> => {
    const result = await api.patch<ApiResponse<DraftResponse>>(`/workspaces/${workspaceId}/email/drafts/${draftId}`, data);
    return result.data;
  },

  deleteDraft: async (workspaceId: string, draftId: string): Promise<void> => {
    await api.delete<void>(`/workspaces/${workspaceId}/email/drafts/${draftId}`);
  },

  // ==================== SMTP/IMAP Functions ====================

  // Get all connections (Gmail + SMTP/IMAP) - legacy format
  getAllConnections: async (workspaceId: string) => {
    return api.get<{ data: AllConnectionsResponse; providers: ProvidersStatus }>(
      `/workspaces/${workspaceId}/email/connections`
    );
  },

  // Get all connections as array
  getAllConnectionsList: async (workspaceId: string) => {
    return api.get<{ data: EmailConnection[] }>(
      `/workspaces/${workspaceId}/email/connections/all`
    );
  },

  // Test SMTP/IMAP connection
  testSmtpImapConnection: async (workspaceId: string, data: TestSmtpImapRequest): Promise<TestConnectionResult> => {
    const result = await api.post<ApiResponse<TestConnectionResult>>(
      `/workspaces/${workspaceId}/email/smtp-imap/test`,
      data
    );
    return result.data;
  },

  // Connect SMTP/IMAP
  connectSmtpImap: async (workspaceId: string, data: ConnectSmtpImapRequest): Promise<EmailConnection> => {
    const result = await api.post<ApiResponse<EmailConnection>>(
      `/workspaces/${workspaceId}/email/smtp-imap/connect`,
      data
    );
    return result.data;
  },

  // Get SMTP/IMAP connection
  getSmtpImapConnection: async (workspaceId: string) => {
    return api.get<{ connected: boolean; data?: EmailConnection }>(
      `/workspaces/${workspaceId}/email/smtp-imap/connection`
    );
  },

  // Disconnect SMTP/IMAP
  disconnectSmtpImap: async (workspaceId: string) => {
    return api.delete<{ success: boolean }>(`/workspaces/${workspaceId}/email/smtp-imap/connection`);
  },

  // Get messages via SMTP/IMAP
  getSmtpImapMessages: async (
    workspaceId: string,
    options?: { labelId?: string; query?: string; pageToken?: string; maxResults?: number; connectionId?: string }
  ): Promise<EmailListResponse> => {
    const params = new URLSearchParams();
    if (options?.labelId) params.set('labelId', options.labelId);
    if (options?.query) params.set('query', options.query);
    if (options?.pageToken) params.set('pageToken', options.pageToken);
    if (options?.maxResults) params.set('maxResults', options.maxResults.toString());
    if (options?.connectionId) params.set('connectionId', options.connectionId);

    const queryString = params.toString();
    const result = await api.get<ApiResponse<EmailListResponse>>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages${queryString ? `?${queryString}` : ''}`
    );
    return result.data;
  },

  // Get single message via SMTP/IMAP
  getSmtpImapMessage: async (workspaceId: string, messageId: string, mailbox?: string, connectionId?: string): Promise<Email> => {
    const params = new URLSearchParams();
    if (mailbox) params.set('mailbox', mailbox);
    if (connectionId) params.set('connectionId', connectionId);
    const queryString = params.toString();
    const result = await api.get<ApiResponse<Email>>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}${queryString ? `?${queryString}` : ''}`
    );
    return result.data;
  },

  // Send email via SMTP
  sendSmtpImapEmail: async (workspaceId: string, data: SendEmailRequest, connectionId?: string): Promise<SendEmailResponse> => {
    const params = connectionId ? `?connectionId=${connectionId}` : '';
    const result = await api.post<ApiResponse<SendEmailResponse>>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages${params}`,
      data
    );
    return result.data;
  },

  // Reply to email via SMTP
  replyToSmtpImapEmail: async (
    workspaceId: string,
    messageId: string,
    data: ReplyEmailRequest,
    mailbox?: string,
    connectionId?: string
  ): Promise<SendEmailResponse> => {
    const params = new URLSearchParams();
    if (mailbox) params.set('mailbox', mailbox);
    if (connectionId) params.set('connectionId', connectionId);
    const queryString = params.toString();
    const result = await api.post<ApiResponse<SendEmailResponse>>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}/reply${queryString ? `?${queryString}` : ''}`,
      data
    );
    return result.data;
  },

  // Delete email via IMAP
  deleteSmtpImapEmail: async (
    workspaceId: string,
    messageId: string,
    mailbox?: string,
    permanent = false
  ): Promise<void> => {
    const params = new URLSearchParams();
    if (mailbox) params.set('mailbox', mailbox);
    if (permanent) params.set('permanent', 'true');
    const queryString = params.toString();
    await api.delete<void>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}${queryString ? `?${queryString}` : ''}`
    );
  },

  // Mark as read via IMAP
  markSmtpImapAsRead: async (
    workspaceId: string,
    messageId: string,
    isRead: boolean,
    mailbox?: string
  ): Promise<void> => {
    const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : '';
    await api.patch<void>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}/read${params}`,
      { isRead }
    );
  },

  // Star email via IMAP
  starSmtpImapEmail: async (
    workspaceId: string,
    messageId: string,
    isStarred: boolean,
    mailbox?: string
  ): Promise<void> => {
    const params = mailbox ? `?mailbox=${encodeURIComponent(mailbox)}` : '';
    await api.patch<void>(
      `/workspaces/${workspaceId}/email/smtp-imap/messages/${messageId}/star${params}`,
      { isStarred }
    );
  },

  // Get labels/mailboxes via IMAP
  getSmtpImapLabels: async (workspaceId: string): Promise<Label[]> => {
    const result = await api.get<ApiResponse<Label[]>>(`/workspaces/${workspaceId}/email/smtp-imap/labels`);
    return result.data;
  },

  // ==================== AI Priority Analysis ====================

  // Analyze email priorities
  analyzePriority: async (workspaceId: string, data: EmailPriorityRequest): Promise<EmailPriorityResponse> => {
    const result = await api.post<ApiResponse<EmailPriorityResponse>>(
      `/workspaces/${workspaceId}/email/analyze-priority`,
      data
    );
    return result.data;
  },

  // Get stored priorities for email IDs
  getStoredPriorities: async (workspaceId: string, data: GetStoredPrioritiesRequest): Promise<EmailPriorityResponse> => {
    const result = await api.post<ApiResponse<EmailPriorityResponse>>(
      `/workspaces/${workspaceId}/email/priorities/get`,
      data
    );
    return result.data;
  },

  // Get all stored priorities for a connection
  getPrioritiesForConnection: async (workspaceId: string, connectionId: string): Promise<EmailPriorityResponse> => {
    const result = await api.get<ApiResponse<EmailPriorityResponse>>(
      `/workspaces/${workspaceId}/email/priorities/${connectionId}`
    );
    return result.data;
  },

  // ==================== Travel Ticket Extraction ====================

  // Extract travel ticket info from email
  extractTravelInfo: async (workspaceId: string, data: ExtractTravelInfoRequest): Promise<ExtractTravelInfoResponse> => {
    const result = await api.post<ApiResponse<ExtractTravelInfoResponse>>(
      `/workspaces/${workspaceId}/email/extract-travel-info`,
      data
    );
    return result.data;
  },

  // ==================== Connection Settings ====================

  // Get connection settings
  getConnectionSettings: async (workspaceId: string, connectionId: string): Promise<ConnectionSettings> => {
    const result = await api.get<ApiResponse<ConnectionSettings>>(
      `/workspaces/${workspaceId}/email/connections/${connectionId}/settings`
    );
    return result.data;
  },

  // Update connection settings
  updateConnectionSettings: async (
    workspaceId: string,
    connectionId: string,
    settings: UpdateEmailConnectionSettings
  ): Promise<ConnectionSettings> => {
    const result = await api.patch<ApiResponse<ConnectionSettings>>(
      `/workspaces/${workspaceId}/email/connections/${connectionId}/settings`,
      settings
    );
    return result.data;
  },
};

// ==================== React Query Hooks ====================

export function useEmailConnection(workspaceId: string) {
  return useQuery({
    queryKey: emailKeys.connection(workspaceId),
    queryFn: () => emailService.getConnection(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useEmails(
  workspaceId: string,
  options?: { labelId?: string; query?: string; enabled?: boolean; connectionId?: string }
) {
  return useInfiniteQuery({
    queryKey: [...emailKeys.messages(workspaceId, options?.labelId, options?.query), options?.connectionId],
    queryFn: ({ pageParam }) =>
      emailService.getMessages(workspaceId, {
        labelId: options?.labelId,
        query: options?.query,
        pageToken: pageParam,
        maxResults: 20,
        connectionId: options?.connectionId,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken,
    enabled: options?.enabled !== false && !!workspaceId,
  });
}

export function useEmail(workspaceId: string, messageId: string, options?: { enabled?: boolean; connectionId?: string }) {
  return useQuery({
    queryKey: [...emailKeys.message(workspaceId, messageId), options?.connectionId],
    queryFn: () => emailService.getMessage(workspaceId, messageId, options?.connectionId),
    enabled: (options?.enabled !== false) && !!workspaceId && !!messageId,
  });
}

export function useLabels(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: emailKeys.labels(workspaceId),
    queryFn: () => emailService.getLabels(workspaceId),
    enabled: (options?.enabled !== false) && !!workspaceId,
  });
}

export function useDrafts(workspaceId: string) {
  return useQuery({
    queryKey: emailKeys.drafts(workspaceId),
    queryFn: () => emailService.getDrafts(workspaceId),
    enabled: !!workspaceId,
  });
}

// ==================== Mutations ====================

export function useSendEmail(workspaceId: string, connectionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendEmailRequest) => emailService.sendEmail(workspaceId, data, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.messages(workspaceId, 'SENT') });
    },
  });
}

export function useReplyToEmail(workspaceId: string, connectionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data }: { messageId: string; data: ReplyEmailRequest }) =>
      emailService.replyToEmail(workspaceId, messageId, data, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useDeleteEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, permanent }: { messageId: string; permanent?: boolean }) =>
      emailService.deleteEmail(workspaceId, messageId, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useMarkAsRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, isRead }: { messageId: string; isRead: boolean }) =>
      emailService.markAsRead(workspaceId, messageId, isRead),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useStarEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, isStarred }: { messageId: string; isStarred: boolean }) =>
      emailService.starEmail(workspaceId, messageId, isStarred),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useDisconnectEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => emailService.disconnect(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.connection(workspaceId) });
    },
  });
}

export function useCreateLabel(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      color,
    }: {
      name: string;
      color?: { textColor: string; backgroundColor: string };
    }) => emailService.createLabel(workspaceId, name, color),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.labels(workspaceId) });
    },
  });
}

export function useCreateDraft(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDraftRequest) => emailService.createDraft(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.drafts(workspaceId) });
    },
  });
}

export function useUpdateDraft(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ draftId, data }: { draftId: string; data: CreateDraftRequest }) =>
      emailService.updateDraft(workspaceId, draftId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.drafts(workspaceId) });
    },
  });
}

export function useDeleteDraft(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (draftId: string) => emailService.deleteDraft(workspaceId, draftId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.drafts(workspaceId) });
    },
  });
}

// ==================== Utility Functions ====================

export function formatEmailAddress(address: EmailAddress | undefined): string {
  if (!address) return '';
  return address.name ? `${address.name} <${address.email}>` : address.email;
}

export function parseEmailAddresses(addresses: EmailAddress[] | undefined): string {
  if (!addresses || addresses.length === 0) return '';
  return addresses.map((a) => formatEmailAddress(a)).join(', ');
}

// Standard Gmail labels
export const SYSTEM_LABELS = {
  INBOX: 'INBOX',
  SENT: 'SENT',
  DRAFT: 'DRAFT',
  STARRED: 'STARRED',
  TRASH: 'TRASH',
  SPAM: 'SPAM',
  IMPORTANT: 'IMPORTANT',
  UNREAD: 'UNREAD',
} as const;

export function getLabelDisplayName(labelId: string): string {
  const displayNames: Record<string, string> = {
    INBOX: 'Inbox',
    SENT: 'Sent',
    DRAFT: 'Drafts',
    STARRED: 'Starred',
    TRASH: 'Trash',
    SPAM: 'Spam',
    IMPORTANT: 'Important',
    CATEGORY_PERSONAL: 'Personal',
    CATEGORY_SOCIAL: 'Social',
    CATEGORY_PROMOTIONS: 'Promotions',
    CATEGORY_UPDATES: 'Updates',
    CATEGORY_FORUMS: 'Forums',
  };
  return displayNames[labelId] || labelId;
}

// ==================== SMTP/IMAP React Query Hooks ====================

export function useAllEmailConnections(workspaceId: string) {
  return useQuery({
    queryKey: [...emailKeys.all, 'all-connections', workspaceId],
    queryFn: () => emailService.getAllConnections(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useAllConnectionsList(workspaceId: string) {
  return useQuery({
    queryKey: [...emailKeys.all, 'all-connections-list', workspaceId],
    queryFn: () => emailService.getAllConnectionsList(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useSmtpImapConnection(workspaceId: string) {
  return useQuery({
    queryKey: [...emailKeys.all, 'smtp-imap-connection', workspaceId],
    queryFn: () => emailService.getSmtpImapConnection(workspaceId),
    enabled: !!workspaceId,
  });
}

export function useTestSmtpImapConnection(workspaceId: string) {
  return useMutation({
    mutationFn: (data: TestSmtpImapRequest) => emailService.testSmtpImapConnection(workspaceId, data),
  });
}

export function useConnectSmtpImap(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ConnectSmtpImapRequest) => emailService.connectSmtpImap(workspaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useDisconnectSmtpImap(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => emailService.disconnectSmtpImap(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useSmtpImapEmails(
  workspaceId: string,
  options?: { labelId?: string; query?: string; enabled?: boolean; connectionId?: string }
) {
  return useInfiniteQuery({
    queryKey: [...emailKeys.all, 'smtp-imap-messages', workspaceId, options?.labelId, options?.query, options?.connectionId],
    queryFn: ({ pageParam }) =>
      emailService.getSmtpImapMessages(workspaceId, {
        labelId: options?.labelId,
        query: options?.query,
        pageToken: pageParam,
        maxResults: 20,
        connectionId: options?.connectionId,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage?.nextPageToken,
    enabled: options?.enabled !== false && !!workspaceId,
  });
}

export function useSmtpImapEmail(
  workspaceId: string,
  messageId: string,
  mailbox?: string,
  options?: { enabled?: boolean; connectionId?: string }
) {
  return useQuery({
    queryKey: [...emailKeys.all, 'smtp-imap-message', workspaceId, messageId, mailbox, options?.connectionId],
    queryFn: () => emailService.getSmtpImapMessage(workspaceId, messageId, mailbox, options?.connectionId),
    enabled: (options?.enabled !== false) && !!workspaceId && !!messageId,
  });
}

export function useSmtpImapLabels(workspaceId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...emailKeys.all, 'smtp-imap-labels', workspaceId],
    queryFn: () => emailService.getSmtpImapLabels(workspaceId),
    enabled: (options?.enabled !== false) && !!workspaceId,
  });
}

export function useSendSmtpImapEmail(workspaceId: string, connectionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SendEmailRequest) => emailService.sendSmtpImapEmail(workspaceId, data, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useReplyToSmtpImapEmail(workspaceId: string, connectionId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, data, mailbox }: { messageId: string; data: ReplyEmailRequest; mailbox?: string }) =>
      emailService.replyToSmtpImapEmail(workspaceId, messageId, data, mailbox, connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useDeleteSmtpImapEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, mailbox, permanent }: { messageId: string; mailbox?: string; permanent?: boolean }) =>
      emailService.deleteSmtpImapEmail(workspaceId, messageId, mailbox, permanent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useMarkSmtpImapAsRead(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, isRead, mailbox }: { messageId: string; isRead: boolean; mailbox?: string }) =>
      emailService.markSmtpImapAsRead(workspaceId, messageId, isRead, mailbox),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

export function useStarSmtpImapEmail(workspaceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, isStarred, mailbox }: { messageId: string; isStarred: boolean; mailbox?: string }) =>
      emailService.starSmtpImapEmail(workspaceId, messageId, isStarred, mailbox),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.all });
    },
  });
}

// ==================== AI Priority Analysis Hooks ====================

export function useAnalyzeEmailPriority(workspaceId: string) {
  return useMutation({
    mutationFn: (data: EmailPriorityRequest) => emailService.analyzePriority(workspaceId, data),
  });
}

export function useGetPrioritiesForConnection(workspaceId: string, connectionId: string | undefined) {
  return useQuery({
    queryKey: [...emailKeys.all, 'priorities', connectionId],
    queryFn: () => emailService.getPrioritiesForConnection(workspaceId, connectionId!),
    enabled: !!workspaceId && !!connectionId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// ==================== Travel Ticket Extraction Hook ====================

export function useExtractTravelInfo(workspaceId: string) {
  return useMutation({
    mutationFn: (data: ExtractTravelInfoRequest) => emailService.extractTravelInfo(workspaceId, data),
  });
}

// ==================== Connection Settings Hooks ====================

export function useConnectionSettings(workspaceId: string, connectionId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...emailKeys.all, 'connection-settings', workspaceId, connectionId],
    queryFn: () => emailService.getConnectionSettings(workspaceId, connectionId),
    enabled: (options?.enabled !== false) && !!workspaceId && !!connectionId,
  });
}

export function useUpdateConnectionSettings(workspaceId: string, connectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: UpdateEmailConnectionSettings) =>
      emailService.updateConnectionSettings(workspaceId, connectionId, settings),
    onSuccess: () => {
      // Invalidate both the settings query and the connection query
      queryClient.invalidateQueries({ queryKey: [...emailKeys.all, 'connection-settings', workspaceId, connectionId] });
      queryClient.invalidateQueries({ queryKey: [...emailKeys.all, 'all-connections', workspaceId] });
    },
  });
}
