import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsInt,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TriggerType {
  KEYWORD = 'keyword',
  REGEX = 'regex',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  MENTION = 'mention',
  ANY_MESSAGE = 'any_message',
}

export enum KeywordMatchType {
  EXACT = 'exact',
  CONTAINS = 'contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
}

export class KeywordTriggerConfigDto {
  @ApiProperty({ enum: KeywordMatchType, description: 'How to match keywords' })
  @IsEnum(KeywordMatchType)
  matchType: KeywordMatchType;

  @ApiProperty({ description: 'Keywords to match', example: ['!help', '!faq'] })
  @IsString({ each: true })
  keywords: string[];

  @ApiPropertyOptional({ description: 'Case sensitive matching', default: false })
  @IsOptional()
  @IsBoolean()
  caseSensitive?: boolean;
}

export class RegexTriggerConfigDto {
  @ApiProperty({ description: 'Regex pattern', example: '^!task\\s+(.+)$' })
  @IsString()
  pattern: string;

  @ApiPropertyOptional({ description: 'Regex flags', example: 'i' })
  @IsOptional()
  @IsString()
  flags?: string;
}

export class ScheduleTriggerConfigDto {
  @ApiProperty({ description: 'Cron expression', example: '0 9 * * 1-5' })
  @IsString()
  cron: string;

  @ApiPropertyOptional({ description: 'Timezone', example: 'America/New_York' })
  @IsOptional()
  @IsString()
  timezone?: string;
}

export class WebhookTriggerConfigDto {
  @ApiPropertyOptional({ description: 'Webhook endpoint path (auto-generated if not provided)' })
  @IsOptional()
  @IsString()
  endpointPath?: string;
}

export class MentionTriggerConfigDto {
  @ApiPropertyOptional({ description: 'Require @mention of bot', default: true })
  @IsOptional()
  @IsBoolean()
  requireAtMention?: boolean;
}

export class AnyMessageTriggerConfigDto {
  @ApiPropertyOptional({ description: 'Include thread messages', default: false })
  @IsOptional()
  @IsBoolean()
  includeThreads?: boolean;

  @ApiPropertyOptional({ description: 'Only from specific users', example: [] })
  @IsOptional()
  @IsString({ each: true })
  fromUsers?: string[];
}

export class TriggerConditionsDto {
  @ApiPropertyOptional({ description: 'Only trigger for specific users' })
  @IsOptional()
  @IsString({ each: true })
  allowedUsers?: string[];

  @ApiPropertyOptional({ description: 'Exclude specific users' })
  @IsOptional()
  @IsString({ each: true })
  excludedUsers?: string[];

  @ApiPropertyOptional({ description: 'Only during specific hours (0-23)', example: [9, 17] })
  @IsOptional()
  @IsInt({ each: true })
  activeHours?: number[];

  @ApiPropertyOptional({
    description: 'Only on specific days (0=Sun, 6=Sat)',
    example: [1, 2, 3, 4, 5],
  })
  @IsOptional()
  @IsInt({ each: true })
  activeDays?: number[];
}

export class CreateTriggerDto {
  @ApiProperty({ description: 'Trigger name', example: 'Help Command Trigger' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: TriggerType, description: 'Type of trigger' })
  @IsEnum(TriggerType)
  triggerType: TriggerType;

  @ApiProperty({ description: 'Trigger configuration (varies by type)' })
  @IsObject()
  triggerConfig:
    | KeywordTriggerConfigDto
    | RegexTriggerConfigDto
    | ScheduleTriggerConfigDto
    | WebhookTriggerConfigDto
    | MentionTriggerConfigDto
    | AnyMessageTriggerConfigDto;

  @ApiPropertyOptional({ description: 'Whether trigger is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Priority (higher runs first)', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: 'Per-user cooldown in seconds', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400) // Max 24 hours
  cooldownSeconds?: number;

  @ApiPropertyOptional({ type: TriggerConditionsDto, description: 'Additional conditions' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TriggerConditionsDto)
  conditions?: TriggerConditionsDto;
}

export class UpdateTriggerDto {
  @ApiPropertyOptional({ description: 'Trigger name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: TriggerType })
  @IsOptional()
  @IsEnum(TriggerType)
  triggerType?: TriggerType;

  @ApiPropertyOptional({ description: 'Trigger configuration' })
  @IsOptional()
  @IsObject()
  triggerConfig?:
    | KeywordTriggerConfigDto
    | RegexTriggerConfigDto
    | ScheduleTriggerConfigDto
    | WebhookTriggerConfigDto
    | MentionTriggerConfigDto
    | AnyMessageTriggerConfigDto;

  @ApiPropertyOptional({ description: 'Whether trigger is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Priority (higher runs first)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: 'Per-user cooldown in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(86400)
  cooldownSeconds?: number;

  @ApiPropertyOptional({ type: TriggerConditionsDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => TriggerConditionsDto)
  conditions?: TriggerConditionsDto;
}
