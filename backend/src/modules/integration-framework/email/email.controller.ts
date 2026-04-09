import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailPollingService } from './email-polling.service';
import { SmtpImapEmailService } from './smtp-imap-email.service';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { WorkspaceGuard } from '../../../common/guards/workspace.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  ListEmailsQueryDto,
  UpdateLabelsDto,
  CreateLabelDto,
  ConnectSmtpImapDto,
  TestSmtpImapConnectionDto,
  EmailProvider,
  AnalyzeEmailPriorityDto,
  GetStoredPrioritiesDto,
  ExtractTravelInfoDto,
  NativeConnectGmailDto,
} from './dto/email.dto';
import {
  SendEmailDto,
  ReplyEmailDto,
  CreateDraftDto,
} from './dto/send-email.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('email')
@ApiBearerAuth()
@Controller('workspaces/:workspaceId/email')
@UseGuards(AuthGuard, WorkspaceGuard)
export class EmailController {
  constructor(
    private readonly emailService: EmailService,
    private readonly emailPollingService: EmailPollingService,
    private readonly smtpImapEmailService: SmtpImapEmailService,
    private readonly configService: ConfigService,
  ) {}

  // ==================== OAuth Endpoints ====================

  @Get('auth/url')
  @ApiOperation({ summary: 'Get Gmail OAuth authorization URL' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'returnUrl', required: false, description: 'URL to redirect after OAuth' })
  @ApiResponse({ status: 200, description: 'OAuth URL generated' })
  getAuthUrl(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('returnUrl') returnUrl?: string,
  ) {
    return this.emailService.getAuthUrl(userId, workspaceId, returnUrl);
  }

  @Post('connect-native')
  @ApiOperation({ summary: 'Connect Gmail using native mobile sign-in' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Gmail connected via native sign-in' })
  async connectNative(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: NativeConnectGmailDto,
  ) {
    const connection = await this.emailService.handleNativeSignIn(
      userId,
      workspaceId,
      dto.serverAuthCode,
      {
        email: dto.email,
        displayName: dto.displayName,
        photoUrl: dto.photoUrl,
      }
    );
    return {
      data: connection,
      connected: true,
      message: 'Gmail connected successfully via native sign-in',
    };
  }

  @Get('connection')
  @ApiOperation({ summary: 'Get email connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection status' })
  async getConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.emailService.getConnection(userId, workspaceId);
    return { data: connection, connected: !!connection };
  }

  @Delete('connection')
  @ApiOperation({ summary: 'Disconnect Gmail' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Disconnected successfully' })
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.emailService.disconnect(userId, workspaceId);
    return { success: true, message: 'Gmail disconnected' };
  }

  @Delete('connections/:connectionId')
  @ApiOperation({ summary: 'Disconnect a specific email connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID to disconnect' })
  @ApiResponse({ status: 200, description: 'Connection disconnected successfully' })
  async disconnectById(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.emailService.disconnectById(userId, workspaceId, connectionId);
    return { success: true, message: 'Email connection disconnected' };
  }

  // ==================== Message Endpoints ====================

  @Get('messages')
  @ApiOperation({ summary: 'List emails' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'List of emails' })
  async getMessages(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListEmailsQueryDto,
  ) {
    const result = await this.emailService.getMessages(userId, workspaceId, {
      labelId: query.labelId,
      query: query.query,
      pageToken: query.pageToken,
      maxResults: query.maxResults,
      connectionId: query.connectionId,
    });
    return { data: result };
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: 'Get email details' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'Email details' })
  async getMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const email = await this.emailService.getMessage(userId, workspaceId, messageId, connectionId);
    return { data: email };
  }

