import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { DiscordOAuthService } from './discord-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [DiscordService, DiscordOAuthService],
  exports: [DiscordService, DiscordOAuthService],
})
export class DiscordModule {}
