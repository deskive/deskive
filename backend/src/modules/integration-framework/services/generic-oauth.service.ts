import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  IntegrationCatalogEntry,
  OAuthConfig,
  OAuthTokens,
  ExternalUserInfo,
  OAuthState,
} from '../interfaces/integration-config.interface';

@Injectable()
export class GenericOAuthService {
  private readonly logger = new Logger(GenericOAuthService.name);
  private readonly STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Generate OAuth authorization URL for any provider
   */
  getAuthorizationUrl(
    integration: IntegrationCatalogEntry,
    userId: string,
    workspaceId: string,
    returnUrl?: string,
  ): { authorizationUrl: string; state: string } {
    const oauthConfig = integration.authConfig as OAuthConfig;

    if (!oauthConfig.authorizationUrl) {
      throw new BadRequestException(
        `Integration '${integration.slug}' does not support OAuth`,
      );
    }

    const clientId = this.getEnvValue(oauthConfig.clientIdEnvKey);
    if (!clientId) {
      throw new BadRequestException(
        `OAuth client ID not configured for '${integration.slug}'`,
      );
    }

    const state = this.generateState(integration.slug, userId, workspaceId, returnUrl);
    const redirectUri = this.getRedirectUri(integration.slug);

    // Build scopes
    const scopes = this.buildScopes(oauthConfig);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      state,
    });

    // Add any extra auth params
    if (oauthConfig.extraAuthParams) {
      for (const [key, value] of Object.entries(oauthConfig.extraAuthParams)) {
        params.append(key, value);
      }
    }

    const authorizationUrl = `${oauthConfig.authorizationUrl}?${params.toString()}`;

    this.logger.debug(`Generated OAuth URL for ${integration.slug}: ${authorizationUrl}`);

    return { authorizationUrl, state };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(
    integration: IntegrationCatalogEntry,
    code: string,
  ): Promise<OAuthTokens> {
    const oauthConfig = integration.authConfig as OAuthConfig;

    const clientId = this.getEnvValue(oauthConfig.clientIdEnvKey);
    const clientSecret = this.getEnvValue(oauthConfig.clientSecretEnvKey);

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        `OAuth credentials not configured for '${integration.slug}'`,
      );
    }

    const redirectUri = this.getRedirectUri(integration.slug);

    const tokenData: Record<string, string> = {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    };

    // Add any extra token params
    if (oauthConfig.extraTokenParams) {
      Object.assign(tokenData, oauthConfig.extraTokenParams);
    }

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(oauthConfig.tokenUrl, new URLSearchParams(tokenData), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }),
      );

      return this.transformTokenResponse(response.data, oauthConfig);
    } catch (error: any) {
      this.logger.error(
        `Failed to exchange code for tokens for ${integration.slug}`,
        error?.response?.data || error,
      );
      throw new UnauthorizedException(
        `Failed to authenticate with ${integration.name}`,
      );
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    integration: IntegrationCatalogEntry,
    refreshToken: string,
  ): Promise<OAuthTokens> {
    const oauthConfig = integration.authConfig as OAuthConfig;

    const clientId = this.getEnvValue(oauthConfig.clientIdEnvKey);
    const clientSecret = this.getEnvValue(oauthConfig.clientSecretEnvKey);

    if (!clientId || !clientSecret) {
      throw new BadRequestException(
        `OAuth credentials not configured for '${integration.slug}'`,
      );
    }

    const tokenData = {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    };

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.post(oauthConfig.tokenUrl, new URLSearchParams(tokenData), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
        }),
      );

      const tokens = this.transformTokenResponse(response.data, oauthConfig);

      // Some providers don't return a new refresh token - keep the old one
      if (!tokens.refreshToken) {
        tokens.refreshToken = refreshToken;
      }

      return tokens;
    } catch (error: any) {
      this.logger.error(
        `Failed to refresh token for ${integration.slug}`,
        error?.response?.data || error,
      );
      throw new UnauthorizedException(
        `Failed to refresh authentication with ${integration.name}`,
      );
    }
  }

  /**
   * Get user info from provider
   */
  async getUserInfo(
    integration: IntegrationCatalogEntry,
    accessToken: string,
  ): Promise<ExternalUserInfo> {
    const oauthConfig = integration.authConfig as OAuthConfig;

    if (!oauthConfig.userInfoUrl) {
      // Return empty user info if no userInfo endpoint
      return { id: 'unknown' };
    }

    try {
      const response: AxiosResponse = await firstValueFrom(
        this.httpService.get(oauthConfig.userInfoUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        }),
      );

      return this.transformUserInfo(response.data, oauthConfig);
    } catch (error: any) {
      this.logger.error(
        `Failed to get user info for ${integration.slug}`,
        error?.response?.data || error,
      );
      // Return partial user info rather than failing
      return { id: 'unknown' };
    }
  }

  /**
   * Revoke OAuth token (if supported)
   */
  async revokeToken(
    integration: IntegrationCatalogEntry,
    token: string,
  ): Promise<boolean> {
    const oauthConfig = integration.authConfig as OAuthConfig;

    if (!oauthConfig.revokeUrl) {
      this.logger.warn(`Revoke URL not configured for ${integration.slug}`);
      return true; // Soft success
    }

    try {
      await firstValueFrom(
        this.httpService.post(
          oauthConfig.revokeUrl,
          new URLSearchParams({ token }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ),
      );

      this.logger.log(`Successfully revoked token for ${integration.slug}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to revoke token for ${integration.slug}`,
        error?.response?.data || error,
      );
      return false;
    }
  }

  /**
   * Generate state parameter for OAuth (CSRF protection)
   */
  generateState(
    integrationSlug: string,
    userId: string,
    workspaceId: string,
    returnUrl?: string,
  ): string {
    const stateData: OAuthState = {
      integrationSlug,
      userId,
      workspaceId,
      returnUrl: returnUrl || '',
      timestamp: Date.now(),
      nonce: this.generateNonce(),
    };

    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  /**
   * Decode and validate state parameter
   */
  decodeState(state: string): OAuthState {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded) as OAuthState;

      // Validate state is not expired
      if (Date.now() - stateData.timestamp > this.STATE_EXPIRY_MS) {
        throw new BadRequestException('OAuth state has expired');
      }

      return stateData;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Failed to decode OAuth state', error);
      throw new BadRequestException('Invalid OAuth state');
    }
  }

  // Helper methods

  private getEnvValue(envKey: string): string | undefined {
    return this.configService.get<string>(envKey);
  }

  private getRedirectUri(integrationSlug?: string): string {
    // Google services use a dedicated redirect URI
    const googleServices = [
      'google-drive', 'gmail', 'google-calendar', 'google-sheets',
      'google-chat', 'google-meet', 'google-cloud', 'google-analytics', 'youtube',
    ];

    if (integrationSlug && googleServices.includes(integrationSlug)) {
      // Use Google OAuth redirect URI for all Google services
      const googleRedirectUri = this.configService.get<string>('GOOGLE_OAUTH_REDIRECT_URI');
      if (googleRedirectUri) {
        return googleRedirectUri;
      }
    }

    // Default redirect URI for other providers
    const baseUrl = this.configService.get<string>('API_BASE_URL') ||
                    // TODO: configure base URL
                    'http://localhost:3000';
    return `${baseUrl}/api/v1/integrations/oauth/callback`;
  }

  private buildScopes(oauthConfig: OAuthConfig): string {
    const scopes = oauthConfig.scopes || [];
    const prefix = oauthConfig.scopePrefix || '';
    const delimiter = oauthConfig.scopeDelimiter || ' ';

    const fullScopes = scopes.map((scope) => {
      // Don't add prefix if scope already contains it or is a full URL
      if (scope.startsWith('http') || scope.startsWith(prefix)) {
        return scope;
      }
      return `${prefix}${scope}`;
    });

    return fullScopes.join(delimiter);
  }

  private transformTokenResponse(
    data: Record<string, unknown>,
    oauthConfig: OAuthConfig,
  ): OAuthTokens {
    const mapping = oauthConfig.tokenResponseMapping || {};

    const accessToken = (data[mapping.accessToken || 'access_token'] as string) || '';
    const refreshToken = data[mapping.refreshToken || 'refresh_token'] as string | undefined;
    const expiresIn = data[mapping.expiresIn || 'expires_in'] as number | undefined;
    const scope = data[mapping.scope || 'scope'] as string | undefined;
    const tokenType = (data[mapping.tokenType || 'token_type'] as string) || 'Bearer';

    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    return {
      accessToken,
      refreshToken,
      tokenType,
      scope,
      expiresIn,
      expiresAt,
    };
  }

  private transformUserInfo(
    data: Record<string, unknown>,
    oauthConfig: OAuthConfig,
  ): ExternalUserInfo {
    const mapping = oauthConfig.userInfoMapping || {};

    // Handle nested paths (e.g., 'data.user.id')
    const getValue = (obj: Record<string, unknown>, path: string): unknown => {
      return path.split('.').reduce((current, key) => {
        return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
      }, obj as unknown);
    };

    return {
      id: String(getValue(data, mapping.id || 'id') || getValue(data, 'sub') || 'unknown'),
      email: (getValue(data, mapping.email || 'email') as string) || undefined,
      name: (getValue(data, mapping.name || 'name') as string) || undefined,
      avatar: (getValue(data, mapping.avatar || 'picture') || getValue(data, 'avatar_url')) as string | undefined,
      metadata: data,
    };
  }

  private generateNonce(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
