import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { SsoController } from './sso/sso.controller';
import { SsoRegistryService } from './sso/sso-registry.service';
import { MagicLinkService, MAGIC_LINK_EMAIL_SENDER, MagicLinkEmailSender } from './sso/magic-link.service';
import { getEmailConfig, sendEmailFn } from '../database/email-helpers';

/**
 * Default magic-link email sender — delegates to the existing
 * nodemailer-based sendEmailFn helper. Tests can override the
 * MAGIC_LINK_EMAIL_SENDER provider with a mock.
 */
const magicLinkEmailSenderProvider = {
  provide: MAGIC_LINK_EMAIL_SENDER,
  useFactory: (config: ConfigService): MagicLinkEmailSender => ({
    async sendEmail(to, subject, html, text) {
      const cfg = getEmailConfig((k, d) => config.get(k, d));
      const result = await sendEmailFn(
        cfg,
        to,
        subject,
        html,
        text,
      );
      if (!result.success) {
        throw new Error(result.error || 'unknown SMTP failure');
      }
    },
  }),
  inject: [ConfigService],
};

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, SsoController],
  providers: [
    AuthService,
    JwtAuthGuard,
    SsoRegistryService,
    MagicLinkService,
    magicLinkEmailSenderProvider,
  ],
  exports: [AuthService, JwtModule, JwtAuthGuard, ConfigModule, SsoRegistryService],
})
export class AuthModule {}