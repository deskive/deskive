import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'Authorization code from OAuth provider',
    example: 'abc123def456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'State parameter for CSRF protection',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({
    description: 'OAuth provider name',
    enum: ['github', 'google', 'apple'],
    example: 'github',
  })
  @IsEnum(['github', 'google', 'apple'])
  @IsNotEmpty()
  provider: 'github' | 'google' | 'apple';
}

export class OAuthProviderDto {
  @ApiProperty({
    description: 'OAuth provider name',
    enum: ['github', 'google', 'apple'],
    example: 'github',
  })
  @IsEnum(['github', 'google', 'apple'])
  @IsNotEmpty()
  provider: 'github' | 'google' | 'apple';
}

export class OAuthUrlDto {
  @ApiProperty({
    description: 'OAuth authorization URL',
    example: 'https://github.com/login/oauth/authorize?client_id=...',
  })
  url: string;
}

export class OAuthTokenResponseDto {
  @ApiProperty({
    description: 'JWT access token',
  })
  token: string;

  @ApiProperty({
    description: 'JWT refresh token',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'User information',
  })
  user: {
    id: string;
    email: string;
    username?: string;
    name?: string;
    avatarUrl?: string;
  };
}
