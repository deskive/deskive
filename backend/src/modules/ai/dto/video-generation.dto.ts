import { IsString, IsOptional, IsEnum, IsNumber, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VideoAspectRatio {
  SQUARE = '1:1',
  PORTRAIT = '9:16',
  LANDSCAPE = '16:9',
  WIDESCREEN = '21:9',
  ULTRAWIDE = '32:9'
}

export enum VideoFrameRate {
  FPS_24 = 24,
  FPS_30 = 30,
  FPS_60 = 60
}

export enum VideoQuality {
  STANDARD = 'standard',
  HD = 'hd',
  FULL_HD = '1080p',
  ULTRA_HD = '4k'
}

export enum VideoStyle {
  REALISTIC = 'realistic',
  ANIMATED = 'animated',
  CARTOON = 'cartoon',
  CINEMATIC = 'cinematic',
  DOCUMENTARY = 'documentary',
  ARTISTIC = 'artistic',
  TIMELAPSE = 'timelapse',
  SLOW_MOTION = 'slow_motion'
}

export class GenerateVideoDto {
  @ApiProperty({ 
    description: 'The prompt describing the video to generate', 
    example: 'A timelapse of a city at sunset with moving clouds and traffic' 
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({ 
    description: 'Negative prompt - what to avoid in the video', 
    example: 'blurry, low quality, shaky camera' 
  })
  @IsOptional()
  @IsString()
  negative_prompt?: string;

  @ApiPropertyOptional({ 
    description: 'Duration of the video in seconds',
    example: 4,
    default: 4,
    minimum: 1,
    maximum: 30
  })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  duration?: number;

  @ApiPropertyOptional({ 
    description: 'Aspect ratio of the video',
    enum: VideoAspectRatio,
    example: VideoAspectRatio.LANDSCAPE,
    default: VideoAspectRatio.LANDSCAPE
  })
  @IsOptional()
  @IsEnum(VideoAspectRatio)
  aspect_ratio?: VideoAspectRatio;

  @ApiPropertyOptional({ 
    description: 'Frame rate of the video',
    enum: VideoFrameRate,
    example: VideoFrameRate.FPS_24,
    default: VideoFrameRate.FPS_24
  })
  @IsOptional()
  @IsEnum(VideoFrameRate)
  frame_rate?: VideoFrameRate;

  @ApiPropertyOptional({ 
    description: 'Quality of the generated video',
    enum: VideoQuality,
    example: VideoQuality.HD,
    default: VideoQuality.STANDARD
  })
  @IsOptional()
  @IsEnum(VideoQuality)
  quality?: VideoQuality;

  @ApiPropertyOptional({ 
    description: 'Style of the video',
    enum: VideoStyle,
    example: VideoStyle.CINEMATIC
  })
  @IsOptional()
  @IsEnum(VideoStyle)
  style?: VideoStyle;

  @ApiPropertyOptional({ 
    description: 'Motion intensity (1-10, where 1 is minimal motion and 10 is high motion)', 
    example: 5,
    minimum: 1,
    maximum: 10
  })
  @IsOptional()
  @IsNumber({ allowInfinity: false, allowNaN: false })
  motion_intensity?: number;

  @ApiPropertyOptional({ 
    description: 'Camera movement type', 
    example: 'pan_left' 
  })
  @IsOptional()
  @IsString()
  camera_movement?: string;

  @ApiPropertyOptional({ 
    description: 'Color palette keywords', 
    example: ['warm', 'golden hour', 'vibrant'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  color_palette?: string[];

  @ApiPropertyOptional({ 
    description: 'Mood or atmosphere keywords', 
    example: ['peaceful', 'dynamic', 'energetic'] 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  mood?: string[];

  @ApiPropertyOptional({ 
    description: 'Lighting conditions', 
    example: 'golden hour lighting' 
  })
  @IsOptional()
  @IsString()
  lighting?: string;

  @ApiPropertyOptional({ 
    description: 'Environment or setting', 
    example: 'urban cityscape' 
  })
  @IsOptional()
  @IsString()
  environment?: string;

  @ApiPropertyOptional({ 
    description: 'Subject or main focus', 
    example: 'busy street with cars and people' 
  })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({ 
    description: 'Seed for reproducible results', 
    example: 12345 
  })
  @IsOptional()
  @IsNumber()
  seed?: number;

  @ApiPropertyOptional({ 
    description: 'Enable high-quality upscaling', 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  upscale?: boolean;

  @ApiPropertyOptional({ 
    description: 'Enable audio generation', 
    default: false 
  })
  @IsOptional()
  @IsBoolean()
  with_audio?: boolean;
}

export class GetVideoJobStatusDto {
  @ApiProperty({ 
    description: 'Video generation task ID', 
    example: 'task_12345abcdef' 
  })
  @IsString()
  task_id: string;
}