import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DropboxOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn?: number;
  expiresAt?: Date;
  scope?: string;
  accountId: string;
  uid: string;
}

export interface DropboxUserInfo {
  accountId: string;
  email: string;
  emailVerified: boolean;
  name: {
    givenName: string;
    surname: string;
    familiarName: string;
    displayName: string;
  };
  profilePhotoUrl?: string;
}

@Injectable()
export class DropboxOAuthService {
  private readonly logger = new Logger(DropboxOAuthService.name);

  // Dropbox OAuth endpoints
  private readonly DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
  private readonly DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';
  private readonly DROPBOX_USERINFO_URL = 'https://api.dropboxapi.com/2/users/get_current_account';

  constructor(private configService: ConfigService) {}

  /**
   * Get OAuth client credentials from environment
   */
  private getClientCredentials() {
    const clientId = this.configService.get<string>('DROPBOX_CLIENT_ID');
    const clientSecret = this.configService.get<string>('DROPBOX_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Dropbox OAuth credentials not configured. Please set DROPBOX_CLIENT_ID and DROPBOX_CLIENT_SECRET');
    }

    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri = this.configService.get<string>('DROPBOX_OAUTH_REDIRECT_URI')
      || `${apiUrl}/api/v1/integrations/dropbox/callback`;

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(userId: string, workspaceId: string, returnUrl?: string): string {
    const stateData = {
      service: 'dropbox',
      userId,
      workspaceId,
      returnUrl: returnUrl || '',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };

    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): { userId: string; workspaceId: string; returnUrl?: string; timestamp: number } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);

      // Validate state is not too old (10 minutes max)
      const maxAge = 10 * 60 * 1000;
      if (Date.now() - stateData.timestamp > maxAge) {
        this.logger.error(`State expired: created ${Date.now() - stateData.timestamp}ms ago`);
        throw new Error('State parameter expired. Please try again.');
      }

      this.logger.log(`State decoded successfully for user ${stateData.userId}, workspace ${stateData.workspaceId}`);
      return stateData;
    } catch (error) {
      this.logger.error('Failed to decode state parameter:', error);
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Generate Dropbox OAuth authorization URL
   */
  getAuthorizationUrl(userId: string, workspaceId: string, returnUrl?: string): { authorizationUrl: string; state: string } {
    const { clientId, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      token_access_type: 'offline', // Get refresh token
      state: state,
    });

    const authorizationUrl = `${this.DROPBOX_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated OAuth URL for user ${userId} in workspace ${workspaceId}`);

    return { authorizationUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<DropboxOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      this.logger.log('Exchanging authorization code for tokens...');

      const response = await axios.post(this.DROPBOX_TOKEN_URL,
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        }
      );

      const data = response.data;

      const tokens: DropboxOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        scope: data.scope,
        accountId: data.account_id,
        uid: data.uid,
      };

      this.logger.log('Successfully exchanged code for tokens');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<DropboxOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      this.logger.log('Refreshing access token...');

      const response = await axios.post(this.DROPBOX_TOKEN_URL,
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        }
      );

      const data = response.data;

      const tokens: DropboxOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: refreshToken, // Dropbox doesn't return a new refresh token
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
        accountId: data.account_id || '',
        uid: data.uid || '',
      };

      this.logger.log('Successfully refreshed access token');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get authenticated user info from Dropbox
   */
  async getUserInfo(accessToken: string): Promise<DropboxUserInfo> {
    try {
      const response = await axios.post(this.DROPBOX_USERINFO_URL, null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = response.data;

      return {
        accountId: data.account_id,
        email: data.email,
        emailVerified: data.email_verified,
        name: {
          givenName: data.name?.given_name || '',
          surname: data.name?.surname || '',
          familiarName: data.name?.familiar_name || '',
          displayName: data.name?.display_name || '',
        },
        profilePhotoUrl: data.profile_photo_url,
      };
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new Error('Failed to get Dropbox user info');
    }
  }

  /**
   * Revoke access token (disconnect)
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      await axios.post('https://api.dropboxapi.com/2/auth/token/revoke', null, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      this.logger.log('Successfully revoked token');
    } catch (error) {
      this.logger.error('Failed to revoke token:', error.response?.data || error.message);
      // Don't throw - revocation failure shouldn't block disconnect
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpired(expiresAt: Date, bufferMinutes: number = 5): boolean {
    const bufferMs = bufferMinutes * 60 * 1000;
    return new Date(expiresAt).getTime() - Date.now() < bufferMs;
  }
}
