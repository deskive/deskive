import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { NotificationsService } from '../notifications/notifications.service';
import { GoogleSheetsService } from '../integration-framework/google-sheets/google-sheets.service';
import { AppGateway } from '../../common/gateways/app.gateway';
import { BudgetService } from '../budget/budget.service';
import { NotificationType, NotificationPriority } from '../notifications/dto';
import {
  CreateRequestTypeDto,
  UpdateRequestTypeDto,
  CreateApprovalRequestDto,
  UpdateApprovalRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  CreateApprovalCommentDto,
  ListRequestsQueryDto,
  RequestStatus,
  ApproverStatus,
  RequestTypeResponseDto,
  ApprovalRequestResponseDto,
  ApproverResponseDto,
  CommentResponseDto,
  ApprovalStatsDto,
} from './dto/approvals.dto';

@Injectable()
export class ApprovalsService {
  private readonly logger = new Logger(ApprovalsService.name);

  constructor(
    private readonly db: DatabaseService,
    private notificationsService: NotificationsService,
    private googleSheetsService: GoogleSheetsService,
    @Inject(forwardRef(() => AppGateway))
    private appGateway: AppGateway,
    @Inject(forwardRef(() => BudgetService))
    private budgetService: BudgetService,
  ) {}

  // ==================== Helper Methods ====================

  private async isOwnerOrAdmin(workspaceId: string, userId: string): Promise<boolean> {
    const memberResult = await this.db
      .table('workspace_members')
      .select('role')
      .where('workspace_id', '=', workspaceId)
      .where('user_id', '=', userId)
      .execute();

    const members = memberResult.data || [];
    if (members.length === 0) return false;

    const role = members[0].role?.toLowerCase();
    return role === 'owner' || role === 'admin';
  }

  // ==================== Request Types ====================

  async createRequestType(
    workspaceId: string,
    dto: CreateRequestTypeDto,
    userId: string,
  ): Promise<RequestTypeResponseDto> {
    const data = {
      workspace_id: workspaceId,
      name: dto.name,
      description: dto.description || null,
      icon: dto.icon || 'file-text',
      color: dto.color || '#6366f1',
      fields_config: dto.fieldsConfig ? JSON.stringify(dto.fieldsConfig) : '[]',
      default_approvers: dto.defaultApprovers ? JSON.stringify(dto.defaultApprovers) : '[]',
      require_all_approvers: dto.requireAllApprovers ?? false,
      allow_attachments: dto.allowAttachments ?? true,
      is_active: true,
      created_by: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await this.db.insert('request_types', data);
    return this.mapRequestType(result);
  }

  async getRequestTypes(workspaceId: string): Promise<RequestTypeResponseDto[]> {
    const result = await this.db
      .table('request_types')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .where('is_active', '=', true)
      .orderBy('created_at', 'asc')
      .execute();

    const results = result.data || [];
    return results.map((r: any) => this.mapRequestType(r));
  }

  async getRequestType(
    workspaceId: string,
    requestTypeId: string,
  ): Promise<RequestTypeResponseDto> {
    const result = await this.db
      .table('request_types')
      .select('*')
      .where('id', '=', requestTypeId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const results = result.data || [];
    if (results.length === 0) {
      throw new NotFoundException('Request type not found');
    }

    return this.mapRequestType(results[0]);
  }

  async updateRequestType(
    workspaceId: string,
    requestTypeId: string,
    dto: UpdateRequestTypeDto,
  ): Promise<RequestTypeResponseDto> {
    await this.getRequestType(workspaceId, requestTypeId);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.icon !== undefined) updateData.icon = dto.icon;
    if (dto.color !== undefined) updateData.color = dto.color;
    if (dto.fieldsConfig !== undefined) updateData.fields_config = JSON.stringify(dto.fieldsConfig);
    if (dto.defaultApprovers !== undefined)
      updateData.default_approvers = JSON.stringify(dto.defaultApprovers);
    if (dto.requireAllApprovers !== undefined)
      updateData.require_all_approvers = dto.requireAllApprovers;
    if (dto.allowAttachments !== undefined) updateData.allow_attachments = dto.allowAttachments;
    if (dto.isActive !== undefined) updateData.is_active = dto.isActive;

    const result = await this.db.update('request_types', requestTypeId, updateData);
    return this.mapRequestType(result);
  }

  async deleteRequestType(workspaceId: string, requestTypeId: string): Promise<void> {
    await this.getRequestType(workspaceId, requestTypeId);

    // Soft delete by setting is_active to false
    await this.db.update('request_types', requestTypeId, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });
  }

  // ==================== Approval Requests ====================

