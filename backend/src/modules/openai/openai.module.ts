import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OpenAIController } from './openai.controller';
import { OpenAIService } from './openai.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
  ],
  controllers: [OpenAIController],
  providers: [OpenAIService],
  exports: [OpenAIService],
})
export class OpenAIModule {}
