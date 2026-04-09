import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CalendarAgentRequestDto {
  @ApiProperty({
    description: 'Natural language prompt for calendar operations',
    example: 'Schedule a meeting tomorrow at 2pm with John for 1 hour',
  })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({
    description: 'User timezone (IANA timezone identifier)',
    example: 'Asia/Tokyo',
    required: false,
  })
  @IsString()
  @IsOptional()
  timezone?: string;
}

export class CalendarAgentResponseDto {
  @ApiProperty({
    description: 'Whether the operation was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'The action that was performed',
    example: 'create',
    enum: [
      'create',
      'update',
      'delete',
      'batch_create',
      'batch_update',
      'batch_delete',
      'search',
      'unknown',
    ],
  })
  action:
    | 'create'
    | 'update'
    | 'delete'
    | 'batch_create'
    | 'batch_update'
    | 'batch_delete'
    | 'search'
    | 'unknown';

  @ApiProperty({
    description: 'Human-readable message describing the result',
    example: 'Event "Team Meeting" has been created successfully!',
  })
  message: string;

  @ApiProperty({
    description: 'Additional data from the operation',
    required: false,
  })
  data?: any;

  @ApiProperty({
    description: 'Error message if operation failed',
    required: false,
  })
  error?: string;
}
