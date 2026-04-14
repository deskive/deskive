/**
 * ClickUp OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { ClickUpOAuthService } from '../clickup-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('ClickUpOAuthService', () => {
  let service: ClickUpOAuthService;

  const mockConfig: Record<string, string> = {
    CLICKUP_CLIENT_ID: 'mock-clickup-client-id',
    CLICKUP_CLIENT_SECRET: 'mock-clickup-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<ClickUpOAuthService>(ClickUpOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate ClickUp OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://app.clickup.com/api');
    expect(result.authorizationUrl).toContain('client_id=mock-clickup-client-id');
  });

  it('should exchange code for tokens', async () => {
    nock('https://api.clickup.com').post('/api/v2/oauth/token').reply(200, {
      access_token: 'pk_mock_clickup_token',
      token_type: 'Bearer',
    });

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBe('pk_mock_clickup_token');
  });

  it('should fetch user info', async () => {
    nock('https://api.clickup.com')
      .get('/api/v2/user')
      .reply(200, {
        user: {
          id: 123,
          username: 'testuser',
          email: 'test@clickup.com',
          color: '#ff0000',
        },
      });

    const userInfo = await service.getUserInfo('mock-token');

    expect(userInfo.email).toBe('test@clickup.com');
  });
});
