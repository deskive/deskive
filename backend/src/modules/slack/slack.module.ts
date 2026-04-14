import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { SlackController, SlackCallbackController } from './slack.controller';
import { SlackService } from './slack.service';
import { SlackOAuthService } from './slack-oauth.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [SlackController, SlackCallbackController],
  providers: [SlackService, SlackOAuthService],
  exports: [SlackService, SlackOAuthService],
})
export class SlackModule {}
