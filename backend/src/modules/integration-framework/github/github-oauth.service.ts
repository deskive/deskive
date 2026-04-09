import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';

export interface GitHubAppTokens {
  accessToken: string;
  tokenType: string;
  expiresAt: Date;
  installationId: number;
  permissions: Record<string, string>;
  repositorySelection: 'all' | 'selected';
}

export interface GitHubUserInfo {
  id: number;
  login: string;
  name: string;
  email: string;
  avatarUrl: string;
  bio?: string;
  company?: string;
  location?: string;
  blog?: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  following: number;
}

export interface GitHubInstallation {
  id: number;
  account: {
    login: string;
    id: number;
    type: string; // 'User' or 'Organization'
    avatarUrl: string;
  };
  repositorySelection: 'all' | 'selected';
  permissions: Record<string, string>;
}

@Injectable()
export class GitHubOAuthService {
  private readonly logger = new Logger(GitHubOAuthService.name);

  // GitHub API endpoints
  private readonly GITHUB_API_BASE = 'https://api.github.com';
  private readonly GITHUB_APP_INSTALL_URL = 'https://github.com/apps';

  // Cache for private key
  private privateKey: string | null = null;

  constructor(private configService: ConfigService) {}

  /**
   * Get GitHub App configuration from environment
   */
  private getAppConfig() {
    const appId = this.configService.get<string>('GITHUB_OAUTH_APP_ID');
    const appSlug = this.configService.get<string>('GITHUB_APP_SLUG');
    const clientId = this.configService.get<string>('GITHUB_OAUTH_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_OAUTH_CLIENT_SECRET');
    const privateKey = this.configService.get<string>('GITHUB_PRIVATE_KEY');
    const redirectUri = this.configService.get<string>('GITHUB_OAUTH_REDIRECT_URI');

    if (!appId || !privateKey) {
      throw new Error('GitHub App not configured. Please set GITHUB_OAUTH_APP_ID and GITHUB_PRIVATE_KEY');
    }

    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const finalRedirectUri = redirectUri || `${apiUrl}/api/v1/oauth/github/callback`;

    return { appId, appSlug, clientId, clientSecret, privateKey, redirectUri: finalRedirectUri };
  }

  /**
   * Get private key from environment variable
   */
  private getPrivateKey(): string {
    if (this.privateKey) {
      return this.privateKey;
    }

    const { privateKey } = this.getAppConfig();

    // Replace literal \n with actual newlines (env variables store escaped newlines)
    this.privateKey = privateKey.replace(/\\n/g, '\n');
    return this.privateKey;
  }

  /**
   * Generate JWT for GitHub App authentication
   */
  private generateAppJWT(): string {
    const { appId } = this.getAppConfig();
    const privateKey = this.getPrivateKey();

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iat: now - 60, // Issued at time (60 seconds in the past to allow for clock drift)
      exp: now + (5 * 60), // JWT expiration time (5 minutes - safer margin for clock drift)
      iss: appId, // GitHub App's identifier
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  }

