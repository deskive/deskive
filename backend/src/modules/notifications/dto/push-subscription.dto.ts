import { IsString, IsOptional, IsObject, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PushSubscriptionKeys {
  @ApiProperty({
    description: 'P256DH key for push encryption',
    example:
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U',
  })
  @IsString()
  p256dh: string;

  @ApiProperty({
    description: 'Auth key for push authentication',
    example: 'tBHItJI5svbpez7KI4CCXg',
  })
  @IsString()
  auth: string;
}

export class PushSubscriptionDto {
  @ApiProperty({
    description: 'Push service endpoint URL',
    example: 'https://fcm.googleapis.com/fcm/send/cOvd3I_Eq9Y:APA91bFQc9bThL...',
  })
  @IsString()
  endpoint: string;

  @ApiProperty({
    description: 'Expiration time (usually null)',
    example: null,
  })
  @IsOptional()
  expirationTime?: number | null;

  @ApiProperty({
    description: 'Subscription keys',
    type: PushSubscriptionKeys,
  })
  @IsObject()
  keys: PushSubscriptionKeys;
}

export class SubscribePushDto {
  @ApiProperty({
    description: 'Push subscription object',
    type: PushSubscriptionDto,
  })
  @IsObject()
  subscription: PushSubscriptionDto;

  @ApiPropertyOptional({
    description: 'Device information',
    example: {
      userAgent: 'Mozilla/5.0...',
      platform: 'web',
      deviceType: 'desktop',
    },
  })
  @IsOptional()
  @IsObject()
  device_info?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Notification types to subscribe to',
    type: [String],
    example: ['reminder', 'health', 'fitness'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notification_types?: string[];

  @ApiPropertyOptional({
    description: 'Whether to enable notifications by default',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UnsubscribePushDto {
  @ApiProperty({
    description: 'Push subscription endpoint to unsubscribe',
    example: 'https://fcm.googleapis.com/fcm/send/cOvd3I_Eq9Y:APA91bFQc9bThL...',
  })
  @IsString()
  endpoint: string;

  @ApiPropertyOptional({
    description: 'Reason for unsubscribing',
    example: 'user_request',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkActionDto {
  @ApiProperty({
    description: 'Array of notification IDs to perform bulk action on',
    type: [String],
    example: ['notif_123', 'notif_456'],
  })
  @IsArray()
  @IsString({ each: true })
  notification_ids: string[];
}

export class NotificationResponseDto {
  @ApiProperty({ example: 'notif_123' })
  id: string;

  @ApiProperty({ example: 'user_123' })
  user_id: string;

  @ApiProperty({ example: 'reminder' })
  type: string;

  @ApiProperty({ example: 'Workout Reminder' })
  title: string;

  @ApiPropertyOptional({ example: 'Time for your scheduled workout!' })
  message?: string;

  @ApiPropertyOptional({ example: { workoutId: 'workout_123' } })
  data?: Record<string, any>;

  @ApiProperty({ example: false })
  is_read: boolean;

  @ApiProperty({ example: false })
  is_archived: boolean;

  @ApiPropertyOptional({ example: '/workouts/123' })
  action_url?: string;

  @ApiProperty({ example: 'normal' })
  priority: string;

  @ApiPropertyOptional({ example: '2024-12-31T23:59:59Z' })
  expires_at?: string;

  @ApiPropertyOptional({ example: '2024-01-15T10:30:00Z' })
  read_at?: string;

  @ApiProperty({ example: '2024-01-15T09:00:00Z' })
  created_at: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to show browser notification (controlled by push setting)',
  })
  shouldShowBrowserNotification?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether notification sound is enabled (controlled by sound setting)',
  })
  soundEnabled?: boolean;
}

export class PaginatedNotificationsDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data: NotificationResponseDto[];

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 8 })
  total_pages: number;

  @ApiPropertyOptional({ example: 5 })
  unread_count?: number;
}
