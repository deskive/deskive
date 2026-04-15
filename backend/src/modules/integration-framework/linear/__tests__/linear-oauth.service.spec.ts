/**
 * Linear OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { LinearOAuthService } from '../linear-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('LinearOAuthService', () => {
  let service: LinearOAuthService;

  const mockConfig: Record<string, string> = {
    LINEAR_CLIENT_ID: 'mock-linear-client-id',
    LINEAR_CLIENT_SECRET: 'mock-linear-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinearOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<LinearOAuthService>(LinearOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Linear OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://linear.app/oauth/authorize');
    expect(result.authorizationUrl).toContain('scope=read%2Cwrite');
  });

  it('should exchange code for tokens', async () => {
    nock('https://api.linear.app').post('/oauth/token').reply(200, {
      access_token: 'lin_api_mock-linear-token',
      token_type: 'Bearer',
      expires_in: 315360000,
      scope: 'read,write',
    });

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBe('lin_api_mock-linear-token');
  });
});
