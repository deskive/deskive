import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { EmailOAuthService } from './email-oauth.service';
import { ImapService } from './imap.service';
import { EmailEventExtractorService } from './email-event-extractor.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType, NotificationPriority } from '../../notifications/dto';
import axios from 'axios';

interface EmailConnection {
  id: string;
  workspace_id: string;
  user_id: string;
  provider: string;
  // OAuth fields
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  // IMAP fields
  imap_host?: string;
  imap_port?: number;
  imap_secure?: boolean;
  imap_user?: string;
  imap_password?: string;
  last_uid?: string; // IMAP last processed UID (stored as string in DB)
  // Common fields
  email_address: string;
  display_name: string;
  is_active: boolean;
  notifications_enabled: boolean;
  auto_create_events: boolean;
  last_synced_at: string | null;
  last_history_id: string | null;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
  };
  internalDate?: string;
}

@Injectable()
export class EmailPollingService {
  private readonly logger = new Logger(EmailPollingService.name);
  private readonly GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
  private readonly OAUTH_PROVIDERS = ['gmail', 'google', 'outlook', 'microsoft'];
  private isPolling = false;

  constructor(
    private readonly db: DatabaseService,
    private oauthService: EmailOAuthService,
    private imapService: ImapService,
    private eventExtractorService: EmailEventExtractorService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Poll for new emails every 2 minutes
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async pollForNewEmails(): Promise<void> {
    // Prevent concurrent polling
    if (this.isPolling) {
      this.logger.debug('Polling already in progress, skipping...');
      return;
    }

    this.isPolling = true;
    this.logger.log('📧 Starting email polling cycle...');

    try {
      // Get all active email connections that need polling
      // (either notifications enabled OR auto_create_events enabled)
      const connectionsResult = await this.db
        .table('email_connections')
        .select('*')
        .where('is_active', '=', true)
        .execute();

      const allConnections: EmailConnection[] = Array.isArray(connectionsResult.data)
        ? connectionsResult.data
        : Array.isArray(connectionsResult)
        ? connectionsResult
        : [];

      // Filter to connections that need polling (notifications OR auto_create_events)
      const connections = allConnections.filter(
        (conn) => conn.notifications_enabled || conn.auto_create_events,
      );

      if (connections.length === 0) {
        this.logger.debug('No active email connections needing polling (notifications or auto_create_events)');
        return;
      }

      this.logger.log(`Found ${connections.length} email connection(s) to poll`);

      // Process each connection
      for (const connection of connections) {
        try {
          await this.pollConnection(connection);
        } catch (error) {
          this.logger.error(
            `Failed to poll connection ${connection.id} (${connection.email_address}): ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Email polling cycle failed: ${error.message}`, error.stack);
    } finally {
      this.isPolling = false;
      this.logger.log('📧 Email polling cycle completed');
    }
  }

  /**
   * Poll a single email connection for new emails
   */
  private async pollConnection(connection: EmailConnection): Promise<void> {
    this.logger.debug(`Polling ${connection.email_address} (provider: ${connection.provider})...`);

    // Check if this is an OAuth connection or IMAP connection
    const isOAuth = this.OAUTH_PROVIDERS.includes(connection.provider?.toLowerCase());

    if (isOAuth) {
      await this.pollOAuthConnection(connection);
    } else {
      await this.pollImapConnection(connection);
    }
  }

  /**
   * Poll OAuth-based connection (Gmail, Outlook) using their APIs
   */
  private async pollOAuthConnection(connection: EmailConnection): Promise<void> {
    // Get valid access token (refresh if needed)
    const accessToken = await this.getValidAccessToken(connection);
    if (!accessToken) {
      this.logger.warn(`Could not get valid access token for ${connection.email_address}`);
      return;
    }

    // Check for new emails using Gmail history API or list API
    const newEmails = await this.fetchNewEmails(accessToken, connection);

    if (newEmails.length === 0) {
      this.logger.debug(`No new emails for ${connection.email_address}`);
      return;
    }

    this.logger.log(`Found ${newEmails.length} new email(s) for ${connection.email_address}`);

    // Create notifications for new emails (only if notifications enabled)
    if (connection.notifications_enabled) {
      for (const email of newEmails) {
        await this.createEmailNotification(connection, email);
      }
    }

    // Auto-create events if enabled
    if (connection.auto_create_events && newEmails.length > 0) {
      await this.processGmailEmailsForEvents(connection, newEmails, accessToken);
    }

    // Update last_synced_at
    await this.db.update('email_connections', connection.id, {
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Poll IMAP-based connection using IMAP protocol
   */
  private async pollImapConnection(connection: EmailConnection): Promise<void> {
    // Validate IMAP credentials
    if (!connection.imap_host || !connection.imap_user || !connection.imap_password) {
      this.logger.warn(`Missing IMAP credentials for ${connection.email_address}`);
      return;
    }

    try {
      const imapConfig = {
        host: connection.imap_host,
        port: connection.imap_port || 993,
        secure: connection.imap_secure ?? true,
        user: connection.imap_user,
        password: connection.imap_password,
      };

      // Get the last UID we polled (default to 0 for first poll)
      const lastUid = connection.last_uid ? parseInt(connection.last_uid, 10) : 0;

      // Fetch new emails since last UID
      const result = await this.imapService.fetchNewEmails(imapConfig, 'INBOX', lastUid);

      if (result.emails.length === 0) {
        this.logger.debug(`No new emails for ${connection.email_address}`);
        return;
      }

      // Filter emails to only include those from the last 24 hours
      const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
      const recentEmails = result.emails.filter((email) => {
        if (!email.date) return false;
        const emailDate = new Date(email.date).getTime();
        return emailDate >= twentyFourHoursAgo;
      });

      if (recentEmails.length === 0) {
        this.logger.debug(`No recent emails (within 24h) for ${connection.email_address}`);
        // Still update the last_uid to avoid re-checking old emails
        await this.db.update('email_connections', connection.id, {
          last_uid: String(result.lastUid),
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        return;
      }

      this.logger.log(`Found ${recentEmails.length} new IMAP email(s) within 24h for ${connection.email_address}`);

      // Create notifications for recent emails only (if notifications enabled)
      if (connection.notifications_enabled) {
        for (const email of recentEmails) {
          await this.createImapEmailNotification(connection, email);
        }
      }

      // Auto-create events if enabled
      if (connection.auto_create_events && recentEmails.length > 0) {
        await this.processEmailsForEvents(connection, recentEmails, imapConfig);
      }

      // Update last_uid and last_synced_at
      await this.db.update('email_connections', connection.id, {
        last_uid: String(result.lastUid),
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`IMAP polling failed for ${connection.email_address}: ${error.message}`);
    }
  }

  /**
   * Process emails for automatic event creation
   */
  private async processEmailsForEvents(
    connection: EmailConnection,
    emails: Array<{ id: string; threadId: string; from?: { name?: string; email: string }; subject?: string; date?: string }>,
    imapConfig: { host: string; port: number; secure: boolean; user: string; password: string },
  ): Promise<void> {
    this.logger.log(`🔍 Processing ${emails.length} email(s) for event extraction...`);

    let totalEventsCreated = 0;

    for (const email of emails) {
      try {
        // Fetch full email content with body and attachments
        const fullEmail = await this.imapService.fetchEmail(imapConfig, email.id, 'INBOX');

        if (!fullEmail) {
          continue;
        }

        // Process for event extraction
        const result = await this.eventExtractorService.processEmailForEvents(
          {
            id: email.id,
            subject: fullEmail.subject,
            bodyText: fullEmail.bodyText,
            bodyHtml: fullEmail.bodyHtml,
            from: fullEmail.from,
            date: fullEmail.date,
            // Note: For attachments, we'd need to fetch them separately
            // The current fetchEmail doesn't return raw attachment data
          },
          connection.workspace_id,
          connection.user_id,
        );

        totalEventsCreated += result.eventsCreated;
      } catch (error) {
        this.logger.warn(`Failed to process email ${email.id} for events: ${error.message}`);
      }
    }

    if (totalEventsCreated > 0) {
      this.logger.log(`📅 Auto-created ${totalEventsCreated} event(s) from emails for ${connection.email_address}`);
    }
  }

  /**
   * Process Gmail emails for automatic event creation
   */
  private async processGmailEmailsForEvents(
    connection: EmailConnection,
    emails: GmailMessage[],
    accessToken: string,
  ): Promise<void> {
    this.logger.log(`🔍 Processing ${emails.length} Gmail email(s) for event extraction...`);

    let totalEventsCreated = 0;

    for (const email of emails) {
      try {
        // Fetch full email content with body
        const fullEmail = await this.fetchGmailFullMessage(accessToken, email.id);

        if (!fullEmail) {
          continue;
        }

        // Process for event extraction
        const result = await this.eventExtractorService.processEmailForEvents(
          {
            id: email.id,
            subject: fullEmail.subject,
            bodyText: fullEmail.bodyText,
            bodyHtml: fullEmail.bodyHtml,
            from: fullEmail.from,
            date: fullEmail.date,
            attachments: fullEmail.attachments,
          },
          connection.workspace_id,
          connection.user_id,
        );

        totalEventsCreated += result.eventsCreated;
      } catch (error) {
        this.logger.warn(`Failed to process Gmail email ${email.id} for events: ${error.message}`);
      }
    }

    if (totalEventsCreated > 0) {
      this.logger.log(`📅 Auto-created ${totalEventsCreated} event(s) from Gmail for ${connection.email_address}`);
    }
  }

  /**
   * Fetch full Gmail message with body and attachments
   */
  private async fetchGmailFullMessage(
    accessToken: string,
    messageId: string,
  ): Promise<{
    id: string;
    subject?: string;
    bodyText?: string;
    bodyHtml?: string;
    from?: { name?: string; email: string };
    date?: string;
    attachments?: Array<{ filename: string; content: Buffer; contentType: string }>;
  } | null> {
    try {
      const response = await axios.get(`${this.GMAIL_API_BASE}/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { format: 'full' },
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      // Extract headers
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;

      const fromHeader = getHeader('From') || '';
      const fromMatch = fromHeader.match(/^(?:(.+?)\s*<(.+?)>|(.+))$/);

      // Extract body
      const body = this.extractGmailBody(message.payload);

      // Extract ICS attachments
      const attachments: Array<{ filename: string; content: Buffer; contentType: string }> = [];
      await this.extractGmailIcsAttachments(message.payload, attachments, accessToken, messageId);

      return {
        id: message.id,
        subject: getHeader('Subject'),
        bodyText: body.text,
        bodyHtml: body.html,
        from: fromMatch
          ? {
              name: fromMatch[1]?.trim(),
              email: (fromMatch[2] || fromMatch[3])?.trim(),
            }
          : { email: fromHeader },
        date: getHeader('Date'),
        attachments: attachments.length > 0 ? attachments : undefined,
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch full Gmail message ${messageId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract body from Gmail payload
   */
  private extractGmailBody(payload: any): { text?: string; html?: string } {
    const result: { text?: string; html?: string } = {};

    if (!payload) return result;

    if (payload.body?.data) {
      const base64Data = payload.body.data.replace(/-/g, '+').replace(/_/g, '/');
      const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');

      if (payload.mimeType === 'text/plain') {
        result.text = decoded;
      } else if (payload.mimeType === 'text/html') {
        result.html = decoded;
      }
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        const partBody = this.extractGmailBody(part);
        if (partBody.text && !result.text) result.text = partBody.text;
        if (partBody.html && !result.html) result.html = partBody.html;
      }
    }

    return result;
  }

  /**
   * Extract ICS attachments from Gmail payload
   */
  private async extractGmailIcsAttachments(
    payload: any,
    attachments: Array<{ filename: string; content: Buffer; contentType: string }>,
    accessToken: string,
    messageId: string,
  ): Promise<void> {
    if (!payload) return;

    // Check if this part is an ICS attachment
    if (payload.filename && payload.body?.attachmentId) {
      const isIcs =
        payload.filename.toLowerCase().endsWith('.ics') ||
        payload.mimeType?.includes('calendar') ||
        payload.mimeType?.includes('ics');

      if (isIcs) {
        try {
          // Fetch attachment data
          const attachmentResponse = await axios.get(
            `${this.GMAIL_API_BASE}/users/me/messages/${messageId}/attachments/${payload.body.attachmentId}`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
          );

          const base64Data = attachmentResponse.data.data.replace(/-/g, '+').replace(/_/g, '/');
          const content = Buffer.from(base64Data, 'base64');

          attachments.push({
            filename: payload.filename,
            content,
            contentType: payload.mimeType || 'text/calendar',
          });
        } catch (error) {
          this.logger.warn(`Failed to fetch ICS attachment: ${error.message}`);
        }
      }
    }

    // Recursively check parts
    if (payload.parts) {
      for (const part of payload.parts) {
        await this.extractGmailIcsAttachments(part, attachments, accessToken, messageId);
      }
    }
  }

  /**
   * Create notification for a new IMAP email
   */
  private async createImapEmailNotification(
    connection: EmailConnection,
    email: { id: string; threadId: string; from?: { name?: string; email: string }; subject?: string; snippet?: string },
  ): Promise<void> {
    try {
      const senderName = email.from?.name || email.from?.email || 'Unknown Sender';
      const senderEmail = email.from?.email || '';
      const subject = email.subject || '(No Subject)';

      // Create notification
      await this.notificationsService.sendNotification({
        user_id: connection.user_id,
        type: NotificationType.EMAIL,
        title: `New email from ${senderName}`,
        message: subject,
        priority: NotificationPriority.NORMAL,
        action_url: `/workspaces/${connection.workspace_id}/email/message/${email.id}`,
        data: {
          email_id: email.id,
          thread_id: email.threadId,
          from_name: senderName,
          from_email: senderEmail,
          subject: subject,
          snippet: email.snippet || '',
          workspace_id: connection.workspace_id,
          email_address: connection.email_address,
        },
        send_push: true,
        send_email: false,
      });

      this.logger.log(`📬 Created notification for IMAP email "${subject}" from ${senderName}`);
    } catch (error) {
      this.logger.error(`Failed to create IMAP email notification: ${error.message}`);
    }
  }

  /**
   * Get valid access token, refresh if expired
   */
  private async getValidAccessToken(connection: EmailConnection): Promise<string | null> {
    try {
      // Check if token is expired
      if (connection.expires_at && this.oauthService.isTokenExpired(new Date(connection.expires_at))) {
        if (!connection.refresh_token) {
          this.logger.warn(`Access token expired and no refresh token for ${connection.email_address}`);
          return null;
        }

        // Refresh the token
        const newTokens = await this.oauthService.refreshAccessToken(connection.refresh_token);

        // Update the connection with new tokens
        await this.db.update('email_connections', connection.id, {
          access_token: newTokens.accessToken,
          expires_at: newTokens.expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        });

        return newTokens.accessToken;
      }

      return connection.access_token;
    } catch (error) {
      this.logger.error(`Failed to get valid access token: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetch new emails since last sync
   */
  private async fetchNewEmails(
    accessToken: string,
    connection: EmailConnection,
  ): Promise<GmailMessage[]> {
    try {
      // If we have a history ID, use the history API for efficiency
      if (connection.last_history_id) {
        return await this.fetchEmailsUsingHistory(accessToken, connection);
      }

      // Otherwise, use the list API with a time filter
      return await this.fetchEmailsUsingList(accessToken, connection);
    } catch (error) {
      this.logger.error(`Failed to fetch new emails: ${error.message}`);
      return [];
    }
  }

  /**
   * Fetch emails using Gmail History API (efficient incremental sync)
   */
  private async fetchEmailsUsingHistory(
    accessToken: string,
    connection: EmailConnection,
  ): Promise<GmailMessage[]> {
    try {
      const response = await axios.get(`${this.GMAIL_API_BASE}/users/me/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          startHistoryId: connection.last_history_id,
          historyTypes: 'messageAdded',
          labelId: 'INBOX',
        },
      });

      const history = response.data.history || [];
      const newMessageIds = new Set<string>();

      // Extract message IDs from history
      for (const historyItem of history) {
        if (historyItem.messagesAdded) {
          for (const messageAdded of historyItem.messagesAdded) {
            // Only include messages in INBOX (not sent, spam, etc.)
            if (messageAdded.message?.labelIds?.includes('INBOX')) {
              newMessageIds.add(messageAdded.message.id);
            }
          }
        }
      }

      // Update history ID for next poll
      if (response.data.historyId) {
        await this.db.update('email_connections', connection.id, {
          last_history_id: response.data.historyId,
        });
      }

      // Fetch full message details for new messages
      const messages: GmailMessage[] = [];
      for (const messageId of newMessageIds) {
        const message = await this.fetchMessageDetails(accessToken, messageId);
        if (message) {
          messages.push(message);
        }
      }

      return messages;
    } catch (error) {
      // If history is too old (404 error), fall back to list API
      if (error.response?.status === 404) {
        this.logger.warn(`History ID expired for ${connection.email_address}, using list API`);
        return await this.fetchEmailsUsingList(accessToken, connection);
      }
      throw error;
    }
  }

  /**
   * Fetch emails using Gmail List API (fallback method)
   */
  private async fetchEmailsUsingList(
    accessToken: string,
    connection: EmailConnection,
  ): Promise<GmailMessage[]> {
    // Build query to get recent unread emails in INBOX
    let query = 'in:inbox is:unread';

    // If we have last_synced_at, only get emails after that time
    if (connection.last_synced_at) {
      const lastSyncDate = new Date(connection.last_synced_at);
      const afterTimestamp = Math.floor(lastSyncDate.getTime() / 1000);
      query += ` after:${afterTimestamp}`;
    } else {
      // First sync: only get emails from last 5 minutes to avoid notification spam
      const fiveMinutesAgo = Math.floor((Date.now() - 5 * 60 * 1000) / 1000);
      query += ` after:${fiveMinutesAgo}`;
    }

    const response = await axios.get(`${this.GMAIL_API_BASE}/users/me/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: query,
        maxResults: 10, // Limit to prevent notification spam
      },
    });

    const messageList = response.data.messages || [];
    const messages: GmailMessage[] = [];

    // Get current history ID for future incremental syncs
    const profileResponse = await axios.get(`${this.GMAIL_API_BASE}/users/me/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (profileResponse.data.historyId) {
      await this.db.update('email_connections', connection.id, {
        last_history_id: profileResponse.data.historyId,
      });
    }

    // Fetch full message details
    for (const msg of messageList) {
      const message = await this.fetchMessageDetails(accessToken, msg.id);
      if (message) {
        messages.push(message);
      }
    }

    return messages;
  }

  /**
   * Fetch full message details
   */
  private async fetchMessageDetails(accessToken: string, messageId: string): Promise<GmailMessage | null> {
    try {
      const response = await axios.get(`${this.GMAIL_API_BASE}/users/me/messages/${messageId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        },
      });

      return response.data;
    } catch (error) {
      this.logger.warn(`Failed to fetch message ${messageId}: ${error.message}`);
      return null;
    }
  }

  /**
   * Create notification for a new email
   */
  private async createEmailNotification(
    connection: EmailConnection,
    email: GmailMessage,
  ): Promise<void> {
    try {
      // Extract headers
      const headers = email.payload?.headers || [];
      const fromHeader = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
      const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';

      // Parse sender name and email
      const senderMatch = fromHeader.match(/^(?:(.+?)\s*<(.+?)>|(.+))$/);
      const senderName = senderMatch?.[1]?.trim() || senderMatch?.[3]?.trim() || fromHeader;
      const senderEmail = senderMatch?.[2]?.trim() || fromHeader;

      // Create notification
      await this.notificationsService.sendNotification({
        user_id: connection.user_id,
        type: NotificationType.EMAIL,
        title: `New email from ${senderName}`,
        message: subjectHeader,
        priority: NotificationPriority.NORMAL,
        action_url: `/workspaces/${connection.workspace_id}/email/message/${email.id}`,
        data: {
          email_id: email.id,
          thread_id: email.threadId,
          from_name: senderName,
          from_email: senderEmail,
          subject: subjectHeader,
          snippet: email.snippet,
          workspace_id: connection.workspace_id,
          email_address: connection.email_address,
        },
        send_push: true,
        send_email: false, // Don't send email notification for emails (that would be ironic)
      });

      this.logger.log(`📬 Created notification for email "${subjectHeader}" from ${senderName}`);
    } catch (error) {
      this.logger.error(`Failed to create email notification: ${error.message}`);
    }
  }

  /**
   * Manually trigger a poll for a specific user (useful for testing)
   */
  async pollForUser(userId: string, workspaceId: string): Promise<{ newEmails: number }> {
    const connection = await this.db.findOne('email_connections', {
      user_id: userId,
      workspace_id: workspaceId,
      is_active: true,
    });

    if (!connection) {
      throw new Error('No active email connection found');
    }

    const accessToken = await this.getValidAccessToken(connection);
    if (!accessToken) {
      throw new Error('Could not get valid access token');
    }

    const newEmails = await this.fetchNewEmails(accessToken, connection);

    for (const email of newEmails) {
      await this.createEmailNotification(connection, email);
    }

    // Update last_synced_at
    await this.db.update('email_connections', connection.id, {
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return { newEmails: newEmails.length };
  }

  /**
   * Enable/disable notifications for a connection
   */
  async setNotificationsEnabled(
    userId: string,
    workspaceId: string,
    enabled: boolean,
  ): Promise<void> {
    const connection = await this.db.findOne('email_connections', {
      user_id: userId,
      workspace_id: workspaceId,
    });

    if (!connection) {
      throw new Error('Email connection not found');
    }

    await this.db.update('email_connections', connection.id, {
      notifications_enabled: enabled,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`Email notifications ${enabled ? 'enabled' : 'disabled'} for ${connection.email_address}`);
  }

  /**
   * Update connection settings (notifications, auto-create events, etc.)
   */
  async updateConnectionSettings(
    userId: string,
    workspaceId: string,
    connectionId: string,
    settings: {
      notificationsEnabled?: boolean;
      autoCreateEvents?: boolean;
    },
  ): Promise<EmailConnection> {
    // Find the connection
    const result = await this.db
      .table('email_connections')
      .select('*')
      .where('id', '=', connectionId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const connections = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];

    if (connections.length === 0) {
      throw new Error('Email connection not found');
    }

    const connection = connections[0] as EmailConnection;

    // Build update payload
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof settings.notificationsEnabled === 'boolean') {
      updatePayload.notifications_enabled = settings.notificationsEnabled;
    }

    if (typeof settings.autoCreateEvents === 'boolean') {
      updatePayload.auto_create_events = settings.autoCreateEvents;
    }

    // Update the connection
    await this.db.update('email_connections', connectionId, updatePayload);

    this.logger.log(
      `Updated settings for ${connection.email_address}: ${JSON.stringify(settings)}`,
    );

    // Return updated connection
    return {
      ...connection,
      notifications_enabled: settings.notificationsEnabled ?? connection.notifications_enabled,
      auto_create_events: settings.autoCreateEvents ?? connection.auto_create_events,
    };
  }

  /**
   * Get connection settings
   */
  async getConnectionSettings(
    userId: string,
    workspaceId: string,
    connectionId: string,
  ): Promise<{ notificationsEnabled: boolean; autoCreateEvents: boolean }> {
    const result = await this.db
      .table('email_connections')
      .select('notifications_enabled', 'auto_create_events')
      .where('id', '=', connectionId)
      .where('user_id', '=', userId)
      .where('workspace_id', '=', workspaceId)
      .execute();

    const connections = Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : [];

    if (connections.length === 0) {
      throw new Error('Email connection not found');
    }

    const connection = connections[0];

    return {
      notificationsEnabled: connection.notifications_enabled ?? false,
      autoCreateEvents: connection.auto_create_events ?? false,
    };
  }
}
