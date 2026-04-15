import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleDriveController } from './google-drive.controller';
import { GoogleDriveService } from './google-drive.service';
import { GoogleDriveOAuthService } from './google-drive-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [GoogleDriveController],
  providers: [GoogleDriveService, GoogleDriveOAuthService],
  exports: [GoogleDriveService, GoogleDriveOAuthService],
})
export class GoogleDriveModule {}
