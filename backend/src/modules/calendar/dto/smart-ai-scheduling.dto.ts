import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';

export enum SchedulingContext {
  WORK = 'work',
  PERSONAL = 'personal',
  URGENT = 'urgent',
  CASUAL = 'casual',
  FORMAL = 'formal',
}

export class SmartAISchedulingRequestDto {
  @ApiProperty({
    description: 'Natural language prompt describing the meeting or event to schedule',
    example:
      'Schedule a team meeting next week to discuss the new project launch. Need John, Sarah, and Mike to attend. Should be about 90 minutes with a projector.',
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Optional context to help AI understand the scheduling scenario',
    enum: SchedulingContext,
    example: SchedulingContext.WORK,
    required: false,
  })
  @IsOptional()
  @IsEnum(SchedulingContext)
  context?: SchedulingContext;

  @ApiProperty({
    description: 'Maximum number of days to look ahead for scheduling (default: 14)',
    example: 14,
    minimum: 1,
    maximum: 30,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  maxLookAheadDays?: number = 14;

  @ApiProperty({
    description: 'Include weekend options in suggestions (default: false)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  includeWeekends?: boolean = false;

  @ApiProperty({
    description: 'User timezone for intelligent time interpretation (default: UTC)',
    example: 'America/New_York',
    required: false,
  })
  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';

  @ApiProperty({
    description: 'Additional constraints or preferences',
    example: 'Avoid Fridays, prefer conference room with video equipment',
    required: false,
  })
  @IsOptional()
  @IsString()
  additionalNotes?: string;
}

export class ParsedSchedulingInfo {
  @ApiProperty({
    description: 'Extracted event title',
    example: 'Project Launch Team Meeting',
  })
  title: string;

  @ApiProperty({
    description: 'Inferred or extracted description',
    example: 'Team meeting to discuss the new project launch strategy and next steps',
  })
  description: string;

  @ApiProperty({
    description: 'Estimated duration in minutes',
    example: 90,
  })
  estimatedDuration: number;

  @ApiProperty({
    description: 'Inferred priority level',
    example: 'high',
  })
  priority: string;

  @ApiProperty({
    description: 'Extracted attendee emails or names',
    type: [String],
    example: ['john@company.com', 'sarah@company.com', 'mike@company.com'],
  })
  attendees: string[];

  @ApiProperty({
    description: 'Preferred or required location/room type',
    example: 'Conference room with projector',
  })
  preferredLocation: string;

  @ApiProperty({
    description: 'Inferred time preferences',
    type: [String],
    example: ['morning', 'next week'],
  })
  timePreferences: string[];

  @ApiProperty({
    description: 'Equipment or setup requirements',
    type: [String],
    example: ['projector', 'video equipment'],
  })
  requirements: string[];

  @ApiProperty({
    description: 'Constraints mentioned in the prompt',
    type: [String],
    example: ['avoid Fridays', 'all attendees must be present'],
  })
  constraints: string[];

  @ApiProperty({
    description: 'Confidence score of the AI parsing (0-100)',
    example: 85,
  })
  confidence: number;
}

export class SmartTimeSlotSuggestion {
  @ApiProperty({
    description: 'Suggested start time',
    example: '2024-01-15T10:00:00.000Z',
  })
  startTime: string;

  @ApiProperty({
    description: 'Suggested end time',
    example: '2024-01-15T11:30:00.000Z',
  })
  endTime: string;

  @ApiProperty({
    description: 'Overall confidence score for this suggestion (0-100)',
    example: 92,
  })
  confidence: number;

  @ApiProperty({
    description: 'Detailed reasoning for this suggestion',
    example:
      'Optimal time slot: All mentioned attendees are available, matches inferred morning preference, and Conference Room A with projector is available',
  })
  reasoning: string;

  @ApiProperty({
    description: 'How well this matches the user prompt (0-100)',
    example: 95,
  })
  promptMatchScore: number;

  @ApiProperty({
    description: 'Potential concerns or considerations',
    type: [String],
    example: ['John has a call 30 minutes after', 'Rush hour traffic might affect attendance'],
  })
  considerations: string[];

  @ApiProperty({
    description: 'Recommended meeting room with details',
    required: false,
  })
  recommendedRoom?: {
    id: string;
    name: string;
    capacity: number;
    equipment: string[];
    whyRecommended: string;
  };

  @ApiProperty({
    description: 'Alternative room options',
    type: [Object],
    required: false,
  })
  alternativeRooms?: Array<{
    id: string;
    name: string;
    capacity: number;
    equipment: string[];
    note: string;
  }>;
}

export class SmartAISchedulingResponseDto {
  @ApiProperty({
    description: 'Whether the AI successfully parsed and processed the prompt',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'AI-generated interpretation of the scheduling request',
    example:
      'I understand you want to schedule a 90-minute team meeting for 4 people to discuss a project launch, preferably next week with presentation capabilities.',
  })
  interpretation: string;

  @ApiProperty({
    description: 'Structured information extracted from the prompt',
    type: ParsedSchedulingInfo,
  })
  extractedInfo: ParsedSchedulingInfo;

  @ApiProperty({
    description: 'Smart scheduling suggestions with detailed reasoning',
    type: [SmartTimeSlotSuggestion],
  })
  suggestions: SmartTimeSlotSuggestion[];

  @ApiProperty({
    description: 'AI insights about the request and scheduling patterns',
    type: [String],
    example: [
      'Based on your prompt, this appears to be a high-priority project meeting',
      'All mentioned attendees have good availability on Tuesday and Wednesday mornings',
      'Conference rooms with presentation equipment are most available mid-week',
    ],
  })
  insights: string[];

  @ApiProperty({
    description: 'Missing information that could improve suggestions',
    type: [String],
    example: [
      'Specific date preference not mentioned - assumed next week',
      'Some attendee emails may need verification',
    ],
    required: false,
  })
  missingInfo?: string[];

  @ApiProperty({
    description: 'Questions AI would like to ask for better suggestions',
    type: [String],
    example: [
      'Would you prefer morning or afternoon for this meeting?',
      'Is this a one-time meeting or should I also suggest follow-up sessions?',
    ],
    required: false,
  })
  clarifyingQuestions?: string[];

  @ApiProperty({
    description: "Alternative approaches if primary suggestions don't work",
    type: [String],
    example: [
      'Consider splitting into two shorter 45-minute sessions',
      'Virtual meeting option available if room booking is challenging',
      'Lunch meeting format could work for casual discussion',
    ],
    required: false,
  })
  alternatives?: string[];

  @ApiProperty({
    description: 'Automatically generated follow-up suggestions',
    type: [String],
    example: [
      'Would you like me to also schedule a follow-up meeting in 2 weeks?',
      'Should I send calendar invites with project materials attached?',
    ],
    required: false,
  })
  followUpSuggestions?: string[];
}
