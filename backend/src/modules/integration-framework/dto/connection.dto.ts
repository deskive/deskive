import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsUUID, IsUrl } from 'class-validator';
import { ConnectionStatus } from '../interfaces/integration-config.interface';

export class InitiateOAuthDto {
  @ApiPropertyOptional({ description: 'URL to redirect after OAuth completes' })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}

export class ConnectApiKeyDto {
  @ApiProperty({ description: 'API key value' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Optional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class ConnectBasicAuthDto {
  @ApiProperty({ description: 'Username' })
  @IsString()
  username: string;

  @ApiProperty({ description: 'Password' })
  @IsString()
  password: string;

  @ApiPropertyOptional({ description: 'Optional configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}

export class UpdateConnectionConfigDto {
  @ApiPropertyOptional({ description: 'Connection configuration' })
  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Connection settings' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}

export class OAuthCallbackQueryDto {
  @ApiPropertyOptional({ description: 'Authorization code from provider' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state: string;

  @ApiPropertyOptional({ description: 'Error code if OAuth failed' })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({ description: 'Error description' })
  @IsOptional()
  @IsString()
  error_description?: string;
}

export class ConnectionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  workspaceId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  integrationId: string;

  @ApiProperty()
  authType: string;

  @ApiPropertyOptional()
  externalId?: string;

  @ApiPropertyOptional()
  externalEmail?: string;

  @ApiPropertyOptional()
  externalName?: string;

  @ApiPropertyOptional()
  externalAvatar?: string;

  @ApiProperty()
  status: ConnectionStatus;

  @ApiPropertyOptional()
  errorMessage?: string;

  @ApiPropertyOptional()
  lastErrorAt?: string;

  @ApiPropertyOptional()
  config?: Record<string, unknown>;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  lastSyncedAt?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;

  // Joined integration data
  @ApiPropertyOptional()
  integration?: {
    slug: string;
    name: string;
    category: string;
    provider?: string;
    logoUrl?: string;
  };
}

export class ConnectionListResponseDto {
  @ApiProperty({ type: [ConnectionResponseDto] })
  connections: ConnectionResponseDto[];

  @ApiProperty()
  total: number;
}

export class InitiateOAuthResponseDto {
  @ApiProperty({ description: 'OAuth authorization URL to redirect user to' })
  authUrl: string;

  @ApiProperty({ description: 'State parameter for validation' })
  state: string;
}

export class TestConnectionResponseDto {
  @ApiProperty({ description: 'Whether the connection is valid' })
  success: boolean;

  @ApiPropertyOptional({ description: 'Error message if connection failed' })
  error?: string;

  @ApiPropertyOptional({ description: 'Additional details' })
  details?: Record<string, unknown>;
}
