import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsObject,
  IsArray,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';
import { BotStatus, BotType, BotSettingsDto } from './create-bot.dto';

export class UpdateBotDto {
  @ApiPropertyOptional({ description: 'Bot unique name (slug)', example: 'faq-bot' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Name must contain only lowercase letters, numbers, and hyphens',
  })
  name?: string;

  @ApiPropertyOptional({ description: 'Bot display name', example: 'FAQ Bot' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional({ description: 'Bot description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'Bot avatar URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: BotStatus })
  @IsOptional()
  @IsEnum(BotStatus)
  status?: BotStatus;

  @ApiPropertyOptional({ enum: BotType })
  @IsOptional()
  @IsEnum(BotType)
  botType?: BotType;

  @ApiPropertyOptional({ type: BotSettingsDto })
  @IsOptional()
  @IsObject()
  settings?: BotSettingsDto;

  @ApiPropertyOptional({
    description: 'Allowed action types',
    example: ['send_message', 'create_task'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  @ApiPropertyOptional({ description: 'Whether bot is shareable across workspaces' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
