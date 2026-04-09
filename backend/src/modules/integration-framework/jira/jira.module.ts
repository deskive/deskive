import { Module } from '@nestjs/common';
import { JiraController } from './jira.controller';
import { JiraService } from './jira.service';
import { JiraOAuthService } from './jira-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [JiraController],
  providers: [JiraService, JiraOAuthService],
  exports: [JiraService, JiraOAuthService],
})
export class JiraModule {}
