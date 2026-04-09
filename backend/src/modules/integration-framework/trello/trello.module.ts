import { Module } from '@nestjs/common';
import { TrelloController } from './trello.controller';
import { TrelloService } from './trello.service';
import { TrelloOAuthService } from './trello-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [TrelloController],
  providers: [TrelloService, TrelloOAuthService],
  exports: [TrelloService, TrelloOAuthService],
})
export class TrelloModule {}
