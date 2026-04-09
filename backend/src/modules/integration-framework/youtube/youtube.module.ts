import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';
import { YoutubeOAuthService } from './youtube-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
  ],
  controllers: [YoutubeController],
  providers: [
    YoutubeService,
    YoutubeOAuthService,
  ],
  exports: [
    YoutubeService,
    YoutubeOAuthService,
  ],
})
export class YoutubeModule {}
