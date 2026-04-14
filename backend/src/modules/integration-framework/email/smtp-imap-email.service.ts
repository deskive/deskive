import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SmtpService } from './smtp.service';
import { ImapService } from './imap.service';
import {
  EmailConnectionDto,
  EmailDto,
  EmailListItemDto,
  EmailListResponseDto,
  LabelDto,
  ConnectSmtpImapDto,
  TestSmtpImapConnectionDto,
  TestConnectionResultDto,
  SmtpConfigDto,
  ImapConfigDto,
  EmailProvider,
} from './dto/email.dto';
import { SendEmailDto, ReplyEmailDto, SendEmailResponseDto } from './dto/send-email.dto';

interface SmtpImapConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: string;
  email_address: string;
  display_name?: string;
  smtp_host: string;
  smtp_port: number;
  smtp_secure: boolean;
  smtp_user: string;
  smtp_password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  imap_user: string;
  imap_password: string;
  is_active: boolean;
  last_uid?: string;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class SmtpImapEmailService {
  private readonly logger = new Logger(SmtpImapEmailService.name);

  constructor(
    private readonly db: DatabaseService,
    private smtpService: SmtpService,
    private imapService: ImapService,
  ) {}

  // ==================== Connection Management ====================

  /**
   * Test SMTP and IMAP connection before saving
   */
  async testConnection(dto: TestSmtpImapConnectionDto): Promise<TestConnectionResultDto> {
    const [smtpResult, imapResult] = await Promise.all([
      this.smtpService.testConnection(dto.smtp),
      this.imapService.testConnection(dto.imap),
    ]);

    return {
      success: smtpResult.success && imapResult.success,
      smtp: smtpResult,
      imap: imapResult,
    };
  }

  /**
   * Connect SMTP/IMAP email account
   */
  async connect(
    userId: string,
    workspaceId: string,
    dto: ConnectSmtpImapDto,
  ): Promise<EmailConnectionDto> {
    // First test the connections
    const testResult = await this.testConnection({
      smtp: dto.smtp,
      imap: dto.imap,
    });

    if (!testResult.success) {
      const errors: string[] = [];
      if (!testResult.smtp.success) errors.push(`SMTP: ${testResult.smtp.message}`);
      if (!testResult.imap.success) errors.push(`IMAP: ${testResult.imap.message}`);
      throw new BadRequestException(`Connection test failed: ${errors.join('; ')}`);
    }

    // Check for existing connection with the SAME email address
    // This allows multiple SMTP/IMAP connections with different email addresses
    const existingConnection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      email_address: dto.emailAddress,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      provider: EmailProvider.SMTP_IMAP,
      email_address: dto.emailAddress,
      display_name: dto.displayName,
      smtp_host: dto.smtp.host,
      smtp_port: dto.smtp.port,
      smtp_secure: dto.smtp.secure ?? true,
      smtp_user: dto.smtp.user,
      smtp_password: dto.smtp.password, // TODO: Encrypt before storing
      imap_host: dto.imap.host,
      imap_port: dto.imap.port,
      imap_secure: dto.imap.secure ?? true,
      imap_user: dto.imap.user,
      imap_password: dto.imap.password, // TODO: Encrypt before storing
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection: SmtpImapConnection;
    if (existingConnection) {
      await this.db.update('email_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData } as SmtpImapConnection;
    } else {
      connection = (await this.db.insert(
        'email_connections',
        connectionData,
      )) as SmtpImapConnection;
    }

    this.logger.log(
      `SMTP/IMAP connected for user ${userId} in workspace ${workspaceId}: ${dto.emailAddress}`,
    );

    return this.transformConnection(connection);
  }

  /**
   * Get SMTP/IMAP connection
   */
  async getConnection(userId: string, workspaceId: string): Promise<EmailConnectionDto | null> {
    const connection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      provider: EmailProvider.SMTP_IMAP,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Get all SMTP/IMAP connections for multi-account support
   */
  async getAllConnections(userId: string, workspaceId: string): Promise<EmailConnectionDto[]> {
    const result = await this.db.findMany('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      provider: EmailProvider.SMTP_IMAP,
      is_active: true,
    });

    const connections = result?.data || [];
    return connections.map((conn) => this.transformConnection(conn));
  }

  /**
   * Disconnect SMTP/IMAP email account
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      provider: EmailProvider.SMTP_IMAP,
    });

    if (!connection) {
      throw new NotFoundException('SMTP/IMAP connection not found');
    }

    await this.db.update('email_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`SMTP/IMAP disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get connection with credentials (for internal use)
   * @param connectionId - Optional specific connection ID. If not provided, returns first active SMTP/IMAP connection.
   */
  private async getConnectionWithCredentials(
    userId: string,
    workspaceId: string,
    connectionId?: string,
  ): Promise<SmtpImapConnection> {
    let connection: SmtpImapConnection | null = null;

    if (connectionId) {
      // Get specific connection by ID
      connection = (await this.db.findOne('email_connections', {
        id: connectionId,
        workspace_id: workspaceId,
        user_id: userId,
        provider: EmailProvider.SMTP_IMAP,
        is_active: true,
      })) as SmtpImapConnection | null;
    } else {
      // Fallback: get first active SMTP/IMAP connection
      connection = (await this.db.findOne('email_connections', {
        workspace_id: workspaceId,
        user_id: userId,
        provider: EmailProvider.SMTP_IMAP,
        is_active: true,
      })) as SmtpImapConnection | null;
    }

    if (!connection) {
      throw new NotFoundException(
        'SMTP/IMAP not connected. Please connect your email account first.',
      );
    }

    return connection;
  }

  /**
   * Get SMTP config from connection
   */
  private getSmtpConfig(connection: SmtpImapConnection): SmtpConfigDto {
    return {
      host: connection.smtp_host,
      port: connection.smtp_port,
      secure: connection.smtp_secure,
      user: connection.smtp_user,
      password: connection.smtp_password,
    };
  }

  /**
   * Get IMAP config from connection
   */
  private getImapConfig(connection: SmtpImapConnection): ImapConfigDto {
    return {
      host: connection.imap_host,
      port: connection.imap_port,
      secure: connection.imap_secure,
      user: connection.imap_user,
      password: connection.imap_password,
    };
  }

  // ==================== Email Operations ====================

  /**
   * Get emails from mailbox
   */
  async getMessages(
    userId: string,
    workspaceId: string,
    options: {
      labelId?: string;
      query?: string;
      pageToken?: string;
      maxResults?: number;
      connectionId?: string;
    } = {},
  ): Promise<EmailListResponseDto> {
    const connection = await this.getConnectionWithCredentials(
      userId,
      workspaceId,
      options.connectionId,
    );
    const imapConfig = this.getImapConfig(connection);

    const { labelId = 'INBOX', query, pageToken, maxResults = 20 } = options;

    try {
      // Resolve the actual mailbox name from the standard label ID
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, labelId);
      this.logger.log(`Resolved mailbox: ${labelId} -> ${actualMailbox}`);

      const result = await this.imapService.fetchEmails(imapConfig, actualMailbox, {
        limit: maxResults,
        offset: pageToken ? parseInt(pageToken, 10) : 0,
        search: query,
      });

      return {
        emails: result.emails,
        nextPageToken: result.nextPageToken,
        resultSizeEstimate: result.emails.length,
      };
    } catch (error) {
      this.logger.error(`Failed to fetch emails: ${error.message}`);
      throw new BadRequestException(`Failed to fetch emails: ${error.message}`);
    }
  }

  /**
   * Get single email with full content
   */
  async getMessage(
    userId: string,
    workspaceId: string,
    messageId: string,
    mailbox: string = 'INBOX',
    connectionId?: string,
  ): Promise<EmailDto> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      // Resolve the actual mailbox name from the standard label ID
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, mailbox);

      const email = await this.imapService.fetchEmail(imapConfig, messageId, actualMailbox);
      if (!email) {
        throw new NotFoundException('Email not found');
      }
      return email;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch email: ${error.message}`);
      throw new BadRequestException(`Failed to fetch email: ${error.message}`);
    }
  }

  /**
   * Get attachment data
   */
  async getAttachment(
    userId: string,
    workspaceId: string,
    messageId: string,
    attachmentId: string,
    mailbox: string = 'INBOX',
    connectionId?: string,
  ): Promise<{ data: Buffer; mimeType: string; filename: string }> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, mailbox);
      const attachment = await this.imapService.fetchAttachment(
        imapConfig,
        messageId,
        attachmentId,
        actualMailbox,
      );

      if (!attachment) {
        throw new NotFoundException('Attachment not found');
      }

      return attachment;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Failed to fetch attachment: ${error.message}`);
      throw new BadRequestException(`Failed to fetch attachment: ${error.message}`);
    }
  }

  /**
   * Send email via SMTP
   */
  async sendEmail(
    userId: string,
    workspaceId: string,
    dto: SendEmailDto,
    connectionId?: string,
  ): Promise<SendEmailResponseDto> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const smtpConfig = this.getSmtpConfig(connection);

    const result = await this.smtpService.sendEmail(
      smtpConfig,
      connection.email_address,
      connection.display_name,
      dto,
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to send email: ${result.error}`);
    }

    return {
      messageId: result.messageId || '',
      threadId: '', // SMTP doesn't provide thread IDs
      labelIds: ['SENT'],
    };
  }

  /**
   * Reply to email via SMTP
   */
  async replyToEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    dto: ReplyEmailDto,
    mailbox: string = 'INBOX',
    connectionId?: string,
  ): Promise<SendEmailResponseDto> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const smtpConfig = this.getSmtpConfig(connection);
    const imapConfig = this.getImapConfig(connection);

    // Get original message for threading info
    const original = await this.imapService.fetchEmail(imapConfig, messageId, mailbox);
    if (!original) {
      throw new NotFoundException('Original email not found');
    }

    const result = await this.smtpService.replyToEmail(
      smtpConfig,
      connection.email_address,
      connection.display_name,
      dto,
      messageId,
      original.subject || '',
      original.from?.email || '',
    );

    if (!result.success) {
      throw new BadRequestException(`Failed to send reply: ${result.error}`);
    }

    return {
      messageId: result.messageId || '',
      threadId: original.threadId,
      labelIds: ['SENT'],
    };
  }

  /**
   * Delete email
   */
  async deleteEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    mailbox: string = 'INBOX',
    permanent: boolean = false,
    connectionId?: string,
  ): Promise<void> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      // Resolve the actual mailbox name from the standard label ID
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, mailbox);
      await this.imapService.deleteEmail(imapConfig, messageId, actualMailbox, permanent);
      this.logger.log(`Email ${messageId} ${permanent ? 'permanently deleted' : 'moved to trash'}`);
    } catch (error) {
      this.logger.error(`Failed to delete email: ${error.message}`);
      throw new BadRequestException(`Failed to delete email: ${error.message}`);
    }
  }

  /**
   * Mark email as read/unread
   */
  async markAsRead(
    userId: string,
    workspaceId: string,
    messageId: string,
    mailbox: string = 'INBOX',
    isRead: boolean = true,
    connectionId?: string,
  ): Promise<void> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      // Resolve the actual mailbox name from the standard label ID
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, mailbox);
      await this.imapService.markAsRead(imapConfig, messageId, actualMailbox, isRead);
    } catch (error) {
      this.logger.error(`Failed to mark email as read: ${error.message}`);
      throw new BadRequestException(`Failed to mark email as read: ${error.message}`);
    }
  }

  /**
   * Star/unstar email
   */
  async starEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    mailbox: string = 'INBOX',
    isStarred: boolean = true,
    connectionId?: string,
  ): Promise<void> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      // Resolve the actual mailbox name from the standard label ID
      const actualMailbox = await this.imapService.resolveMailboxName(imapConfig, mailbox);
      await this.imapService.starEmail(imapConfig, messageId, actualMailbox, isStarred);
    } catch (error) {
      this.logger.error(`Failed to star email: ${error.message}`);
      throw new BadRequestException(`Failed to star email: ${error.message}`);
    }
  }

  // ==================== Labels ====================

  /**
   * Get mailboxes as labels
   */
  async getLabels(userId: string, workspaceId: string, connectionId?: string): Promise<LabelDto[]> {
    const connection = await this.getConnectionWithCredentials(userId, workspaceId, connectionId);
    const imapConfig = this.getImapConfig(connection);

    try {
      return await this.imapService.getMailboxes(imapConfig);
    } catch (error) {
      this.logger.error(`Failed to get mailboxes: ${error.message}`);
      throw new BadRequestException(`Failed to get mailboxes: ${error.message}`);
    }
  }

  // ==================== Polling ====================

  /**
   * Fetch new emails for polling service
   */
  async fetchNewEmails(
    connection: SmtpImapConnection,
  ): Promise<{ emails: EmailListItemDto[]; lastUid: number }> {
    const imapConfig = this.getImapConfig(connection);
    const lastUid = connection.last_uid ? parseInt(connection.last_uid, 10) : 0;

    try {
      return await this.imapService.fetchNewEmails(imapConfig, 'INBOX', lastUid);
    } catch (error) {
      this.logger.error(`Failed to fetch new emails: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update last UID after polling
   */
  async updateLastUid(connectionId: string, lastUid: number): Promise<void> {
    await this.db.update('email_connections', connectionId, {
      last_uid: String(lastUid),
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  // ==================== Helpers ====================

  private transformConnection(connection: any): EmailConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      provider: connection.provider as EmailProvider,
      emailAddress: connection.email_address,
      displayName: connection.display_name,
      profilePicture: undefined, // SMTP/IMAP doesn't have profile pictures
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }
}
