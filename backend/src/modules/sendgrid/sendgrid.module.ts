import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SendGridController } from './sendgrid.controller';
import { SendGridService } from './sendgrid.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [SendGridController],
  providers: [SendGridService],
  exports: [SendGridService],
})
export class SendGridModule {}
