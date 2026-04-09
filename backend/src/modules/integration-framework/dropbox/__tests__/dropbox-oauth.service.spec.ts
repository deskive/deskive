/**
 * Dropbox OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { DropboxOAuthService } from '../dropbox-oauth.service';
import {
  mockCustomOAuthEndpoint,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '../../../../../test/helpers/oauth-mock.helper';
import { OAUTH_MOCK_CREDENTIALS } from '../../../../../test/helpers/mock-credentials';

describe('DropboxOAuthService', () => {
  let service: DropboxOAuthService;

  const mockConfig: Record<string, string> = {
    DROPBOX_CLIENT_ID: OAUTH_MOCK_CREDENTIALS.dropbox.clientId,
    DROPBOX_CLIENT_SECRET: OAUTH_MOCK_CREDENTIALS.dropbox.clientSecret,
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DropboxOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<DropboxOAuthService>(DropboxOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  describe('OAuth URL Generation', () => {
    it('should generate Dropbox authorization URL', () => {
      const result = service.getAuthorizationUrl('user-123', 'workspace-456');

      expect(result.authorizationUrl).toContain('https://www.dropbox.com/oauth2/authorize');
      expect(result.authorizationUrl).toContain('client_id=' + OAUTH_MOCK_CREDENTIALS.dropbox.clientId);
      expect(result.authorizationUrl).toContain('response_type=code');
      expect(result.authorizationUrl).toContain('token_access_type=offline');
    });

    it('should include state parameter', () => {
      const result = service.getAuthorizationUrl('user-123', 'workspace-456');

      expect(result.state).toBeDefined();
      expect(result.authorizationUrl).toContain('state=');
    });

    it('should include redirect_uri', () => {
      const result = service.getAuthorizationUrl('user-123', 'workspace-456');

      expect(result.authorizationUrl).toContain('redirect_uri=');
    });
  });

  describe('State Management', () => {
    it('should generate valid state', () => {
      const state = service.generateState('user-123', 'workspace-456', 'http://example.com/callback');

      expect(state).toBeDefined();
      expect(typeof state).toBe('string');
    });

    it('should decode valid state', () => {
      const state = service.generateState('user-123', 'workspace-456', 'http://example.com/callback');
      const decoded = service.decodeState(state);

      expect(decoded.userId).toBe('user-123');
      expect(decoded.workspaceId).toBe('workspace-456');
      expect(decoded.returnUrl).toBe('http://example.com/callback');
    });

    it('should throw error for expired state', () => {
      // Create state with old timestamp
      const expiredState = Buffer.from(
        JSON.stringify({
          service: 'dropbox',
          userId: 'user-123',
          workspaceId: 'workspace-456',
          timestamp: Date.now() - 15 * 60 * 1000, // 15 minutes ago
          nonce: 'test-nonce',
        })
      ).toString('base64url');

      // The service catches the expiration error and re-throws as generic "Invalid state parameter"
      expect(() => service.decodeState(expiredState)).toThrow('Invalid state parameter');
    });

    it('should throw error for invalid state', () => {
      expect(() => service.decodeState('invalid-state')).toThrow('Invalid state parameter');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      // Mock Dropbox token endpoint
      nock('https://api.dropboxapi.com')
        .post('/oauth2/token')
        .reply(200, {
          access_token: MOCK_TOKENS.dropbox.access_token,
          refresh_token: MOCK_TOKENS.dropbox.refresh_token,
          expires_in: MOCK_TOKENS.dropbox.expires_in,
          token_type: 'bearer',
          account_id: 'dbid:mock-account-id',
          uid: '12345678',
        });

      const tokens = await service.exchangeCodeForTokens('test-auth-code');

      expect(tokens.accessToken).toBe(MOCK_TOKENS.dropbox.access_token);
      expect(tokens.refreshToken).toBe(MOCK_TOKENS.dropbox.refresh_token);
      // Dropbox returns lowercase 'bearer', service normalizes it
      expect(tokens.tokenType.toLowerCase()).toBe('bearer');
    });

    it('should send correct request body format', async () => {
      let requestBody: any = null;

      nock('https://api.dropboxapi.com')
        .post('/oauth2/token', (body: any) => {
          requestBody = body;
          return true;
        })
        .reply(200, {
          access_token: 'test-token',
          token_type: 'bearer',
          account_id: 'dbid:test',
          uid: '123',
        });

      await service.exchangeCodeForTokens('test-code');

      // Body could be object or URL-encoded string depending on nock version
      if (typeof requestBody === 'object') {
        expect(requestBody.grant_type).toBe('authorization_code');
        expect(requestBody.code).toBe('test-code');
      } else {
        expect(requestBody).toMatch(/grant_type=authorization_code/);
        expect(requestBody).toMatch(/code=test-code/);
      }
    });

    it('should handle token exchange error', async () => {
      nock('https://api.dropboxapi.com')
        .post('/oauth2/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'The authorization code has expired',
        });

      await expect(service.exchangeCodeForTokens('expired-code')).rejects.toThrow(
        'Failed to exchange authorization code'
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      nock('https://api.dropboxapi.com')
        .post('/oauth2/token', (body: any) => {
          // Body can be string or object depending on how nock parses it
          const bodyStr = typeof body === 'string' ? body : '';
          return bodyStr.includes('grant_type=refresh_token') ||
                 (body && body.grant_type === 'refresh_token');
        })
        .reply(200, {
          access_token: 'new-refreshed-token',
          token_type: 'bearer',
          expires_in: 14400,
        });

      const tokens = await service.refreshAccessToken('old-refresh-token');

      expect(tokens.accessToken).toBe('new-refreshed-token');
      expect(tokens.refreshToken).toBe('old-refresh-token'); // Dropbox keeps old refresh token
    });

    it('should handle refresh token error', async () => {
      nock('https://api.dropboxapi.com')
        .post('/oauth2/token')
        .reply(400, {
          error: 'invalid_grant',
          error_description: 'The refresh token is invalid',
        });

      await expect(service.refreshAccessToken('invalid-refresh-token')).rejects.toThrow(
        'Failed to refresh access token'
      );
    });
  });

  describe('User Info', () => {
    it('should fetch Dropbox user info', async () => {
      nock('https://api.dropboxapi.com')
        .post('/2/users/get_current_account')
        .reply(200, MOCK_USER_INFO.dropbox);

      const userInfo = await service.getUserInfo('dropbox-access-token');

      expect(userInfo.accountId).toBe(MOCK_USER_INFO.dropbox.account_id);
      expect(userInfo.email).toBe(MOCK_USER_INFO.dropbox.email);
      expect(userInfo.name.displayName).toBe(MOCK_USER_INFO.dropbox.name.display_name);
    });

    it('should handle user info fetch error', async () => {
      nock('https://api.dropboxapi.com')
        .post('/2/users/get_current_account')
        .reply(401, {
          error: {
            '.tag': 'invalid_access_token',
          },
        });

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow(
        'Failed to get Dropbox user info'
      );
    });
  });

  describe('Token Revocation', () => {
    it('should revoke access token', async () => {
      nock('https://api.dropboxapi.com')
        .post('/2/auth/token/revoke')
        .reply(200, null);

      // Should not throw
      await expect(service.revokeToken('valid-token')).resolves.not.toThrow();
    });

    it('should not throw on revocation failure', async () => {
      nock('https://api.dropboxapi.com')
        .post('/2/auth/token/revoke')
        .reply(400, { error: 'invalid_token' });

      // Should not throw even on failure
      await expect(service.revokeToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('Token Expiration Check', () => {
    it('should correctly identify expired token', () => {
      const expiredDate = new Date(Date.now() - 1000); // 1 second ago
      expect(service.isTokenExpired(expiredDate)).toBe(true);
    });

    it('should correctly identify token expiring soon', () => {
      const expiringDate = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes from now
      expect(service.isTokenExpired(expiringDate, 5)).toBe(true); // 5 minute buffer
    });

    it('should correctly identify valid token', () => {
      const validDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      expect(service.isTokenExpired(validDate)).toBe(false);
    });
  });
});
