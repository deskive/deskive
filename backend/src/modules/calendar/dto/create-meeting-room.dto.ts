import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsArray,
  IsBoolean,
  IsObject,
  Min,
  Max,
} from 'class-validator';

export enum RoomType {
  CONFERENCE = 'conference',
  MEETING = 'meeting',
  HUDDLE = 'huddle',
  TRAINING = 'training',
  PRESENTATION = 'presentation',
  PHONE_BOOTH = 'phone_booth',
}

export enum BookingPolicy {
  OPEN = 'open',
  APPROVAL_REQUIRED = 'approval_required',
  RESTRICTED = 'restricted',
}

export class CreateMeetingRoomDto {
  @ApiProperty({
    description: 'Meeting room name',
    example: 'Conference Room A',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Room description',
    example: 'Large conference room with video conferencing equipment',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Room location/address',
    example: '1st Floor, Building A',
    required: false,
  })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({
    description: 'Room capacity (number of people)',
    example: 12,
    minimum: 1,
    maximum: 1000,
  })
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;

  @ApiProperty({
    description: 'Type of meeting room',
    enum: RoomType,
    example: RoomType.CONFERENCE,
  })
  @IsEnum(RoomType)
  room_type: RoomType;

  @ApiProperty({
    description: 'Available equipment in the room',
    example: ['projector', 'whiteboard', 'video_conference', 'audio_system'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  equipment?: string[];

  @ApiProperty({
    description: 'Room amenities',
    example: ['coffee_machine', 'water', 'snacks', 'air_conditioning'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @ApiProperty({
    description: 'Booking policy for the room',
    enum: BookingPolicy,
    example: BookingPolicy.OPEN,
    required: false,
  })
  @IsOptional()
  @IsEnum(BookingPolicy)
  booking_policy?: BookingPolicy;

  @ApiProperty({
    description: 'Working hours configuration',
    example: {
      monday: { start: '09:00', end: '18:00', available: true },
      tuesday: { start: '09:00', end: '18:00', available: true },
      wednesday: { start: '09:00', end: '18:00', available: true },
      thursday: { start: '09:00', end: '18:00', available: true },
      friday: { start: '09:00', end: '18:00', available: true },
      saturday: { available: false },
      sunday: { available: false },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  working_hours?: {
    [key: string]: {
      start?: string;
      end?: string;
      available: boolean;
    };
  };

  @ApiProperty({
    description: 'Floor number',
    example: '1st Floor',
    required: false,
  })
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiProperty({
    description: 'Building name',
    example: 'Building A',
    required: false,
  })
  @IsOptional()
  @IsString()
  building?: string;

  @ApiProperty({
    description: 'Room code for easy identification',
    example: 'CR-A-001',
    required: false,
  })
  @IsOptional()
  @IsString()
  room_code?: string;

  @ApiProperty({
    description: 'Room thumbnail image URL',
    example: 'https://example.com/room-images/room-a.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiProperty({
    description: 'Additional room images',
    example: ['https://example.com/room1.jpg', 'https://example.com/room2.jpg'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
