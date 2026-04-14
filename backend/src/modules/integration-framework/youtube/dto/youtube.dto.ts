import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetPlaylistDto {
  @ApiProperty({ description: 'Playlist ID' })
  @IsString()
  playlistId: string;

  @ApiPropertyOptional({ description: 'Fields to return', type: [String] })
  @IsOptional()
  @IsArray()
  part?: string[];
}

export class CreatePlaylistDto {
  @ApiProperty({ description: 'Playlist title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Playlist description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Privacy status', enum: ['public', 'private', 'unlisted'] })
  @IsOptional()
  @IsString()
  privacyStatus?: 'public' | 'private' | 'unlisted';

  @ApiPropertyOptional({ description: 'Tags (comma-separated)' })
  @IsOptional()
  @IsString()
  tags?: string;
}

export class GetVideoDto {
  @ApiProperty({ description: 'Video ID' })
  @IsString()
  videoId: string;

  @ApiPropertyOptional({ description: 'Fields to return', type: [String] })
  @IsOptional()
  @IsArray()
  part?: string[];
}

export class SearchVideosDto {
  @ApiPropertyOptional({ description: 'Search query' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Channel ID to filter by' })
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Max results to return', default: 25 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({
    description: 'Order results by',
    enum: ['date', 'rating', 'relevance', 'title', 'viewCount'],
  })
  @IsOptional()
  @IsString()
  order?: string;
}

export class AddPlaylistItemDto {
  @ApiProperty({ description: 'Playlist ID' })
  @IsString()
  playlistId: string;

  @ApiProperty({ description: 'Video ID to add' })
  @IsString()
  videoId: string;

  @ApiPropertyOptional({ description: 'Position in playlist' })
  @IsOptional()
  @IsNumber()
  position?: number;
}

export class RateVideoDto {
  @ApiProperty({ description: 'Video ID' })
  @IsString()
  videoId: string;

  @ApiProperty({ description: 'Rating', enum: ['like', 'dislike', 'none'] })
  @IsString()
  rating: 'like' | 'dislike' | 'none';
}
