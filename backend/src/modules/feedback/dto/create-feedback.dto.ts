import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  MinLength,
  MaxLength,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum FeedbackType {
  BUG = 'bug',
  ISSUE = 'issue',
  IMPROVEMENT = 'improvement',
  FEATURE_REQUEST = 'feature_request',
}

export enum FeedbackCategory {
  UI = 'ui',
  PERFORMANCE = 'performance',
  FEATURE = 'feature',
  SECURITY = 'security',
  OTHER = 'other',
}

export class AttachmentDto {
  @ApiProperty({ description: 'File URL', example: 'https://storage.example.com/file.png' })
  @IsString()
  url: string;

  @ApiProperty({ description: 'File name', example: 'screenshot.png' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'File MIME type', example: 'image/png' })
  @IsString()
  type: string;

  @ApiProperty({ description: 'File size in bytes', example: 1024000 })
  @IsNumber()
  size: number;
}

export class DeviceInfoDto {
  @ApiPropertyOptional({ description: 'Platform', example: 'android' })
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional({ description: 'OS version', example: '14.0' })
  @IsOptional()
  @IsString()
  osVersion?: string;

  @ApiPropertyOptional({ description: 'Device model', example: 'Pixel 7' })
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional({ description: 'Screen resolution', example: '1080x2400' })
  @IsOptional()
  @IsString()
  screenResolution?: string;
}

export class CreateFeedbackDto {
  @ApiProperty({
    description: 'Type of feedback',
    enum: FeedbackType,
    example: FeedbackType.BUG,
  })
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @ApiProperty({
    description: 'Feedback title',
    example: 'App crashes when opening settings',
    minLength: 5,
    maxLength: 200,
  })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed description of the feedback',
    example:
      'When I open the settings screen and tap on notifications, the app crashes immediately.',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  description: string;

  @ApiPropertyOptional({
    description: 'Category of the feedback',
    enum: FeedbackCategory,
    example: FeedbackCategory.UI,
  })
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @ApiPropertyOptional({
    description: 'Attachments (screenshots, files)',
    type: [AttachmentDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiPropertyOptional({
    description: 'App version',
    example: '1.2.3',
  })
  @IsOptional()
  @IsString()
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Device information',
    type: DeviceInfoDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DeviceInfoDto)
  deviceInfo?: DeviceInfoDto;
}
