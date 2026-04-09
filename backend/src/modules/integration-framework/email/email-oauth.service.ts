import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface GmailOAuthTokens {
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
export class EmailOAuthService {
  private readonly logger = new Logger(EmailOAuthService.name);

  // Google OAuth endpoints
  private readonly GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
  private readonly GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
  private readonly GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

  // Gmail API scopes
  private readonly GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose',
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
      throw new Error('Google OAuth credentials not configured. Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET');
    }

    // Use unified Google OAuth redirect URI
    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri = this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI')
      || `${apiUrl}/api/v1/integrations/google/callback`;

    return { clientId, clientSecret, redirectUri };
  }

  /**
   * Generate state parameter for CSRF protection
   * Includes 'service: gmail' so the unified callback knows which service to handle
   */
  generateState(userId: string, workspaceId: string, returnUrl?: string): string {
    const stateData = {
      service: 'gmail', // Used by unified Google OAuth callback to route to correct handler
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
        throw new Error('State parameter expired');
      }

      return stateData;
    } catch (error) {
      this.logger.error('Failed to decode state parameter:', error);
      throw new Error('Invalid state parameter');
    }
  }

  /**
   * Generate Gmail OAuth authorization URL
   */
  getAuthorizationUrl(userId: string, workspaceId: string, returnUrl?: string): { authorizationUrl: string; state: string } {
    const { clientId, redirectUri } = this.getClientCredentials();
    const state = this.generateState(userId, workspaceId, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: this.GMAIL_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: state,
    });

    const authorizationUrl = `${this.GOOGLE_AUTH_URL}?${params.toString()}`;

    this.logger.log(`Generated Gmail OAuth URL for user ${userId} in workspace ${workspaceId}`);

    return { authorizationUrl, state };
  }

  /**
   * Exchange authorization code for tokens (web OAuth flow)
   */
  async exchangeCodeForTokens(code: string): Promise<GmailOAuthTokens> {
    const { clientId, clientSecret, redirectUri } = this.getClientCredentials();

    try {
      this.logger.log('Exchanging authorization code for Gmail tokens...');

      const response = await axios.post(this.GOOGLE_TOKEN_URL,
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
        }
      );

      const data = response.data;

      const tokens: GmailOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };

      this.logger.log('Successfully exchanged code for Gmail tokens');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error.response?.data || error.message);
      throw new Error(`Failed to exchange authorization code: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Exchange native mobile server auth code for tokens
   * Native sign-in uses serverClientId (web client ID) but without redirect_uri
   */
  async exchangeNativeCodeForTokens(serverAuthCode: string): Promise<GmailOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      this.logger.log('Exchanging native server auth code for Gmail tokens...');

      // For native mobile sign-in, we don't use redirect_uri
      // The server auth code is generated by the Google Sign-In SDK
      const response = await axios.post(this.GOOGLE_TOKEN_URL,
        new URLSearchParams({
          code: serverAuthCode,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      const tokens: GmailOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };

      this.logger.log('Successfully exchanged native auth code for Gmail tokens');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to exchange native auth code for tokens:', error.response?.data || error.message);
      throw new Error(`Failed to exchange native authorization code: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<GmailOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials();

    try {
      this.logger.log('Refreshing Gmail access token...');

      const response = await axios.post(this.GOOGLE_TOKEN_URL,
        new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const data = response.data;

      const tokens: GmailOAuthTokens = {
        accessToken: data.access_token,
        refreshToken: refreshToken,
        tokenType: data.token_type || 'Bearer',
        expiresIn: data.expires_in,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
        scope: data.scope,
      };

      this.logger.log('Successfully refreshed Gmail access token');

      return tokens;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error.response?.data || error.message);
      throw new Error(`Failed to refresh access token: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Get authenticated user info from Google
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
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new Error('Failed to get Google user info');
    }
  }

  /**
   * Revoke access token (disconnect)
   */
  async revokeToken(token: string): Promise<void> {
    try {
      await axios.post(`https://oauth2.googleapis.com/revoke?token=${token}`);
      this.logger.log('Successfully revoked Gmail token');
    } catch (error) {
      this.logger.error('Failed to revoke token:', error.response?.data || error.message);
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
