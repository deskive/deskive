import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface AsanaOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: Date;
  data?: {
    id: string;
    gid: string;
    email: string;
    name: string;
  };
}

export interface AsanaUserInfo {
  id: string;
  email: string;
  name: string;
  photo?: {
    image_60x60?: string;
  };
}

@Injectable()
export class AsanaOAuthService {
  private readonly logger = new Logger(AsanaOAuthService.name);

  private readonly ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize';
  private readonly ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
  private readonly ASANA_USERINFO_URL = 'https://app.asana.com/api/1.0/users/me';

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('ASANA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('ASANA_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Asana OAuth credentials not configured');
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
      service: 'asana',
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
      state,
    });

    const authorizationUrl = `${this.ASANA_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string): Promise<AsanaOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.ASANA_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
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
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        data: data.data,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<AsanaOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.ASANA_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
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
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      };
    } catch (error) {
      this.logger.error('Failed to refresh token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to refresh access token');
    }
  }

  async getUserInfo(accessToken: string): Promise<AsanaUserInfo> {
    try {
      const response = await axios.get(this.ASANA_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      const userData = response.data.data;

      return {
        id: userData.gid,
        email: userData.email,
        name: userData.name,
        photo: userData.photo,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Asana');
    }
  }
}
