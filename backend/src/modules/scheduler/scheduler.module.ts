import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { RecordingProcessorService } from './recording-processor.service';
import { ScheduledMessageProcessorService } from './scheduled-message-processor.service';
import { SchedulerController } from './scheduler.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { VideoCallsModule } from '../video-calls/video-calls.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
    forwardRef(() => VideoCallsModule),
    forwardRef(() => ChatModule),
  ],
  controllers: [SchedulerController],
  providers: [
    NotificationSchedulerService,
    RecordingProcessorService,
    ScheduledMessageProcessorService,
  ],
  exports: [
    NotificationSchedulerService,
    RecordingProcessorService,
    ScheduledMessageProcessorService,
  ],
})
export class SchedulerModule {}
