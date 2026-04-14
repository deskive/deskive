import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsObject,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum NotificationType {
  SYSTEM = 'system',
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
  HEALTH = 'health',
  FITNESS = 'fitness',
  FINANCE = 'finance',
  TRAVEL = 'travel',
  MEDITATION = 'meditation',
  SOCIAL = 'social',
  SECURITY = 'security',
  UPDATE = 'update',
  PROMOTIONAL = 'promotional',
  TASKS = 'tasks',
  CALENDAR = 'calendar',
  WORKSPACE = 'workspace',
  MESSAGES = 'messages',
  EMAIL = 'email',
  CHANNEL_CREATED = 'channel_created',
  CHANNEL_MEMBER_ADDED = 'channel_member_added',
  CHANNEL_MEMBER_REMOVED = 'channel_member_removed',
  VIDEO_CALL = 'video_call',
  FEEDBACK_RESOLVED = 'feedback_resolved',
  OTHER = 'other',
}

export enum NotificationPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateNotificationDto {
  @ApiPropertyOptional({
    description: 'User ID to send notification to (optional if sending to multiple users)',
    example: 'user_123',
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs to send notification to (for bulk notifications)',
    type: [String],
    example: ['user_123', 'user_456'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  user_ids?: string[];

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.REMINDER,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'Workout Reminder',
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Notification message content',
    example: 'Time for your scheduled workout!',
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Additional data payload',
    example: { workoutId: 'workout_123', type: 'strength' },
  })
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Action URL for notification click',
    example: '/workouts/123',
  })
  @IsOptional()
  @IsString()
  action_url?: string;

  @ApiPropertyOptional({
    description: 'Notification priority',
    enum: NotificationPriority,
    example: NotificationPriority.NORMAL,
  })
  @IsOptional()
  @IsEnum(NotificationPriority)
  priority?: NotificationPriority;

  @ApiPropertyOptional({
    description: 'Notification expiration date',
    example: '2024-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  expires_at?: string;

  @ApiPropertyOptional({
    description: 'Whether to send push notification',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  send_push?: boolean;

  @ApiPropertyOptional({
    description: 'Whether to send email notification',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  send_email?: boolean;

  @ApiPropertyOptional({
    description: 'Push notification configuration',
    example: {
      sound: 'default',
      badge: 1,
      category: 'reminder',
    },
  })
  @IsOptional()
  @IsObject()
  push_config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Email configuration',
    example: {
      template: 'reminder',
      variables: { userName: 'John' },
    },
  })
  @IsOptional()
  @IsObject()
  email_config?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Force send notification bypassing user preferences (e.g., for mentions)',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  force_send?: boolean;
}
