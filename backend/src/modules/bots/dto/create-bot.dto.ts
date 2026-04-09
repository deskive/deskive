import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, IsArray, MaxLength, MinLength, Matches } from 'class-validator';

export enum BotStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum BotType {
  CUSTOM = 'custom',
  AI_ASSISTANT = 'ai_assistant',
  WEBHOOK = 'webhook',
  PREBUILT = 'prebuilt',
}

export class BotSettingsDto {
  @ApiPropertyOptional({ description: 'Rate limit (executions per minute)', example: 60 })
  @IsOptional()
  rateLimit?: number;

  @ApiPropertyOptional({ description: 'Response delay in milliseconds', example: 0 })
  @IsOptional()
  responseDelay?: number;

  @ApiPropertyOptional({ description: 'Max execution depth for bot chains', example: 3 })
  @IsOptional()
  maxExecutionDepth?: number;
}

export class CreateBotDto {
  @ApiProperty({ description: 'Bot unique name (slug)', example: 'faq-bot' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, { message: 'Name must contain only lowercase letters, numbers, and hyphens' })
  name: string;

  @ApiProperty({ description: 'Bot display name', example: 'FAQ Bot' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName: string;

  @ApiPropertyOptional({ description: 'Bot description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Bot avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: BotStatus, default: BotStatus.DRAFT })
  @IsOptional()
  @IsEnum(BotStatus)
  status?: BotStatus;

  @ApiPropertyOptional({ enum: BotType, default: BotType.CUSTOM })
  @IsOptional()
  @IsEnum(BotType)
  botType?: BotType;

  @ApiPropertyOptional({ type: BotSettingsDto })
  @IsOptional()
  @IsObject()
  settings?: BotSettingsDto;

  @ApiPropertyOptional({ description: 'Allowed action types', example: ['send_message', 'create_task'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Whether bot is shareable across workspaces', default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
