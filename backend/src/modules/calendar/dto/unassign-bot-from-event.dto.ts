import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class UnassignBotFromEventDto {
  @ApiProperty({
    description: 'Bot ID to unassign from the event',
    example: 'uuid-here',
  })
  @IsUUID()
  bot_id: string;

  @ApiProperty({
    description: 'Event ID to unassign the bot from',
    example: 'uuid-here',
  })
  @IsUUID()
  event_id: string;
}
