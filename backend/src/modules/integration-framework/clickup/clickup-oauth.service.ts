import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ClickUpOAuthTokens {
  accessToken: string;
  tokenType: string;
}

export interface ClickUpUserInfo {
  id: number;
  username: string;
  email: string;
  color: string;
  profilePicture?: string;
}

@Injectable()
export class ClickUpOAuthService {
  private readonly logger = new Logger(ClickUpOAuthService.name);

  private readonly CLICKUP_AUTH_URL = 'https://app.clickup.com/api';
  private readonly CLICKUP_TOKEN_URL = 'https://api.clickup.com/api/v2/oauth/token';
  private readonly CLICKUP_USERINFO_URL = 'https://api.clickup.com/api/v2/user';

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('CLICKUP_CLIENT_ID');
    const clientSecret = this.configService.get<string>('CLICKUP_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('ClickUp OAuth credentials not configured');
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
      service: 'clickup',
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

  getAuthorizationUrl(
    userId: string,
    workspaceId: string,
    returnUrl?: string,
  ): { authorizationUrl: string; state: string } {
    const { clientId, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      state,
    });

    const authorizationUrl = `${this.CLICKUP_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string): Promise<ClickUpOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.CLICKUP_TOKEN_URL,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type || 'Bearer',
      };
    } catch (error) {
      this.logger.error('Failed to exchange code:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  async getUserInfo(accessToken: string): Promise<ClickUpUserInfo> {
    try {
      const response = await axios.get(this.CLICKUP_USERINFO_URL, {
        headers: {
          Authorization: accessToken,
          'Content-Type': 'application/json',
        },
      });

      const user = response.data.user;

      return {
        id: user.id,
        username: user.username,
        email: user.email,
        color: user.color,
        profilePicture: user.profilePicture,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from ClickUp');
    }
  }
}
