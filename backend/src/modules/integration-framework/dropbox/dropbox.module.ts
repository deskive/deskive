import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DropboxController, DropboxCallbackController } from './dropbox.controller';
import { DropboxService } from './dropbox.service';
import { DropboxOAuthService } from './dropbox-oauth.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
  ],
  controllers: [DropboxController, DropboxCallbackController],
  providers: [
    DropboxService,
    DropboxOAuthService,
  ],
  exports: [
    DropboxService,
    DropboxOAuthService,
  ],
})
export class DropboxModule {}
