import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, MaxLength } from 'class-validator';

// ============================================================================
// OAuth DTOs
// ============================================================================

export class TwitterOAuthCallbackDto {
  @ApiPropertyOptional({ description: 'OAuth 2.0 authorization code' })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({ description: 'OAuth error' })
  @IsString()
  @IsOptional()
  error?: string;

  @ApiPropertyOptional({ description: 'OAuth error description' })
  @IsString()
  @IsOptional()
  error_description?: string;
}

// ============================================================================
// Connection DTOs
// ============================================================================

export class TwitterConnectionDto {
  @ApiProperty({ description: 'Connection ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'User ID who made the connection' })
  userId: string;

  @ApiPropertyOptional({ description: 'Twitter user ID' })
  twitterUserId?: string;

  @ApiPropertyOptional({ description: 'Twitter username/handle' })
  twitterUsername?: string;

  @ApiPropertyOptional({ description: 'Twitter display name' })
  twitterName?: string;

  @ApiPropertyOptional({ description: 'Twitter profile picture URL' })
  twitterPicture?: string;

  @ApiPropertyOptional({ description: 'Whether the account is verified' })
  twitterVerified?: boolean;

  @ApiPropertyOptional({ description: 'Number of followers' })
  followersCount?: number;

  @ApiPropertyOptional({ description: 'Number of following' })
  followingCount?: number;

  @ApiPropertyOptional({ description: 'Number of tweets' })
  tweetCount?: number;

  @ApiProperty({ description: 'Whether the connection is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  lastSyncedAt?: Date;

  @ApiProperty({ description: 'Connection created timestamp' })
  createdAt: Date;
}

// ============================================================================
// Tweet DTOs
// ============================================================================

export class TweetDto {
  @ApiProperty({ description: 'Tweet ID' })
  id: string;

  @ApiProperty({ description: 'Tweet text content' })
  text: string;

  @ApiPropertyOptional({ description: 'Author user ID' })
  authorId?: string;

  @ApiPropertyOptional({ description: 'Author username' })
  authorUsername?: string;

  @ApiPropertyOptional({ description: 'Author name' })
  authorName?: string;

  @ApiPropertyOptional({ description: 'Author profile image URL' })
  authorProfileImage?: string;

  @ApiPropertyOptional({ description: 'Tweet creation time' })
  createdAt?: string;

  @ApiPropertyOptional({ description: 'Public metrics' })
  publicMetrics?: {
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
    bookmarkCount?: number;
    impressionCount?: number;
  };

  @ApiPropertyOptional({ description: 'Media attachments' })
  media?: TweetMediaDto[];

  @ApiPropertyOptional({ description: 'Referenced tweets (replied to, quoted, etc.)' })
  referencedTweets?: { type: string; id: string }[];

  @ApiPropertyOptional({ description: 'Conversation ID' })
  conversationId?: string;

  @ApiPropertyOptional({ description: 'In reply to user ID' })
  inReplyToUserId?: string;
}

export class TweetMediaDto {
  @ApiProperty({ description: 'Media key' })
  mediaKey: string;

  @ApiProperty({ description: 'Media type (photo, video, animated_gif)' })
  type: string;

  @ApiPropertyOptional({ description: 'Media URL' })
  url?: string;

  @ApiPropertyOptional({ description: 'Preview image URL' })
  previewImageUrl?: string;

  @ApiPropertyOptional({ description: 'Width' })
  width?: number;

  @ApiPropertyOptional({ description: 'Height' })
  height?: number;

  @ApiPropertyOptional({ description: 'Alt text' })
  altText?: string;

  @ApiPropertyOptional({ description: 'Duration in milliseconds (for video)' })
  durationMs?: number;
}

// ============================================================================
// Create Tweet DTOs
// ============================================================================

export class CreateTweetDto {
  @ApiProperty({ description: 'Tweet text content', maxLength: 280 })
  @IsString()
  @MaxLength(280)
  text: string;

  @ApiPropertyOptional({ description: 'Tweet ID to reply to' })
  @IsString()
  @IsOptional()
  replyToTweetId?: string;

  @ApiPropertyOptional({ description: 'Tweet ID to quote' })
  @IsString()
  @IsOptional()
  quoteTweetId?: string;

  @ApiPropertyOptional({ description: 'Media IDs to attach' })
  @IsArray()
  @IsOptional()
  mediaIds?: string[];

  @ApiPropertyOptional({ description: 'Poll options (2-4 options)' })
  @IsArray()
  @IsOptional()
  pollOptions?: string[];

  @ApiPropertyOptional({ description: 'Poll duration in minutes (5-10080)' })
  @IsNumber()
  @IsOptional()
  pollDurationMinutes?: number;
}

export class CreateTweetResponseDto {
  @ApiProperty({ description: 'Created tweet ID' })
  id: string;

  @ApiProperty({ description: 'Tweet text' })
  text: string;
}

// ============================================================================
// Timeline DTOs
// ============================================================================

export class TimelineQueryDto {
  @ApiPropertyOptional({ description: 'Maximum number of results (1-100)' })
  @IsOptional()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Pagination token' })
  @IsString()
  @IsOptional()
  paginationToken?: string;

  @ApiPropertyOptional({ description: 'Start time (ISO 8601)' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Exclude reply tweets' })
  @IsOptional()
  excludeReplies?: boolean;

  @ApiPropertyOptional({ description: 'Exclude retweets' })
  @IsOptional()
  excludeRetweets?: boolean;
}

export class TimelineResponseDto {
  @ApiProperty({ description: 'List of tweets', type: [TweetDto] })
  tweets: TweetDto[];

  @ApiPropertyOptional({ description: 'Next page token' })
  nextToken?: string;

  @ApiPropertyOptional({ description: 'Previous page token' })
  previousToken?: string;

  @ApiProperty({ description: 'Total result count' })
  resultCount: number;
}

// ============================================================================
// User DTOs
// ============================================================================

export class TwitterUserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Username/handle' })
  username: string;

  @ApiProperty({ description: 'Display name' })
  name: string;

  @ApiPropertyOptional({ description: 'User bio/description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  profileImageUrl?: string;

  @ApiPropertyOptional({ description: 'Location' })
  location?: string;

  @ApiPropertyOptional({ description: 'URL' })
  url?: string;

  @ApiPropertyOptional({ description: 'Whether the account is verified' })
  verified?: boolean;

  @ApiPropertyOptional({ description: 'Whether the account is protected' })
  protected?: boolean;

  @ApiPropertyOptional({ description: 'Public metrics' })
  publicMetrics?: {
    followersCount: number;
    followingCount: number;
    tweetCount: number;
    listedCount: number;
  };

  @ApiPropertyOptional({ description: 'Account creation date' })
  createdAt?: string;
}

export class FollowResponseDto {
  @ApiProperty({ description: 'List of users', type: [TwitterUserDto] })
  users: TwitterUserDto[];

  @ApiPropertyOptional({ description: 'Next page token' })
  nextToken?: string;

  @ApiProperty({ description: 'Result count' })
  resultCount: number;
}

// ============================================================================
// Search DTOs
// ============================================================================

export class SearchTweetsQueryDto {
  @ApiProperty({ description: 'Search query' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ description: 'Maximum number of results (10-100)' })
  @IsOptional()
  maxResults?: number;

  @ApiPropertyOptional({ description: 'Pagination token' })
  @IsString()
  @IsOptional()
  nextToken?: string;

  @ApiPropertyOptional({ description: 'Start time (ISO 8601)' })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ description: 'End time (ISO 8601)' })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ description: 'Sort order: recency or relevancy' })
  @IsString()
  @IsOptional()
  sortOrder?: 'recency' | 'relevancy';
}

// ============================================================================
// Like/Retweet DTOs
// ============================================================================

export class LikeTweetDto {
  @ApiProperty({ description: 'Tweet ID to like' })
  @IsString()
  tweetId: string;
}

export class RetweetDto {
  @ApiProperty({ description: 'Tweet ID to retweet' })
  @IsString()
  tweetId: string;
}

// ============================================================================
// Follow DTOs
// ============================================================================

export class FollowUserDto {
  @ApiProperty({ description: 'User ID to follow' })
  @IsString()
  targetUserId: string;
}

// ============================================================================
// Direct Message DTOs
// ============================================================================

export class DirectMessageDto {
  @ApiProperty({ description: 'DM event ID' })
  id: string;

  @ApiProperty({ description: 'Message text' })
  text: string;

  @ApiProperty({ description: 'Sender ID' })
  senderId: string;

  @ApiPropertyOptional({ description: 'Sender username' })
  senderUsername?: string;

  @ApiProperty({ description: 'Created timestamp' })
  createdAt: string;

  @ApiPropertyOptional({ description: 'Media attachments' })
  attachments?: any[];
}

export class SendDirectMessageDto {
  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  participantId: string;

  @ApiProperty({ description: 'Message text' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Media ID to attach' })
  @IsString()
  @IsOptional()
  mediaId?: string;
}

export class DirectMessageConversationDto {
  @ApiProperty({ description: 'Conversation ID' })
  id: string;

  @ApiProperty({ description: 'Messages in conversation', type: [DirectMessageDto] })
  messages: DirectMessageDto[];

  @ApiPropertyOptional({ description: 'Next page token' })
  nextToken?: string;
}
