import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GoogleSheetsController } from './google-sheets.controller';
import { GoogleSheetsService } from './google-sheets.service';
import { GoogleSheetsOAuthService } from './google-sheets-oauth.service';
import { GoogleSheetsSyncService } from './google-sheets-sync.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [GoogleSheetsController],
  providers: [GoogleSheetsService, GoogleSheetsOAuthService, GoogleSheetsSyncService],
  exports: [GoogleSheetsService, GoogleSheetsOAuthService, GoogleSheetsSyncService],
})
export class GoogleSheetsModule {}
