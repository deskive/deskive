import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ApprovalsService } from './approvals.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../common/guards/workspace.guard';
import {
  CreateRequestTypeDto,
  UpdateRequestTypeDto,
  CreateApprovalRequestDto,
  UpdateApprovalRequestDto,
  ApproveRequestDto,
  RejectRequestDto,
  CreateApprovalCommentDto,
  ListRequestsQueryDto,
  RequestTypeResponseDto,
  ApprovalRequestResponseDto,
  CommentResponseDto,
  ApprovalStatsDto,
} from './dto/approvals.dto';

@ApiTags('approvals')
@Controller('workspaces/:workspaceId/approvals')
@UseGuards(AuthGuard, WorkspaceGuard)
@ApiBearerAuth()
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  // ==================== Request Types ====================

  @Post('types')
  @ApiOperation({ summary: 'Create a new request type' })
  @ApiResponse({ status: 201, description: 'Request type created successfully' })
  async createRequestType(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateRequestTypeDto,
    @CurrentUser('sub') userId: string,
  ): Promise<RequestTypeResponseDto> {
    return this.approvalsService.createRequestType(workspaceId, dto, userId);
  }

  @Get('types')
  @ApiOperation({ summary: 'Get all request types for workspace' })
  @ApiResponse({ status: 200, description: 'List of request types' })
  async getRequestTypes(
    @Param('workspaceId') workspaceId: string,
  ): Promise<RequestTypeResponseDto[]> {
    return this.approvalsService.getRequestTypes(workspaceId);
  }

  @Get('types/:typeId')
  @ApiOperation({ summary: 'Get a specific request type' })
  @ApiResponse({ status: 200, description: 'Request type details' })
  async getRequestType(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
  ): Promise<RequestTypeResponseDto> {
    return this.approvalsService.getRequestType(workspaceId, typeId);
  }

  @Patch('types/:typeId')
  @ApiOperation({ summary: 'Update a request type' })
  @ApiResponse({ status: 200, description: 'Request type updated successfully' })
  async updateRequestType(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
    @Body() dto: UpdateRequestTypeDto,
  ): Promise<RequestTypeResponseDto> {
    return this.approvalsService.updateRequestType(workspaceId, typeId, dto);
  }

  @Delete('types/:typeId')
  @ApiOperation({ summary: 'Delete a request type' })
  @ApiResponse({ status: 200, description: 'Request type deleted successfully' })
  async deleteRequestType(
    @Param('workspaceId') workspaceId: string,
    @Param('typeId') typeId: string,
  ): Promise<{ message: string }> {
    await this.approvalsService.deleteRequestType(workspaceId, typeId);
    return { message: 'Request type deleted successfully' };
  }

  // ==================== Approval Requests ====================

  @Post('requests')
  @ApiOperation({ summary: 'Create a new approval request' })
  @ApiResponse({ status: 201, description: 'Approval request created successfully' })
  async createApprovalRequest(
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateApprovalRequestDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.createApprovalRequest(workspaceId, dto, userId);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Get all approval requests' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'requestTypeId', required: false, description: 'Filter by request type' })
  @ApiQuery({ name: 'requesterId', required: false, description: 'Filter by requester' })
  @ApiQuery({ name: 'priority', required: false, description: 'Filter by priority' })
  @ApiQuery({
    name: 'pendingMyApproval',
    required: false,
    description: 'Show only pending my approval',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'List of approval requests' })
  async getApprovalRequests(
    @Param('workspaceId') workspaceId: string,
    @Query() query: ListRequestsQueryDto,
    @CurrentUser('sub') userId: string,
  ): Promise<{ requests: ApprovalRequestResponseDto[]; total: number }> {
    return this.approvalsService.getApprovalRequests(workspaceId, query, userId);
  }

  @Get('requests/:requestId')
  @ApiOperation({ summary: 'Get a specific approval request' })
  @ApiResponse({ status: 200, description: 'Approval request details' })
  async getApprovalRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.getApprovalRequest(workspaceId, requestId, userId);
  }

  @Patch('requests/:requestId')
  @ApiOperation({ summary: 'Update an approval request' })
  @ApiResponse({ status: 200, description: 'Approval request updated successfully' })
  async updateApprovalRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateApprovalRequestDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.updateApprovalRequest(workspaceId, requestId, dto, userId);
  }

  @Post('requests/:requestId/approve')
  @ApiOperation({ summary: 'Approve an approval request' })
  @ApiResponse({ status: 200, description: 'Request approved successfully' })
  async approveRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Body() dto: ApproveRequestDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.approveRequest(workspaceId, requestId, dto, userId);
  }

  @Post('requests/:requestId/reject')
  @ApiOperation({ summary: 'Reject an approval request' })
  @ApiResponse({ status: 200, description: 'Request rejected successfully' })
  async rejectRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Body() dto: RejectRequestDto,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.rejectRequest(workspaceId, requestId, dto, userId);
  }

  @Post('requests/:requestId/cancel')
  @ApiOperation({ summary: 'Cancel an approval request' })
  @ApiResponse({ status: 200, description: 'Request cancelled successfully' })
  async cancelRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalRequestResponseDto> {
    return this.approvalsService.cancelRequest(workspaceId, requestId, userId);
  }

  @Delete('requests/:requestId')
  @ApiOperation({ summary: 'Delete an approval request (only for completed requests)' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  async deleteRequest(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.approvalsService.deleteRequest(workspaceId, requestId, userId);
    return { message: 'Request deleted successfully' };
  }

  // ==================== Comments ====================

  @Post('requests/:requestId/comments')
  @ApiOperation({ summary: 'Add a comment to an approval request' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Body() dto: CreateApprovalCommentDto,
    @CurrentUser('sub') userId: string,
  ): Promise<CommentResponseDto> {
    return this.approvalsService.addComment(workspaceId, requestId, dto, userId);
  }

  @Get('requests/:requestId/comments')
  @ApiOperation({ summary: 'Get comments for an approval request' })
  @ApiResponse({ status: 200, description: 'List of comments' })
  async getComments(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<CommentResponseDto[]> {
    return this.approvalsService.getComments(workspaceId, requestId, userId);
  }

  @Delete('requests/:requestId/comments/:commentId')
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiResponse({ status: 200, description: 'Comment deleted successfully' })
  async deleteComment(
    @Param('workspaceId') workspaceId: string,
    @Param('requestId') requestId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<{ message: string }> {
    await this.approvalsService.deleteComment(workspaceId, requestId, commentId, userId);
    return { message: 'Comment deleted successfully' };
  }

  // ==================== Stats ====================

  @Get('stats')
  @ApiOperation({ summary: 'Get approval statistics' })
  @ApiResponse({ status: 200, description: 'Approval statistics' })
  async getStats(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ): Promise<ApprovalStatsDto> {
    return this.approvalsService.getStats(workspaceId, userId);
  }
}
