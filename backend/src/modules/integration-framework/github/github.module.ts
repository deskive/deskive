import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GitHubController, GitHubOAuthCallbackController } from './github.controller';
import { GitHubService } from './github.service';
import { GitHubOAuthService } from './github-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [GitHubController, GitHubOAuthCallbackController],
  providers: [GitHubService, GitHubOAuthService],
  exports: [GitHubService, GitHubOAuthService],
})
export class GitHubModule {}