  @Get('messages/:messageId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download email attachment' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiQuery({ name: 'filename', required: false, description: 'Attachment filename' })
  @ApiQuery({ name: 'mimeType', required: false, description: 'Attachment MIME type' })
  @ApiResponse({ status: 200, description: 'Attachment file' })
  async getAttachment(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('sub') userId: string,
    @Query('connectionId') connectionId: string,
    @Query('filename') filename: string,
    @Query('mimeType') mimeType: string,
    @Res() res: Response,
  ) {
    const attachment = await this.emailService.getAttachment(
      userId,
      workspaceId,
      messageId,
      attachmentId,
      connectionId,
      filename,
      mimeType,
    );

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    res.send(attachment.data);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Send email' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendEmail(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendEmailDto,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.emailService.sendEmail(userId, workspaceId, dto, connectionId);
    return { data: result, message: 'Email sent successfully' };
  }

  @Post('messages/:messageId/reply')
  @ApiOperation({ summary: 'Reply to email' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID to reply to' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 201, description: 'Reply sent' })
  async replyToEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReplyEmailDto,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.emailService.replyToEmail(userId, workspaceId, messageId, dto, connectionId);
    return { data: result, message: 'Reply sent successfully' };
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete/trash email' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'permanent', required: false, description: 'Permanently delete' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'Email deleted' })
  async deleteEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Query('permanent') permanent?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    await this.emailService.deleteEmail(userId, workspaceId, messageId, permanent === 'true', connectionId);
    return { success: true, message: permanent === 'true' ? 'Email deleted permanently' : 'Email moved to trash' };
  }

  @Patch('messages/:messageId/read')
  @ApiOperation({ summary: 'Mark email as read/unread' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'Read status updated' })
  async markAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { isRead: boolean },
    @Query('connectionId') connectionId?: string,
  ) {
    await this.emailService.markAsRead(userId, workspaceId, messageId, body.isRead, connectionId);
    return { success: true };
  }

  @Patch('messages/:messageId/star')
  @ApiOperation({ summary: 'Star/unstar email' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'Star status updated' })
  async starEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { isStarred: boolean },
    @Query('connectionId') connectionId?: string,
  ) {
    await this.emailService.starEmail(userId, workspaceId, messageId, body.isStarred, connectionId);
    return { success: true };
  }

  @Patch('messages/:messageId/labels')
  @ApiOperation({ summary: 'Update email labels' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'Labels updated' })
  async updateLabels(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateLabelsDto,
    @Query('connectionId') connectionId?: string,
  ) {
    await this.emailService.updateLabels(userId, workspaceId, messageId, dto.addLabelIds, dto.removeLabelIds, connectionId);
    return { success: true };
  }

  // ==================== Label Endpoints ====================

