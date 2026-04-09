import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface TrelloOAuthTokens {
  accessToken: string;
  tokenType: string;
}

export interface TrelloUserInfo {
  id: string;
  username: string;
  fullName: string;
  email?: string;
}

@Injectable()
export class TrelloOAuthService {
  private readonly logger = new Logger(TrelloOAuthService.name);

  private readonly TRELLO_AUTH_URL = 'https://trello.com/1/authorize';
  private readonly TRELLO_USERINFO_URL = 'https://api.trello.com/1/members/me';

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const apiKey = this.configService.get<string>('TRELLO_API_KEY');
    const apiSecret = this.configService.get<string>('TRELLO_API_SECRET');

    if (!apiKey || !apiSecret) {
      throw new Error('Trello OAuth credentials not configured');
    }

    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri = `${apiUrl}/api/v1/integrations/oauth/callback`;

    return { apiKey, apiSecret, redirectUri };
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
      service: 'trello',
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
    const { apiKey, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      key: apiKey,
      return_url: redirectUri,
      callback_method: 'fragment',
      scope: 'read,write,account',
      expiration: 'never',
      name: 'Deskive',
      state,
    });

    const authorizationUrl = `${this.TRELLO_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async getUserInfo(accessToken: string, apiKey: string): Promise<TrelloUserInfo> {
    try {
      const response = await axios.get(this.TRELLO_USERINFO_URL, {
        params: {
          key: apiKey,
          token: accessToken,
        },
      });

      return {
        id: response.data.id,
        username: response.data.username,
        fullName: response.data.fullName,
        email: response.data.email,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Trello');
    }
  }
}
