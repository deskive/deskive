/**
 * Notion OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { NotionOAuthService } from '../notion-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('NotionOAuthService', () => {
  let service: NotionOAuthService;

  const mockConfig: Record<string, string> = {
    NOTION_CLIENT_ID: 'mock-notion-client-id',
    NOTION_CLIENT_SECRET: 'mock-notion-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<NotionOAuthService>(NotionOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Notion OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://api.notion.com/v1/oauth/authorize');
    expect(result.authorizationUrl).toContain('owner=user');
  });

  it('should exchange code for tokens', async () => {
    nock('https://api.notion.com')
      .post('/v1/oauth/token')
      .matchHeader('authorization', /^Basic /)
      .reply(200, {
        access_token: 'secret_mock-notion-token',
        token_type: 'Bearer',
        bot_id: 'bot-123',
        workspace_id: 'ws-456',
        workspace_name: 'Test Workspace',
      });

    const tokens = await service.exchangeCodeForTokens('test-code');

    expect(tokens.accessToken).toBe('secret_mock-notion-token');
    expect(tokens.botId).toBe('bot-123');
  });
});
