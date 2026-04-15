import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, MaxLength, IsArray } from 'class-validator';

export class UpdateChannelDto {
  @ApiProperty({ description: 'Channel name', example: 'general', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @ApiProperty({
    description: 'Channel description',
    example: 'General discussion',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Is private channel', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_private?: boolean;

  @ApiProperty({
    description: 'Member IDs for private channel',
    example: ['user-id-1', 'user-id-2'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  member_ids?: string[];
}
