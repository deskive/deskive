import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GoogleOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
  expiresAt: Date;
  scope: string;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

@Injectable()
export class YoutubeOAuthService {
  private readonly logger = new Logger(YoutubeOAuthService.name);

  // Google OAuth endpoints
  private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

  // YouTube scopes
  private readonly YOUTUBE_SCOPES = [
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ];

  constructor(private configService: ConfigService) {}

  /**
   * Get OAuth client credentials from environment
   */
  private getClientCredentials() {
    const clientId = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_OAUTH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error(
        'Google OAuth credentials not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET',
      );
    }

    // Use unified Google OAuth redirect URI
    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri =
      this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI') ||
      `${apiUrl}/api/v1/integrations/google/callback`;

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Generate state parameter for CSRF protection
   * Includes 'service: youtube' so the unified callback knows which service to handle
   */
  generateState(userId: string, workspaceId: string, returnUrl?: string): string {
    const stateData = {
      service: 'youtube', // Used by unified Google OAuth callback to route to correct handler
      userId,
      workspaceId,
      returnUrl: returnUrl || '',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };

    // Base64 encode the state
    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): {
    userId: string;
    workspaceId: string;
    returnUrl?: string;
    timestamp: number;
  } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);

      // Validate state is not too old (10 minutes max)
      const maxAge = 10 * 60 * 1000; // 10 minutes
      if (Date.now() - stateData.timestamp > maxAge) {
        this.logger.error(`State expired: created ${Date.now() - stateData.timestamp}ms ago`);
        throw new Error('State parameter expired. Please try again.');
      }

      this.logger.log(
        `State decoded successfully for user ${stateData.userId}, workspace ${stateData.workspaceId}`,
      );
      return stateData;
    } catch (error) {
      this.logger.error('Failed to decode state parameter:', error);
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Generate authorization URL for YouTube OAuth
   */
  getAuthUrl(userId: string, workspaceId: string, returnUrl?: string): string {
    const { clientId, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.YOUTUBE_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `${this.GOOGLE_AUTH_URL}?${params}`;
    this.logger.log(`Generated YouTube auth URL for user ${userId}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokens> {
    try {
      const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

      this.logger.log('Exchanging authorization code for tokens');

      const response = await axios.post(
        this.GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, refresh_token, token_type, expires_in, scope } = response.data;

      this.logger.log('Successfully exchanged code for tokens');

      return {
        accessToken: access_token,
        refreshToken: refresh_token,
        tokenType: token_type,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope,
      };
    } catch (error: any) {
      this.logger.error(
        'Failed to exchange code for tokens:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokens> {
    try {
      const { clientId, clientSecret } = this.getClientCredentials();

      this.logger.log('Refreshing YouTube access token');

      const response = await axios.post(
        this.GOOGLE_TOKEN_URL,
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, token_type, expires_in, scope } = response.data;

      this.logger.log('Successfully refreshed access token');

      return {
        accessToken: access_token,
        refreshToken: refreshToken, // Keep the same refresh token
        tokenType: token_type,
        expiresIn: expires_in,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        scope,
      };
    } catch (error: any) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get user info from Google
   */
  async getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    try {
      const response = await axios.get(this.GOOGLE_USERINFO_URL, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        id: response.data.id,
        email: response.data.email,
        name: response.data.name,
        picture: response.data.picture,
      };
    } catch (error: any) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new Error('Failed to get user info');
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      await axios.post(
        `https://oauth2.googleapis.com/revoke?token=${token}`,
        {},
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      this.logger.log('Successfully revoked token');
      return true;
    } catch (error: any) {
      this.logger.error('Failed to revoke token:', error.response?.data || error.message);
      return false;
    }
  }
}
