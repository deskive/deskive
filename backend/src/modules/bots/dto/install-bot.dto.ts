import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject, IsUUID } from 'class-validator';

export class InstallBotDto {
  @ApiPropertyOptional({ description: 'Channel ID to install bot to' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Conversation ID (DM) to install bot to' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Override bot settings for this installation' })
  @IsOptional()
  @IsObject()
  settingsOverride?: Record<string, any>;
}

export class UninstallBotDto {
  @ApiPropertyOptional({ description: 'Channel ID to uninstall from' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Conversation ID to uninstall from' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}

export class BotInstallationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  botId: string;

  @ApiPropertyOptional()
  channelId?: string;

  @ApiPropertyOptional()
  conversationId?: string;

  @ApiProperty()
  installedBy: string;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  settingsOverride?: Record<string, any>;

  @ApiProperty()
  installedAt: string;

  @ApiPropertyOptional()
  uninstalledAt?: string;
}

export class TestBotDto {
  @ApiProperty({ description: 'Test message content', example: '!help' })
  @IsString()
  testMessage: string;

  @ApiPropertyOptional({ description: 'Channel ID for context' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Conversation ID for context' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({
    description: 'Actually execute actions (dry run if false)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  executeActions?: boolean;
}

export class TestBotResponseDto {
  @ApiProperty({ description: 'Whether any triggers matched' })
  triggersMatched: boolean;

  @ApiProperty({ description: 'List of matched trigger IDs' })
  matchedTriggers: string[];

  @ApiProperty({ description: 'Actions that would be executed' })
  actionsToExecute: {
    actionId: string;
    actionType: string;
    actionName: string;
    wouldExecute: boolean;
  }[];

  @ApiPropertyOptional({ description: 'Execution results (if executeActions=true)' })
  executionResults?: {
    actionId: string;
    success: boolean;
    output?: any;
    error?: string;
  }[];
}

export class BotLogsQueryDto {
  @ApiPropertyOptional({ description: 'Filter by trigger ID' })
  @IsOptional()
  @IsUUID()
  triggerId?: string;

  @ApiPropertyOptional({ description: 'Filter by action ID' })
  @IsOptional()
  @IsUUID()
  actionId?: string;

  @ApiPropertyOptional({ description: 'Filter by status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsUUID()
  channelId?: string;

  @ApiPropertyOptional({ description: 'Filter by conversation ID' })
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @ApiPropertyOptional({ description: 'Limit results', default: 50 })
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination', default: 0 })
  @IsOptional()
  offset?: number;
}
