import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

// ============================================================================
// OAuth DTOs
// ============================================================================

export class SlackOAuthCallbackDto {
  @ApiProperty({ description: 'OAuth authorization code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsOptional()
  state?: string;
}

// ============================================================================
// Connection DTOs
// ============================================================================

export class SlackConnectionDto {
  @ApiProperty({ description: 'Connection ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'User ID who made the connection' })
  userId: string;

  @ApiPropertyOptional({ description: 'Slack team/workspace ID' })
  teamId?: string;

  @ApiPropertyOptional({ description: 'Slack team name' })
  teamName?: string;

  @ApiPropertyOptional({ description: 'Slack user ID' })
  slackUserId?: string;

  @ApiPropertyOptional({ description: 'Slack email' })
  slackEmail?: string;

  @ApiPropertyOptional({ description: 'Slack display name' })
  slackName?: string;

  @ApiPropertyOptional({ description: 'Slack profile picture URL' })
  slackPicture?: string;

  @ApiProperty({ description: 'Whether the connection is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  lastSyncedAt?: Date;

  @ApiProperty({ description: 'Connection created timestamp' })
  createdAt: Date;
}

// ============================================================================
// Channel DTOs
// ============================================================================

export class SlackChannelDto {
  @ApiProperty({ description: 'Channel ID' })
  id: string;

  @ApiProperty({ description: 'Channel name' })
  name: string;

  @ApiPropertyOptional({ description: 'Channel topic' })
  topic?: string;

  @ApiPropertyOptional({ description: 'Channel purpose/description' })
  purpose?: string;

  @ApiProperty({ description: 'Whether it is a private channel' })
  isPrivate: boolean;

  @ApiProperty({ description: 'Whether it is an IM/DM channel' })
  isIm: boolean;

  @ApiProperty({ description: 'Whether the user is a member' })
  isMember: boolean;

  @ApiProperty({ description: 'Number of members' })
  numMembers: number;

  @ApiPropertyOptional({ description: 'Channel creation timestamp' })
  created?: number;
}

export class ListChannelsResponseDto {
  @ApiProperty({ description: 'List of channels', type: [SlackChannelDto] })
  channels: SlackChannelDto[];

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  nextCursor?: string;
}

// ============================================================================
// Message DTOs
// ============================================================================

export class SlackMessageDto {
  @ApiProperty({ description: 'Message timestamp (unique ID)' })
  ts: string;

  @ApiProperty({ description: 'Message text content' })
  text: string;

  @ApiProperty({ description: 'User ID who sent the message' })
  user: string;

  @ApiPropertyOptional({ description: 'Username' })
  username?: string;

  @ApiPropertyOptional({ description: 'Thread timestamp if in thread' })
  threadTs?: string;

  @ApiPropertyOptional({ description: 'Number of replies in thread' })
  replyCount?: number;

  @ApiPropertyOptional({ description: 'Attachments' })
  attachments?: any[];

  @ApiPropertyOptional({ description: 'Blocks (rich content)' })
  blocks?: any[];

  @ApiPropertyOptional({ description: 'Reactions on the message' })
  reactions?: { name: string; count: number; users: string[] }[];
}

export class ListMessagesQueryDto {
  @ApiProperty({ description: 'Channel ID to fetch messages from' })
  @IsString()
  channel: string;

  @ApiPropertyOptional({ description: 'Number of messages to fetch' })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Oldest message timestamp to include' })
  @IsString()
  @IsOptional()
  oldest?: string;

  @ApiPropertyOptional({ description: 'Latest message timestamp to include' })
  @IsString()
  @IsOptional()
  latest?: string;
}

export class ListMessagesResponseDto {
  @ApiProperty({ description: 'List of messages', type: [SlackMessageDto] })
  messages: SlackMessageDto[];

  @ApiProperty({ description: 'Whether there are more messages' })
  hasMore: boolean;

  @ApiPropertyOptional({ description: 'Cursor for next page' })
  nextCursor?: string;
}

// ============================================================================
// Send Message DTOs
// ============================================================================

export class SlackSendMessageDto {
  @ApiProperty({ description: 'Channel ID to send message to' })
  @IsString()
  channel: string;

  @ApiProperty({ description: 'Message text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Thread timestamp to reply to' })
  @IsString()
  @IsOptional()
  threadTs?: string;

  @ApiPropertyOptional({ description: 'Whether to also send to channel when replying to thread' })
  @IsBoolean()
  @IsOptional()
  replyBroadcast?: boolean;

  @ApiPropertyOptional({ description: 'Rich content blocks' })
  @IsArray()
  @IsOptional()
  blocks?: any[];

  @ApiPropertyOptional({ description: 'Attachments' })
  @IsArray()
  @IsOptional()
  attachments?: any[];
}

export class SendMessageResponseDto {
  @ApiProperty({ description: 'Whether the message was sent successfully' })
  ok: boolean;

  @ApiProperty({ description: 'Channel ID where message was sent' })
  channel: string;

  @ApiProperty({ description: 'Message timestamp (ID)' })
  ts: string;

  @ApiPropertyOptional({ description: 'The sent message' })
  message?: SlackMessageDto;
}

// ============================================================================
// User DTOs
// ============================================================================

export class SlackUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username' })
  name: string;

  @ApiPropertyOptional({ description: 'Real name' })
  realName?: string;

  @ApiPropertyOptional({ description: 'Display name' })
  displayName?: string;

  @ApiPropertyOptional({ description: 'Email address' })
  email?: string;

  @ApiPropertyOptional({ description: 'Profile picture URL' })
  image?: string;

  @ApiProperty({ description: 'Whether user is a bot' })
  isBot: boolean;

  @ApiProperty({ description: 'Whether user is admin' })
  isAdmin: boolean;

  @ApiPropertyOptional({ description: 'User status text' })
  statusText?: string;

  @ApiPropertyOptional({ description: 'User status emoji' })
  statusEmoji?: string;
}

export class ListUsersResponseDto {
  @ApiProperty({ description: 'List of users', type: [SlackUserDto] })
  members: SlackUserDto[];

  @ApiPropertyOptional({ description: 'Cursor for pagination' })
  nextCursor?: string;
}

// ============================================================================
// Reaction DTOs
// ============================================================================

export class AddReactionDto {
  @ApiProperty({ description: 'Channel containing the message' })
  @IsString()
  channel: string;

  @ApiProperty({ description: 'Message timestamp' })
  @IsString()
  timestamp: string;

  @ApiProperty({ description: 'Emoji name (without colons)' })
  @IsString()
  name: string;
}

// ============================================================================
// File DTOs
// ============================================================================

export class SlackFileDto {
  @ApiProperty({ description: 'File ID' })
  id: string;

  @ApiProperty({ description: 'File name' })
  name: string;

  @ApiPropertyOptional({ description: 'File title' })
  title?: string;

  @ApiProperty({ description: 'MIME type' })
  mimetype: string;

  @ApiProperty({ description: 'File size in bytes' })
  size: number;

  @ApiPropertyOptional({ description: 'URL to download file' })
  urlPrivate?: string;

  @ApiPropertyOptional({ description: 'Permalink to file' })
  permalink?: string;

  @ApiPropertyOptional({ description: 'Thumbnail URL' })
  thumb?: string;

  @ApiProperty({ description: 'Upload timestamp' })
  created: number;

  @ApiProperty({ description: 'User who uploaded' })
  user: string;
}

export class ListFilesQueryDto {
  @ApiPropertyOptional({ description: 'Channel to filter files' })
  @IsString()
  @IsOptional()
  channel?: string;

  @ApiPropertyOptional({ description: 'User to filter files' })
  @IsString()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional({ description: 'Number of files to return' })
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;
}

export class ListFilesResponseDto {
  @ApiProperty({ description: 'List of files', type: [SlackFileDto] })
  files: SlackFileDto[];

  @ApiProperty({ description: 'Total number of files' })
  total: number;

  @ApiProperty({ description: 'Current page' })
  page: number;

  @ApiProperty({ description: 'Total pages' })
  pages: number;
}

// ============================================================================
// Search DTOs
// ============================================================================

export class SearchQueryDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Number of results to return' })
  @IsOptional()
  count?: number;

  @ApiPropertyOptional({ description: 'Page number' })
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: 'Sort by: score or timestamp' })
  @IsString()
  @IsOptional()
  sort?: 'score' | 'timestamp';

  @ApiPropertyOptional({ description: 'Sort direction' })
  @IsString()
  @IsOptional()
  sortDir?: 'asc' | 'desc';
}

export class SearchResultDto {
  @ApiProperty({ description: 'Message search results' })
  messages: {
    total: number;
    matches: SlackMessageDto[];
  };

  @ApiPropertyOptional({ description: 'File search results' })
  files?: {
    total: number;
    matches: SlackFileDto[];
  };
}
