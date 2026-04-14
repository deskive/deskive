/**
 * Google Drive OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { GoogleDriveOAuthService } from '../google-drive-oauth.service';
import {
  mockTokenExchange,
  mockTokenRefresh,
  mockUserInfo,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '../../../../../test/helpers/oauth-mock.helper';
import { OAUTH_MOCK_CREDENTIALS } from '../../../../../test/helpers/mock-credentials';

describe('GoogleDriveOAuthService', () => {
  let service: GoogleDriveOAuthService;

  const mockConfig: Record<string, string> = {
    GOOGLE_OAUTH_CLIENT_ID: OAUTH_MOCK_CREDENTIALS.google.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: OAUTH_MOCK_CREDENTIALS.google.clientSecret,
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleDriveOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<GoogleDriveOAuthService>(GoogleDriveOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  describe('OAuth URL Generation', () => {
    it('should generate Google Drive authorization URL', () => {
      const result = service.getAuthorizationUrl('user-123', 'workspace-456');

      expect(result.authorizationUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.authorizationUrl).toContain(
        'client_id=' + OAUTH_MOCK_CREDENTIALS.google.clientId,
      );
      expect(result.authorizationUrl).toContain('scope=');
      expect(result.authorizationUrl).toContain('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive');
    });

    it('should include state parameter', () => {
      const result = service.getAuthorizationUrl('user-123', 'workspace-456');

      expect(result.state).toBeDefined();
      expect(result.authorizationUrl).toContain('state=');
    });
  });

  describe('Token Exchange', () => {
    it('should exchange authorization code for tokens', async () => {
      mockTokenExchange('google', MOCK_TOKENS.google);

      const tokens = await service.exchangeCodeForTokens('test-auth-code');

      expect(tokens.accessToken).toBe(MOCK_TOKENS.google.access_token);
      expect(tokens.refreshToken).toBe(MOCK_TOKENS.google.refresh_token);
    });

    it('should send correct request body', async () => {
      let requestBody: any = {};

      nock('https://oauth2.googleapis.com')
        .post('/token', (body: any) => {
          requestBody = body;
          return true;
        })
        .reply(200, MOCK_TOKENS.google);

      await service.exchangeCodeForTokens('test-code');

      expect(requestBody.grant_type).toBe('authorization_code');
      expect(requestBody.code).toBe('test-code');
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      // nock receives body as object (URLSearchParams parsed), not string
      nock('https://oauth2.googleapis.com')
        .post('/token', (body: any) => {
          return body.grant_type === 'refresh_token' && body.refresh_token === 'old-refresh-token';
        })
        .reply(200, {
          ...MOCK_TOKENS.google,
          access_token: 'new-refreshed-token',
        });

      const tokens = await service.refreshAccessToken('old-refresh-token');

      expect(tokens.accessToken).toBe('new-refreshed-token');
    });
  });

  describe('User Info', () => {
    it('should fetch Google user info', async () => {
      mockUserInfo('google', MOCK_USER_INFO.google);

      const userInfo = await service.getUserInfo('google-access-token');

      expect(userInfo.id).toBe(MOCK_USER_INFO.google.id);
      expect(userInfo.email).toBe(MOCK_USER_INFO.google.email);
    });
  });
});
