/**
 * Slack OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { SlackOAuthService } from '../slack-oauth.service';
import { cleanupOAuthMocks } from '../../../../test/helpers/oauth-mock.helper';

describe('SlackOAuthService', () => {
  let service: SlackOAuthService;

  const mockConfig: Record<string, string> = {
    SLACK_CLIENT_ID: 'test-client-id',
    SLACK_CLIENT_SECRET: 'test-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlackOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<SlackOAuthService>(SlackOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate Slack authorization URL with required parameters', () => {
      const url = service.getAuthorizationUrl('workspace-123', 'user-456');

      expect(url).toContain('https://slack.com/oauth/v2/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('state=');
      expect(url).toContain('user_scope=');
    });

    it('should include return URL in state when provided', () => {
      const url = service.getAuthorizationUrl(
        'workspace-123',
        'user-456',
        'https://app.example.com/callback',
      );

      expect(url).toContain('state=');
      // State should be base64url encoded
      const stateMatch = url.match(/state=([^&]+)/);
      expect(stateMatch).toBeTruthy();

      const state = stateMatch![1];
      const decoded = service.decodeState(state);
      expect(decoded.returnUrl).toBe('https://app.example.com/callback');
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange code for tokens successfully', async () => {
      const mockResponse = {
        ok: true,
        access_token: 'xoxp-test-access-token',
        token_type: 'Bearer',
        scope: 'channels:read,chat:write',
        app_id: 'A123456',
        team: { id: 'T123456', name: 'Test Team' },
        authed_user: {
          id: 'U123456',
          scope: 'channels:read,chat:write',
          access_token: 'xoxp-user-access-token',
          token_type: 'user',
        },
      };

      nock('https://slack.com').post('/api/oauth.v2.access').reply(200, mockResponse);

      const tokens = await service.exchangeCodeForTokens('test-code');

      expect(tokens.access_token).toBe('xoxp-test-access-token');
      expect(tokens.authed_user.access_token).toBe('xoxp-user-access-token');
      expect(tokens.team.name).toBe('Test Team');
    });

    it('should throw error when exchange fails', async () => {
      nock('https://slack.com')
        .post('/api/oauth.v2.access')
        .reply(200, { ok: false, error: 'invalid_code' });

      await expect(service.exchangeCodeForTokens('invalid-code')).rejects.toThrow();
    });
  });

  describe('getUserInfo', () => {
    it('should fetch user info successfully', async () => {
      const mockUser = {
        ok: true,
        user: {
          id: 'U123456',
          team_id: 'T123456',
          name: 'testuser',
          real_name: 'Test User',
          profile: {
            email: 'test@example.com',
            display_name: 'Test',
            image_72: 'https://example.com/avatar.png',
            image_192: 'https://example.com/avatar-large.png',
          },
        },
      };

      nock('https://slack.com')
        .get('/api/users.info')
        .query({ user: 'U123456' })
        .reply(200, mockUser);

      const userInfo = await service.getUserInfo('test-token', 'U123456');

      expect(userInfo.id).toBe('U123456');
      expect(userInfo.real_name).toBe('Test User');
      expect(userInfo.profile.email).toBe('test@example.com');
    });

    it('should throw error when user info fetch fails', async () => {
      nock('https://slack.com')
        .get('/api/users.info')
        .query({ user: 'U123456' })
        .reply(200, { ok: false, error: 'user_not_found' });

      await expect(service.getUserInfo('test-token', 'U123456')).rejects.toThrow();
    });
  });

  describe('testAuth', () => {
    it('should return true for valid token', async () => {
      nock('https://slack.com').post('/api/auth.test').reply(200, { ok: true, user_id: 'U123456' });

      const result = await service.testAuth('valid-token');
      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      nock('https://slack.com')
        .post('/api/auth.test')
        .reply(200, { ok: false, error: 'invalid_auth' });

      const result = await service.testAuth('invalid-token');
      expect(result).toBe(false);
    });
  });

  describe('revokeToken', () => {
    it('should revoke token successfully', async () => {
      nock('https://slack.com').post('/api/auth.revoke').reply(200, { ok: true, revoked: true });

      await expect(service.revokeToken('test-token')).resolves.not.toThrow();
    });

    it('should not throw when revoke fails', async () => {
      nock('https://slack.com')
        .post('/api/auth.revoke')
        .reply(200, { ok: false, error: 'token_revoked' });

      // Should not throw even on failure
      await expect(service.revokeToken('already-revoked-token')).resolves.not.toThrow();
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
  });
});
