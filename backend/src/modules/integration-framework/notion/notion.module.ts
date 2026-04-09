import { Module } from '@nestjs/common';
import { NotionController } from './notion.controller';
import { NotionService } from './notion.service';
import { NotionOAuthService } from './notion-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [NotionController],
  providers: [NotionService, NotionOAuthService],
  exports: [NotionService, NotionOAuthService],
})
export class NotionModule {}
