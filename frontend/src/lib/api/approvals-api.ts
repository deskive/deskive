import { api } from '@/lib/fetch';

// ==================== Types ====================

export enum RequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum RequestPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum ApproverStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum FieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  CHECKBOX = 'checkbox',
  FILE = 'file',
  USER = 'user',
  CURRENCY = 'currency',
}

export interface FieldOption {
  label: string;
  value: string;
}

export interface CustomFieldConfig {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: FieldOption[];
  order?: number;
}

export interface RequestType {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  fieldsConfig: CustomFieldConfig[];
  defaultApprovers: string[];
  requireAllApprovers: boolean;
  allowAttachments: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Approver {
  id: string;
  approverId: string;
  approverName?: string;
  approverEmail?: string;
  approverAvatar?: string;
  status: ApproverStatus;
  comments: string | null;
  respondedAt: string | null;
  order: number;
}

export interface ApprovalRequest {
  id: string;
  workspaceId: string;
  requestTypeId: string;
  requestType?: RequestType;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterAvatar?: string;
  title: string;
  description: string | null;
  data: Record<string, any>;
  attachments: string[];
  status: RequestStatus;
  priority: RequestPriority;
  dueDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  cancelledAt: string | null;
  approvers?: Approver[];
  commentsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  requestId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovalStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  pendingMyApproval: number;
  myRequests: number;
  averageApprovalTime: number;
  requestsByType: { typeId: string; typeName: string; count: number }[];
}

// ==================== Request Type DTOs ====================

export interface CreateRequestTypeDto {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  fieldsConfig?: CustomFieldConfig[];
  defaultApprovers?: string[];
  requireAllApprovers?: boolean;
  allowAttachments?: boolean;
}

export interface UpdateRequestTypeDto {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  fieldsConfig?: CustomFieldConfig[];
  defaultApprovers?: string[];
  requireAllApprovers?: boolean;
  allowAttachments?: boolean;
  isActive?: boolean;
}

// ==================== Approval Request DTOs ====================

export interface CreateApprovalRequestDto {
  requestTypeId: string;
  title: string;
  description?: string;
  data?: Record<string, any>;
  attachments?: string[];
  priority?: RequestPriority;
  dueDate?: string;
  approverIds?: string[];
}

export interface UpdateApprovalRequestDto {
  title?: string;
  description?: string;
  data?: Record<string, any>;
  attachments?: string[];
  priority?: RequestPriority;
  dueDate?: string;
}

export interface ApproveRequestDto {
  comments?: string;
}

export interface RejectRequestDto {
  reason: string;
  comments?: string;
}

export interface CreateCommentDto {
  content: string;
  isInternal?: boolean;
}

export interface ListRequestsQuery {
  status?: RequestStatus;
  requestTypeId?: string;
  requesterId?: string;
  priority?: RequestPriority;
  pendingMyApproval?: boolean;
  page?: number;
  limit?: number;
}

// ==================== API Functions ====================

export const approvalsApi = {
  // Request Types
  async createRequestType(workspaceId: string, dto: CreateRequestTypeDto): Promise<RequestType> {
    return api.post<RequestType>(`/workspaces/${workspaceId}/approvals/types`, dto);
  },

  async getRequestTypes(workspaceId: string): Promise<RequestType[]> {
    return api.get<RequestType[]>(`/workspaces/${workspaceId}/approvals/types`);
  },

  async getRequestType(workspaceId: string, typeId: string): Promise<RequestType> {
    return api.get<RequestType>(`/workspaces/${workspaceId}/approvals/types/${typeId}`);
  },

  async updateRequestType(workspaceId: string, typeId: string, dto: UpdateRequestTypeDto): Promise<RequestType> {
    return api.patch<RequestType>(`/workspaces/${workspaceId}/approvals/types/${typeId}`, dto);
  },

  async deleteRequestType(workspaceId: string, typeId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/approvals/types/${typeId}`);
  },

  // Approval Requests
  async createRequest(workspaceId: string, dto: CreateApprovalRequestDto): Promise<ApprovalRequest> {
    return api.post<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests`, dto);
  },

  async getRequests(workspaceId: string, query?: ListRequestsQuery): Promise<{ requests: ApprovalRequest[]; total: number }> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    return api.get<{ requests: ApprovalRequest[]; total: number }>(`/workspaces/${workspaceId}/approvals/requests?${params.toString()}`);
  },

  async getRequest(workspaceId: string, requestId: string): Promise<ApprovalRequest> {
    return api.get<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests/${requestId}`);
  },

  async updateRequest(workspaceId: string, requestId: string, dto: UpdateApprovalRequestDto): Promise<ApprovalRequest> {
    return api.patch<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests/${requestId}`, dto);
  },

  async approveRequest(workspaceId: string, requestId: string, dto?: ApproveRequestDto): Promise<ApprovalRequest> {
    return api.post<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests/${requestId}/approve`, dto || {});
  },

  async rejectRequest(workspaceId: string, requestId: string, dto: RejectRequestDto): Promise<ApprovalRequest> {
    return api.post<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests/${requestId}/reject`, dto);
  },

  async cancelRequest(workspaceId: string, requestId: string): Promise<ApprovalRequest> {
    return api.post<ApprovalRequest>(`/workspaces/${workspaceId}/approvals/requests/${requestId}/cancel`, {});
  },

  async deleteRequest(workspaceId: string, requestId: string): Promise<void> {
    return api.delete<void>(`/workspaces/${workspaceId}/approvals/requests/${requestId}`);
  },

  // Comments
  async addComment(workspaceId: string, requestId: string, dto: CreateCommentDto): Promise<Comment> {
    return api.post<Comment>(`/workspaces/${workspaceId}/approvals/requests/${requestId}/comments`, dto);
  },

  async getComments(workspaceId: string, requestId: string): Promise<Comment[]> {
    return api.get<Comment[]>(`/workspaces/${workspaceId}/approvals/requests/${requestId}/comments`);
  },

  async deleteComment(workspaceId: string, requestId: string, commentId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/approvals/requests/${requestId}/comments/${commentId}`);
  },

  // Stats
  async getStats(workspaceId: string): Promise<ApprovalStats> {
    return api.get<ApprovalStats>(`/workspaces/${workspaceId}/approvals/stats`);
  },
};

export default approvalsApi;
