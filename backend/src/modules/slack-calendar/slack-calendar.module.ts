import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { SlackCalendarController } from './slack-calendar.controller';
import { SlackCalendarService } from './slack-calendar.service';
import { CalendarModule } from '../calendar/calendar.module';

@Module({
  imports: [
    ConfigModule,
    CalendarModule, // Import existing calendar module to reuse CalendarService
    ScheduleModule.forRoot(), // For cron jobs (reminders)
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [SlackCalendarController],
  providers: [SlackCalendarService],
  exports: [SlackCalendarService],
})
export class SlackCalendarModule {}
