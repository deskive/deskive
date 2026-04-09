import { ApiProperty } from '@nestjs/swagger';

export class SubscriptionPlanInfo {
  @ApiProperty({ description: 'Plan ID', example: 'free' })
  id: string;

  @ApiProperty({ description: 'Plan name', example: 'Free' })
  name: string;

  @ApiProperty({ description: 'Maximum storage in GB', example: 1 })
  max_storage_gb: number;
}

export class FileTypeBreakdown {
  @ApiProperty({ description: 'Number of image files', example: 6 })
  images: number;

  @ApiProperty({ description: 'Number of video files', example: 0 })
  videos: number;

  @ApiProperty({ description: 'Number of audio files', example: 0 })
  audio: number;

  @ApiProperty({ description: 'Number of document files', example: 0 })
  documents: number;

  @ApiProperty({ description: 'Number of spreadsheet files', example: 0 })
  spreadsheets: number;

  @ApiProperty({ description: 'Number of PDF files', example: 0 })
  pdfs: number;
}

export class DashboardStatsResponseDto {
  @ApiProperty({
    description: 'Total number of files in workspace',
    example: 6
  })
  total_files: number;

  @ApiProperty({
    description: 'Number of files added today',
    example: 5
  })
  files_added_today: number;

  @ApiProperty({
    description: 'Total storage used in bytes',
    example: 616243
  })
  storage_used_bytes: number;

  @ApiProperty({
    description: 'Total storage used (formatted)',
    example: '601.8 KB'
  })
  storage_used_formatted: string;

  @ApiProperty({
    description: 'Maximum storage available in bytes',
    example: 10737418240
  })
  storage_total_bytes: number;

  @ApiProperty({
    description: 'Maximum storage available (formatted)',
    example: '10 GB'
  })
  storage_total_formatted: string;

  @ApiProperty({
    description: 'Percentage of storage used',
    example: 0.006
  })
  storage_percentage_used: number;

  @ApiProperty({
    description: 'Number of AI-generated files this month',
    example: 0
  })
  ai_generations_this_month: number;

  @ApiProperty({
    description: 'Number of unique file types (categories with files)',
    example: 4
  })
  unique_file_types: number;

  @ApiProperty({
    description: 'Breakdown of files by type category',
    type: FileTypeBreakdown
  })
  file_type_breakdown: FileTypeBreakdown;

  @ApiProperty({
    description: 'Subscription plan information',
    type: SubscriptionPlanInfo,
    required: false
  })
  plan?: SubscriptionPlanInfo;
}
