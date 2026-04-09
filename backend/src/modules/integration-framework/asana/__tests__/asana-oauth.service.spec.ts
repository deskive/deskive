/**
 * Asana OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { AsanaOAuthService } from '../asana-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('AsanaOAuthService', () => {
  let service: AsanaOAuthService;

  const mockConfig: Record<string, string> = {
    ASANA_CLIENT_ID: 'mock-asana-client-id',
    ASANA_CLIENT_SECRET: 'mock-asana-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsanaOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<AsanaOAuthService>(AsanaOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should be configured', () => {
    expect(service.isConfigured()).toBe(true);
  });

  it('should generate Asana OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://app.asana.com/-/oauth_authorize');
    expect(result.authorizationUrl).toContain('client_id=mock-asana-client-id');
    expect(result.state).toBeDefined();
  });

  it('should exchange code for tokens', async () => {
    nock('https://app.asana.com')
      .post('/-/oauth_token')
      .reply(200, {
        access_token: 'mock-asana-token',
        refresh_token: 'mock-asana-refresh',
        token_type: 'Bearer',
        data: {
          gid: '123',
          email: 'test@asana.com',
          name: 'Test User',
        },
      });

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBe('mock-asana-token');
  });

  it('should fetch user info', async () => {
    nock('https://app.asana.com')
      .get('/api/1.0/users/me')
      .matchHeader('authorization', 'Bearer mock-token')
      .reply(200, {
        data: {
          gid: '123',
          email: 'test@asana.com',
          name: 'Test User',
        },
      });

    const userInfo = await service.getUserInfo('mock-token');

    expect(userInfo.email).toBe('test@asana.com');
  });

  it('should refresh tokens', async () => {
    nock('https://app.asana.com')
      .post('/-/oauth_token', (body: any) => body.grant_type === 'refresh_token')
      .reply(200, {
        access_token: 'new-asana-token',
        refresh_token: 'new-asana-refresh',
        token_type: 'Bearer',
      });

    const tokens = await service.refreshAccessToken('old-refresh');

    expect(tokens.accessToken).toBe('new-asana-token');
  });
});
