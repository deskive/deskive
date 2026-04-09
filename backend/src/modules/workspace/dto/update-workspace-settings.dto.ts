import { IsOptional, IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateWorkspaceSettingsDto {
  @ApiProperty({
    description: 'Workspace timezone',
    example: 'America/New_York',
    required: false
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiProperty({
    description: 'Default currency for workspace',
    example: 'USD',
    required: false
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({
    description: 'Default language for workspace',
    example: 'en',
    required: false
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({
    description: 'Additional workspace settings as key-value pairs',
    example: { theme: 'dark', notifications: true },
    required: false
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
