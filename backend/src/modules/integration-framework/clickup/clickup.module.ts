import { Module } from '@nestjs/common';
import { ClickUpController } from './clickup.controller';
import { ClickUpService } from './clickup.service';
import { ClickUpOAuthService } from './clickup-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ClickUpController],
  providers: [ClickUpService, ClickUpOAuthService],
  exports: [ClickUpService, ClickUpOAuthService],
})
export class ClickUpModule {}
