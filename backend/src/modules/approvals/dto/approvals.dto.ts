import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// ==================== Enums ====================

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

// ==================== Custom Field Configuration ====================

export class FieldOptionDto {
  @ApiProperty({ description: 'Option label' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Option value' })
  @IsString()
  value: string;
}

export class CustomFieldConfigDto {
  @ApiProperty({ description: 'Field ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Field label' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Field type', enum: FieldType })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({ description: 'Is field required', required: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiProperty({ description: 'Placeholder text', required: false })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiProperty({ description: 'Default value', required: false })
  @IsOptional()
  defaultValue?: any;

  @ApiProperty({ description: 'Options for select/multiselect fields', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldOptionDto)
  options?: FieldOptionDto[];

  @ApiProperty({ description: 'Display order', required: false })
  @IsOptional()
  order?: number;
}

// ==================== Request Type DTOs ====================

export class CreateRequestTypeDto {
  @ApiProperty({ description: 'Request type name', example: 'Leave Request' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Icon name (lucide icon)', required: false, example: 'calendar' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color hex code', required: false, example: '#6366f1' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    description: 'Custom fields configuration',
    type: [CustomFieldConfigDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldConfigDto)
  fieldsConfig?: CustomFieldConfigDto[];

  @ApiProperty({ description: 'Default approver user IDs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultApprovers?: string[];

  @ApiProperty({ description: 'Require all approvers to approve', required: false })
  @IsOptional()
  @IsBoolean()
  requireAllApprovers?: boolean;

  @ApiProperty({ description: 'Allow file attachments', required: false })
  @IsOptional()
  @IsBoolean()
  allowAttachments?: boolean;
}

export class UpdateRequestTypeDto {
  @ApiProperty({ description: 'Request type name', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Icon name', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'Color hex code', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Custom fields configuration', required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomFieldConfigDto)
  fieldsConfig?: CustomFieldConfigDto[];

  @ApiProperty({ description: 'Default approver user IDs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  defaultApprovers?: string[];

  @ApiProperty({ description: 'Require all approvers to approve', required: false })
  @IsOptional()
  @IsBoolean()
  requireAllApprovers?: boolean;

  @ApiProperty({ description: 'Allow file attachments', required: false })
  @IsOptional()
  @IsBoolean()
  allowAttachments?: boolean;

  @ApiProperty({ description: 'Is active', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RequestTypeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  icon: string;

  @ApiProperty()
  color: string;

  @ApiProperty()
  fieldsConfig: CustomFieldConfigDto[];

  @ApiProperty()
  defaultApprovers: string[];

  @ApiProperty()
  requireAllApprovers: boolean;

  @ApiProperty()
  allowAttachments: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ==================== Approval Request DTOs ====================

export class CreateApprovalRequestDto {
  @ApiProperty({ description: 'Request type ID' })
  @IsUUID()
  requestTypeId: string;

  @ApiProperty({ description: 'Request title', example: 'Vacation Leave - Dec 25-27' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Custom field values', required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ description: 'Attachment file IDs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({ description: 'Priority', enum: RequestPriority, required: false })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiProperty({ description: 'Due date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({ description: 'Approver user IDs (overrides default)', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  approverIds?: string[];
}

export class UpdateApprovalRequestDto {
  @ApiProperty({ description: 'Request title', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Custom field values', required: false })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiProperty({ description: 'Attachment file IDs', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiProperty({ description: 'Priority', enum: RequestPriority, required: false })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiProperty({ description: 'Due date (ISO string)', required: false })
  @IsOptional()
  @IsString()
  dueDate?: string;
}

export class ApproveRequestDto {
  @ApiProperty({ description: 'Approval comments', required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class RejectRequestDto {
  @ApiProperty({ description: 'Rejection reason' })
  @IsString()
  reason: string;

  @ApiProperty({ description: 'Additional comments', required: false })
  @IsOptional()
  @IsString()
  comments?: string;
}

export class ApproverResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  approverId: string;

  @ApiProperty()
  approverName?: string;

  @ApiProperty()
  approverEmail?: string;

  @ApiProperty()
  approverAvatar?: string;

  @ApiProperty()
  status: ApproverStatus;

  @ApiProperty()
  comments: string | null;

  @ApiProperty()
  respondedAt: string | null;

  @ApiProperty()
  order: number;
}

export class ApprovalRequestResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  requestTypeId: string;

  @ApiProperty()
  requestType?: RequestTypeResponseDto;

  @ApiProperty()
  requesterId: string;

  @ApiProperty()
  requesterName?: string;

  @ApiProperty()
  requesterEmail?: string;

  @ApiProperty()
  requesterAvatar?: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  data: Record<string, any>;

  @ApiProperty()
  attachments: string[];

  @ApiProperty()
  status: RequestStatus;

  @ApiProperty()
  priority: RequestPriority;

  @ApiProperty()
  dueDate: string | null;

  @ApiProperty()
  approvedBy: string | null;

  @ApiProperty()
  approvedAt: string | null;

  @ApiProperty()
  rejectedBy: string | null;

  @ApiProperty()
  rejectedAt: string | null;

  @ApiProperty()
  rejectionReason: string | null;

  @ApiProperty()
  cancelledAt: string | null;

  @ApiProperty()
  approvers?: ApproverResponseDto[];

  @ApiProperty()
  commentsCount?: number;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ==================== Comment DTOs ====================

export class CreateApprovalCommentDto {
  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Is internal note (only visible to approvers)', required: false })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName?: string;

  @ApiProperty()
  userEmail?: string;

  @ApiProperty()
  userAvatar?: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  isInternal: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

// ==================== Query DTOs ====================

export class ListRequestsQueryDto {
  @ApiProperty({ description: 'Filter by status', enum: RequestStatus, required: false })
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @ApiProperty({ description: 'Filter by request type ID', required: false })
  @IsOptional()
  @IsUUID()
  requestTypeId?: string;

  @ApiProperty({ description: 'Filter by requester ID', required: false })
  @IsOptional()
  @IsString()
  requesterId?: string;

  @ApiProperty({ description: 'Filter by priority', enum: RequestPriority, required: false })
  @IsOptional()
  @IsEnum(RequestPriority)
  priority?: RequestPriority;

  @ApiProperty({ description: 'Only show requests pending my approval', required: false })
  @IsOptional()
  @IsBoolean()
  pendingMyApproval?: boolean;

  @ApiProperty({ description: 'Page number', required: false })
  @IsOptional()
  page?: number;

  @ApiProperty({ description: 'Items per page', required: false })
  @IsOptional()
  limit?: number;
}

// ==================== Stats DTOs ====================

export class ApprovalStatsDto {
  @ApiProperty()
  totalRequests: number;

  @ApiProperty()
  pendingRequests: number;

  @ApiProperty()
  approvedRequests: number;

  @ApiProperty()
  rejectedRequests: number;

  @ApiProperty()
  pendingMyApproval: number;

  @ApiProperty()
  myRequests: number;

  @ApiProperty()
  averageApprovalTime: number; // in hours

  @ApiProperty()
  requestsByType: { typeId: string; typeName: string; count: number }[];
}
