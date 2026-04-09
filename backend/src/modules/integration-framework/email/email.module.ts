import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailOAuthService } from './email-oauth.service';
import { EmailPollingService } from './email-polling.service';
import { EmailEventExtractorService } from './email-event-extractor.service';
import { SmtpService } from './smtp.service';
import { ImapService } from './imap.service';
import { SmtpImapEmailService } from './smtp-imap-email.service';
import { AuthModule } from '../../auth/auth.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { CalendarModule } from '../../calendar/calendar.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    forwardRef(() => NotificationsModule),
    forwardRef(() => CalendarModule),
  ],
  controllers: [EmailController],
  providers: [
    EmailService,
    EmailOAuthService,
    EmailPollingService,
    EmailEventExtractorService,
    SmtpService,
    ImapService,
    SmtpImapEmailService,
  ],
  exports: [EmailService, EmailPollingService, SmtpImapEmailService],
})
export class EmailModule {}
