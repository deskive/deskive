import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject, IsBoolean } from 'class-validator';

export class UpdateBotAssignmentDto {
  @ApiProperty({
    description: 'Bot-specific settings for this event',
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
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
