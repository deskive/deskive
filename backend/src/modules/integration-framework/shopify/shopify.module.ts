import { Module } from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { ShopifyOAuthService } from './shopify-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [],
  providers: [ShopifyService, ShopifyOAuthService],
  exports: [ShopifyService, ShopifyOAuthService],
})
export class ShopifyModule {}