  async createApprovalRequest(
    workspaceId: string,
    dto: CreateApprovalRequestDto,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    // Get request type for default approvers
    const requestType = await this.getRequestType(workspaceId, dto.requestTypeId);

    const data = {
      workspace_id: workspaceId,
      request_type_id: dto.requestTypeId,
      requester_id: userId,
      title: dto.title,
      description: dto.description || null,
      data: dto.data ? JSON.stringify(dto.data) : '{}',
      attachments: dto.attachments ? JSON.stringify(dto.attachments) : '[]',
      status: RequestStatus.PENDING,
      priority: dto.priority || 'normal',
      due_date: dto.dueDate || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await this.db.insert('approval_requests', data);

    // Determine approvers
    const approverIds =
      dto.approverIds && dto.approverIds.length > 0
        ? dto.approverIds
        : requestType.defaultApprovers;

    // Create approver records
    for (let i = 0; i < approverIds.length; i++) {
      await this.db.insert('approval_request_approvers', {
        request_id: result.id,
        approver_id: approverIds[i],
        status: ApproverStatus.PENDING,
        sort_order: i + 1,
        created_at: new Date().toISOString(),
      });

      // Send notification to approver
      try {
        await this.notificationsService.sendNotification({
          user_id: approverIds[i],
          type: NotificationType.TASKS,
          title: 'New Approval Request',
          message: `You have a new approval request: "${dto.title}"`,
          action_url: `/workspaces/${workspaceId}/approvals/${result.id}`,
          priority:
            dto.priority === 'urgent' ? NotificationPriority.HIGH : NotificationPriority.NORMAL,
          send_push: true,
          data: {
            category: 'approvals',
            entity_type: 'approval_request',
            entity_id: result.id,
            actor_id: userId,
            request_title: dto.title,
            workspace_id: workspaceId,
            action: 'approval_requested',
          },
        });
      } catch (error) {
        console.error('Failed to send approval notification:', error);
      }
    }

    // Export to Google Sheets (async, don't block the request)
    this.exportRequestToGoogleSheets(workspaceId, result.id, requestType, dto, userId).catch(
      (error) => {
        this.logger.warn(`Failed to export request to Google Sheets: ${error.message}`);
      },
    );

    // Get the full request with approvers for the response and WebSocket event
    const createdRequest = await this.getApprovalRequest(workspaceId, result.id, userId);

    // Emit WebSocket event for real-time update
    this.emitApprovalRequestCreated(workspaceId, createdRequest, approverIds, userId);

    return createdRequest;
  }

  /**
   * Export approval request to Google Sheets
   * Creates a spreadsheet if needed, creates a sheet for the request type if needed,
   * and appends the request data as a new row
   */
  private async exportRequestToGoogleSheets(
    workspaceId: string,
    requestId: string,
    requestType: RequestTypeResponseDto,
    dto: CreateApprovalRequestDto,
    requesterId: string,
  ): Promise<void> {
    this.logger.log(
      `[Google Sheets Export] Starting export for request ${requestId} in workspace ${workspaceId}`,
    );

    try {
      // Get any active Google Sheets connection for this workspace
      const connectionResult = await this.googleSheetsService.getWorkspaceConnection(workspaceId);
      if (!connectionResult) {
        this.logger.log(
          `[Google Sheets Export] No active Google Sheets connection found for workspace ${workspaceId}, skipping export`,
        );
        return;
      }

      this.logger.log(
        `[Google Sheets Export] Found connection for user ${connectionResult.userId}, email: ${connectionResult.connection.googleEmail}`,
      );
      const connectedUserId = connectionResult.userId;

      // Get workspace name for spreadsheet title
      const workspaceResult = await this.db
        .table('workspaces')
        .select('name')
        .where('id', '=', workspaceId)
        .execute();

      const workspaceName = workspaceResult.data?.[0]?.name || 'Workspace';

      // Get or create the approval spreadsheet for this workspace
      let spreadsheetId = await this.getApprovalSpreadsheetId(workspaceId);
      this.logger.log(`[Google Sheets Export] Existing spreadsheet ID: ${spreadsheetId || 'none'}`);

      if (!spreadsheetId) {
        // Create new spreadsheet
        this.logger.log(
          `[Google Sheets Export] Creating new spreadsheet for workspace: ${workspaceName}`,
        );
        const spreadsheet = await this.googleSheetsService.createSpreadsheet(
          connectedUserId,
          workspaceId,
          `Deskive Approvals - ${workspaceName}`,
          ['Sheet1'], // Default sheet, will be renamed or we'll add new sheets
        );
        spreadsheetId = spreadsheet.spreadsheetId;
        this.logger.log(`[Google Sheets Export] Created spreadsheet with ID: ${spreadsheetId}`);

        // Store the spreadsheet ID
        await this.saveApprovalSpreadsheetId(workspaceId, spreadsheetId);
      }

      // Get requester info (name and email)
      let requesterName = '';
      let requesterEmail = '';
      try {
        const requesterProfile = await this.db.getUserById(requesterId);
        if (requesterProfile) {
          requesterName = requesterProfile.name || (requesterProfile as any).fullName || '';
          requesterEmail = requesterProfile.email || '';
        }
      } catch (error) {
        this.logger.warn(`[Google Sheets Export] Failed to get requester info: ${error.message}`);
      }

      // Get or create sheet for this request type
      const sheetName = this.sanitizeSheetName(requestType.name);
      const headers = [
        'Request ID',
        'Title',
        'Description',
        'Status',
        'Priority',
        'Due Date',
        'Requester Name',
        'Requester Email',
        'Created At',
        ...this.getCustomFieldHeaders(requestType.fieldsConfig || []),
      ];

      this.logger.log(`[Google Sheets Export] Getting or creating sheet: ${sheetName}`);
      await this.googleSheetsService.getOrCreateSheet(
        connectedUserId,
        workspaceId,
        spreadsheetId,
        sheetName,
        headers,
      );

      // Prepare row data
      const customFieldValues = this.getCustomFieldValues(
        requestType.fieldsConfig || [],
        dto.data || {},
      );
      const rowData = [
        requestId,
        dto.title,
        dto.description || '',
        RequestStatus.PENDING,
        dto.priority || 'normal',
        dto.dueDate || '',
        requesterName,
        requesterEmail,
        new Date().toISOString(),
        ...customFieldValues,
      ];

      // Append row
      this.logger.log(`[Google Sheets Export] Appending row to sheet: ${sheetName}`);
      await this.googleSheetsService.appendRow(
        connectedUserId,
        workspaceId,
        spreadsheetId,
        sheetName,
        [rowData],
      );

      this.logger.log(
        `[Google Sheets Export] Successfully exported request ${requestId} to Google Sheets`,
      );
    } catch (error) {
      this.logger.error(
        `[Google Sheets Export] Failed to export request ${requestId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is a non-critical operation
    }
  }

  /**
   * Get the approval spreadsheet ID for a workspace
   */
  private async getApprovalSpreadsheetId(workspaceId: string): Promise<string | null> {
    const result = await this.db
      .table('workspace_settings')
      .select('value')
      .where('workspace_id', '=', workspaceId)
      .where('key', '=', 'approval_spreadsheet_id')
      .execute();

    return result.data?.[0]?.value || null;
  }

  /**
   * Save the approval spreadsheet ID for a workspace
   */
  private async saveApprovalSpreadsheetId(
    workspaceId: string,
    spreadsheetId: string,
  ): Promise<void> {
    // Check if setting exists
    const existing = await this.db
      .table('workspace_settings')
      .select('id')
      .where('workspace_id', '=', workspaceId)
      .where('key', '=', 'approval_spreadsheet_id')
      .execute();

    if (existing.data?.[0]) {
      await this.db.update('workspace_settings', existing.data[0].id, {
        value: spreadsheetId,
        updated_at: new Date().toISOString(),
      });
    } else {
      await this.db.insert('workspace_settings', {
        workspace_id: workspaceId,
        key: 'approval_spreadsheet_id',
        value: spreadsheetId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Sanitize sheet name (Google Sheets has restrictions)
   */
  private sanitizeSheetName(name: string): string {
    // Remove invalid characters and limit length
    return (
      name
        .replace(/[\\/*?:[\]]/g, '') // Remove invalid chars
        .substring(0, 100) // Max 100 chars
        .trim() || 'Requests'
    );
  }

  /**
   * Get headers from custom field config
   */
  private getCustomFieldHeaders(fieldsConfig: any[]): string[] {
    return fieldsConfig.map((field) => field.label || field.id);
  }

  /**
   * Get values from custom field data matching the field config order
   */
  private getCustomFieldValues(fieldsConfig: any[], data: Record<string, any>): string[] {
    return fieldsConfig.map((field) => {
      const value = data[field.id];
      if (value === undefined || value === null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    });
  }

  /**
   * Update the status of an approval request in Google Sheets
   * Finds the row by Request ID and updates the Status column
   */
  private async updateRequestStatusInGoogleSheets(
    workspaceId: string,
    requestId: string,
    requestTypeName: string,
    newStatus: RequestStatus,
  ): Promise<void> {
    this.logger.log(
      `[Google Sheets Update] Starting status update for request ${requestId} to ${newStatus}`,
    );

    try {
      // Get any active Google Sheets connection for this workspace
      const connectionResult = await this.googleSheetsService.getWorkspaceConnection(workspaceId);
      if (!connectionResult) {
        this.logger.log(
          `[Google Sheets Update] No active Google Sheets connection found for workspace ${workspaceId}, skipping update`,
        );
        return;
      }

      const connectedUserId = connectionResult.userId;

      // Get the approval spreadsheet ID for this workspace
      const spreadsheetId = await this.getApprovalSpreadsheetId(workspaceId);
      if (!spreadsheetId) {
        this.logger.log(
          `[Google Sheets Update] No spreadsheet found for workspace ${workspaceId}, skipping update`,
        );
        return;
      }

      // Get the sheet name for this request type
      const sheetName = this.sanitizeSheetName(requestTypeName);

      // Update the row using appendOrUpdateRow with match on Request ID
      await this.googleSheetsService.appendOrUpdateRow(
        connectedUserId,
        workspaceId,
        spreadsheetId,
        sheetName,
        {
          'Request ID': requestId,
          Status: newStatus,
        },
        {
          columnToMatchOn: 'Request ID',
          valueToMatch: requestId,
          appendIfNotFound: false, // Don't append if not found, just skip
        },
      );

      this.logger.log(
        `[Google Sheets Update] Successfully updated status for request ${requestId} to ${newStatus}`,
      );
    } catch (error) {
      this.logger.error(
        `[Google Sheets Update] Failed to update status for request ${requestId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - this is a non-critical operation
    }
  }

  async getApprovalRequests(
    workspaceId: string,
    query: ListRequestsQueryDto,
    userId: string,
  ): Promise<{ requests: ApprovalRequestResponseDto[]; total: number }> {
    let queryBuilder = this.db
      .table('approval_requests')
      .select('*')
      .where('workspace_id', '=', workspaceId);

    if (query.status) {
      queryBuilder = queryBuilder.where('status', '=', query.status);
    }

    if (query.requestTypeId) {
      queryBuilder = queryBuilder.where('request_type_id', '=', query.requestTypeId);
    }

    if (query.requesterId) {
      queryBuilder = queryBuilder.where('requester_id', '=', query.requesterId);
    }

    if (query.priority) {
      queryBuilder = queryBuilder.where('priority', '=', query.priority);
    }

    queryBuilder = queryBuilder.orderBy('created_at', 'desc');

    const limit = query.limit || 20;
    const offset = ((query.page || 1) - 1) * limit;

    queryBuilder = queryBuilder.limit(limit).offset(offset);

    const queryResult = await queryBuilder.execute();
    let results = queryResult.data || [];

    // Filter by pending my approval if requested
    if (query.pendingMyApproval) {
      const approverResult = await this.db
        .table('approval_request_approvers')
        .select('request_id')
        .where('approver_id', '=', userId)
        .where('status', '=', ApproverStatus.PENDING)
        .execute();

      const approverRecords = approverResult.data || [];
      const pendingRequestIds = approverRecords.map((a: any) => a.request_id);
      results = results.filter((r: any) => pendingRequestIds.includes(r.id));
    }

    const mappedResults = await Promise.all(
      results.map((r: any) => this.mapApprovalRequest(r, workspaceId)),
    );

    return {
      requests: mappedResults,
      total: mappedResults.length,
    };
  }

  async getApprovalRequest(
    workspaceId: string,
    requestId: string,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const result = await this.db
      .table('approval_requests')
      .select('*')
      .where('id', '=', requestId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const results = result.data || [];
    if (results.length === 0) {
      throw new NotFoundException('Approval request not found');
    }

    return this.mapApprovalRequest(results[0], workspaceId);
  }

  async updateApprovalRequest(
    workspaceId: string,
    requestId: string,
    dto: UpdateApprovalRequestDto,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can update this request');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Cannot update a request that is not pending');
    }

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.data !== undefined) updateData.data = JSON.stringify(dto.data);
    if (dto.attachments !== undefined) updateData.attachments = JSON.stringify(dto.attachments);
    if (dto.priority !== undefined) updateData.priority = dto.priority;
    if (dto.dueDate !== undefined) updateData.due_date = dto.dueDate;

    await this.db.update('approval_requests', requestId, updateData);
    return this.getApprovalRequest(workspaceId, requestId, userId);
  }

  async approveRequest(
    workspaceId: string,
    requestId: string,
    dto: ApproveRequestDto,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('This request is not pending');
    }

    // Check if user is owner/admin (they can approve any request)
    const isAdmin = await this.isOwnerOrAdmin(workspaceId, userId);

    // Check if user is an explicit approver
    const approverResult = await this.db
      .table('approval_request_approvers')
      .select('*')
      .where('request_id', '=', requestId)
      .where('approver_id', '=', userId)
      .execute();

    const approverResults = approverResult.data || [];
    const approver = approverResults.length > 0 ? approverResults[0] : null;

    // Must be either admin/owner OR an explicit approver
    if (!isAdmin && !approver) {
      throw new ForbiddenException('You are not an approver for this request');
    }

    // If explicit approver, check if they already responded
    if (approver && approver.status !== ApproverStatus.PENDING) {
      throw new BadRequestException('You have already responded to this request');
    }

    // Update approver status if user is an explicit approver
    if (approver) {
      await this.db.update('approval_request_approvers', approver.id, {
        status: ApproverStatus.APPROVED,
        comments: dto.comments || null,
        responded_at: new Date().toISOString(),
      });
    }

    // Determine if request should be marked as approved
    let shouldApprove = false;

    // Admins can directly approve without checking other approvers
    if (isAdmin && !approver) {
      shouldApprove = true;
    } else {
      // Check if all approvers have approved or if only one is needed
      const allApproversResult = await this.db
        .table('approval_request_approvers')
        .select('*')
        .where('request_id', '=', requestId)
        .execute();

      const allApprovers = allApproversResult.data || [];

      const requestType = await this.getRequestType(workspaceId, request.requestTypeId);
      const requireAll = requestType.requireAllApprovers;

      const allApproved = allApprovers.every((a: any) => a.status === ApproverStatus.APPROVED);
      const anyApproved = allApprovers.some((a: any) => a.status === ApproverStatus.APPROVED);

      shouldApprove = (!requireAll && anyApproved) || allApproved;
    }

    if (shouldApprove) {
      // Mark request as approved
      await this.db.update('approval_requests', requestId, {
        status: RequestStatus.APPROVED,
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Handle expense approval if this is a Budget Expense Approval
      if (request.requestType?.name === 'Budget Expense Approval' && request.data?.expenseId) {
        try {
          await this.budgetService.handleExpenseApproval(
            workspaceId,
            request.data.expenseId,
            userId,
          );
          this.logger.log(
            `Expense ${request.data.expenseId} approved via approval request ${requestId}`,
          );
        } catch (error) {
          this.logger.error(`Failed to approve expense ${request.data.expenseId}:`, error);
        }
      }

      // Notify requester
      try {
        await this.notificationsService.sendNotification({
          user_id: request.requesterId,
          type: NotificationType.TASKS,
          title: 'Request Approved',
          message: `Your request "${request.title}" has been approved`,
          action_url: `/workspaces/${workspaceId}/approvals/${requestId}`,
          priority: NotificationPriority.NORMAL,
          send_push: true,
          data: {
            category: 'approvals',
            entity_type: 'approval_request',
            entity_id: requestId,
            actor_id: userId,
            request_title: request.title,
            workspace_id: workspaceId,
            action: 'request_approved',
          },
        });
      } catch (error) {
        console.error('Failed to send approval notification:', error);
      }

      // Update status in Google Sheets (async, don't block the request)
      if (request.requestType?.name) {
        this.updateRequestStatusInGoogleSheets(
          workspaceId,
          requestId,
          request.requestType.name,
          RequestStatus.APPROVED,
        ).catch((error) => {
          this.logger.warn(`Failed to update Google Sheets status: ${error.message}`);
        });
      }

      // Emit WebSocket event for real-time status update
      this.emitApprovalStatusUpdate(
        workspaceId,
        requestId,
        request,
        RequestStatus.APPROVED,
        userId,
      );
    }

    return this.getApprovalRequest(workspaceId, requestId, userId);
  }

  async rejectRequest(
    workspaceId: string,
    requestId: string,
    dto: RejectRequestDto,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('This request is not pending');
    }

    // Check if user is owner/admin (they can reject any request)
    const isAdmin = await this.isOwnerOrAdmin(workspaceId, userId);

    // Check if user is an explicit approver
    const rejectApproverResult = await this.db
      .table('approval_request_approvers')
      .select('*')
      .where('request_id', '=', requestId)
      .where('approver_id', '=', userId)
      .execute();

    const rejectApproverResults = rejectApproverResult.data || [];
    const approver = rejectApproverResults.length > 0 ? rejectApproverResults[0] : null;

    // Must be either admin/owner OR an explicit approver
    if (!isAdmin && !approver) {
      throw new ForbiddenException('You are not an approver for this request');
    }

    // If explicit approver, check if they already responded
    if (approver && approver.status !== ApproverStatus.PENDING) {
      throw new BadRequestException('You have already responded to this request');
    }

    // Update approver status if user is an explicit approver
    if (approver) {
      await this.db.update('approval_request_approvers', approver.id, {
        status: ApproverStatus.REJECTED,
        comments: dto.comments || null,
        responded_at: new Date().toISOString(),
      });
    }

    // Mark request as rejected
    await this.db.update('approval_requests', requestId, {
      status: RequestStatus.REJECTED,
      rejected_by: userId,
      rejected_at: new Date().toISOString(),
      rejection_reason: dto.reason,
      updated_at: new Date().toISOString(),
    });

    // Handle expense rejection if this is a Budget Expense Approval
    if (request.requestType?.name === 'Budget Expense Approval' && request.data?.expenseId) {
      try {
        await this.budgetService.handleExpenseRejection(
          workspaceId,
          request.data.expenseId,
          dto.reason,
        );
        this.logger.log(
          `Expense ${request.data.expenseId} rejected via approval request ${requestId}`,
        );
      } catch (error) {
        this.logger.error(`Failed to reject expense ${request.data.expenseId}:`, error);
      }
    }

    // Notify requester
    try {
      await this.notificationsService.sendNotification({
        user_id: request.requesterId,
        type: NotificationType.TASKS,
        title: 'Request Rejected',
        message: `Your request "${request.title}" has been rejected`,
        action_url: `/workspaces/${workspaceId}/approvals/${requestId}`,
        priority: NotificationPriority.NORMAL,
        send_push: true,
        data: {
          category: 'approvals',
          entity_type: 'approval_request',
          entity_id: requestId,
          actor_id: userId,
          request_title: request.title,
          workspace_id: workspaceId,
          action: 'request_rejected',
          rejection_reason: dto.reason,
        },
      });
    } catch (error) {
      console.error('Failed to send rejection notification:', error);
    }

    // Update status in Google Sheets (async, don't block the request)
    if (request.requestType?.name) {
      this.updateRequestStatusInGoogleSheets(
        workspaceId,
        requestId,
        request.requestType.name,
        RequestStatus.REJECTED,
      ).catch((error) => {
        this.logger.warn(`Failed to update Google Sheets status: ${error.message}`);
      });
    }

    // Emit WebSocket event for real-time status update
    this.emitApprovalStatusUpdate(
      workspaceId,
      requestId,
      request,
      RequestStatus.REJECTED,
      userId,
      dto.reason,
    );

    return this.getApprovalRequest(workspaceId, requestId, userId);
  }

  async cancelRequest(
    workspaceId: string,
    requestId: string,
    userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    if (request.requesterId !== userId) {
      throw new ForbiddenException('Only the requester can cancel this request');
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Cannot cancel a request that is not pending');
    }

    await this.db.update('approval_requests', requestId, {
      status: RequestStatus.CANCELLED,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Notify approvers that the request was cancelled
    if (request.approvers) {
      for (const approver of request.approvers) {
        if (approver.approverId && approver.status === ApproverStatus.PENDING) {
          try {
            await this.notificationsService.sendNotification({
              user_id: approver.approverId,
              type: NotificationType.TASKS,
              title: 'Request Cancelled',
              message: `The request "${request.title}" has been cancelled by the requester`,
              action_url: `/workspaces/${workspaceId}/approvals/${requestId}`,
              priority: NotificationPriority.LOW,
              send_push: false,
              data: {
                category: 'approvals',
                entity_type: 'approval_request',
                entity_id: requestId,
                actor_id: userId,
                request_title: request.title,
                workspace_id: workspaceId,
                action: 'request_cancelled',
              },
            });
          } catch (error) {
            console.error('Failed to send cancellation notification:', error);
          }
        }
      }
    }

    // Emit WebSocket event for real-time status update
    this.emitApprovalStatusUpdate(workspaceId, requestId, request, RequestStatus.CANCELLED, userId);

    return this.getApprovalRequest(workspaceId, requestId, userId);
  }

  async deleteRequest(workspaceId: string, requestId: string, userId: string): Promise<void> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    // Only owners/admins can delete requests
    const isAdmin = await this.isOwnerOrAdmin(workspaceId, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only workspace owners or admins can delete requests');
    }

    // Can only delete completed requests (approved, rejected, or cancelled)
    if (request.status === RequestStatus.PENDING) {
      throw new BadRequestException(
        'Cannot delete a pending request. Cancel it first or wait for approval/rejection.',
      );
    }

    // Delete related comments first
    await this.db
      .table('approval_request_comments')
      .where('request_id', '=', requestId)
      .delete()
      .execute();

    // Delete related approvers
    await this.db
      .table('approval_request_approvers')
      .where('request_id', '=', requestId)
      .delete()
      .execute();

    // Delete the request itself
    await this.db.delete('approval_requests', requestId);

    // Emit WebSocket event for real-time update
    this.emitApprovalRequestDeleted(workspaceId, requestId, request.title, userId);

    this.logger.log(`Request ${requestId} deleted by user ${userId}`);
  }

  // ==================== Comments ====================

  async addComment(
    workspaceId: string,
    requestId: string,
    dto: CreateApprovalCommentDto,
    userId: string,
  ): Promise<CommentResponseDto> {
    const request = await this.getApprovalRequest(workspaceId, requestId, userId);

    const data = {
      request_id: requestId,
      user_id: userId,
      content: dto.content,
      is_internal: dto.isInternal ?? false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await this.db.insert('approval_request_comments', data);
    const comment = this.mapComment(result);

    // Get commenter info
    let commenterName = 'Someone';
    try {
      const commenterProfile = await this.db.getUserById(userId);
      if (commenterProfile) {
        commenterName = commenterProfile.name || (commenterProfile as any).fullName || 'Someone';
      }
    } catch (error) {
      this.logger.warn(`Failed to get commenter info: ${error.message}`);
    }

    // Emit WebSocket event for real-time comment update
    this.emitApprovalCommentAdded(workspaceId, requestId, request, comment, userId, commenterName);

    // Send notification to relevant users (requester and approvers, except the commenter)
    const notifyUserIds = this.getParticipantUserIds(request, userId);
    for (const notifyUserId of notifyUserIds) {
      try {
        await this.notificationsService.sendNotification({
          user_id: notifyUserId,
          type: NotificationType.TASKS,
          title: 'New Comment on Request',
          message: `${commenterName} commented on "${request.title}"`,
          action_url: `/workspaces/${workspaceId}/approvals/${requestId}`,
          priority: NotificationPriority.NORMAL,
          send_push: true,
          data: {
            category: 'approvals',
            entity_type: 'approval_request_comment',
            entity_id: comment.id,
            request_id: requestId,
            actor_id: userId,
            request_title: request.title,
            workspace_id: workspaceId,
            action: 'comment_added',
          },
        });
      } catch (error) {
        this.logger.warn(
          `Failed to send comment notification to ${notifyUserId}: ${error.message}`,
        );
      }
    }

    return comment;
  }

  async getComments(
    workspaceId: string,
    requestId: string,
    userId: string,
  ): Promise<CommentResponseDto[]> {
    await this.getApprovalRequest(workspaceId, requestId, userId);

    const commentsResult = await this.db
      .table('approval_request_comments')
      .select('*')
      .where('request_id', '=', requestId)
      .orderBy('created_at', 'asc')
      .execute();

    const comments = commentsResult.data || [];
    return comments.map((c: any) => this.mapComment(c));
  }

  async deleteComment(
    workspaceId: string,
    requestId: string,
    commentId: string,
    userId: string,
  ): Promise<void> {
    const deleteCommentResult = await this.db
      .table('approval_request_comments')
      .select('*')
      .where('id', '=', commentId)
      .where('request_id', '=', requestId)
      .execute();

    const deleteCommentResults = deleteCommentResult.data || [];
    if (deleteCommentResults.length === 0) {
      throw new NotFoundException('Comment not found');
    }

    if (deleteCommentResults[0].user_id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.db.delete('approval_request_comments', commentId);
  }

  // ==================== Stats ====================

  async getStats(workspaceId: string, userId: string): Promise<ApprovalStatsDto> {
    // Get all requests for this workspace
    const allRequestsResult = await this.db
      .table('approval_requests')
      .select('*')
      .where('workspace_id', '=', workspaceId)
      .execute();

    const allRequests = allRequestsResult.data || [];

    // Get pending approvals for current user
    const pendingApprovalsResult = await this.db
      .table('approval_request_approvers')
      .select('request_id')
      .where('approver_id', '=', userId)
      .where('status', '=', ApproverStatus.PENDING)
      .execute();

    const pendingApprovals = pendingApprovalsResult.data || [];
    const pendingRequestIds = pendingApprovals.map((a: any) => a.request_id);
    const pendingMyApprovalCount = allRequests.filter(
      (r: any) => r.status === RequestStatus.PENDING && pendingRequestIds.includes(r.id),
    ).length;

    // Calculate stats
    const totalRequests = allRequests.length;
    const pendingRequests = allRequests.filter(
      (r: any) => r.status === RequestStatus.PENDING,
    ).length;
    const approvedRequests = allRequests.filter(
      (r: any) => r.status === RequestStatus.APPROVED,
    ).length;
    const rejectedRequests = allRequests.filter(
      (r: any) => r.status === RequestStatus.REJECTED,
    ).length;
    const myRequests = allRequests.filter((r: any) => r.requester_id === userId).length;

    // Calculate average approval time
    const approvedWithTime = allRequests.filter(
      (r: any) => r.status === RequestStatus.APPROVED && r.approved_at && r.created_at,
    );
    let averageApprovalTime = 0;
    if (approvedWithTime.length > 0) {
      const totalTime = approvedWithTime.reduce((sum: number, r: any) => {
        const created = new Date(r.created_at).getTime();
        const approved = new Date(r.approved_at).getTime();
        return sum + (approved - created);
      }, 0);
      averageApprovalTime = totalTime / approvedWithTime.length / (1000 * 60 * 60); // Convert to hours
    }

    // Get request types for breakdown
    const requestTypes = await this.getRequestTypes(workspaceId);
    const requestsByType = requestTypes.map((type) => ({
      typeId: type.id,
      typeName: type.name,
      count: allRequests.filter((r: any) => r.request_type_id === type.id).length,
    }));

    return {
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      pendingMyApproval: pendingMyApprovalCount,
      myRequests,
      averageApprovalTime,
      requestsByType,
    };
  }

  // ==================== Helpers ====================

  private mapRequestType(data: any): RequestTypeResponseDto {
    return {
      id: data.id,
      workspaceId: data.workspace_id,
      name: data.name,
      description: data.description,
      icon: data.icon,
      color: data.color,
      fieldsConfig:
        typeof data.fields_config === 'string'
          ? JSON.parse(data.fields_config)
          : data.fields_config || [],
      defaultApprovers:
        typeof data.default_approvers === 'string'
          ? JSON.parse(data.default_approvers)
          : data.default_approvers || [],
      requireAllApprovers: data.require_all_approvers,
      allowAttachments: data.allow_attachments,
      isActive: data.is_active,
      createdBy: data.created_by,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async mapApprovalRequest(
    data: any,
    workspaceId: string,
  ): Promise<ApprovalRequestResponseDto> {
    // Get approvers
    const approversResult = await this.db
      .table('approval_request_approvers')
      .select('*')
      .where('request_id', '=', data.id)
      .orderBy('sort_order', 'asc')
      .execute();

    const approversData = approversResult.data || [];

    // Fetch user info for all approvers in parallel
    const approvers = await Promise.all(
      approversData.map((a: any) => this.mapApproverWithUserInfo(a)),
    );

    // Get comments count
    const commentsCountResult = await this.db
      .table('approval_request_comments')
      .select('id')
      .where('request_id', '=', data.id)
      .execute();

    const comments = commentsCountResult.data || [];

    // Get request type
    let requestType: RequestTypeResponseDto | undefined;
    try {
      requestType = await this.getRequestType(workspaceId, data.request_type_id);
    } catch {
      // Request type may have been deleted
    }

    return {
      id: data.id,
      workspaceId: data.workspace_id,
      requestTypeId: data.request_type_id,
      requestType,
      requesterId: data.requester_id,
      title: data.title,
      description: data.description,
      data: typeof data.data === 'string' ? JSON.parse(data.data) : data.data || {},
      attachments:
        typeof data.attachments === 'string'
          ? JSON.parse(data.attachments)
          : data.attachments || [],
      status: data.status,
      priority: data.priority,
      dueDate: data.due_date,
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      rejectedBy: data.rejected_by,
      rejectedAt: data.rejected_at,
      rejectionReason: data.rejection_reason,
      cancelledAt: data.cancelled_at,
      approvers,
      commentsCount: comments.length,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private async mapApproverWithUserInfo(data: any): Promise<ApproverResponseDto> {
    let approverName: string | undefined;
    let approverEmail: string | undefined;
    let approverAvatar: string | undefined;

    // Fetch user profile for the approver
    try {
      const userProfile = await this.db.getUserById(data.approver_id);
      if (userProfile) {
        approverName = userProfile.name || (userProfile as any).fullName || undefined;
        approverEmail = userProfile.email || undefined;
        approverAvatar = (userProfile as any).avatarUrl || (userProfile as any).avatar || undefined;
      }
    } catch (error) {
      this.logger.warn(`Failed to get approver info for ${data.approver_id}: ${error.message}`);
    }

    return {
      id: data.id,
      approverId: data.approver_id,
      approverName,
      approverEmail,
      approverAvatar,
      status: data.status,
      comments: data.comments,
      respondedAt: data.responded_at,
      order: data.sort_order,
    };
  }

  private mapComment(data: any): CommentResponseDto {
    return {
      id: data.id,
      requestId: data.request_id,
      userId: data.user_id,
      content: data.content,
      isInternal: data.is_internal,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // ==================== WebSocket Event Helpers ====================

  /**
   * Get all participant user IDs (requester + approvers) except the given user
   */
  private getParticipantUserIds(
    request: ApprovalRequestResponseDto,
    excludeUserId: string,
  ): string[] {
    const userIds = new Set<string>();

    // Add requester
    if (request.requesterId && request.requesterId !== excludeUserId) {
      userIds.add(request.requesterId);
    }

    // Add all approvers
    if (request.approvers) {
      for (const approver of request.approvers) {
        if (approver.approverId && approver.approverId !== excludeUserId) {
          userIds.add(approver.approverId);
        }
      }
    }

    return Array.from(userIds);
  }

  /**
   * Emit WebSocket event when approval status changes
   */
  private emitApprovalStatusUpdate(
    workspaceId: string,
    requestId: string,
    request: ApprovalRequestResponseDto,
    newStatus: RequestStatus,
    actorId: string,
    reason?: string,
  ): void {
    try {
      const eventData = {
        requestId,
        workspaceId,
        status: newStatus,
        title: request.title,
        actorId,
        reason,
        requestTypeId: request.requestTypeId,
        requestTypeName: request.requestType?.name,
      };

      // Emit to all participants (requester + approvers)
      const participantIds = this.getParticipantUserIds(request, ''); // Include everyone

      this.logger.log(
        `[WebSocket] Emitting approval:status_updated to ${participantIds.length} users for request ${requestId}`,
      );

      // Emit to each user in the workspace
      this.appGateway.emitToWorkspaceUsers(
        workspaceId,
        participantIds,
        'approval:status_updated',
        eventData,
      );

      // Also emit to workspace room for any listeners
      this.appGateway.emitToRoom(`workspace:${workspaceId}`, 'approval:status_updated', eventData);
    } catch (error) {
      this.logger.error(`[WebSocket] Failed to emit approval status update: ${error.message}`);
    }
  }

  /**
   * Emit WebSocket event when a new comment is added
   */
  private emitApprovalCommentAdded(
    workspaceId: string,
    requestId: string,
    request: ApprovalRequestResponseDto,
    comment: CommentResponseDto,
    actorId: string,
    actorName: string,
  ): void {
    try {
      const eventData = {
        requestId,
        workspaceId,
        comment: {
          id: comment.id,
          content: comment.content,
          userId: comment.userId,
          isInternal: comment.isInternal,
          createdAt: comment.createdAt,
        },
        actorId,
        actorName,
        requestTitle: request.title,
      };

      // Emit to all participants (requester + approvers) except the commenter
      const participantIds = this.getParticipantUserIds(request, actorId);

      this.logger.log(
        `[WebSocket] Emitting approval:comment_added to ${participantIds.length} users for request ${requestId}`,
      );

      // Emit to each user in the workspace
      this.appGateway.emitToWorkspaceUsers(
        workspaceId,
        participantIds,
        'approval:comment_added',
        eventData,
      );

      // Also emit to the commenter so their UI can update
      this.appGateway.emitToWorkspaceUser(
        workspaceId,
        actorId,
        'approval:comment_added',
        eventData,
      );
    } catch (error) {
      this.logger.error(`[WebSocket] Failed to emit comment added event: ${error.message}`);
    }
  }

  /**
   * Emit WebSocket event when a request is deleted
   */
  private emitApprovalRequestDeleted(
    workspaceId: string,
    requestId: string,
    requestTitle: string,
    actorId: string,
  ): void {
    try {
      const eventData = {
        requestId,
        workspaceId,
        title: requestTitle,
        actorId,
      };

      this.logger.log(`[WebSocket] Emitting approval:request_deleted for request ${requestId}`);

      // Emit to workspace room so all users in the workspace can update their lists
      this.appGateway.emitToRoom(`workspace:${workspaceId}`, 'approval:request_deleted', eventData);
    } catch (error) {
      this.logger.error(`[WebSocket] Failed to emit request deleted event: ${error.message}`);
    }
  }

  /**
   * Emit WebSocket event when a new request is created
   */
  private emitApprovalRequestCreated(
    workspaceId: string,
    request: ApprovalRequestResponseDto,
    approverIds: string[],
    actorId: string,
  ): void {
    try {
      const eventData = {
        request,
        workspaceId,
        approverIds,
        actorId,
      };

      this.logger.log(`[WebSocket] Emitting approval:request_created for request ${request.id}`);

      // Emit to all approvers so they see the new request
      this.appGateway.emitToWorkspaceUsers(
        workspaceId,
        approverIds,
        'approval:request_created',
        eventData,
      );

      // Also emit to workspace room so admins/owners can see all new requests
      this.appGateway.emitToRoom(`workspace:${workspaceId}`, 'approval:request_created', eventData);
    } catch (error) {
      this.logger.error(`[WebSocket] Failed to emit request created event: ${error.message}`);
    }
  }
}
