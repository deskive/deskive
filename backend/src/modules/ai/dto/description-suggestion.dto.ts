import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum DescriptionType {
  TASK = 'task',
  PROJECT = 'project',
  EVENT = 'event',
  MEETING = 'meeting',
}

export enum DescriptionTone {
  PROFESSIONAL = 'professional',
  CASUAL = 'casual',
  FRIENDLY = 'friendly',
  FORMAL = 'formal',
  CONCISE = 'concise',
}

export class GenerateDescriptionSuggestionsDto {
  @ApiProperty({
    description: 'Type of description to generate',
    enum: DescriptionType,
    example: DescriptionType.TASK
  })
  @IsEnum(DescriptionType)
  type: DescriptionType;

  @ApiProperty({
    description: 'Title/name of the item (task name, project name, event title, etc.)',
    example: 'Weekly Team Standup'
  })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Additional context to help generate better descriptions',
    example: 'This is for the engineering team'
  })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({
    description: 'Number of suggestions to generate (1-5)',
    default: 3,
    example: 3
  })
  @IsOptional()
  @IsNumber()
  count?: number;

  @ApiPropertyOptional({
    description: 'Tone of the description',
    enum: DescriptionTone,
    default: DescriptionTone.PROFESSIONAL
  })
  @IsOptional()
  @IsEnum(DescriptionTone)
  tone?: DescriptionTone;

  @ApiPropertyOptional({
    description: 'Maximum length hint for each description (short, medium, long)',
    default: 'medium'
  })
  @IsOptional()
  @IsString()
  length?: 'short' | 'medium' | 'long';
}

export class DescriptionSuggestionResponseDto {
  @ApiProperty({
    description: 'Array of description suggestions',
    type: [String],
    example: ['A weekly sync meeting to discuss progress...', 'Team standup to align on priorities...']
  })
  suggestions: string[];

  @ApiProperty({ description: 'Number of suggestions returned' })
  count: number;

  @ApiProperty({ description: 'Type of description generated', enum: DescriptionType })
  type: DescriptionType;

  @ApiProperty({ description: 'Timestamp of generation' })
  timestamp: string;

  @ApiProperty({ description: 'Unique request ID' })
  requestId: string;

  @ApiPropertyOptional({ description: 'Token usage information' })
  usage?: {
    tokensUsed: number;
    processingTimeMs: number;
  };
}