  @Get('labels')
  @ApiOperation({ summary: 'Get all labels' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 200, description: 'List of labels' })
  async getLabels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const labels = await this.emailService.getLabels(userId, workspaceId, connectionId);
    return { data: labels };
  }

  @Post('labels')
  @ApiOperation({ summary: 'Create label' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific Gmail connection ID' })
  @ApiResponse({ status: 201, description: 'Label created' })
  async createLabel(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateLabelDto,
    @Query('connectionId') connectionId?: string,
  ) {
    const label = await this.emailService.createLabel(userId, workspaceId, dto.name, dto.color, connectionId);
    return { data: label, message: 'Label created' };
  }

  // ==================== Draft Endpoints ====================

  @Get('drafts')
  @ApiOperation({ summary: 'List drafts' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'List of drafts' })
  async getDrafts(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('pageToken') pageToken?: string,
  ) {
    const result = await this.emailService.getDrafts(userId, workspaceId, pageToken);
    return { data: result };
  }

  @Post('drafts')
  @ApiOperation({ summary: 'Create draft' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'Draft created' })
  async createDraft(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDraftDto,
  ) {
    const draft = await this.emailService.createDraft(userId, workspaceId, dto);
    return { data: draft, message: 'Draft created' };
  }

  @Patch('drafts/:draftId')
  @ApiOperation({ summary: 'Update draft' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'draftId', description: 'Draft ID' })
  @ApiResponse({ status: 200, description: 'Draft updated' })
  async updateDraft(
    @Param('workspaceId') workspaceId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateDraftDto,
  ) {
    const draft = await this.emailService.updateDraft(userId, workspaceId, draftId, dto);
    return { data: draft, message: 'Draft updated' };
  }

  @Delete('drafts/:draftId')
  @ApiOperation({ summary: 'Delete draft' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'draftId', description: 'Draft ID' })
  @ApiResponse({ status: 200, description: 'Draft deleted' })
  async deleteDraft(
    @Param('workspaceId') workspaceId: string,
    @Param('draftId') draftId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.emailService.deleteDraft(userId, workspaceId, draftId);
    return { success: true, message: 'Draft deleted' };
  }

  // ==================== Notification Endpoints ====================

  @Patch('notifications')
  @ApiOperation({ summary: 'Enable or disable email notifications' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  async setNotificationsEnabled(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { enabled: boolean },
  ) {
    await this.emailPollingService.setNotificationsEnabled(userId, workspaceId, body.enabled);
    return { success: true, message: `Email notifications ${body.enabled ? 'enabled' : 'disabled'}` };
  }

  // ==================== Connection Settings Endpoints ====================

  @Get('connections/:connectionId/settings')
  @ApiOperation({ summary: 'Get email connection settings' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({ status: 200, description: 'Connection settings' })
  async getConnectionSettings(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const settings = await this.emailPollingService.getConnectionSettings(userId, workspaceId, connectionId);
    return { data: settings };
  }

  @Patch('connections/:connectionId/settings')
  @ApiOperation({ summary: 'Update email connection settings (notifications, auto-create events)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'connectionId', description: 'Connection ID' })
  @ApiResponse({ status: 200, description: 'Connection settings updated' })
  async updateConnectionSettings(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { notificationsEnabled?: boolean; autoCreateEvents?: boolean },
  ) {
    const connection = await this.emailPollingService.updateConnectionSettings(
      userId,
      workspaceId,
      connectionId,
      body,
    );
    return {
      data: {
        id: connection.id,
        notificationsEnabled: connection.notifications_enabled,
        autoCreateEvents: connection.auto_create_events,
      },
      message: 'Connection settings updated successfully',
    };
  }

  @Post('notifications/poll')
  @ApiOperation({ summary: 'Manually trigger email polling (for testing)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Poll completed' })
  async triggerPoll(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.emailPollingService.pollForUser(userId, workspaceId);
    return { success: true, data: result, message: `Found ${result.newEmails} new email(s)` };
  }

  // ==================== SMTP/IMAP Endpoints ====================

  @Post('smtp-imap/test')
  @ApiOperation({ summary: 'Test SMTP/IMAP connection before saving' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Connection test result' })
  async testSmtpImapConnection(
    @Body() dto: TestSmtpImapConnectionDto,
  ) {
    const result = await this.smtpImapEmailService.testConnection(dto);
    return { data: result };
  }

  @Post('smtp-imap/connect')
  @ApiOperation({ summary: 'Connect SMTP/IMAP email account' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 201, description: 'SMTP/IMAP connected' })
  async connectSmtpImap(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ConnectSmtpImapDto,
  ) {
    const connection = await this.smtpImapEmailService.connect(userId, workspaceId, dto);
    return { data: connection, message: 'SMTP/IMAP connected successfully' };
  }

  @Get('smtp-imap/connection')
  @ApiOperation({ summary: 'Get SMTP/IMAP connection status' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'SMTP/IMAP connection status' })
  async getSmtpImapConnection(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connection = await this.smtpImapEmailService.getConnection(userId, workspaceId);
    return { data: connection, connected: !!connection };
  }

  @Delete('smtp-imap/connection')
  @ApiOperation({ summary: 'Disconnect SMTP/IMAP email account' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'SMTP/IMAP disconnected' })
  async disconnectSmtpImap(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    await this.smtpImapEmailService.disconnect(userId, workspaceId);
    return { success: true, message: 'SMTP/IMAP disconnected' };
  }

  @Get('smtp-imap/messages')
  @ApiOperation({ summary: 'List emails via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'List of emails' })
  async getSmtpImapMessages(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query() query: ListEmailsQueryDto,
  ) {
    const result = await this.smtpImapEmailService.getMessages(userId, workspaceId, {
      labelId: query.labelId,
      query: query.query,
      pageToken: query.pageToken,
      maxResults: query.maxResults,
      connectionId: query.connectionId,
    });
    return { data: result };
  }

  @Get('smtp-imap/messages/:messageId')
  @ApiOperation({ summary: 'Get email details via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'Email details' })
  async getSmtpImapMessage(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Query('mailbox') mailbox?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const email = await this.smtpImapEmailService.getMessage(userId, workspaceId, messageId, mailbox || 'INBOX', connectionId);
    return { data: email };
  }

  @Get('smtp-imap/messages/:messageId/attachments/:attachmentId')
  @ApiOperation({ summary: 'Download email attachment via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment ID' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'Attachment file' })
  async getSmtpImapAttachment(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @Param('attachmentId') attachmentId: string,
    @CurrentUser('sub') userId: string,
    @Query('mailbox') mailbox: string,
    @Query('connectionId') connectionId: string,
    @Res() res: Response,
  ) {
    const attachment = await this.smtpImapEmailService.getAttachment(
      userId,
      workspaceId,
      messageId,
      attachmentId,
      mailbox || 'INBOX',
      connectionId,
    );

    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
    );
    res.send(attachment.data);
  }

  @Post('smtp-imap/messages')
  @ApiOperation({ summary: 'Send email via SMTP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 201, description: 'Email sent' })
  async sendSmtpImapEmail(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: SendEmailDto,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.smtpImapEmailService.sendEmail(userId, workspaceId, dto, connectionId);
    return { data: result, message: 'Email sent successfully' };
  }

  @Post('smtp-imap/messages/:messageId/reply')
  @ApiOperation({ summary: 'Reply to email via SMTP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID to reply to' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 201, description: 'Reply sent' })
  async replyToSmtpImapEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ReplyEmailDto,
    @Query('mailbox') mailbox?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const result = await this.smtpImapEmailService.replyToEmail(
      userId,
      workspaceId,
      messageId,
      dto,
      mailbox || 'INBOX',
      connectionId,
    );
    return { data: result, message: 'Reply sent successfully' };
  }

  @Delete('smtp-imap/messages/:messageId')
  @ApiOperation({ summary: 'Delete/trash email via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'permanent', required: false, description: 'Permanently delete' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'Email deleted' })
  async deleteSmtpImapEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Query('mailbox') mailbox?: string,
    @Query('permanent') permanent?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    await this.smtpImapEmailService.deleteEmail(
      userId,
      workspaceId,
      messageId,
      mailbox || 'INBOX',
      permanent === 'true',
      connectionId,
    );
    return { success: true, message: permanent === 'true' ? 'Email deleted permanently' : 'Email moved to trash' };
  }

  @Patch('smtp-imap/messages/:messageId/read')
  @ApiOperation({ summary: 'Mark email as read/unread via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'Read status updated' })
  async markSmtpImapAsRead(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { isRead: boolean },
    @Query('mailbox') mailbox?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    await this.smtpImapEmailService.markAsRead(
      userId,
      workspaceId,
      messageId,
      mailbox || 'INBOX',
      body.isRead,
      connectionId,
    );
    return { success: true };
  }

  @Patch('smtp-imap/messages/:messageId/star')
  @ApiOperation({ summary: 'Star/unstar email via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'messageId', description: 'Message ID' })
  @ApiQuery({ name: 'mailbox', required: false, description: 'Mailbox name (default: INBOX)' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'Star status updated' })
  async starSmtpImapEmail(
    @Param('workspaceId') workspaceId: string,
    @Param('messageId') messageId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { isStarred: boolean },
    @Query('mailbox') mailbox?: string,
    @Query('connectionId') connectionId?: string,
  ) {
    await this.smtpImapEmailService.starEmail(
      userId,
      workspaceId,
      messageId,
      mailbox || 'INBOX',
      body.isStarred,
      connectionId,
    );
    return { success: true };
  }

  @Get('smtp-imap/labels')
  @ApiOperation({ summary: 'Get all mailboxes/labels via IMAP' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiQuery({ name: 'connectionId', required: false, description: 'Specific connection ID' })
  @ApiResponse({ status: 200, description: 'List of mailboxes' })
  async getSmtpImapLabels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Query('connectionId') connectionId?: string,
  ) {
    const labels = await this.smtpImapEmailService.getLabels(userId, workspaceId, connectionId);
    return { data: labels };
  }

  // ==================== Unified Connection Endpoint ====================

  @Get('connections')
  @ApiOperation({ summary: 'Get all email connections (Gmail and SMTP/IMAP)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'All email connections' })
  async getAllConnections(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    // Get all connections for multi-account support
    const [gmailConnections, smtpImapConnections] = await Promise.all([
      this.emailService.getAllConnections(userId, workspaceId),
      this.smtpImapEmailService.getAllConnections(userId, workspaceId),
    ]);

    // Combine all accounts into a single array
    const allAccounts = [...gmailConnections, ...smtpImapConnections];

    // Legacy format for backwards compatibility (first of each type)
    const gmailConnection = gmailConnections.length > 0 ? gmailConnections[0] : null;
    const smtpImapConnection = smtpImapConnections.length > 0 ? smtpImapConnections[0] : null;

    return {
      data: {
        // Legacy single account fields for backwards compatibility
        gmail: gmailConnection,
        smtpImap: smtpImapConnection,
        // New multi-account arrays
        gmailAccounts: gmailConnections,
        smtpImapAccounts: smtpImapConnections,
        allAccounts: allAccounts,
      },
      providers: {
        gmail: gmailConnections.length > 0,
        smtpImap: smtpImapConnections.length > 0,
      },
    };
  }

  @Get('connections/all')
  @ApiOperation({ summary: 'Get all email connections as array' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'All email connections as array' })
  async getAllConnectionsList(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const connections = await this.emailService.getAllConnections(userId, workspaceId);
    return { data: connections };
  }

  // ==================== AI Email Priority Analysis ====================

  @Post('analyze-priority')
  @ApiOperation({ summary: 'Analyze email priorities using AI' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Email priorities analyzed' })
  async analyzeEmailPriority(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: AnalyzeEmailPriorityDto,
  ) {
    const result = await this.emailService.analyzeEmailPriority(
      userId,
      workspaceId,
      dto.emails,
      dto.connectionId,
    );
    return { data: result, message: 'Email priorities analyzed successfully' };
  }

  @Post('priorities/get')
  @ApiOperation({ summary: 'Get stored priorities for email IDs' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Stored priorities retrieved' })
  async getStoredPriorities(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: GetStoredPrioritiesDto,
  ) {
    const result = await this.emailService.getStoredPriorities(userId, workspaceId, dto.emailIds);
    return { data: result, message: 'Priorities retrieved successfully' };
  }

  @Get('priorities/:connectionId')
  @ApiOperation({ summary: 'Get all stored priorities for a connection' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiParam({ name: 'connectionId', description: 'Email connection ID' })
  @ApiResponse({ status: 200, description: 'Connection priorities retrieved' })
  async getPrioritiesForConnection(
    @Param('workspaceId') workspaceId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const result = await this.emailService.getPrioritiesForConnection(userId, workspaceId, connectionId);
    return { data: result, message: 'Connection priorities retrieved successfully' };
  }

  // ==================== Travel Ticket Extraction ====================

  @Post('extract-travel-info')
  @ApiOperation({ summary: 'Extract travel ticket information from email using AI (supports PDF attachments)' })
  @ApiParam({ name: 'workspaceId', description: 'Workspace ID' })
  @ApiResponse({ status: 200, description: 'Travel information extracted' })
  async extractTravelInfo(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser('sub') userId: string,
    @Body() dto: ExtractTravelInfoDto,
  ) {
    const result = await this.emailService.extractTravelInfo(
      userId,
      workspaceId,
      dto.subject,
      dto.body,
      dto.senderEmail,
      dto.messageId,
      dto.attachmentId,
      dto.connectionId,
    );
    return { data: result, message: 'Travel information extracted successfully' };
  }
}
