import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface JiraOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope: string;
}

export interface JiraUserInfo {
  accountId: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class JiraOAuthService {
  private readonly logger = new Logger(JiraOAuthService.name);

  private readonly JIRA_AUTH_URL = 'https://auth.atlassian.com/authorize';
  private readonly JIRA_TOKEN_URL = 'https://auth.atlassian.com/oauth/token';
  private readonly JIRA_USERINFO_URL = 'https://api.atlassian.com/me';

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('JIRA_CLIENT_ID');
    const clientSecret = this.configService.get<string>('JIRA_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Jira OAuth credentials not configured');
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
      service: 'jira',
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
      audience: 'api.atlassian.com',
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      prompt: 'consent',
      scope: 'read:jira-user read:jira-work write:jira-work offline_access',
      state,
    });

    const authorizationUrl = `${this.JIRA_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string): Promise<JiraOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.JIRA_TOKEN_URL,
        {
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: redirectUri,
        },
        {
          headers: {
            'Content-Type': 'application/json',
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

  async refreshAccessToken(refreshToken: string): Promise<JiraOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.JIRA_TOKEN_URL,
        {
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
        },
        {
          headers: {
            'Content-Type': 'application/json',
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

  async getUserInfo(accessToken: string): Promise<JiraUserInfo> {
    try {
      const response = await axios.get(this.JIRA_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return {
        accountId: response.data.account_id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from Jira');
    }
  }
}
