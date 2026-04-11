/**
 * EmailProviderService — the app's transactional email façade.
 *
 * Every module that needs to send email (auth verification, password
 * reset, order confirmation, shipment tracking, vendor notifications,
 * refund updates, etc.) should inject EmailProviderService and call `send()`.
 *
 * Internally this dispatches to whichever provider the operator has
 * selected via EMAIL_PROVIDER in .env. See `./providers/` and
 * `docs/providers/email.md` for the full list (smtp, resend, sendgrid,
 * postmark, ses, mailgun, none).
 *
 * Deskive has three pre-existing email code paths that this module does
 * NOT touch, to keep the diff reviewable:
 *
 *   1. `backend/src/modules/database/email-helpers.ts` — legacy
 *      nodemailer SMTP sender used by DatabaseService.sendEmail().
 *   2. `backend/src/modules/sendgrid/sendgrid.service.ts` — per-user
 *      SendGrid connection manager for user-owned mailer features.
 *   3. `backend/src/modules/integration-framework/email/` — IMAP
 *      polling + email event extraction (inbound, different concern).
 *
 * Call sites should migrate to EmailProviderService. Old paths can be
 * deleted in follow-ups once every caller is moved.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createEmailProvider,
  EmailProvider,
  SendEmailInput,
  SendEmailResult,
} from './providers';

@Injectable()
export class EmailProviderService implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderService.name);
  private provider!: EmailProvider;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.provider = createEmailProvider(this.config);
    this.logger.log(
      `Email provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`,
    );
  }

  getProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  isAvailable(): boolean {
    return !!this.provider && this.provider.isAvailable();
  }

  /** Send a single transactional email. */
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(
      `send subject="${input.subject}" to=${Array.isArray(input.to) ? input.to.join(',') : input.to} via=${this.provider.name}`,
    );
    return this.provider.send(input);
  }

  /** Send many emails. Providers with a native batch API override this. */
  async sendBulk(inputs: SendEmailInput[]): Promise<SendEmailResult[]> {
    this.logger.log(
      `sendBulk count=${inputs.length} via=${this.provider.name}`,
    );
    return this.provider.sendBulk(inputs);
  }

  /**
   * Direct access to the underlying provider for advanced call sites.
   * Prefer the higher-level methods above.
   */
  getProvider(): EmailProvider {
    return this.provider;
  }
}
