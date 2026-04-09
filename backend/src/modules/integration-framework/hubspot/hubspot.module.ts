import { Module } from '@nestjs/common';
import { HubSpotService } from './hubspot.service';
import { HubSpotOAuthService } from './hubspot-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [HubSpotService, HubSpotOAuthService],
  exports: [HubSpotService, HubSpotOAuthService],
})
export class HubSpotModule {}
