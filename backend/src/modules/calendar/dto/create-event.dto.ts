import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsDateString,
  IsBoolean,
  IsArray,
  IsUUID,
  IsEnum,
  IsObject,
  Allow,
} from 'class-validator';
import { Transform } from 'class-transformer';

export enum EventVisibility {
  PRIVATE = 'private',
  PUBLIC = 'public',
  INTERNAL = 'internal',
}

export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

export enum EventPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateEventDto {
  @ApiProperty({
    description: 'Event title',
    example: 'Team Standup Meeting',
  })
  @Transform(({ value }) => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: 'Event description',
    example: 'Daily standup to discuss project progress',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Event start time',
    example: '2024-01-15T10:00:00.000Z',
  })
  @IsDateString()
  start_time: string;

  @ApiProperty({
    description: 'Event end time',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsDateString()
  end_time: string;

  @ApiProperty({
    description: 'Whether this is an all-day event',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  all_day?: boolean;

  @ApiProperty({
    description: 'Event location',
    example: 'Conference Room A',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Meeting room ID',
    example: 'uuid-here',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  room_id?: string;

  @ApiProperty({
    description: 'Event category ID',
    example: 'uuid-here',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @ApiProperty({
    description: 'List of attendee email addresses',
    example: ['john@example.com', 'jane@example.com'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle undefined/null
    if (value === undefined || value === null) {
      return undefined;
    }
    // Handle empty string
    if (value === '') {
      return [];
    }
    // Handle string that needs to be parsed
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not valid JSON, treat as single item array
        return value.trim() ? [value] : [];
      }
    }
    // Already an array
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsString({ each: true })
  attendees?: string[];

  @ApiProperty({
    description: 'Meeting URL (Zoom, Teams, etc.)',
    example: 'https://zoom.us/j/123456789',
    required: false,
  })
  @IsOptional()
  @IsString()
  meeting_url?: string;

  @ApiProperty({
    description: 'Event visibility',
    enum: EventVisibility,
    example: EventVisibility.PRIVATE,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventVisibility)
  visibility?: EventVisibility;

  @ApiProperty({
    description: 'Event priority',
    enum: EventPriority,
    example: EventPriority.NORMAL,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventPriority)
  priority?: EventPriority;

  @ApiProperty({
    description: 'Event status',
    enum: EventStatus,
    example: EventStatus.CONFIRMED,
    required: false,
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @ApiProperty({
    description: 'Whether this is a recurring event',
    example: false,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  is_recurring?: boolean;

  @ApiProperty({
    description: 'Recurrence rule for recurring events',
    example: { frequency: 'weekly', interval: 1, daysOfWeek: ['monday', 'wednesday', 'friday'] },
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  recurrence_rule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval?: number;
    daysOfWeek?: string[];
    byWeekDay?: number[]; // Alternative format: array of day numbers (0=Sun, 1=Mon, etc.)
    endDate?: string;
    until?: string; // Alternative to endDate (ISO date string)
    occurrences?: number;
  };

  @ApiProperty({
    description: 'Reminder settings in minutes before event',
    example: [15, 60],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsArray()
  reminders?: number[];

  @ApiProperty({
    description: 'Unified attachments object containing file, note, event, and drive attachments',
    example: {
      file_attachment: ['file-uuid-1'],
      note_attachment: ['note-uuid-1'],
      event_attachment: [],
      drive_attachment: [],
    },
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {
          file_attachment: [],
          note_attachment: [],
          event_attachment: [],
          drive_attachment: [],
        };
      }
    }
    if (value && typeof value === 'object') {
      return {
        file_attachment: Array.isArray(value.file_attachment) ? value.file_attachment : [],
        note_attachment: Array.isArray(value.note_attachment) ? value.note_attachment : [],
        event_attachment: Array.isArray(value.event_attachment) ? value.event_attachment : [],
        drive_attachment: Array.isArray(value.drive_attachment) ? value.drive_attachment : [],
      };
    }
    return { file_attachment: [], note_attachment: [], event_attachment: [], drive_attachment: [] };
  })
  @IsObject()
  attachments?: {
    file_attachment: string[];
    note_attachment: string[];
    event_attachment: string[];
    drive_attachment?: Array<{
      id: string;
      title: string;
      driveFileUrl?: string;
      driveThumbnailUrl?: string;
      driveMimeType?: string;
      driveFileSize?: number;
    }>;
  };

  @ApiProperty({
    description:
      'Array of file IDs embedded in the description content (for rich text images/files)',
    example: ['file-uuid-1', 'file-uuid-2'],
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Handle undefined/null
    if (value === undefined || value === null) {
      return undefined;
    }
    // Handle empty string
    if (value === '') {
      return [];
    }
    // Handle string that needs to be parsed
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // If not valid JSON, treat as single item array
        return value.trim() ? [value] : [];
      }
    }
    // Already an array
    if (Array.isArray(value)) {
      return value;
    }
    return [];
  })
  @IsArray()
  @IsUUID('4', { each: true })
  description_file_ids?: string[];
}