  /**
   * Check if GitHub App is configured
   */
  isConfigured(): boolean {
    try {
      this.getAppConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate state parameter for CSRF protection
   */
  generateState(userId: string, workspaceId: string, returnUrl?: string): string {
    const stateData = {
      service: 'github',
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
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  /**
   * Generate GitHub App installation URL
   * This shows the "Where do you want to install" picker
   */
  getAuthorizationUrl(userId: string, workspaceId: string, returnUrl?: string): { authorizationUrl: string; state: string } {
    const { appSlug } = this.getAppConfig();
    const state = this.generateState(userId, workspaceId, returnUrl);

    if (!appSlug) {
      throw new Error('GITHUB_APP_SLUG not configured. Please add your GitHub App slug to .env');
    }

    // GitHub App installation URL with state
    const authorizationUrl = `${this.GITHUB_APP_INSTALL_URL}/${appSlug}/installations/new?state=${state}`;

    this.logger.log(`Generated GitHub App installation URL for user ${userId} in workspace ${workspaceId}`);

    return { authorizationUrl, state };
  }

  /**
   * Get installation access token using the installation_id from callback
   */
  async getInstallationAccessToken(installationId: number): Promise<GitHubAppTokens> {
    const appJWT = this.generateAppJWT();

    try {
      this.logger.log(`Getting installation access token for installation ${installationId}...`);

      const response = await axios.post(
        `${this.GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`,
        {},
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      const data = response.data;

      const tokens: GitHubAppTokens = {
        accessToken: data.token,
        tokenType: 'token',
        expiresAt: new Date(data.expires_at),
        installationId,
        permissions: data.permissions || {},
        repositorySelection: data.repository_selection || 'all',
      };

      this.logger.log(`Successfully got installation access token, expires at ${tokens.expiresAt}`);

      return tokens;
    } catch (error) {
      this.logger.error('Failed to get installation access token:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get installation access token');
    }
  }

  /**
   * Get installation details
   */
  async getInstallation(installationId: number): Promise<GitHubInstallation> {
    const appJWT = this.generateAppJWT();

    try {
      const response = await axios.get(
        `${this.GITHUB_API_BASE}/app/installations/${installationId}`,
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      const data = response.data;

      return {
        id: data.id,
        account: {
          login: data.account.login,
          id: data.account.id,
          type: data.account.type,
          avatarUrl: data.account.avatar_url,
        },
        repositorySelection: data.repository_selection,
        permissions: data.permissions,
      };
    } catch (error) {
      this.logger.error('Failed to get installation details:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get installation details');
    }
  }

  /**
   * Get user info using installation token (requires user to have authorized the app)
   */
  async getUserInfo(accessToken: string): Promise<GitHubUserInfo> {
    try {
      this.logger.log('Fetching GitHub user info...');

      const response = await axios.get(`${this.GITHUB_API_BASE}/user`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      let email = response.data.email;

      // If email is null/private, try to fetch from emails endpoint
      if (!email) {
        try {
          const emailsResponse = await axios.get(`${this.GITHUB_API_BASE}/user/emails`, {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: 'application/vnd.github.v3+json',
            },
          });

          const primaryEmail = emailsResponse.data.find((e: { primary: boolean; email: string }) => e.primary);
          if (primaryEmail) {
            email = primaryEmail.email;
          }
        } catch (emailError) {
          this.logger.warn('Could not fetch user emails');
        }
      }

      const userInfo: GitHubUserInfo = {
        id: response.data.id,
        login: response.data.login,
        name: response.data.name || response.data.login,
        email: email,
        avatarUrl: response.data.avatar_url,
        bio: response.data.bio,
        company: response.data.company,
        location: response.data.location,
        blog: response.data.blog,
        htmlUrl: response.data.html_url,
        publicRepos: response.data.public_repos,
        followers: response.data.followers,
        following: response.data.following,
      };

      this.logger.log(`Successfully fetched GitHub user info for ${userInfo.login}`);

      return userInfo;
    } catch (error) {
      this.logger.error('Failed to get user info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get user info from GitHub');
    }
  }

  /**
   * Check if installation token is still valid
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await axios.get(`${this.GITHUB_API_BASE}/user`, {
        headers: {
          Authorization: `token ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      return true;
    } catch (error) {
      if (error.response?.status === 401) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Refresh installation access token (they expire after 1 hour)
   */
  async refreshInstallationToken(installationId: number): Promise<GitHubAppTokens> {
    return this.getInstallationAccessToken(installationId);
  }

  /**
   * List all installations for the authenticated app
   */
  async listInstallations(): Promise<GitHubInstallation[]> {
    const appJWT = this.generateAppJWT();

    try {
      const response = await axios.get(
        `${this.GITHUB_API_BASE}/app/installations`,
        {
          headers: {
            Authorization: `Bearer ${appJWT}`,
            Accept: 'application/vnd.github.v3+json',
          },
        },
      );

      return response.data.map((inst: any) => ({
        id: inst.id,
        account: {
          login: inst.account.login,
          id: inst.account.id,
          type: inst.account.type,
          avatarUrl: inst.account.avatar_url,
        },
        repositorySelection: inst.repository_selection,
        permissions: inst.permissions,
      }));
    } catch (error) {
      this.logger.error('Failed to list installations:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to list installations');
    }
  }
}
