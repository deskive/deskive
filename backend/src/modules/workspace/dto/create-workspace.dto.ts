import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ description: 'Workspace name', example: 'My Company' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Workspace description', example: 'Our company workspace', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: 'Workspace logo URL', example: 'https://example.com/logo.png', required: false })
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiProperty({ description: 'Company website URL', example: 'https://example.com', required: false })
  @IsOptional()
  @IsUrl()
  website?: string;

  // Subscription management is handled by database platform
  // No subscription_plan field needed in workspace creation
}