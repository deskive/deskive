import { Module } from '@nestjs/common';
import { LinearController } from './linear.controller';
import { LinearService } from './linear.service';
import { LinearOAuthService } from './linear-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LinearController],
  providers: [LinearService, LinearOAuthService],
  exports: [LinearService, LinearOAuthService],
})
export class LinearModule {}
