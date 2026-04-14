import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as crypto from 'crypto';

interface TwitterTokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope: string;
  refresh_token?: string;
}

interface TwitterUserResponse {
  data: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
    verified?: boolean;
    public_metrics?: {
      followers_count: number;
      following_count: number;
      tweet_count: number;
      listed_count: number;
    };
  };
}

@Injectable()
export class TwitterOAuthService {
  private readonly logger = new Logger(TwitterOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  // Twitter OAuth 2.0 endpoints
  private readonly authorizationUrl = 'https://twitter.com/i/oauth2/authorize';
  private readonly tokenUrl = 'https://api.twitter.com/2/oauth2/token';

  // Store code verifiers (in production, use Redis or DB)
  private codeVerifiers = new Map<string, string>();

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('TWITTER_CLIENT_ID') || '';
    this.clientSecret = this.configService.get<string>('TWITTER_CLIENT_SECRET') || '';
    this.redirectUri =
      this.configService.get<string>('TWITTER_REDIRECT_URI') ||
      `${this.configService.get<string>('API_URL')}/integrations/twitter/callback`;
  }

  /**
   * Generate OAuth authorization URL for Twitter (OAuth 2.0 with PKCE)
   */
  getAuthorizationUrl(
    workspaceId: string,
    userId: string,
    returnUrl?: string,
  ): { url: string; state: string } {
    const state = this.generateState(workspaceId, userId, returnUrl);

    // Generate PKCE code verifier and challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    // Store code verifier for later use
    this.codeVerifiers.set(state, codeVerifier);

    // Twitter OAuth 2.0 scopes
    const scopes = [
      'tweet.read',
      'tweet.write',
      'users.read',
      'follows.read',
      'follows.write',
      'like.read',
      'like.write',
      'dm.read',
      'dm.write',
      'offline.access', // For refresh token
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${this.authorizationUrl}?${params.toString()}`,
      state,
    };
  }

  /**
   * Exchange authorization code for access tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<TwitterTokenResponse> {
    const codeVerifier = this.codeVerifiers.get(state);
    if (!codeVerifier) {
      throw new Error('Code verifier not found for state');
    }

    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post<TwitterTokenResponse>(
        this.tokenUrl,
        new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      // Clean up code verifier
      this.codeVerifiers.delete(state);

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange code for tokens:', error?.response?.data || error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TwitterTokenResponse> {
    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      const response = await axios.post<TwitterTokenResponse>(
        this.tokenUrl,
        new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to refresh access token:', error?.response?.data || error);
      throw error;
    }
  }

  /**
   * Get authenticated user info
   */
  async getUserInfo(accessToken: string): Promise<TwitterUserResponse['data']> {
    try {
      const response = await axios.get<TwitterUserResponse>('https://api.twitter.com/2/users/me', {
        params: {
          'user.fields':
            'id,name,username,profile_image_url,verified,public_metrics,created_at,description',
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.data;
    } catch (error) {
      this.logger.error('Failed to get user info:', error?.response?.data || error);
      throw error;
    }
  }

  /**
   * Revoke access token
   */
  async revokeToken(accessToken: string): Promise<void> {
    try {
      const basicAuth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

      await axios.post(
        'https://api.twitter.com/2/oauth2/revoke',
        new URLSearchParams({
          token: accessToken,
          token_type_hint: 'access_token',
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${basicAuth}`,
          },
        },
      );
    } catch (error) {
      this.logger.error('Failed to revoke token:', error?.response?.data || error);
      // Don't throw - we still want to delete the connection
    }
  }

  /**
   * Generate PKCE code verifier
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
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
