import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ContactFormDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  // Deskive team receivers - will get contact form submissions
  private readonly contactEmails = ['support@deskive.com'];

  constructor(private readonly db: DatabaseService) {}

  async sendContactEmail(dto: ContactFormDto): Promise<{ success: boolean; message: string }> {
    try {
      this.logger.log(`Processing contact form submission from ${dto.email}`);

      // Map subject to human-readable label
      const subjectLabels: Record<string, string> = {
        general: 'General Inquiry',
        sales: 'Sales Inquiry',
        support: 'Technical Support',
        partnership: 'Partnership Opportunity',
        other: 'Other',
      };

      const subjectLabel = subjectLabels[dto.subject] || dto.subject;

      // Build email content
      const emailSubject = `[Deskive Contact] ${subjectLabel} from ${dto.name}`;

      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151; width: 120px;">Name:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${dto.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Email:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">
                  <a href="mailto:${dto.email}" style="color: #0ea5e9;">${dto.email}</a>
                </td>
              </tr>
              ${
                dto.company
                  ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Company:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${dto.company}</td>
              </tr>
              `
                  : ''
              }
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #374151;">Subject:</td>
                <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #1f2937;">${subjectLabel}</td>
              </tr>
            </table>

            <div style="margin-top: 20px;">
              <h3 style="color: #374151; margin-bottom: 10px;">Message:</h3>
              <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; white-space: pre-wrap; color: #1f2937;">
${dto.message}
              </div>
            </div>
          </div>

          <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              This email was sent from the Deskive contact form at ${new Date().toISOString()}
            </p>
          </div>
        </div>
      `;

      // Send email using database to both receivers
      const emailResult = await /* TODO: use EmailService */ this.db.client.email.send(
        this.contactEmails,
        emailSubject,
        htmlContent,
        {
          replyTo: dto.email,
        },
      );

      this.logger.log(`Contact email sent successfully to ${this.contactEmails.join(', ')}`);
      this.logger.debug(`Email send result: ${JSON.stringify(emailResult)}`);

      // Optionally send a confirmation email to the user
      await this.sendConfirmationEmail(dto);

      return {
        success: true,
        message: 'Your message has been sent successfully. We will get back to you soon!',
      };
    } catch (error) {
      this.logger.error('Failed to send contact email:', error);
      throw error;
    }
  }

  private async sendConfirmationEmail(dto: ContactFormDto): Promise<void> {
    try {
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Thank you for contacting us!</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
              Hi ${dto.name},
            </p>
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
              Thank you for reaching out to us. We have received your message and will get back to you within 24 hours.
            </p>
            <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
              Here's a copy of your message:
            </p>

            <div style="background: white; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0; white-space: pre-wrap;">${dto.message}</p>
            </div>

            <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
              Best regards,<br/>
              The Deskive Team
            </p>
          </div>

          <div style="background: #1f2937; padding: 20px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="color: #9ca3af; margin: 0; font-size: 12px;">
              Deskive - Your All-in-One Workspace Solution
            </p>
          </div>
        </div>
      `;

      await /* TODO: use EmailService */ this.db.client.email.send(
        dto.email,
        'Thank you for contacting Deskive',
        htmlContent,
        {
          replyTo: this.contactEmails[0], // support@deskive.com
        },
      );

      this.logger.log(`Confirmation email sent to ${dto.email}`);
    } catch (error) {
      // Don't throw - confirmation email is not critical
      this.logger.warn(`Failed to send confirmation email to ${dto.email}:`, error);
    }
  }
}
