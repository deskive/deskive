import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsObject, IsBoolean } from 'class-validator';

export class AssignBotToEventDto {
  @ApiProperty({
    description: 'Bot ID to assign to the event',
    example: 'uuid-here',
  })
  @IsUUID()
  botId: string;

  @ApiProperty({
    description:
      'Bot-specific settings for this event (e.g., reminder preferences, notification types)',
    example: { sendReminders: true, reminderIntervals: [15, 60], notifyOnUpdates: true },
    required: false,
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiProperty({
    description: 'Whether the bot should be active for this event',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
