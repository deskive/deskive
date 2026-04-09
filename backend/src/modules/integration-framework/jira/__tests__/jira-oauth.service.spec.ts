/**
 * Jira OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { JiraOAuthService } from '../jira-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('JiraOAuthService', () => {
  let service: JiraOAuthService;

  const mockConfig: Record<string, string> = {
    JIRA_CLIENT_ID: 'mock-jira-client-id',
    JIRA_CLIENT_SECRET: 'mock-jira-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<JiraOAuthService>(JiraOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Jira OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://auth.atlassian.com/authorize');
    expect(result.authorizationUrl).toContain('audience=api.atlassian.com');
  });

  it('should exchange code for tokens', async () => {
    nock('https://auth.atlassian.com')
      .post('/oauth/token')
      .reply(200, {
        access_token: 'mock-jira-token',
        refresh_token: 'mock-jira-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read:jira-user read:jira-work write:jira-work',
      });

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBe('mock-jira-token');
  });

  it('should refresh tokens', async () => {
    nock('https://auth.atlassian.com')
      .post('/oauth/token', (body: any) => body.grant_type === 'refresh_token')
      .reply(200, {
        access_token: 'new-jira-token',
        refresh_token: 'new-jira-refresh',
        token_type: 'Bearer',
        expires_in: 3600,
        scope: 'read:jira-user read:jira-work',
      });

    const tokens = await service.refreshAccessToken('old-refresh');

    expect(tokens.accessToken).toBe('new-jira-token');
  });

  it('should fetch user info', async () => {
    nock('https://api.atlassian.com')
      .get('/me')
      .matchHeader('authorization', 'Bearer mock-token')
      .reply(200, {
        account_id: '123',
        email: 'test@jira.com',
        name: 'Test User',
      });

    const userInfo = await service.getUserInfo('mock-token');

    expect(userInfo.email).toBe('test@jira.com');
  });
});
