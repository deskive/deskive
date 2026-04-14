/**
 * Slack OAuth Tests (using GenericOAuthService)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { GenericOAuthService } from '../generic-oauth.service';
import {
  mockTokenExchange,
  mockUserInfo,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '../../../../../test/helpers/oauth-mock.helper';
import { OAUTH_MOCK_CREDENTIALS } from '../../../../../test/helpers/mock-credentials';

describe('GenericOAuthService - Slack', () => {
  let service: GenericOAuthService;

  const mockConfig: Record<string, string> = {
    SLACK_OAUTH_CLIENT_ID: OAUTH_MOCK_CREDENTIALS.slack.clientId,
    SLACK_OAUTH_CLIENT_SECRET: OAUTH_MOCK_CREDENTIALS.slack.clientSecret,
    FRONTEND_URL: 'http://localhost:5173',
  };

  const slackIntegration = {
    id: 'slack-id',
    slug: 'slack',
    name: 'Slack',
    authType: 'oauth2' as const,
    authConfig: {
      authorizationUrl: 'https://slack.com/oauth/v2/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.access',
      userInfoUrl: 'https://slack.com/api/users.identity',
      scopes: ['channels:read', 'chat:write', 'users:read'],
      clientIdEnvKey: 'SLACK_OAUTH_CLIENT_ID',
      clientSecretEnvKey: 'SLACK_OAUTH_CLIENT_SECRET',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenericOAuthService,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              post: jest.fn(),
              get: jest.fn(),
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<GenericOAuthService>(GenericOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Slack OAuth URL', () => {
    const authData = service.getAuthorizationUrl(
      slackIntegration as any,
      'user-123',
      'workspace-456',
    );

    expect(authData.authorizationUrl).toContain('https://slack.com/oauth/v2/authorize');
    expect(authData.authorizationUrl).toContain(
      `client_id=${OAUTH_MOCK_CREDENTIALS.slack.clientId}`,
    );
  });

  it('should exchange code for tokens', async () => {
    mockTokenExchange('slack', MOCK_TOKENS.slack);

    const tokens = await service.exchangeCodeForTokens(slackIntegration as any, 'slack-code');

    expect(tokens.accessToken).toBe(MOCK_TOKENS.slack.access_token);
  });

  it('should fetch Slack user info', async () => {
    mockUserInfo('slack', MOCK_USER_INFO.slack);

    const userInfo = await service.getUserInfo(slackIntegration as any, 'slack-token');

    expect(userInfo).toBeDefined();
  });
});
