import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class GoogleCalendarConnectionDto {
  @ApiProperty({ description: 'Connection ID' })
  id: string;

  @ApiProperty({ description: 'Workspace ID' })
  workspaceId: string;

  @ApiProperty({ description: 'User ID' })
  userId: string;

  @ApiProperty({ description: 'Google account email' })
  googleEmail: string;

  @ApiProperty({ description: 'Calendar ID (usually the email address)' })
  calendarId: string;

  @ApiPropertyOptional({ description: 'Calendar display name' })
  calendarName?: string;

  @ApiProperty({ description: 'Whether the connection is active' })
  isActive: boolean;

  @ApiPropertyOptional({ description: 'Last sync timestamp' })
  lastSyncedAt?: string;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;
}

export class GoogleCalendarAuthUrlResponseDto {
  @ApiProperty({ description: 'Google OAuth authorization URL' })
  authorizationUrl: string;

  @ApiProperty({ description: 'State parameter for CSRF protection' })
  state: string;
}

export class GoogleCalendarConnectionResponseDto {
  @ApiProperty({ description: 'Whether Google Calendar is connected' })
  connected: boolean;

  @ApiPropertyOptional({
    type: GoogleCalendarConnectionDto,
    description: 'Connection details if connected',
  })
  data?: GoogleCalendarConnectionDto;
}

export class GoogleCalendarSyncResultDto {
  @ApiProperty({ description: 'Number of events synced' })
  synced: number;

  @ApiProperty({ description: 'Number of events deleted' })
  deleted: number;
}

export class GoogleCalendarCallbackDto {
  @ApiProperty({ description: 'Authorization code from Google' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'State parameter for CSRF validation' })
  @IsString()
  state: string;

  @ApiPropertyOptional({ description: 'Error if OAuth failed' })
  @IsOptional()
  @IsString()
  error?: string;
}

export class NativeConnectGoogleCalendarDto {
  @ApiProperty({ description: 'Server auth code from native Google Sign-In' })
  @IsString()
  serverAuthCode: string;

  @ApiPropertyOptional({ description: 'User email from Google Sign-In' })
  @IsString()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ description: 'User display name from Google Sign-In' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ description: 'User photo URL from Google Sign-In' })
  @IsString()
  @IsOptional()
  photoUrl?: string;
}
