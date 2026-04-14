import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsObject,
} from 'class-validator';

export enum CallType {
  AUDIO = 'audio',
  VIDEO = 'video',
}

export enum VideoQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  HD = 'hd',
  FOUR_K = '4k',
}

export class CreateVideoCallDto {
  @ApiProperty({ description: 'Call title/subject', example: 'Team Standup Meeting' })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Call description',
    example: 'Daily standup to discuss progress',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ description: 'Call type', enum: CallType, example: CallType.VIDEO })
  @IsEnum(CallType)
  call_type: CallType;

  @ApiProperty({ description: 'Is this a group call', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_group_call?: boolean = false;

  @ApiProperty({ description: 'Participant user IDs to invite', type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  participant_ids?: string[];

  @ApiProperty({ description: 'Enable recording', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  recording_enabled?: boolean = false;

  @ApiProperty({
    description: 'Video quality',
    enum: VideoQuality,
    example: VideoQuality.HD,
    required: false,
  })
  @IsOptional()
  @IsEnum(VideoQuality)
  video_quality?: VideoQuality = VideoQuality.HD;

  @ApiProperty({ description: 'Maximum participants', example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(500)
  max_participants?: number = 50;

  @ApiProperty({
    description: 'Scheduled start time (ISO 8601)',
    example: '2024-01-15T10:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduled_start_time?: string;

  @ApiProperty({
    description: 'Scheduled end time (ISO 8601)',
    example: '2024-01-15T11:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  scheduled_end_time?: string;

  @ApiProperty({ description: 'Enable end-to-end encryption', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  e2ee_enabled?: boolean = false;

  @ApiProperty({
    description: 'Lock room on join (no new participants after started)',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  lock_on_join?: boolean = false;

  @ApiProperty({
    description: 'Additional metadata (AI settings, location, recurrence, etc.)',
    example: { ai_features: true, ai_settings: {} },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
