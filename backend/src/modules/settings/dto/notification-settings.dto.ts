import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

class NotificationCategorySettingsDto {
  @ApiProperty({ description: 'Email notifications enabled' })
  @IsBoolean()
  email: boolean;

  @ApiProperty({ description: 'Push notifications enabled' })
  @IsBoolean()
  push: boolean;

  @ApiProperty({ description: 'In-app notifications enabled' })
  @IsBoolean()
  inApp: boolean;
}

class NotificationCategoryDto {
  @ApiProperty({ description: 'Category ID' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Category label' })
  @IsString()
  label: string;

  @ApiProperty({ description: 'Category description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Category settings', type: NotificationCategorySettingsDto })
  @ValidateNested()
  @Type(() => NotificationCategorySettingsDto)
  settings: NotificationCategorySettingsDto;
}

class QuietHoursDto {
  @ApiProperty({ description: 'Quiet hours enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Start time (HH:mm format)' })
  @IsString()
  startTime: string;

  @ApiProperty({ description: 'End time (HH:mm format)' })
  @IsString()
  endTime: string;
}

class GeneralSettingsDto {
  @ApiProperty({ description: 'Do not disturb mode' })
  @IsBoolean()
  doNotDisturb: boolean;

  @ApiProperty({ description: 'Quiet hours configuration', type: QuietHoursDto })
  @ValidateNested()
  @Type(() => QuietHoursDto)
  quietHours: QuietHoursDto;

  @ApiProperty({
    description: 'Notification frequency',
    enum: ['immediate', 'digest', 'daily', 'weekly'],
  })
  @IsEnum(['immediate', 'digest', 'daily', 'weekly'])
  frequency: 'immediate' | 'digest' | 'daily' | 'weekly';

  @ApiProperty({ description: 'Sound notifications enabled' })
  @IsBoolean()
  sound: boolean;
}

export class NotificationSettingsDto {
  @ApiProperty({ description: 'Email notifications enabled' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiProperty({ description: 'Desktop notifications enabled' })
  @IsOptional()
  @IsBoolean()
  desktop?: boolean;

  @ApiProperty({ description: 'Mention notifications enabled' })
  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @ApiProperty({ description: 'Direct message notifications enabled' })
  @IsOptional()
  @IsBoolean()
  directMessages?: boolean;

  @ApiProperty({ description: 'Channel message notifications enabled' })
  @IsOptional()
  @IsBoolean()
  channelMessages?: boolean;

  @ApiProperty({ description: 'Task notifications enabled' })
  @IsOptional()
  @IsBoolean()
  tasks?: boolean;

  @ApiProperty({ description: 'Calendar notifications enabled' })
  @IsOptional()
  @IsBoolean()
  calendar?: boolean;

  @ApiProperty({ description: 'Marketing notifications enabled' })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiProperty({
    description: 'Notification categories',
    type: [NotificationCategoryDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationCategoryDto)
  categories?: NotificationCategoryDto[];

  @ApiProperty({
    description: 'General notification settings',
    type: GeneralSettingsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  generalSettings?: GeneralSettingsDto;
}

export class UpdateNotificationSettingsDto {
  @ApiProperty({ description: 'Email notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiProperty({ description: 'Push notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  push?: boolean;

  @ApiProperty({ description: 'Desktop notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  desktop?: boolean;

  @ApiProperty({ description: 'Mention notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  mentions?: boolean;

  @ApiProperty({ description: 'Direct message notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  directMessages?: boolean;

  @ApiProperty({ description: 'Channel message notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  channelMessages?: boolean;

  @ApiProperty({ description: 'Task notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  tasks?: boolean;

  @ApiProperty({ description: 'Calendar notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  calendar?: boolean;

  @ApiProperty({ description: 'Marketing notifications enabled', required: false })
  @IsOptional()
  @IsBoolean()
  marketing?: boolean;

  @ApiProperty({
    description: 'Notification categories',
    type: [NotificationCategoryDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NotificationCategoryDto)
  categories?: NotificationCategoryDto[];

  @ApiProperty({
    description: 'General notification settings',
    type: GeneralSettingsDto,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeneralSettingsDto)
  generalSettings?: GeneralSettingsDto;

  @ApiProperty({
    description: 'User timezone (IANA format, e.g., Asia/Dhaka)',
    example: 'Asia/Dhaka',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string;
}
