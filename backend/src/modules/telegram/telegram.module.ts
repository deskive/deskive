import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TelegramController } from './telegram.controller';
import { TelegramService } from './telegram.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
  ],
  controllers: [TelegramController],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
