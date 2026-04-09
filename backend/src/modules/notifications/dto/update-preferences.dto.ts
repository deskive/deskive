import { IsBoolean, IsOptional, IsObject, IsEnum, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from './create-notification.dto';

export class NotificationChannelPreferences {
  @ApiPropertyOptional({ description: 'Enable push notifications', example: true })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiPropertyOptional({ description: 'Enable email notifications', example: true })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ description: 'Enable in-app notifications', example: true })
  @IsOptional()
  @IsBoolean()
  in_app?: boolean;
}

export class NotificationTypePreferences {
  @ApiPropertyOptional({ description: 'System notification preferences' })
  @IsOptional()
  @IsObject()
  system?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Reminder notification preferences' })
  @IsOptional()
  @IsObject()
  reminder?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Achievement notification preferences' })
  @IsOptional()
  @IsObject()
  achievement?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Health notification preferences' })
  @IsOptional()
  @IsObject()
  health?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Fitness notification preferences' })
  @IsOptional()
  @IsObject()
  fitness?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Finance notification preferences' })
  @IsOptional()
  @IsObject()
  finance?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Travel notification preferences' })
  @IsOptional()
  @IsObject()
  travel?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Meditation notification preferences' })
  @IsOptional()
  @IsObject()
  meditation?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Social notification preferences' })
  @IsOptional()
  @IsObject()
  social?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Security notification preferences' })
  @IsOptional()
  @IsObject()
  security?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Update notification preferences' })
  @IsOptional()
  @IsObject()
  update?: NotificationChannelPreferences;

  @ApiPropertyOptional({ description: 'Promotional notification preferences' })
  @IsOptional()
  @IsObject()
  promotional?: NotificationChannelPreferences;
}

export class QuietHours {
  @ApiPropertyOptional({ 
    description: 'Start time for quiet hours (24-hour format)',
    example: '22:00'
  })
  @IsOptional()
  @IsString()
  start?: string;

  @ApiPropertyOptional({ 
    description: 'End time for quiet hours (24-hour format)',
    example: '08:00'
  })
  @IsOptional()
  @IsString()
  end?: string;

  @ApiPropertyOptional({ 
    description: 'Days when quiet hours apply',
    type: [String],
    example: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  days?: string[];

  @ApiPropertyOptional({ 
    description: 'Timezone for quiet hours',
    example: 'America/New_York'
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional({ 
    description: 'Global notification preferences',
    example: {
      push: true,
      email: false,
      in_app: true
    }
  })
  @IsOptional()
  @IsObject()
  global?: NotificationChannelPreferences;

  @ApiPropertyOptional({ 
    description: 'Preferences by notification type',
  })
  @IsOptional()
  @IsObject()
  types?: NotificationTypePreferences;

  @ApiPropertyOptional({ 
    description: 'Quiet hours configuration'
  })
  @IsOptional()
  @IsObject()
  quiet_hours?: QuietHours;

  @ApiPropertyOptional({ 
    description: 'Maximum notifications per day',
    example: 50
  })
  @IsOptional()
  daily_limit?: number;

  @ApiPropertyOptional({ 
    description: 'Notification grouping preferences',
    example: {
      group_similar: true,
      group_by_type: true,
      max_group_size: 5
    }
  })
  @IsOptional()
  @IsObject()
  grouping?: Record<string, any>;

  @ApiPropertyOptional({ 
    description: 'Language preference for notifications',
    example: 'en'
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ 
    description: 'Additional preferences metadata'
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}