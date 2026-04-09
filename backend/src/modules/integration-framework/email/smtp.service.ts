import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { SmtpConfigDto } from './dto/email.dto';
import { SendEmailDto, ReplyEmailDto } from './dto/send-email.dto';

export interface SmtpSendResult {
  success: boolean;
  messageId?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

@Injectable()
export class SmtpService {
  private readonly logger = new Logger(SmtpService.name);

  /**
   * Create a nodemailer transporter with the given SMTP configuration
   */
  private createTransporter(config: SmtpConfigDto): Transporter<SMTPTransport.SentMessageInfo> {
    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? (config.port === 465), // true for 465, false for other ports
      auth: {
        user: config.user,
        pass: config.password,
      },
      // Connection timeout settings
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000,
      socketTimeout: 30000,
    });
  }

  /**
   * Test SMTP connection
   */
  async testConnection(config: SmtpConfigDto): Promise<{ success: boolean; message: string }> {
    const transporter = this.createTransporter(config);

    try {
      await transporter.verify();
      this.logger.log(`SMTP connection test successful for ${config.host}:${config.port}`);
      return { success: true, message: 'SMTP connection successful' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`SMTP connection test failed for ${config.host}:${config.port}: ${errorMessage}`);
      return { success: false, message: `SMTP connection failed: ${errorMessage}` };
    } finally {
      transporter.close();
    }
  }

  /**
   * Send an email via SMTP
   */
  async sendEmail(
    config: SmtpConfigDto,
    fromEmail: string,
    fromName: string | undefined,
    dto: SendEmailDto,
  ): Promise<SmtpSendResult> {
    const transporter = this.createTransporter(config);

    try {
      const fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: dto.to.join(', '),
        subject: dto.subject,
      };

      // Add CC if provided
      if (dto.cc && dto.cc.length > 0) {
        mailOptions.cc = dto.cc.join(', ');
      }

      // Add BCC if provided
      if (dto.bcc && dto.bcc.length > 0) {
        mailOptions.bcc = dto.bcc.join(', ');
      }

      // Set body based on isHtml flag
      if (dto.isHtml !== false) {
        // Default to HTML
        mailOptions.html = dto.body;
      } else {
        mailOptions.text = dto.body;
      }

      // Add attachments if provided
      if (dto.attachments && dto.attachments.length > 0) {
        mailOptions.attachments = dto.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.mimeType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      this.logger.log(`Email sent via SMTP: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email via SMTP: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      transporter.close();
    }
  }

  /**
   * Reply to an email via SMTP
   */
  async replyToEmail(
    config: SmtpConfigDto,
    fromEmail: string,
    fromName: string | undefined,
    dto: ReplyEmailDto,
    originalMessageId: string,
    originalSubject: string,
    originalFrom: string,
  ): Promise<SmtpSendResult> {
    const transporter = this.createTransporter(config);

    try {
      const fromAddress = fromName ? `"${fromName}" <${fromEmail}>` : fromEmail;

      // For reply, always reply to original sender (replyAll just includes others in thread)
      const toRecipients = [originalFrom];

      // Build subject with Re: prefix if not already present
      const subject = originalSubject.startsWith('Re:')
        ? originalSubject
        : `Re: ${originalSubject}`;

      const mailOptions: nodemailer.SendMailOptions = {
        from: fromAddress,
        to: toRecipients.join(', '),
        subject: subject,
        // Thread headers
        inReplyTo: originalMessageId,
        references: originalMessageId,
      };

      // Set body based on isHtml flag
      if (dto.isHtml !== false) {
        // Default to HTML
        mailOptions.html = dto.body;
      } else {
        mailOptions.text = dto.body;
      }

      // Add attachments if provided
      if (dto.attachments && dto.attachments.length > 0) {
        mailOptions.attachments = dto.attachments.map((att) => ({
          filename: att.filename,
          content: Buffer.from(att.content, 'base64'),
          contentType: att.mimeType,
        }));
      }

      const info = await transporter.sendMail(mailOptions);

      this.logger.log(`Reply sent via SMTP: ${info.messageId}`);

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted as string[],
        rejected: info.rejected as string[],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send reply via SMTP: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      transporter.close();
    }
  }
}
