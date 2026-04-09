import { IsString, IsOptional, IsNumber, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ==================== Connection DTOs ====================

export class TelegramConnectDto {
  @ApiProperty({ description: 'Telegram Bot Token from @BotFather' })
  @IsString()
  botToken: string;
}

export class TelegramTestConnectionDto {
  @ApiProperty({ description: 'Telegram Bot Token to test' })
  @IsString()
  botToken: string;
}

export class TelegramConnectionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty({ description: 'User ID who owns this connection' })
  userId: string;

  @ApiProperty({ description: 'Telegram Bot ID' })
  botId: string;

  @ApiProperty({ description: 'Bot username (without @)' })
  botUsername: string;

  @ApiPropertyOptional({ description: 'Bot display name' })
  botName?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiProperty()
  createdAt: string;

  @ApiPropertyOptional()
  updatedAt?: string;
}

// ==================== Bot Info DTOs ====================

export class TelegramBotInfoDto {
  @ApiProperty({ description: 'Bot ID' })
  id: number;

  @ApiProperty({ description: 'Is this a bot' })
  isBot: boolean;

  @ApiProperty({ description: 'Bot first name' })
  firstName: string;

  @ApiProperty({ description: 'Bot username' })
  username: string;

  @ApiPropertyOptional({ description: 'Whether bot can join groups' })
  canJoinGroups?: boolean;

  @ApiPropertyOptional({ description: 'Whether bot can read all group messages' })
  canReadAllGroupMessages?: boolean;

  @ApiPropertyOptional({ description: 'Whether bot supports inline queries' })
  supportsInlineQueries?: boolean;
}

// ==================== Message DTOs ====================

export class TelegramSendMessageDto {
  @ApiProperty({ description: 'Chat ID or username to send message to' })
  @IsString()
  chatId: string;

  @ApiProperty({ description: 'Message text (supports Markdown or HTML)' })
  @IsString()
  text: string;

  @ApiPropertyOptional({ description: 'Parse mode: Markdown, MarkdownV2, or HTML', default: 'Markdown' })
  @IsOptional()
  @IsString()
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';

  @ApiPropertyOptional({ description: 'Disable link previews' })
  @IsOptional()
  @IsBoolean()
  disableWebPagePreview?: boolean;

  @ApiPropertyOptional({ description: 'Disable notification sound' })
  @IsOptional()
  @IsBoolean()
  disableNotification?: boolean;

  @ApiPropertyOptional({ description: 'Reply to message ID' })
  @IsOptional()
  @IsNumber()
  replyToMessageId?: number;
}

export class TelegramSendMessageResponseDto {
  @ApiProperty({ description: 'Message ID' })
  messageId: number;

  @ApiProperty({ description: 'Chat ID where message was sent' })
  chatId: number;

  @ApiProperty({ description: 'Date message was sent (Unix timestamp)' })
  date: number;

  @ApiPropertyOptional({ description: 'Message text' })
  text?: string;
}

// ==================== Update DTOs ====================

export class TelegramGetUpdatesQueryDto {
  @ApiPropertyOptional({ description: 'Offset to start fetching updates from' })
  @IsOptional()
  @IsNumber()
  offset?: number;

  @ApiPropertyOptional({ description: 'Maximum number of updates to return (1-100)', default: 100 })
  @IsOptional()
  @IsNumber()
  limit?: number;

  @ApiPropertyOptional({ description: 'Timeout in seconds for long polling', default: 0 })
  @IsOptional()
  @IsNumber()
  timeout?: number;

  @ApiPropertyOptional({ description: 'Types of updates to receive', type: [String] })
  @IsOptional()
  @IsArray()
  allowedUpdates?: string[];
}

export class TelegramChatDto {
  @ApiProperty({ description: 'Chat ID' })
  id: number;

  @ApiProperty({ description: 'Chat type: private, group, supergroup, or channel' })
  type: 'private' | 'group' | 'supergroup' | 'channel';

  @ApiPropertyOptional({ description: 'Chat title (for groups, supergroups, channels)' })
  title?: string;

  @ApiPropertyOptional({ description: 'Username (for private chats, supergroups, channels)' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name (for private chats)' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (for private chats)' })
  lastName?: string;
}

