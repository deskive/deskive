import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsArray, IsEnum, IsBoolean } from 'class-validator';

export enum TimePreference {
  MORNING = 'morning',
  AFTERNOON = 'afternoon',
  EVENING = 'evening',
}

export enum Priority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class AISchedulingRequestDto {
  @ApiProperty({
    description: 'Event title for AI to analyze',
    example: 'Weekly team meeting',
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Event description for AI context',
    example: 'Discuss project progress and next steps',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Duration in minutes',
    example: 60,
  })
  @IsNumber()
  duration: number;

  @ApiProperty({
    description: 'Event priority level',
    enum: Priority,
    example: Priority.NORMAL,
  })
  @IsEnum(Priority)
  priority: Priority;

  @ApiProperty({
    description: 'List of attendee email addresses',
    type: [String],
    example: ['john@example.com', 'jane@example.com'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @ApiProperty({
    description: 'Preferred location or meeting room',
    example: 'Conference Room A',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Preferred time of day',
    enum: TimePreference,
    example: TimePreference.MORNING,
    required: false,
  })
  @IsOptional()
  @IsEnum(TimePreference)
  timePreference?: TimePreference;

  @ApiProperty({
    description: 'Number of days to look ahead for scheduling',
    example: 7,
    default: 7,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  lookAheadDays?: number = 7;

  @ApiProperty({
    description: 'Include weekends in suggestions',
    example: false,
    default: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeWeekends?: boolean = false;
}

export class TimeSlotSuggestion {
  @ApiProperty({
    description: 'Suggested start time',
    example: '2024-01-15T10:00:00.000Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Suggested end time',
    example: '2024-01-15T11:00:00.000Z',
  })
  endTime: string;

  @ApiProperty({
    description: 'Confidence score for this suggestion (0-100)',
    example: 85,
  })
  confidence: number;

  @ApiProperty({
    description: 'Reason why this time slot is suggested',
    example: 'All attendees are available and matches your morning preference',
  })
  reason: string;

  @ApiProperty({
    description: 'Potential conflicts or considerations',
    type: [String],
    example: ['John has a meeting 30 minutes after'],
  })
  considerations: string[];

  @ApiProperty({
    description: 'Available meeting rooms for this time slot',
    type: [Object],
    example: [
      {
        id: 'room-123',
        name: 'Conference Room A',
        capacity: 10,
        equipment: ['projector', 'whiteboard'],
      },
    ],
    required: false,
  })
  availableRooms?: Array<{
    id: string;
    name: string;
    capacity: number;
    equipment: string[];
  }>;
}

export class AISchedulingResponseDto {
  @ApiProperty({
    description: 'Whether suggestions were successfully generated',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'AI-generated summary of the scheduling request',
    example: 'Looking for a 60-minute team meeting for 3 attendees with morning preference',
  })
  summary: string;

  @ApiProperty({
    description: 'Top 3-5 recommended time slots',
    type: [TimeSlotSuggestion],
  })
  suggestions: TimeSlotSuggestion[];

  @ApiProperty({
    description: 'Additional insights from AI analysis',
    type: [String],
    example: [
      'Most attendees prefer morning meetings',
      'Tuesday and Wednesday have fewer conflicts',
      'Consider booking Conference Room A for better equipment access',
    ],
  })
  insights: string[];

  @ApiProperty({
    description: 'Scheduling constraints or limitations found',
    type: [String],
    example: ['Limited availability on Fridays', 'No large meeting rooms available'],
    required: false,
  })
  constraints?: string[];

  @ApiProperty({
    description: 'Alternative suggestions if primary slots are not suitable',
    type: [String],
    example: [
      'Consider shorter 45-minute duration for more availability',
      'Move to next week for better attendee alignment',
    ],
    required: false,
  })
  alternatives?: string[];
}