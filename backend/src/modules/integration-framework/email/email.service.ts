import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { AiProviderService } from '../../ai-provider/ai-provider.service';
import { EmailOAuthService } from './email-oauth.service';
import axios from 'axios';
import {
  EmailConnectionDto,
  EmailDto,
  EmailListItemDto,
  EmailListResponseDto,
  LabelDto,
  EmailAddressDto,
  EmailAttachmentDto,
  EmailPriorityItemDto,
  EmailPriorityLevel,
  AnalyzeEmailPriorityResponseDto,
  TravelType,
  TravelTicketInfoDto,
  ExtractTravelInfoResponseDto,
} from './dto/email.dto';
import {
  SendEmailDto,
  ReplyEmailDto,
  ForwardEmailDto,
  CreateDraftDto,
  SendEmailResponseDto,
  DraftResponseDto,
} from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: EmailOAuthService,
  ) {}

  // Legacy alias for the AI provider - delegates to db.getAI() until a real
  // AIProviderService is wired in.
  private get aiProvider(): any {
    return this.db.getAI();
  }

  // ==================== Connection Management ====================

  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string) {
    return this.oauthService.getAuthorizationUrl(userId, workspaceId, returnUrl);
  }

  async handleOAuthCallback(code: string, state: string): Promise<EmailConnectionDto> {
    const stateData = this.oauthService.decodeState(state);
    const { userId, workspaceId } = stateData;

    const tokens = await this.oauthService.exchangeCodeForTokens(code);
    const userInfo = await this.oauthService.getUserInfo(tokens.accessToken);

    // Debug: Log user info to verify profile picture is being fetched
    this.logger.log(
      `Gmail OAuth userInfo: email=${userInfo.email}, name=${userInfo.name}, picture=${userInfo.picture || 'NOT PROVIDED'}`,
    );

    // Check for existing connection with the SAME email address
    // This allows multiple Gmail accounts with different email addresses
    const existingConnection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      email_address: userInfo.email,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      provider: 'gmail',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || existingConnection?.refresh_token,
      token_type: tokens.tokenType,
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      email_address: userInfo.email,
      display_name: userInfo.name,
      profile_picture: userInfo.picture,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('email_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('email_connections', connectionData);
    }

    this.logger.log(`Gmail connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Handle native mobile sign-in and store connection
   * Uses server auth code from native Google Sign-In SDK
   */
  async handleNativeSignIn(
    userId: string,
    workspaceId: string,
    serverAuthCode: string,
    userInfo: { email?: string; displayName?: string; photoUrl?: string },
  ): Promise<EmailConnectionDto> {
    // Exchange native auth code for tokens (no redirect_uri)
    const tokens = await this.oauthService.exchangeNativeCodeForTokens(serverAuthCode);

    // Get user info from tokens if not provided by client
    let email = userInfo.email;
    let name = userInfo.displayName;
    let picture = userInfo.photoUrl;

    if (!email) {
      const googleUserInfo = await this.oauthService.getUserInfo(tokens.accessToken);
      email = googleUserInfo.email;
      name = name || googleUserInfo.name;
      picture = picture || googleUserInfo.picture;
    }

    // Check for existing connection with the SAME email address
    const existingConnection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      email_address: email,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      provider: 'gmail',
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken || existingConnection?.refresh_token,
      token_type: tokens.tokenType,
      scope: tokens.scope,
      expires_at: tokens.expiresAt.toISOString(),
      email_address: email,
      display_name: name,
      profile_picture: picture,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('email_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('email_connections', connectionData);
    }

    this.logger.log(
      `Gmail connected via native sign-in for user ${userId} in workspace ${workspaceId}`,
    );

    return this.transformConnection(connection);
  }

  async getConnection(userId: string, workspaceId: string): Promise<EmailConnectionDto | null> {
    const connection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      provider: 'gmail',
      is_active: true,
    });

    // Debug: Log connection data to verify profile_picture is stored
    if (connection) {
      this.logger.log(
        `Gmail connection found: email=${connection.email_address}, profile_picture=${connection.profile_picture || 'NOT SET'}`,
      );
    }

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  async getAllConnections(userId: string, workspaceId: string): Promise<EmailConnectionDto[]> {
    const result = await this.db.findMany('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    const connections = result?.data || [];
    return connections.map((conn) => this.transformConnection(conn));
  }

  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('email_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      provider: 'gmail',
    });

    if (!connection) {
      throw new NotFoundException('Email connection not found');
    }

    try {
      await this.oauthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    await this.db.update('email_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Gmail disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Disconnect a specific email connection by ID
   * This allows disconnecting a specific Gmail account when multiple accounts are connected
   */
  async disconnectById(userId: string, workspaceId: string, connectionId: string): Promise<void> {
    const connection = await this.db.findOne('email_connections', {
      id: connectionId,
      workspace_id: workspaceId,
      user_id: userId,
    });

    if (!connection) {
      throw new NotFoundException('Email connection not found');
    }

    try {
      await this.oauthService.revokeToken(connection.access_token);
    } catch (error) {
      this.logger.warn('Failed to revoke token, continuing with disconnect');
    }

    await this.db.update('email_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(
      `Email connection ${connectionId} disconnected for user ${userId} in workspace ${workspaceId}`,
    );
  }

  /**
   * Get valid access token for Gmail API
   * @param connectionId - Optional specific connection ID. If not provided, returns first active Gmail connection.
   */
  private async getValidAccessToken(
    userId: string,
    workspaceId: string,
    connectionId?: string,
  ): Promise<string> {
    let connection;

    if (connectionId) {
      // Get specific connection by ID
      connection = await this.db.findOne('email_connections', {
        id: connectionId,
        workspace_id: workspaceId,
        user_id: userId,
        provider: 'gmail',
        is_active: true,
      });
    } else {
      // Fallback: get first active Gmail connection
      connection = await this.db.findOne('email_connections', {
        workspace_id: workspaceId,
        user_id: userId,
        provider: 'gmail',
        is_active: true,
      });
    }

    if (!connection) {
      throw new NotFoundException('Gmail not connected. Please connect your Gmail account first.');
    }

    if (
      connection.expires_at &&
      this.oauthService.isTokenExpired(new Date(connection.expires_at))
    ) {
      if (!connection.refresh_token) {
        throw new BadRequestException(
          'Access token expired and no refresh token available. Please reconnect Gmail.',
        );
      }

      const newTokens = await this.oauthService.refreshAccessToken(connection.refresh_token);

      await this.db.update('email_connections', connection.id, {
        access_token: newTokens.accessToken,
        expires_at: newTokens.expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      });

      return newTokens.accessToken;
    }

    return connection.access_token;
  }

  // ==================== Email Operations ====================

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
    const accessToken = await this.getValidAccessToken(userId, workspaceId, options.connectionId);

    const { labelId = 'INBOX', query, pageToken, maxResults = 20 } = options;

    const params: Record<string, any> = {
      maxResults: Math.min(maxResults, 100),
    };

    if (labelId) {
      params.labelIds = labelId;
    }

    if (query) {
      params.q = query;
    }

    if (pageToken) {
      params.pageToken = pageToken;
    }

    const response = await this.makeGmailRequest(accessToken, 'GET', '/users/me/messages', {
      params,
    });

    const emails: EmailListItemDto[] = [];
    if (response.data.messages) {
      // Fetch details for each message (limited batch)
      const messagesToFetch = response.data.messages.slice(0, maxResults);

      for (const message of messagesToFetch) {
        try {
          const fullMessage = await this.makeGmailRequest(
            accessToken,
            'GET',
            `/users/me/messages/${message.id}`,
            { params: { format: 'metadata', metadataHeaders: ['From', 'To', 'Subject', 'Date'] } },
          );
          emails.push(this.transformEmailListItem(fullMessage.data));
        } catch (error) {
          this.logger.warn(`Failed to fetch message ${message.id}:`, error.message);
        }
      }
    }

    return {
      emails,
      nextPageToken: response.data.nextPageToken,
      resultSizeEstimate: response.data.resultSizeEstimate,
    };
  }

  async getMessage(
    userId: string,
    workspaceId: string,
    messageId: string,
    connectionId?: string,
  ): Promise<EmailDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const response = await this.makeGmailRequest(
      accessToken,
      'GET',
      `/users/me/messages/${messageId}`,
      { params: { format: 'full' } },
    );

    return this.transformEmail(response.data);
  }

  async getAttachment(
    userId: string,
    workspaceId: string,
    messageId: string,
    attachmentId: string,
    connectionId?: string,
    filename?: string,
    mimeType?: string,
  ): Promise<{ data: Buffer; mimeType: string; filename: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    // Get the attachment data directly from Gmail
    const attachmentResponse = await this.makeGmailRequest(
      accessToken,
      'GET',
      `/users/me/messages/${messageId}/attachments/${attachmentId}`,
    );

    // Gmail returns base64url encoded data
    const base64Data = attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(base64Data, 'base64');

    return {
      data: buffer,
      mimeType: mimeType || 'application/octet-stream',
      filename: filename || 'attachment',
    };
  }

  async sendEmail(
    userId: string,
    workspaceId: string,
    dto: SendEmailDto,
    connectionId?: string,
  ): Promise<SendEmailResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const rawMessage = this.createRawMessage({
      to: dto.to,
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject,
      body: dto.body,
      isHtml: dto.isHtml ?? true,
      attachments: dto.attachments,
    });

    const response = await this.makeGmailRequest(accessToken, 'POST', '/users/me/messages/send', {
      data: { raw: rawMessage },
    });

    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds || [],
    };
  }

  async replyToEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    dto: ReplyEmailDto,
    connectionId?: string,
  ): Promise<SendEmailResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    // Get original message for threading
    const original = await this.getMessage(userId, workspaceId, messageId, connectionId);

    const replyTo = dto.replyAll
      ? [...(original.to || []), ...(original.cc || [])].map((r) => r.email)
      : ([original.from?.email].filter(Boolean) as string[]);

    const subject = original.subject?.startsWith('Re:')
      ? original.subject
      : `Re: ${original.subject}`;

    const rawMessage = this.createRawMessage({
      to: replyTo,
      subject,
      body: dto.body,
      isHtml: dto.isHtml ?? true,
      attachments: dto.attachments,
      threadId: original.threadId,
      replyToMessageId: messageId,
    });

    const response = await this.makeGmailRequest(accessToken, 'POST', '/users/me/messages/send', {
      data: { raw: rawMessage, threadId: original.threadId },
    });

    return {
      messageId: response.data.id,
      threadId: response.data.threadId,
      labelIds: response.data.labelIds || [],
    };
  }

  async deleteEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    permanent: boolean = false,
    connectionId?: string,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    if (permanent) {
      await this.makeGmailRequest(accessToken, 'DELETE', `/users/me/messages/${messageId}`);
    } else {
      // Move to trash
      await this.makeGmailRequest(accessToken, 'POST', `/users/me/messages/${messageId}/trash`);
    }

    this.logger.log(`Email ${messageId} ${permanent ? 'permanently deleted' : 'moved to trash'}`);
  }

  async markAsRead(
    userId: string,
    workspaceId: string,
    messageId: string,
    isRead: boolean = true,
    connectionId?: string,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const body = isRead ? { removeLabelIds: ['UNREAD'] } : { addLabelIds: ['UNREAD'] };

    await this.makeGmailRequest(accessToken, 'POST', `/users/me/messages/${messageId}/modify`, {
      data: body,
    });
  }

  async starEmail(
    userId: string,
    workspaceId: string,
    messageId: string,
    isStarred: boolean = true,
    connectionId?: string,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const body = isStarred ? { addLabelIds: ['STARRED'] } : { removeLabelIds: ['STARRED'] };

    await this.makeGmailRequest(accessToken, 'POST', `/users/me/messages/${messageId}/modify`, {
      data: body,
    });
  }

  async updateLabels(
    userId: string,
    workspaceId: string,
    messageId: string,
    addLabelIds?: string[],
    removeLabelIds?: string[],
    connectionId?: string,
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const body: any = {};
    if (addLabelIds?.length) body.addLabelIds = addLabelIds;
    if (removeLabelIds?.length) body.removeLabelIds = removeLabelIds;

    await this.makeGmailRequest(accessToken, 'POST', `/users/me/messages/${messageId}/modify`, {
      data: body,
    });
  }

  // ==================== Labels ====================

  async getLabels(userId: string, workspaceId: string, connectionId?: string): Promise<LabelDto[]> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const response = await this.makeGmailRequest(accessToken, 'GET', '/users/me/labels');

    return (response.data.labels || []).map((label: any) => this.transformLabel(label));
  }

  async createLabel(
    userId: string,
    workspaceId: string,
    name: string,
    color?: { textColor: string; backgroundColor: string },
    connectionId?: string,
  ): Promise<LabelDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId, connectionId);

    const labelData: any = {
      name,
      messageListVisibility: 'show',
      labelListVisibility: 'labelShow',
    };

    if (color) {
      labelData.color = color;
    }

    const response = await this.makeGmailRequest(accessToken, 'POST', '/users/me/labels', {
      data: labelData,
    });

    return this.transformLabel(response.data);
  }

  // ==================== Drafts ====================

  async getDrafts(
    userId: string,
    workspaceId: string,
    pageToken?: string,
  ): Promise<{ drafts: any[]; nextPageToken?: string }> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const params: any = { maxResults: 20 };
    if (pageToken) params.pageToken = pageToken;

    const response = await this.makeGmailRequest(accessToken, 'GET', '/users/me/drafts', {
      params,
    });

    return {
      drafts: response.data.drafts || [],
      nextPageToken: response.data.nextPageToken,
    };
  }

  async createDraft(
    userId: string,
    workspaceId: string,
    dto: CreateDraftDto,
  ): Promise<DraftResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const rawMessage = this.createRawMessage({
      to: dto.to || [],
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject || '',
      body: dto.body || '',
      isHtml: dto.isHtml ?? true,
      threadId: dto.threadId,
      replyToMessageId: dto.replyToMessageId,
    });

    const response = await this.makeGmailRequest(accessToken, 'POST', '/users/me/drafts', {
      data: {
        message: { raw: rawMessage, threadId: dto.threadId },
      },
    });

    return {
      draftId: response.data.id,
      messageId: response.data.message.id,
      threadId: response.data.message.threadId,
    };
  }

  async updateDraft(
    userId: string,
    workspaceId: string,
    draftId: string,
    dto: CreateDraftDto,
  ): Promise<DraftResponseDto> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    const rawMessage = this.createRawMessage({
      to: dto.to || [],
      cc: dto.cc,
      bcc: dto.bcc,
      subject: dto.subject || '',
      body: dto.body || '',
      isHtml: dto.isHtml ?? true,
      threadId: dto.threadId,
      replyToMessageId: dto.replyToMessageId,
    });

    const response = await this.makeGmailRequest(
      accessToken,
      'PUT',
      `/users/me/drafts/${draftId}`,
      {
        data: {
          message: { raw: rawMessage, threadId: dto.threadId },
        },
      },
    );

    return {
      draftId: response.data.id,
      messageId: response.data.message.id,
      threadId: response.data.message.threadId,
    };
  }

  async deleteDraft(userId: string, workspaceId: string, draftId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId, workspaceId);

    await this.makeGmailRequest(accessToken, 'DELETE', `/users/me/drafts/${draftId}`);
  }

  // ==================== Helper Methods ====================

  private async makeGmailRequest(
    accessToken: string,
    method: string,
    endpoint: string,
    config: { params?: any; data?: any } = {},
  ): Promise<any> {
    const url = `${this.GMAIL_API_BASE}${endpoint}`;

    try {
      const response = await axios({
        method,
        url,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        params: config.params,
        data: config.data,
      });

      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new BadRequestException('Gmail access token is invalid. Please reconnect.');
      }
      if (error.response?.status === 404) {
        throw new NotFoundException('Email not found');
      }
      this.logger.error('Gmail API error:', error.response?.data || error.message);
      throw new BadRequestException(
        `Gmail API error: ${error.response?.data?.error?.message || error.message}`,
      );
    }
  }

  private transformConnection(connection: any): EmailConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      provider: connection.provider,
      emailAddress: connection.email_address,
      displayName: connection.display_name,
      profilePicture: connection.profile_picture,
      isActive: connection.is_active,
      lastSyncedAt: connection.last_synced_at,
      createdAt: connection.created_at,
    };
  }

  private transformEmailListItem(message: any): EmailListItemDto {
    const headers = this.extractHeaders(message.payload?.headers || []);
    const labelIds = message.labelIds || [];

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds,
      snippet: message.snippet || '',
      from: this.parseEmailAddress(headers.from),
      subject: headers.subject,
      date: headers.date,
      isRead: !labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      hasAttachments: this.hasAttachments(message.payload),
    };
  }

  private transformEmail(message: any): EmailDto {
    const headers = this.extractHeaders(message.payload?.headers || []);
    const labelIds = message.labelIds || [];

    this.logger.log(`transformEmail: messageId=${message.id}, hasPayload=${!!message.payload}`);
    const body = this.extractBody(message.payload);
    this.logger.log(
      `transformEmail: bodyText=${body.text?.length || 0} chars, bodyHtml=${body.html?.length || 0} chars`,
    );

    return {
      id: message.id,
      threadId: message.threadId,
      labelIds,
      snippet: message.snippet || '',
      from: this.parseEmailAddress(headers.from),
      to: this.parseEmailAddresses(headers.to),
      cc: this.parseEmailAddresses(headers.cc),
      bcc: this.parseEmailAddresses(headers.bcc),
      subject: headers.subject,
      bodyText: body.text,
      bodyHtml: body.html,
      date: headers.date,
      internalDate: message.internalDate,
      isRead: !labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      attachments: this.extractAttachments(message.payload),
    };
  }

  private transformLabel(label: any): LabelDto {
    return {
      id: label.id,
      name: label.name,
      type: label.type,
      messagesTotal: label.messagesTotal,
      messagesUnread: label.messagesUnread,
      color: label.color,
    };
  }

  private extractHeaders(headers: any[]): Record<string, string> {
    const result: Record<string, string> = {};
    for (const header of headers) {
      result[header.name.toLowerCase()] = header.value;
    }
    return result;
  }

  private parseEmailAddress(value: string | undefined): EmailAddressDto | undefined {
    if (!value) return undefined;

    const match = value.match(/^(?:(.+?)\s*<(.+?)>|(.+))$/);
    if (match) {
      return {
        name: match[1]?.trim(),
        email: (match[2] || match[3])?.trim(),
      };
    }
    return { email: value };
  }

  private parseEmailAddresses(value: string | undefined): EmailAddressDto[] | undefined {
    if (!value) return undefined;

    return value
      .split(',')
      .map((addr) => this.parseEmailAddress(addr.trim()))
      .filter(Boolean) as EmailAddressDto[];
  }

  private extractBody(payload: any, depth: number = 0): { text?: string; html?: string } {
    const result: { text?: string; html?: string } = {};
    const indent = '  '.repeat(depth);

    if (!payload) {
      this.logger.log(`${indent}extractBody: payload is null`);
      return result;
    }

    this.logger.log(
      `${indent}extractBody: mimeType=${payload.mimeType}, hasBody=${!!payload.body}, hasBodyData=${!!payload.body?.data}, partsCount=${payload.parts?.length || 0}`,
    );

    if (payload.body?.data) {
      // Gmail uses base64url encoding - convert to standard base64 before decoding
      const base64Data = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
      this.logger.log(
        `${indent}extractBody: decoded ${decoded.length} chars for mimeType=${payload.mimeType}`,
      );

      if (payload.mimeType === 'text/plain') {
        result.text = decoded;
      } else if (payload.mimeType === 'text/html') {
        result.html = decoded;
      }
    }

    if (payload.parts) {
      this.logger.log(`${indent}extractBody: processing ${payload.parts.length} parts`);
      for (const part of payload.parts) {
        const partBody = this.extractBody(part, depth + 1);
        if (partBody.text && !result.text) {
          result.text = partBody.text;
        }
        if (partBody.html && !result.html) {
          result.html = partBody.html;
        }
      }
    }

    this.logger.log(
      `${indent}extractBody: returning text=${!!result.text} (${result.text?.length || 0}), html=${!!result.html} (${result.html?.length || 0})`,
    );
    return result;
  }

  private hasAttachments(payload: any): boolean {
    if (!payload) return false;

    if (payload.filename && payload.body?.attachmentId) {
      return true;
    }

    if (payload.parts) {
      return payload.parts.some((part: any) => this.hasAttachments(part));
    }

    return false;
  }

  private extractAttachments(payload: any): EmailAttachmentDto[] {
    const attachments: EmailAttachmentDto[] = [];

    const extractFromPart = (part: any) => {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          attachmentId: part.body.attachmentId,
          filename: part.filename,
          mimeType: part.mimeType,
          size: part.body.size || 0,
        });
      }

      if (part.parts) {
        part.parts.forEach(extractFromPart);
      }
    };

    if (payload) {
      extractFromPart(payload);
    }

    return attachments;
  }

  private createRawMessage(options: {
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    body: string;
    isHtml?: boolean;
    attachments?: { filename: string; content: string; mimeType: string }[];
    threadId?: string;
    replyToMessageId?: string;
  }): string {
    const lines: string[] = [];

    lines.push(`To: ${options.to.join(', ')}`);

    if (options.cc?.length) {
      lines.push(`Cc: ${options.cc.join(', ')}`);
    }

    if (options.bcc?.length) {
      lines.push(`Bcc: ${options.bcc.join(', ')}`);
    }

    lines.push(`Subject: ${options.subject}`);

    if (options.replyToMessageId) {
      lines.push(`In-Reply-To: ${options.replyToMessageId}`);
    }

    if (options.threadId) {
      lines.push(`References: ${options.threadId}`);
    }

    const contentType = options.isHtml ? 'text/html' : 'text/plain';
    lines.push(`Content-Type: ${contentType}; charset=utf-8`);
    lines.push('');
    lines.push(options.body);

    // Handle attachments with proper MIME multipart formatting
    if (options.attachments?.length) {
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Rebuild the message as multipart
      const headers: string[] = [];
      headers.push(`To: ${options.to.join(', ')}`);
      if (options.cc?.length) headers.push(`Cc: ${options.cc.join(', ')}`);
      if (options.bcc?.length) headers.push(`Bcc: ${options.bcc.join(', ')}`);
      headers.push(`Subject: ${options.subject}`);
      if (options.replyToMessageId) headers.push(`In-Reply-To: ${options.replyToMessageId}`);
      if (options.threadId) headers.push(`References: ${options.threadId}`);
      headers.push('MIME-Version: 1.0');
      headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      headers.push('');

      // Body part
      const bodyPart = [
        `--${boundary}`,
        `Content-Type: ${contentType}; charset=utf-8`,
        'Content-Transfer-Encoding: 7bit',
        '',
        options.body,
      ].join('\r\n');

      // Attachment parts
      const attachmentParts: string[] = [];
      for (const attachment of options.attachments) {
        // Line-wrap base64 content at 76 characters (RFC 2045)
        const wrappedContent =
          attachment.content.match(/.{1,76}/g)?.join('\r\n') || attachment.content;

        attachmentParts.push(
          [
            `--${boundary}`,
            `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
            `Content-Disposition: attachment; filename="${attachment.filename}"`,
            'Content-Transfer-Encoding: base64',
            '',
            wrappedContent,
          ].join('\r\n'),
        );
      }

      // Final boundary
      const finalMessage = [
        headers.join('\r\n'),
        bodyPart,
        ...attachmentParts,
        `--${boundary}--`,
      ].join('\r\n');

      return Buffer.from(finalMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
    }

    return Buffer.from(lines.join('\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // ==================== AI Email Priority Analysis ====================

  async analyzeEmailPriority(
    userId: string,
    workspaceId: string,
    emails: EmailPriorityItemDto[],
    connectionId?: string,
  ): Promise<AnalyzeEmailPriorityResponseDto> {
    this.logger.log(`Analyzing priority for ${emails.length} emails`);

    if (emails.length === 0) {
      return { priorities: [] };
    }

    // Limit to 10 emails per request to avoid token limits and truncation
    const emailsToAnalyze = emails.slice(0, 10);

    // Build the prompt for AI analysis
    const emailSummaries = emailsToAnalyze
      .map((email, index) => {
        const sender = email.from?.name || email.from?.email || 'Unknown';
        const subject = email.subject || '(No Subject)';
        const snippet = email.snippet?.substring(0, 200) || '';
        const isUnread = !email.isRead ? '[UNREAD]' : '';
        const hasAttachment = email.hasAttachments ? '[HAS ATTACHMENTS]' : '';

        return `Email ${index + 1} (ID: ${email.id}):
  From: ${sender}
  Subject: ${subject}
  Preview: ${snippet}
  ${isUnread} ${hasAttachment}`;
      })
      .join('\n\n');

    const prompt = `You are an email priority analyzer. Analyze the following emails and assign a priority score to each one.

Consider these factors when determining priority:
- Urgency keywords (URGENT, ASAP, deadline, immediately, critical, important, action required)
- Time-sensitive content (meetings, deadlines, expiring offers)
- Sender importance (executives, managers, clients vs. newsletters, promotions)
- Unread status (unread emails may need attention)
- Request for action or response
- Financial or legal matters
- Personal/direct communication vs. bulk/automated emails

For each email, provide:
1. A priority level: "high", "medium", "low", or "none"
2. A score from 0-10 (10 being most urgent)
3. A brief reason (1 sentence)
4. Key factors that influenced the decision (list of keywords/reasons)

EMAILS TO ANALYZE:
${emailSummaries}

Respond ONLY with a valid JSON array in this exact format, no other text:
[
  {
    "emailId": "actual_email_id_from_input",
    "level": "high|medium|low|none",
    "score": 0-10,
    "reason": "Brief explanation",
    "factors": ["factor1", "factor2"]
  }
]`;

    try {
      // Call AI to analyze priorities
      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      // Parse AI response
      const priorities = this.parseAIPriorityResponse(response, emailsToAnalyze);

      // Save to database if connectionId provided (for cross-platform sync)
      if (connectionId) {
        await this.savePriorities(userId, workspaceId, connectionId, priorities);
      }

      return { priorities };
    } catch (error) {
      this.logger.error(`Failed to analyze email priorities: ${error.message}`);

      // Return default priorities if AI fails
      return {
        priorities: emailsToAnalyze.map((email) => ({
          emailId: email.id,
          priority: {
            level: EmailPriorityLevel.NONE,
            score: 0,
            reason: 'Unable to analyze priority',
            factors: [],
          },
        })),
      };
    }
  }

  private parseAIPriorityResponse(
    response: any,
    emails: EmailPriorityItemDto[],
  ): AnalyzeEmailPriorityResponseDto['priorities'] {
    try {
      // Extract content from response
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response?.content) {
        content = response.content;
      } else if (response?.text) {
        content = response.text;
      } else if (response?.result) {
        content = response.result;
      } else {
        content = JSON.stringify(response);
      }

      this.logger.debug(`AI priority response content: ${content.substring(0, 500)}...`);

      // Try to parse as complete JSON array first
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return this.mapPriorityResults(parsed, emails);
          }
        } catch (parseError) {
          this.logger.warn(`Full JSON parse failed, trying to extract individual objects`);
        }
      }

      // If full parse fails, try to extract individual complete JSON objects
      // This handles truncated responses by salvaging what we can
      const objectMatches = content.matchAll(
        /\{\s*"emailId"\s*:\s*"([^"]+)"[^}]*"level"\s*:\s*"([^"]+)"[^}]*"score"\s*:\s*(\d+)[^}]*"reason"\s*:\s*"([^"]*)"[^}]*"factors"\s*:\s*\[([^\]]*)\][^}]*\}/g,
      );

      const extractedItems: any[] = [];
      for (const match of objectMatches) {
        try {
          const factors = match[5]
            .split(',')
            .map((f) => f.trim().replace(/^"|"$/g, ''))
            .filter((f) => f.length > 0);

          extractedItems.push({
            emailId: match[1],
            level: match[2],
            score: parseInt(match[3]) || 0,
            reason: match[4],
            factors: factors,
          });
        } catch (e) {
          // Skip malformed objects
        }
      }

      if (extractedItems.length > 0) {
        this.logger.log(
          `Extracted ${extractedItems.length} priority items from truncated response`,
        );
        return this.mapPriorityResults(extractedItems, emails);
      }

      throw new Error('No valid priority data found in response');
    } catch (error) {
      this.logger.warn(`Failed to parse AI priority response: ${error.message}`);

      // Return default priorities for all emails
      return emails.map((email) => ({
        emailId: email.id,
        priority: {
          level: EmailPriorityLevel.NONE,
          score: 0,
          reason: 'Failed to parse AI response',
          factors: [],
        },
      }));
    }
  }

  private mapPriorityResults(
    parsed: any[],
    emails: EmailPriorityItemDto[],
  ): AnalyzeEmailPriorityResponseDto['priorities'] {
    // Create a map of parsed results by emailId
    const parsedMap = new Map<string, any>();
    for (const item of parsed) {
      if (item.emailId) {
        parsedMap.set(item.emailId, item);
      }
    }

    // Map all emails, using parsed data if available, defaults otherwise
    return emails.map((email) => {
      const item = parsedMap.get(email.id);
      if (item) {
        const level = this.normalizeLevel(item.level);
        return {
          emailId: email.id,
          priority: {
            level,
            score: Math.min(10, Math.max(0, parseInt(item.score) || 0)),
            reason: item.reason || 'No reason provided',
            factors: Array.isArray(item.factors) ? item.factors : [],
          },
        };
      }
      // Return default for emails not in the parsed response
      return {
        emailId: email.id,
        priority: {
          level: EmailPriorityLevel.NONE,
          score: 0,
          reason: 'Not analyzed',
          factors: [],
        },
      };
    });
  }

  private normalizeLevel(level: string): EmailPriorityLevel {
    const normalized = level?.toLowerCase()?.trim();
    switch (normalized) {
      case 'high':
        return EmailPriorityLevel.HIGH;
      case 'medium':
        return EmailPriorityLevel.MEDIUM;
      case 'low':
        return EmailPriorityLevel.LOW;
      default:
        return EmailPriorityLevel.NONE;
    }
  }

  // Save analyzed priorities to database
  async savePriorities(
    userId: string,
    workspaceId: string,
    connectionId: string,
    priorities: AnalyzeEmailPriorityResponseDto['priorities'],
  ): Promise<void> {
    try {
      for (const item of priorities) {
        // Skip 'none' priorities to save space
        if (item.priority.level === EmailPriorityLevel.NONE) continue;

        // Upsert: update if exists, insert if not
        const existingResult = await this.db
          .table('email_priorities')
          .select('id')
          .where('workspace_id', '=', workspaceId)
          .where('user_id', '=', userId)
          .where('email_id', '=', item.emailId)
          .execute();

        const existingData = Array.isArray(existingResult?.data) ? existingResult.data : [];

        if (existingData.length > 0) {
          // Update existing
          await this.db
            .table('email_priorities')
            .where('id', '=', existingData[0].id)
            .update({
              level: item.priority.level,
              score: item.priority.score,
              reason: item.priority.reason,
              factors: JSON.stringify(item.priority.factors),
              analyzed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .execute();
        } else {
          // Insert new
          await this.db
            .table('email_priorities')
            .insert({
              workspace_id: workspaceId,
              user_id: userId,
              connection_id: connectionId,
              email_id: item.emailId,
              level: item.priority.level,
              score: item.priority.score,
              reason: item.priority.reason,
              factors: JSON.stringify(item.priority.factors),
              analyzed_at: new Date().toISOString(),
            })
            .execute();
        }
      }
      this.logger.log(`Saved ${priorities.length} priorities to database`);
    } catch (error) {
      this.logger.error(`Failed to save priorities: ${error.message}`);
      // Don't throw - saving is optional, analysis result is still valid
    }
  }

  // Get stored priorities for a list of email IDs
  async getStoredPriorities(
    userId: string,
    workspaceId: string,
    emailIds: string[],
  ): Promise<AnalyzeEmailPriorityResponseDto> {
    try {
      if (emailIds.length === 0) {
        return { priorities: [] };
      }

      // Query stored priorities - use whereIn pattern
      const storedResult = await this.db
        .table('email_priorities')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .whereIn('email_id', emailIds)
        .execute();

      const storedData = Array.isArray(storedResult?.data) ? storedResult.data : [];

      const priorities = storedData.map((row) => ({
        emailId: row.email_id,
        priority: {
          level: row.level as EmailPriorityLevel,
          score: row.score,
          reason: row.reason || '',
          factors: typeof row.factors === 'string' ? JSON.parse(row.factors) : row.factors || [],
        },
      }));

      return { priorities };
    } catch (error) {
      this.logger.error(`Failed to get stored priorities: ${error.message}`);
      return { priorities: [] };
    }
  }

  // Get all stored priorities for a connection
  async getPrioritiesForConnection(
    userId: string,
    workspaceId: string,
    connectionId: string,
  ): Promise<AnalyzeEmailPriorityResponseDto> {
    try {
      const storedResult = await this.db
        .table('email_priorities')
        .select('*')
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', userId)
        .where('connection_id', '=', connectionId)
        .orderBy('analyzed_at', 'desc')
        .execute();

      const storedData = Array.isArray(storedResult?.data) ? storedResult.data : [];

      const priorities = storedData.map((row) => ({
        emailId: row.email_id,
        priority: {
          level: row.level as EmailPriorityLevel,
          score: row.score,
          reason: row.reason || '',
          factors: typeof row.factors === 'string' ? JSON.parse(row.factors) : row.factors || [],
        },
      }));

      return { priorities };
    } catch (error) {
      this.logger.error(`Failed to get priorities for connection: ${error.message}`);
      return { priorities: [] };
    }
  }

  // ==================== Travel Ticket Extraction ====================

  async extractTravelInfo(
    userId: string,
    workspaceId: string,
    subject: string,
    body: string,
    senderEmail?: string,
    messageId?: string,
    attachmentId?: string,
    connectionId?: string,
  ): Promise<ExtractTravelInfoResponseDto> {
    this.logger.log(`Extracting travel info from email: ${subject}`);

    // Strip HTML tags for cleaner AI processing
    const cleanBody = body
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If there's a PDF attachment, extract text from it
    let pdfText = '';
    if (messageId && attachmentId) {
      try {
        this.logger.log(`Fetching PDF attachment: ${attachmentId}`);
        const attachment = await this.getAttachment(
          userId,
          workspaceId,
          messageId,
          attachmentId,
          connectionId,
          'ticket.pdf',
          'application/pdf',
        );

        // Parse PDF to extract text using pdf-parse v2.x API

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { PDFParse, VerbosityLevel } = require('pdf-parse');
        const pdfParser = new PDFParse({
          data: attachment.data,
          verbosity: VerbosityLevel.ERRORS,
        });
        await pdfParser.load();
        const pdfData = await pdfParser.getText();
        pdfText = pdfData?.text || '';
        this.logger.log(`Extracted ${pdfText.length} characters from PDF`);
      } catch (error) {
        this.logger.warn(`Failed to extract PDF text: ${error.message}`);
      }
    }

    // Combine email body and PDF text
    const combinedContent = pdfText
      ? `${cleanBody}\n\n--- PDF ATTACHMENT CONTENT ---\n${pdfText}`
      : cleanBody;

    // Limit to avoid token issues
    const truncatedContent = combinedContent.substring(0, 5000);

    const prompt = `You are a travel ticket information extractor. Analyze the following email and any attached PDF content to extract travel/booking information.

EMAIL SUBJECT: ${subject}
EMAIL FROM: ${senderEmail || 'Unknown'}
EMAIL CONTENT:
${truncatedContent}

If this contains a travel ticket (flight, train, bus, or other transport booking), extract the following information. If NO travel ticket is found, return found: false.

Respond ONLY with valid JSON in this exact format:
{
  "found": true/false,
  "travelType": "flight" | "train" | "bus" | "other",
  "bookingReference": "PNR/Booking reference number",
  "passengerName": "Passenger name",
  "departureLocation": "City/Station/Airport name",
  "arrivalLocation": "City/Station/Airport name",
  "departureDateTime": "YYYY-MM-DDTHH:mm:ss",
  "arrivalDateTime": "YYYY-MM-DDTHH:mm:ss",
  "departureTimezone": "+HH:MM or -HH:MM",
  "vehicleNumber": "Flight/Train/Bus number",
  "seatInfo": "Seat number or class",
  "carrier": "Airline/Railway/Bus company name",
  "notes": "Any other important details like terminal, gate, platform"
}

CRITICAL TIME AND TIMEZONE RULES:
- Use EXACTLY the time shown on the ticket - DO NOT convert to any timezone
- Format: YYYY-MM-DDTHH:mm:ss (NO timezone suffix in the datetime field)
- Convert AM/PM to 24-hour format: 5:30 PM = 17:30:00, 3:00 AM = 03:00:00
- If arrival is next day (e.g., depart 5:30 PM, arrive 3:00 AM), increment the date for arrival
- Date format DD/MM/YY means: 27/12/25 = 2025-12-27

DEPARTURE TIMEZONE - Set based on the departure city/country:
- Spain (Madrid, Barcelona): "+01:00"
- UK (London): "+00:00"
- France (Paris): "+01:00"
- Germany (Berlin, Munich): "+01:00"
- USA East (New York, Miami): "-05:00"
- USA West (Los Angeles, San Francisco): "-08:00"
- India (Delhi, Mumbai): "+05:30"
- Bangladesh (Dhaka): "+06:00"
- Japan (Tokyo): "+09:00"
- Australia East (Sydney): "+11:00"
- Dubai, UAE: "+04:00"
- For other locations, use your knowledge of world timezones

Example:
- Madrid to Barcelona, 27/12/25 at 5:30 PM, arrive 3:00 AM
- departureDateTime: "2025-12-27T17:30:00"
- arrivalDateTime: "2025-12-28T03:00:00"
- departureTimezone: "+01:00" (Spain timezone)

Other rules:
- If a field is not found, use null
- For flights, include airport codes if mentioned
- For trains, include station names and platform if available`;

    try {
      const response = await this.aiProvider.generateText(prompt, {
        saveToDatabase: false,
      });

      const ticketInfo = this.parseTravelResponse(response);

      // Generate suggested event title and description
      const suggestedTitle = this.generateEventTitle(ticketInfo);
      const suggestedDescription = this.generateEventDescription(ticketInfo);

      return {
        ticketInfo,
        suggestedTitle,
        suggestedDescription,
      };
    } catch (error) {
      this.logger.error(`Failed to extract travel info: ${error.message}`);
      return {
        ticketInfo: {
          found: false,
          travelType: TravelType.OTHER,
        },
        suggestedTitle: '',
        suggestedDescription: '',
      };
    }
  }

  private parseTravelResponse(response: any): TravelTicketInfoDto {
    try {
      let content = '';
      if (typeof response === 'string') {
        content = response;
      } else if (response?.content) {
        content = response.content;
      } else if (response?.text) {
        content = response.text;
      } else if (response?.result) {
        content = response.result;
      } else {
        content = JSON.stringify(response);
      }

      // Find JSON object in response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Strip timezone info from datetime strings to prevent UTC conversion
      // This keeps the time exactly as shown on the ticket
      const stripTimezone = (dt: string | null | undefined): string | undefined => {
        if (!dt) return undefined;
        // Remove Z suffix, +HH:MM, -HH:MM timezone offsets
        return dt.replace(/Z$/, '').replace(/[+-]\d{2}:\d{2}$/, '');
      };

      return {
        found: parsed.found === true,
        travelType: this.normalizeTravelType(parsed.travelType),
        bookingReference: parsed.bookingReference || undefined,
        passengerName: parsed.passengerName || undefined,
        departureLocation: parsed.departureLocation || undefined,
        arrivalLocation: parsed.arrivalLocation || undefined,
        departureDateTime: stripTimezone(parsed.departureDateTime),
        arrivalDateTime: stripTimezone(parsed.arrivalDateTime),
        departureTimezone: parsed.departureTimezone || undefined,
        vehicleNumber: parsed.vehicleNumber || undefined,
        seatInfo: parsed.seatInfo || undefined,
        carrier: parsed.carrier || undefined,
        notes: parsed.notes || undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to parse travel response: ${error.message}`);
      return {
        found: false,
        travelType: TravelType.OTHER,
      };
    }
  }

  private normalizeTravelType(type: string): TravelType {
    const normalized = type?.toLowerCase()?.trim();
    switch (normalized) {
      case 'flight':
        return TravelType.FLIGHT;
      case 'train':
        return TravelType.TRAIN;
      case 'bus':
        return TravelType.BUS;
      default:
        return TravelType.OTHER;
    }
  }

  private generateEventTitle(ticketInfo: TravelTicketInfoDto): string {
    if (!ticketInfo.found) return '';

    const typeEmoji = {
      [TravelType.FLIGHT]: '✈️',
      [TravelType.TRAIN]: '🚆',
      [TravelType.BUS]: '🚌',
      [TravelType.OTHER]: '🚗',
    };

    const emoji = typeEmoji[ticketInfo.travelType] || '🚗';
    const route =
      ticketInfo.departureLocation && ticketInfo.arrivalLocation
        ? `${ticketInfo.departureLocation} → ${ticketInfo.arrivalLocation}`
        : ticketInfo.departureLocation || ticketInfo.arrivalLocation || 'Travel';

    const vehicleInfo = ticketInfo.vehicleNumber ? ` (${ticketInfo.vehicleNumber})` : '';

    return `${emoji} ${route}${vehicleInfo}`;
  }

  private generateEventDescription(ticketInfo: TravelTicketInfoDto): string {
    if (!ticketInfo.found) return '';

    const lines: string[] = [];

    if (ticketInfo.carrier) {
      lines.push(`Carrier: ${ticketInfo.carrier}`);
    }
    if (ticketInfo.vehicleNumber) {
      lines.push(
        `${ticketInfo.travelType === TravelType.FLIGHT ? 'Flight' : ticketInfo.travelType === TravelType.TRAIN ? 'Train' : 'Vehicle'}: ${ticketInfo.vehicleNumber}`,
      );
    }
    if (ticketInfo.bookingReference) {
      lines.push(`Booking Reference: ${ticketInfo.bookingReference}`);
    }
    if (ticketInfo.passengerName) {
      lines.push(`Passenger: ${ticketInfo.passengerName}`);
    }
    if (ticketInfo.seatInfo) {
      lines.push(`Seat: ${ticketInfo.seatInfo}`);
    }
    if (ticketInfo.departureLocation) {
      lines.push(`From: ${ticketInfo.departureLocation}`);
    }
    if (ticketInfo.arrivalLocation) {
      lines.push(`To: ${ticketInfo.arrivalLocation}`);
    }
    if (ticketInfo.notes) {
      lines.push(`Notes: ${ticketInfo.notes}`);
    }

    return lines.join('\n');
  }
}
