import { Module } from '@nestjs/common';
import { GoogleOAuthController } from './google-oauth.controller';
import { GoogleDriveModule } from '../integration-framework/google-drive/google-drive.module';
import { GoogleSheetsModule } from '../integration-framework/google-sheets/google-sheets.module';
import { EmailModule } from '../integration-framework/email/email.module';
import { CalendarModule } from '../calendar/calendar.module';
import { IntegrationFrameworkModule } from '../integration-framework/integration-framework.module';

/**
 * Integrations Module
 *
 * Provides unified OAuth callbacks for third-party services.
 * This module consolidates all OAuth redirects to a single endpoint per provider.
 *
 * Supported Google services:
 * - Gmail, Google Calendar, Google Sheets, Google Drive (dedicated handlers)
 * - Google Chat, Google Meet, Google Cloud, Google Analytics, YouTube (generic handlers)
 */
@Module({
  imports: [
    GoogleDriveModule,
    GoogleSheetsModule,
    EmailModule,
    CalendarModule,
    IntegrationFrameworkModule,
  ],
  controllers: [GoogleOAuthController],
})
export class IntegrationsModule {}
