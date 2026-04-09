import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SlackTokenResponse {
  ok: boolean;
  access_token: string;
  token_type: string;
  scope: string;
  bot_user_id?: string;
  app_id: string;
  team: {
    id: string;
    name: string;
  };
  authed_user: {
    id: string;
    scope: string;
    access_token: string;
    token_type: string;
  };
  incoming_webhook?: {
    channel: string;
    channel_id: string;
    configuration_url: string;
    url: string;
  };
  error?: string;
}

interface SlackUserInfo {
  ok: boolean;
  user: {
    id: string;
    team_id: string;
    name: string;
    real_name: string;
    profile: {
      email: string;
      display_name: string;
      image_72: string;
      image_192: string;
    };
  };
  error?: string;
}

@Injectable()
export class SlackOAuthService {
  private readonly logger = new Logger(SlackOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // Slack OAuth endpoints
  private readonly authorizationUrl = 'https://slack.com/oauth/v2/authorize';
  private readonly tokenUrl = 'https://slack.com/api/oauth.v2.access';

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('SLACK_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('SLACK_CLIENT_SECRET') || '';
    this.redirectUri = this.configService.get<string>('SLACK_REDIRECT_URI') ||
      `${this.configService.get<string>('API_URL')}/integrations/slack/callback`;
  }

  /**
   * Generate OAuth authorization URL for Slack
   */
  getAuthorizationUrl(workspaceId: string, userId: string, returnUrl?: string): string {
    const state = this.generateState(workspaceId, userId, returnUrl);

    // Scopes for user token
    const userScopes = [
      'channels:history',
      'channels:read',
      'chat:write',
      'files:read',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'mpim:history',
      'mpim:read',
      'reactions:read',
      'reactions:write',
      'search:read',
      'users:read',
      'users:read.email',
    ].join(',');

    // Bot scopes (optional, for bot functionality)
    const botScopes = [
      'channels:history',
      'channels:read',
      'chat:write',
      'files:read',
      'groups:history',
      'groups:read',
      'im:history',
      'im:read',
      'reactions:read',
      'users:read',
    ].join(',');

    const params = new URLSearchParams({
      client_id: this.clientId,
      scope: botScopes,
      user_scope: userScopes,
      redirect_uri: this.redirectUri,
      state,
    });

    return `${this.authorizationUrl}?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<SlackTokenResponse> {
    try {
      const response = await axios.post(
        this.tokenUrl,
        new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to exchange code for tokens');
      }

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error);
      throw error;
    }
  }

  /**
   * Get user info from Slack
   */
  async getUserInfo(accessToken: string, userId: string): Promise<SlackUserInfo['user']> {
    try {
      const response = await axios.get<SlackUserInfo>(
        'https://slack.com/api/users.info',
        {
          params: { user: userId },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to get user info');
      }

      return response.data.user;
    } catch (error) {
      this.logger.error('Failed to get user info:', error);
      throw error;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const response = await axios.post(
        'https://slack.com/api/auth.revoke',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.ok) {
        this.logger.warn('Failed to revoke token:', response.data.error);
      }
    } catch (error) {
      this.logger.error('Failed to revoke token:', error);
      // Don't throw - we still want to delete the connection
    }
  }

  /**
   * Test if token is still valid
   */
  async testAuth(accessToken: string): Promise<boolean> {
    try {
      const response = await axios.post(
        'https://slack.com/api/auth.test',
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.ok === true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(workspaceId: string, userId: string, returnUrl?: string): string {
    const stateData = {
      workspaceId,
      userId,
      returnUrl,
      timestamp: Date.now(),
    };
    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  /**
   * Decode state parameter
   */
  decodeState(state: string): { workspaceId: string; userId: string; returnUrl?: string } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid state parameter');
    }
  }
}
