/**
 * Twitter OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { TwitterOAuthService } from '../twitter-oauth.service';
import { cleanupOAuthMocks } from '../../../../test/helpers/oauth-mock.helper';

describe('TwitterOAuthService', () => {
  let service: TwitterOAuthService;

  const mockConfig: Record<string, string> = {
    TWITTER_CLIENT_ID: 'test-client-id',
    TWITTER_CLIENT_SECRET: 'test-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TwitterOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<TwitterOAuthService>(TwitterOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate Twitter authorization URL with PKCE parameters', () => {
      const { url, state } = service.getAuthorizationUrl('workspace-123', 'user-456');

      expect(url).toContain('https://twitter.com/i/oauth2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('code_challenge=');
      expect(url).toContain('code_challenge_method=S256');
      expect(url).toContain(`state=${state}`);
    });

    it('should include return URL in state when provided', () => {
      const { url, state } = service.getAuthorizationUrl(
        'workspace-123',
        'user-456',
        'https://app.example.com/callback',
      );

      expect(url).toContain(`state=${state}`);
      const decoded = service.decodeState(state);
      expect(decoded.returnUrl).toBe('https://app.example.com/callback');
    });

    it('should include required scopes', () => {
      const { url } = service.getAuthorizationUrl('workspace-123', 'user-456');

      expect(url).toContain('scope=');
      expect(url).toContain('tweet.read');
      expect(url).toContain('tweet.write');
      expect(url).toContain('users.read');
      expect(url).toContain('offline.access');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      // First generate a state to store the code verifier
      const { state } = service.getAuthorizationUrl('workspace-123', 'user-456');

      const mockResponse = {
        token_type: 'bearer',
        expires_in: 7200,
        access_token: 'test-access-token',
        scope: 'tweet.read tweet.write users.read',
        refresh_token: 'test-refresh-token',
      };

      nock('https://api.twitter.com').post('/2/oauth2/token').reply(200, mockResponse);

      const tokens = await service.exchangeCodeForTokens('test-code', state);

      expect(tokens.access_token).toBe('test-access-token');
      expect(tokens.refresh_token).toBe('test-refresh-token');
      expect(tokens.expires_in).toBe(7200);
    });

    it('should throw error when code verifier not found', async () => {
      await expect(service.exchangeCodeForTokens('test-code', 'unknown-state')).rejects.toThrow(
        'Code verifier not found',
      );
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      const mockResponse = {
        token_type: 'bearer',
        expires_in: 7200,
        access_token: 'new-access-token',
        scope: 'tweet.read tweet.write users.read',
        refresh_token: 'new-refresh-token',
      };

      nock('https://api.twitter.com').post('/2/oauth2/token').reply(200, mockResponse);

      const tokens = await service.refreshAccessToken('old-refresh-token');

      expect(tokens.access_token).toBe('new-access-token');
      expect(tokens.refresh_token).toBe('new-refresh-token');
    });

    it('should throw error when refresh fails', async () => {
      nock('https://api.twitter.com')
        .post('/2/oauth2/token')
        .reply(400, { error: 'invalid_grant', error_description: 'Invalid refresh token' });

      await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow();
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const mockUser = {
        data: {
          id: '123456789',
          name: 'Test User',
          username: 'testuser',
          profile_image_url: 'https://pbs.twimg.com/profile_images/123/avatar.jpg',
          verified: false,
          public_metrics: {
            followers_count: 100,
            following_count: 50,
            tweet_count: 1000,
            listed_count: 5,
          },
        },
      };

      nock('https://api.twitter.com').get('/2/users/me').query(true).reply(200, mockUser);

      const userInfo = await service.getUserInfo('test-token');

      expect(userInfo.id).toBe('123456789');
      expect(userInfo.username).toBe('testuser');
      expect(userInfo.name).toBe('Test User');
      expect(userInfo.public_metrics.followers_count).toBe(100);
    });

    it('should throw error when user info fetch fails', async () => {
      nock('https://api.twitter.com')
        .get('/2/users/me')
        .query(true)
        .reply(401, { errors: [{ message: 'Unauthorized' }] });

      await expect(service.getUserInfo('invalid-token')).rejects.toThrow();
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      nock('https://api.twitter.com').post('/2/oauth2/revoke').reply(200, { revoked: true });

      await expect(service.revokeToken('test-token')).resolves.not.toThrow();
    });

    it('should not throw when revoke fails', async () => {
      nock('https://api.twitter.com')
        .post('/2/oauth2/revoke')
        .reply(400, { error: 'invalid_token' });

      // Should not throw even on failure (we still want to delete the connection)
      await expect(service.revokeToken('invalid-token')).resolves.not.toThrow();
    });
  });

  describe('generateState / decodeState', () => {
    it('should generate and decode state correctly', () => {
      const state = service.generateState(
        'workspace-123',
        'user-456',
        'https://example.com/callback',
      );
      const decoded = service.decodeState(state);

      expect(decoded.workspaceId).toBe('workspace-123');
      expect(decoded.userId).toBe('user-456');
      expect(decoded.returnUrl).toBe('https://example.com/callback');
    });

    it('should throw error for invalid state', () => {
      expect(() => service.decodeState('invalid-state')).toThrow('Invalid state parameter');
    });

    it('should generate base64url encoded state', () => {
      const state = service.generateState('workspace-123', 'user-456');

      // Should be valid base64url (no +, /, or = padding typically)
      expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
    });
  });
});
