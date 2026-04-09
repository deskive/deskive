import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface LinearOAuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope: string[];
}

@Injectable()
export class LinearOAuthService {
  private readonly logger = new Logger(LinearOAuthService.name);

  private readonly LINEAR_AUTH_URL = 'https://linear.app/oauth/authorize';
  private readonly LINEAR_TOKEN_URL = 'https://api.linear.app/oauth/token';

  constructor(private configService: ConfigService) {}

  private getClientCredentials() {
    const clientId = this.configService.get<string>('LINEAR_CLIENT_ID');
    const clientSecret = this.configService.get<string>('LINEAR_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Linear OAuth credentials not configured');
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
      service: 'linear',
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
      scope: 'read,write,issues:create,comments:create',
      state,
    });

    const authorizationUrl = `${this.LINEAR_AUTH_URL}?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string): Promise<LinearOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      const response = await axios.post(
        this.LINEAR_TOKEN_URL,
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
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
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope ? data.scope.split(',') : [],
      };
    } catch (error) {
      this.logger.error('Failed to exchange code:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }
}
