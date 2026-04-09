import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SlackWhiteboardController } from './slack-whiteboard.controller';
import { SlackWhiteboardService } from './slack-whiteboard.service';
import { WhiteboardsModule } from '../whiteboards/whiteboards.module';
import { SlackProjectsModule } from '../slack-projects/slack-projects.module';
import { SlackCalendarModule } from '../slack-calendar/slack-calendar.module';

@Module({
  imports: [
    ConfigModule,
    WhiteboardsModule, // Import existing whiteboards module to reuse WhiteboardsService
    forwardRef(() => SlackProjectsModule), // Import to route project interactions
    forwardRef(() => SlackCalendarModule), // Import to route calendar interactions
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SlackWhiteboardController],
  providers: [SlackWhiteboardService],
  exports: [SlackWhiteboardService],
})
export class SlackWhiteboardModule {}
