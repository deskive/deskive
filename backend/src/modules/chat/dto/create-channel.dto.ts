import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, IsArray } from 'class-validator';

export class CreateChannelDto {
  @ApiProperty({ description: 'Channel name', example: 'general' })
  @IsString()
  @MaxLength(50)
  name: string;

  @ApiProperty({
    description: 'Channel description',
    example: 'General discussion',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Channel type', example: 'channel', required: false })
  @IsOptional()
  @IsString()
  type?: string = 'channel';

  @ApiProperty({ description: 'Is private channel', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_private?: boolean = false;

  @ApiProperty({
    description: 'Array of user IDs to add as channel members (only for private channels)',
    example: ['user-id-1', 'user-id-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  member_ids?: string[];
}
