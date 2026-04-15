import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, ArrayMaxSize } from 'class-validator';

export class TabArrangementDto {
  @ApiProperty({
    description: 'Tab IDs in bottom navigation bar (ordered, max 5)',
    example: ['home', 'autopilot', 'messages', 'projects', 'notes'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  bottomNavTabIds: string[];

  @ApiProperty({
    description: 'Tab IDs in More menu (ordered)',
    example: [
      'calendar',
      'video_calls',
      'files',
      'email',
      'search',
      'connectors',
      'tools',
      'bots',
      'settings',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  moreMenuTabIds: string[];

  @ApiProperty({
    description: 'Last modified timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastModified?: string;
}

export class UpdateTabArrangementDto {
  @ApiProperty({
    description: 'Tab IDs in bottom navigation bar (ordered, max 5)',
    example: ['home', 'autopilot', 'messages', 'projects', 'notes'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  bottomNavTabIds: string[];

  @ApiProperty({
    description: 'Tab IDs in More menu (ordered)',
    example: [
      'calendar',
      'video_calls',
      'files',
      'email',
      'search',
      'connectors',
      'tools',
      'bots',
      'settings',
    ],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  moreMenuTabIds: string[];
}
