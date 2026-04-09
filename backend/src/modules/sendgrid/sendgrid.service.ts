import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import axios from 'axios';
import {
  SendGridConnectionDto,
  SendGridConnectDto,
  SendGridSendEmailDto,
  SendEmailResponseDto,
  SendGridTemplateDto,
  ListTemplatesResponseDto,
  EmailStatsDto,
  GetStatsResponseDto,
  ValidateApiKeyResponseDto,
  SendBulkEmailDto,
  BulkEmailResponseDto,
} from './dto/sendgrid.dto';

@Injectable()
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private readonly SENDGRID_API_BASE = 'https://api.sendgrid.com/v3';

  constructor(private readonly db: DatabaseService) {}

  // ==================== Connection Management ====================

  /**
   * Save SendGrid API key connection for user
   */
  async saveConnection(
    userId: string,
    workspaceId: string,
    connectDto: SendGridConnectDto,
  ): Promise<SendGridConnectionDto> {
    // First validate the API key
    const validation = await this.validateApiKey(connectDto.apiKey);
    if (!validation.valid) {
      throw new BadRequestException(`Invalid SendGrid API key: ${validation.error}`);
    }

    // Check if this user already has a connection in this workspace
    const existingConnection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
    });

    const connectionData = {
      workspace_id: workspaceId,
      user_id: userId,
      api_key: connectDto.apiKey, // In production, this should be encrypted
      sender_email: connectDto.senderEmail,
      sender_name: connectDto.senderName || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let connection;
    if (existingConnection) {
      await this.db.update('sendgrid_connections', existingConnection.id, connectionData);
      connection = { ...existingConnection, ...connectionData };
    } else {
      connection = await this.db.insert('sendgrid_connections', connectionData);
    }

    this.logger.log(`SendGrid connected for user ${userId} in workspace ${workspaceId}`);

    return this.transformConnection(connection);
  }

  /**
   * Get user's SendGrid connection in this workspace
   */
  async getConnection(userId: string, workspaceId: string): Promise<SendGridConnectionDto | null> {
    const connection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return null;
    }

    return this.transformConnection(connection);
  }

  /**
   * Disconnect user's SendGrid in this workspace
   */
  async disconnect(userId: string, workspaceId: string): Promise<void> {
    const connection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('SendGrid connection not found');
    }

    // Soft delete the connection
    await this.db.update('sendgrid_connections', connection.id, {
      is_active: false,
      updated_at: new Date().toISOString(),
    });

    this.logger.log(`SendGrid disconnected for user ${userId} in workspace ${workspaceId}`);
  }

  /**
   * Get API key for authenticated requests
   */
  private async getApiKey(userId: string, workspaceId: string): Promise<string> {
    const connection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('SendGrid not connected. Please connect your SendGrid first.');
    }

    return connection.api_key;
  }

  /**
   * Get connection with API key for internal use
   */
  private async getFullConnection(userId: string, workspaceId: string): Promise<any> {
    const connection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      throw new NotFoundException('SendGrid not connected. Please connect your SendGrid first.');
    }

    return connection;
  }

  // ==================== Email Operations ====================

  /**
   * Send an email via SendGrid
   */
  async sendEmail(
    userId: string,
    workspaceId: string,
    emailDto: SendGridSendEmailDto,
  ): Promise<SendEmailResponseDto> {
    const connection = await this.getFullConnection(userId, workspaceId);

    const fromEmail = emailDto.fromEmail || connection.sender_email;
    const fromName = emailDto.fromName || connection.sender_name;

    // Build the SendGrid mail payload
    const payload: any = {
      personalizations: [
        {
          to: emailDto.to.map((r) => ({ email: r.email, name: r.name })),
        },
      ],
      from: {
        email: fromEmail,
        name: fromName || undefined,
      },
      subject: emailDto.subject,
    };

    // Add CC if provided
    if (emailDto.cc && emailDto.cc.length > 0) {
      payload.personalizations[0].cc = emailDto.cc.map((r) => ({ email: r.email, name: r.name }));
    }

    // Add BCC if provided
    if (emailDto.bcc && emailDto.bcc.length > 0) {
      payload.personalizations[0].bcc = emailDto.bcc.map((r) => ({ email: r.email, name: r.name }));
    }

    // Add reply-to if provided
    if (emailDto.replyTo) {
      payload.reply_to = { email: emailDto.replyTo };
    }

    // Add content (text/html)
    if (emailDto.templateId) {
      payload.template_id = emailDto.templateId;
      if (emailDto.dynamicTemplateData) {
        payload.personalizations[0].dynamic_template_data = emailDto.dynamicTemplateData;
      }
    } else {
      payload.content = [];
      if (emailDto.text) {
        payload.content.push({ type: 'text/plain', value: emailDto.text });
      }
      if (emailDto.html) {
        payload.content.push({ type: 'text/html', value: emailDto.html });
      }
      // Ensure at least one content type
      if (payload.content.length === 0) {
        throw new BadRequestException('Email must have text, html content, or a template ID');
      }
    }

    // Add attachments if provided
    if (emailDto.attachments && emailDto.attachments.length > 0) {
      payload.attachments = emailDto.attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type,
        disposition: a.disposition || 'attachment',
      }));
    }

    // Add categories if provided
    if (emailDto.categories && emailDto.categories.length > 0) {
      payload.categories = emailDto.categories;
    }

    // Add scheduled send time if provided
    if (emailDto.sendAt) {
      payload.send_at = Math.floor(new Date(emailDto.sendAt).getTime() / 1000);
    }

    try {
      const response = await this.makeApiRequest(connection.api_key, '/mail/send', 'POST', payload);

      // SendGrid returns 202 for successful send with no body
      // The message ID is in the x-message-id header
      const messageId = response.headers?.['x-message-id'];

      this.logger.log(`Email sent via SendGrid for user ${userId}, messageId: ${messageId}`);

      return {
        success: true,
        messageId,
      };
    } catch (error) {
      this.logger.error('Failed to send email:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors?.[0]?.message || error.message || 'Failed to send email',
      };
    }
  }

  /**
   * Send bulk emails using a template
   */
  async sendBulkEmail(
    userId: string,
    workspaceId: string,
    bulkEmailDto: SendBulkEmailDto,
  ): Promise<BulkEmailResponseDto> {
    const connection = await this.getFullConnection(userId, workspaceId);

    let successCount = 0;
    let failureCount = 0;

    // Process each recipient - SendGrid v3 supports personalizations for bulk sending
    // For simplicity, we'll batch them into a single request with multiple personalizations
    const personalizations = bulkEmailDto.recipients.map((recipient) => {
      const personalization: any = {
        to: [{ email: recipient.email }],
      };

      // Merge global data with recipient-specific data
      const dynamicData = {
        ...(bulkEmailDto.globalData || {}),
        ...(recipient.templateData || {}),
      };

      if (Object.keys(dynamicData).length > 0) {
        personalization.dynamic_template_data = dynamicData;
      }

      return personalization;
    });

    const payload = {
      personalizations,
      from: {
        email: connection.sender_email,
        name: connection.sender_name || undefined,
      },
      template_id: bulkEmailDto.templateId,
    };

    try {
      const response = await this.makeApiRequest(connection.api_key, '/mail/send', 'POST', payload);
      const messageId = response.headers?.['x-message-id'];

      successCount = bulkEmailDto.recipients.length;

      this.logger.log(`Bulk email sent via SendGrid for user ${userId}, recipients: ${successCount}`);

      return {
        jobId: messageId,
        status: 'sent',
        totalRecipients: bulkEmailDto.recipients.length,
        successCount,
        failureCount,
      };
    } catch (error) {
      this.logger.error('Failed to send bulk email:', error.response?.data || error.message);
      failureCount = bulkEmailDto.recipients.length;

      return {
        status: 'failed',
        totalRecipients: bulkEmailDto.recipients.length,
        successCount,
        failureCount,
      };
    }
  }

  // ==================== Template Operations ====================

  /**
   * List email templates from SendGrid
   */
  async listTemplates(
    userId: string,
    workspaceId: string,
    options: {
      generations?: string;
      pageSize?: number;
      pageToken?: string;
    } = {},
  ): Promise<ListTemplatesResponseDto> {
    const apiKey = await this.getApiKey(userId, workspaceId);

    const { generations = 'dynamic', pageSize = 50, pageToken } = options;

    try {
      const queryParams = new URLSearchParams({
        generations: generations,
        page_size: pageSize.toString(),
      });

      if (pageToken) {
        queryParams.append('page_token', pageToken);
      }

      const response = await this.makeApiRequest(
        apiKey,
        `/templates?${queryParams.toString()}`,
        'GET',
      );

      const templates: SendGridTemplateDto[] = (response.data.result || []).map((t: any) =>
        this.transformTemplate(t),
      );

      return {
        templates,
        metadata: response.data._metadata,
      };
    } catch (error) {
      this.logger.error('Failed to list templates:', error.response?.data || error.message);
      throw new BadRequestException('Failed to list templates from SendGrid');
    }
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(
    userId: string,
    workspaceId: string,
    templateId: string,
  ): Promise<SendGridTemplateDto> {
    const apiKey = await this.getApiKey(userId, workspaceId);

    try {
      const response = await this.makeApiRequest(apiKey, `/templates/${templateId}`, 'GET');

      return this.transformTemplate(response.data);
    } catch (error) {
      this.logger.error('Failed to get template:', error.response?.data || error.message);
      throw new NotFoundException('Template not found in SendGrid');
    }
  }

  // ==================== Stats Operations ====================

  /**
   * Get email statistics
   */
  async getStats(
    userId: string,
    workspaceId: string,
    options: {
      startDate: string;
      endDate?: string;
      aggregatedBy?: 'day' | 'week' | 'month';
    },
  ): Promise<GetStatsResponseDto> {
    const apiKey = await this.getApiKey(userId, workspaceId);

    const { startDate, endDate, aggregatedBy = 'day' } = options;

    try {
      const queryParams = new URLSearchParams({
        start_date: startDate,
        aggregated_by: aggregatedBy,
      });

      if (endDate) {
        queryParams.append('end_date', endDate);
      }

      const response = await this.makeApiRequest(
        apiKey,
        `/stats?${queryParams.toString()}`,
        'GET',
      );

      const stats: EmailStatsDto[] = (response.data || []).map((s: any) =>
        this.transformStats(s),
      );

      return { stats };
    } catch (error) {
      this.logger.error('Failed to get stats:', error.response?.data || error.message);
      throw new BadRequestException('Failed to get statistics from SendGrid');
    }
  }

  // ==================== Validation ====================

  /**
   * Test the current connection by validating the stored API key
   */
  async testConnection(
    userId: string,
    workspaceId: string,
  ): Promise<{ success: boolean; message?: string; senderEmail?: string; senderName?: string }> {
    const connection = await this.db.findOne('sendgrid_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      is_active: true,
    });

    if (!connection) {
      return {
        success: false,
        message: 'SendGrid not connected. Please connect your API key first.',
      };
    }

    const validation = await this.validateApiKey(connection.api_key);
    if (validation.valid) {
      return {
        success: true,
        message: 'SendGrid API key is valid and working.',
        senderEmail: connection.sender_email,
        senderName: connection.sender_name,
      };
    }

    return {
      success: false,
      message: validation.error || 'SendGrid API key is invalid or expired. Please reconnect.',
    };
  }

  /**
   * Validate an API key
   */
  async validateApiKey(apiKey: string): Promise<ValidateApiKeyResponseDto> {
    try {
      const response = await axios.get(`${this.SENDGRID_API_BASE}/scopes`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        valid: true,
        scopes: response.data.scopes,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.errors?.[0]?.message || 'Invalid API key',
      };
    }
  }

  // ==================== Helper Methods ====================

  private async makeApiRequest(
    apiKey: string,
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    data?: any,
  ): Promise<any> {
    try {
      const response = await axios({
        method,
        url: `${this.SENDGRID_API_BASE}${endpoint}`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        data,
      });

      return response;
    } catch (error) {
      if (error.response?.status === 401) {
        throw new BadRequestException('SendGrid API key is invalid. Please reconnect.');
      }
      throw error;
    }
  }

  private transformConnection(connection: any): SendGridConnectionDto {
    return {
      id: connection.id,
      workspaceId: connection.workspace_id,
      userId: connection.user_id,
      senderEmail: connection.sender_email,
      senderName: connection.sender_name,
      isActive: connection.is_active,
      createdAt: connection.created_at,
      updatedAt: connection.updated_at,
    };
  }

  private transformTemplate(template: any): SendGridTemplateDto {
    return {
      id: template.id,
      name: template.name,
      generation: template.generation,
      updatedAt: template.updated_at,
      activeVersionId: template.versions?.find((v: any) => v.active === 1)?.id,
      versions: template.versions?.map((v: any) => ({
        id: v.id,
        name: v.name,
        subject: v.subject,
        active: v.active === 1,
        updatedAt: v.updated_at,
      })),
    };
  }

  private transformStats(stat: any): EmailStatsDto {
    const metrics = stat.stats?.[0]?.metrics || {};
    return {
      date: stat.date,
      requests: metrics.requests || 0,
      delivered: metrics.delivered || 0,
      opens: metrics.opens || 0,
      uniqueOpens: metrics.unique_opens || 0,
      clicks: metrics.clicks || 0,
      uniqueClicks: metrics.unique_clicks || 0,
      bounces: metrics.bounces || 0,
      blocks: metrics.blocks || 0,
      spamReports: metrics.spam_reports || 0,
      unsubscribes: metrics.unsubscribes || 0,
    };
  }
}
