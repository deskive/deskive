import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DailyBriefingService } from './daily-briefing.service';
import { DeadlineAlertService } from './deadline-alert.service';
import { SuggestionsCacheService } from './suggestions-cache.service';

// Import required modules
import { NotificationsModule } from '../../notifications/notifications.module';
import { WebSocketModule } from '../../../common/gateways/websocket.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    forwardRef(() => NotificationsModule),
    forwardRef(() => WebSocketModule),
  ],
  providers: [
    DailyBriefingService,
    DeadlineAlertService,
    SuggestionsCacheService,
  ],
  exports: [
    DailyBriefingService,
    DeadlineAlertService,
    SuggestionsCacheService,
  ],
})
export class ProactiveModule {}
