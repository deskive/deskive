import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DiscordOAuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope: string;
}

export interface DiscordUserInfo {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  email?: string;
  verified?: boolean;
}

@Injectable()
export class DiscordOAuthService {
  private readonly logger = new Logger(DiscordOAuthService.name);

  private readonly DISCORD_AUTH_URL = 'https://discord.com/api/oauth2/authorize';
  private readonly DISCORD_TOKEN_URL = 'https://discord.com/api/oauth2/token';
  private readonly DISCORD_USERINFO_URL = 'https://discord.com/api/users/@me';

  private readonly SCOPES = ['identify', 'email', 'guilds'];

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('DISCORD_CLIENT_ID');
    const clientSecret = this.configService.get<string>('DISCORD_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Discord OAuth credentials not configured');
    }

    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri = `${apiUrl}/api/v1/integrations/oauth/callback`;

    return { clientId, clientSecret, redirectUri };
  }

  isConfigured(): boolean {
    try {
      this.getClientCredentials();
      return true;
    } catch {
      return false;
    }
  }

  generateState(userId: string, workspaceId: string, returnUrl?: string): string {
    const stateData = {
      service: 'discord',
      userId,
      workspaceId,
      returnUrl: returnUrl || '',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };

    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  decodeState(state: string): { userId: string; workspaceId: string; returnUrl?: string } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);

      const maxAge = 10 * 60 * 1000;
      if (Date.now() - stateData.timestamp > maxAge) {
        throw new Error('State expired');
      }

      return stateData;
    } catch (error) {
      this.logger.error('Failed to decode state:', error);
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  getAuthorizationUrl(userId: string, workspaceId: string, returnUrl?: string): { authorizationUrl: string; state: string } {
    const { clientId, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.SCOPES.join(' '),
      state,
    });

    const authorizationUrl = `${this.DISCORD_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string): Promise<DiscordOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.DISCORD_TOKEN_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<DiscordOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.DISCORD_TOKEN_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const data = response.data;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error('Failed to refresh token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async getUserInfo(accessToken: string): Promise<DiscordUserInfo> {
    try {
      const response = await axios.get(this.DISCORD_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const userData = response.data;

      return {
        id: userData.id,
        username: userData.username,
        discriminator: userData.discriminator,
        avatar: userData.avatar,
        email: userData.email,
        verified: userData.verified,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Discord');
    }
  }
}