export class TelegramUserDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({ description: 'Is this a bot' })
  isBot: boolean;

  @ApiProperty({ description: 'First name' })
  firstName: string;

  @ApiPropertyOptional({ description: 'Last name' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Username' })
  username?: string;

  @ApiPropertyOptional({ description: 'Language code' })
  languageCode?: string;
}

export class TelegramMessageDto {
  @ApiProperty({ description: 'Message ID' })
  messageId: number;

  @ApiPropertyOptional({ description: 'Sender' })
  from?: TelegramUserDto;

  @ApiProperty({ description: 'Chat where message was sent' })
  chat: TelegramChatDto;

  @ApiProperty({ description: 'Date message was sent (Unix timestamp)' })
  date: number;

  @ApiPropertyOptional({ description: 'Message text' })
  text?: string;

  @ApiPropertyOptional({ description: 'Reply to message' })
  replyToMessage?: TelegramMessageDto;
}

export class TelegramUpdateDto {
  @ApiProperty({ description: 'Update ID' })
  updateId: number;

  @ApiPropertyOptional({ description: 'New incoming message' })
  message?: TelegramMessageDto;

  @ApiPropertyOptional({ description: 'Edited message' })
  editedMessage?: TelegramMessageDto;

  @ApiPropertyOptional({ description: 'New channel post' })
  channelPost?: TelegramMessageDto;

  @ApiPropertyOptional({ description: 'Edited channel post' })
  editedChannelPost?: TelegramMessageDto;
}

export class TelegramUpdatesResponseDto {
  @ApiProperty({ description: 'List of updates', type: [TelegramUpdateDto] })
  updates: TelegramUpdateDto[];

  @ApiProperty({ description: 'Total number of updates returned' })
  count: number;

  @ApiPropertyOptional({ description: 'Next offset to use for fetching more updates' })
  nextOffset?: number;
}

// ==================== Chat Info DTOs ====================

export class TelegramGetChatDto {
  @ApiProperty({ description: 'Chat ID or username' })
  @IsString()
  chatId: string;
}

export class TelegramChatInfoDto {
  @ApiProperty({ description: 'Chat ID' })
  id: number;

  @ApiProperty({ description: 'Chat type' })
  type: 'private' | 'group' | 'supergroup' | 'channel';

  @ApiPropertyOptional({ description: 'Chat title' })
  title?: string;

  @ApiPropertyOptional({ description: 'Chat username' })
  username?: string;

  @ApiPropertyOptional({ description: 'First name (private chat)' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name (private chat)' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Chat description/bio' })
  description?: string;

  @ApiPropertyOptional({ description: 'Invite link' })
  inviteLink?: string;

  @ApiPropertyOptional({ description: 'Pinned message' })
  pinnedMessage?: TelegramMessageDto;
}

// ==================== Webhook DTOs ====================

export class TelegramSetWebhookDto {
  @ApiProperty({ description: 'HTTPS URL to send updates to' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ description: 'Secret token for webhook verification' })
  @IsOptional()
  @IsString()
  secretToken?: string;

  @ApiPropertyOptional({ description: 'Maximum allowed connections (1-100)', default: 40 })
  @IsOptional()
  @IsNumber()
  maxConnections?: number;

  @ApiPropertyOptional({ description: 'Types of updates to receive', type: [String] })
  @IsOptional()
  @IsArray()
  allowedUpdates?: string[];
}

export class TelegramWebhookInfoDto {
  @ApiProperty({ description: 'Webhook URL' })
  url: string;

  @ApiProperty({ description: 'Whether webhook has custom certificate' })
  hasCustomCertificate: boolean;

  @ApiProperty({ description: 'Number of pending updates' })
  pendingUpdateCount: number;

  @ApiPropertyOptional({ description: 'IP address used for webhook' })
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Unix timestamp of last error' })
  lastErrorDate?: number;

  @ApiPropertyOptional({ description: 'Last error message' })
  lastErrorMessage?: string;

  @ApiPropertyOptional({ description: 'Last synchronization error date' })
  lastSynchronizationErrorDate?: number;

  @ApiPropertyOptional({ description: 'Maximum allowed connections' })
  maxConnections?: number;

  @ApiPropertyOptional({ description: 'Allowed updates', type: [String] })
  allowedUpdates?: string[];
}
