/**
 * Trello OAuth Service Tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { TrelloOAuthService } from '../trello-oauth.service';
import { cleanupOAuthMocks } from '../../../../../test/helpers/oauth-mock.helper';

describe('TrelloOAuthService', () => {
  let service: TrelloOAuthService;

  const mockConfig: Record<string, string> = {
    TRELLO_API_KEY: 'mock-trello-api-key',
    TRELLO_API_SECRET: 'mock-trello-api-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrelloOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
      ],
    }).compile();

    service = module.get<TrelloOAuthService>(TrelloOAuthService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
  });

  it('should generate Trello OAuth URL', () => {
    const result = service.getAuthorizationUrl('user-123', 'workspace-456');

    expect(result.authorizationUrl).toContain('https://trello.com/1/authorize');
    expect(result.authorizationUrl).toContain('key=mock-trello-api-key');
    expect(result.authorizationUrl).toContain('scope=read%2Cwrite%2Caccount');
  });

  it('should fetch user info', async () => {
    nock('https://api.trello.com')
      .get('/1/members/me')
      .query({ key: 'mock-trello-api-key', token: 'mock-token' })
      .reply(200, {
        id: '123',
        username: 'testuser',
        fullName: 'Test User',
        email: 'test@trello.com',
      });

    const userInfo = await service.getUserInfo('mock-token', 'mock-trello-api-key');

    expect(userInfo.email).toBe('test@trello.com');
  });
});
