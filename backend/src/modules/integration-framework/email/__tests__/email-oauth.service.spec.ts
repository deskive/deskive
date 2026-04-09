/**
 * Gmail OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { EmailOAuthService } from '../email-oauth.service';
import {
  mockTokenExchange,
  mockUserInfo,
  MOCK_TOKENS,
  MOCK_USER_INFO,
  cleanupOAuthMocks,
} from '../../../../../test/helpers/oauth-mock.helper';
import { OAUTH_MOCK_CREDENTIALS } from '../../../../../test/helpers/mock-credentials';

describe('EmailOAuthService (Gmail)', () => {
  let service: EmailOAuthService;

  const mockConfig: Record<string, string> = {
    GOOGLE_OAUTH_CLIENT_ID: OAUTH_MOCK_CREDENTIALS.google.clientId,
    GOOGLE_OAUTH_CLIENT_SECRET: OAUTH_MOCK_CREDENTIALS.google.clientSecret,
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<EmailOAuthService>(EmailOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Gmail authorization URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
    expect(result.authorizationUrl).toContain('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail');
  });

  it('should exchange code for tokens', async () => {
    mockTokenExchange('google', MOCK_TOKENS.google);

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBeDefined();
  });

  it('should fetch user info', async () => {
    mockUserInfo('google', MOCK_USER_INFO.google);

    const userInfo = await service.getUserInfo('access-token');

    expect(userInfo.email).toBe(MOCK_USER_INFO.google.email);
  });
});
