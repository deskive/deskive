import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VideoCallsController } from './video-calls.controller';
import { VideoCallsService } from './video-calls.service';
import { LivekitVideoService } from './livekit-video.service';
import { VideoCallsGateway } from './gateways/video-calls.gateway';
import { TranscriptionGateway } from './gateways/transcription.gateway';
import { RealtimeTranscriptionService } from './services/realtime-transcription.service';
import { MeetingIntelligenceService } from './services/meeting-intelligence.service';
import { CalendarModule } from '../calendar/calendar.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebSocketModule } from '../../common/gateways/websocket.module';

@Module({
  imports: [
    // JWT module for WebSocket authentication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => CalendarModule),
    forwardRef(() => NotificationsModule),
    forwardRef(() => WebSocketModule), // For AppGateway to send notifications to web clients
    // For database operations in transcription
  ],
  controllers: [VideoCallsController],
  providers: [
    VideoCallsService,
    LivekitVideoService,
    VideoCallsGateway,
    TranscriptionGateway,
    RealtimeTranscriptionService,
    MeetingIntelligenceService,
  ],
  exports: [VideoCallsService, LivekitVideoService, VideoCallsGateway, RealtimeTranscriptionService, MeetingIntelligenceService],
})
export class VideoCallsModule {}
