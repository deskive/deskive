import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class ActivatePrebuiltBotDto {
  @ApiProperty({
    description: 'ID of the prebuilt bot to activate (e.g., calendar-event-bot)',
    example: 'calendar-event-bot',
  })
  @IsString()
  prebuiltBotId: string;

  @ApiProperty({
    description: 'Custom display name for this bot instance (optional, defaults to prebuilt name)',
    example: 'My Calendar Assistant',
    required: false,
  })
  @IsOptional()
  @IsString()
  customDisplayName?: string;

  @ApiProperty({
    description: 'Custom settings for this bot instance (optional)',
    example: { reminderIntervals: [30, 120], notifyOnUpdates: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  customSettings?: Record<string, any>;
}

export class PrebuiltBotResponseDto {
  @ApiProperty({ description: 'Prebuilt bot ID' })
  id: string;

  @ApiProperty({ description: 'Bot name (slug)' })
  name: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiProperty({ description: 'Bot description' })
  description: string;

  @ApiProperty({ description: 'Avatar URL' })
  avatarUrl: string;

  @ApiProperty({ description: 'Bot type' })
  botType: string;

  @ApiProperty({ description: 'Category' })
  category: string;

  @ApiProperty({ description: 'Features list' })
  features: string[];

  @ApiProperty({ description: 'Default settings' })
  settings: Record<string, any>;

  @ApiProperty({ description: 'Required permissions' })
  permissions: string[];

  @ApiProperty({ description: 'Setup instructions' })
  setupInstructions: string;

  @ApiProperty({ description: 'Usage examples' })
  usageExamples: string[];

  @ApiProperty({ description: 'Whether user has activated this bot', required: false })
  isActivated?: boolean;

  @ApiProperty({ description: 'User bot instance ID if activated', required: false })
  userBotId?: string;
}
