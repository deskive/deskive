import { Module } from '@nestjs/common';
import { AsanaController } from './asana.controller';
import { AsanaService } from './asana.service';
import { AsanaOAuthService } from './asana-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AsanaController],
  providers: [AsanaService, AsanaOAuthService],
  exports: [AsanaService, AsanaOAuthService],
})
export class AsanaModule {}
