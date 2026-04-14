import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { TwitterController, TwitterCallbackController } from './twitter.controller';
import { TwitterService } from './twitter.service';
import { TwitterOAuthService } from './twitter-oauth.service';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [TwitterController, TwitterCallbackController],
  providers: [TwitterService, TwitterOAuthService],
  exports: [TwitterService, TwitterOAuthService],
})
export class TwitterModule {}
