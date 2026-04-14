/**
 * Notion Service Action Tests (Integration Pattern)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { NotionService } from '../notion.service';
import { NotionOAuthService } from '../notion-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { TestFixture } from '../../../../../test/helpers/connector-test.helper';

import createPageFixture from './fixtures/create_page.json';

describe('NotionService - Actions', () => {
  let service: NotionService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'notion',
    access_token: 'secret_mock-notion-token',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    NOTION_CLIENT_ID: 'mock-notion-client-id',
    NOTION_CLIENT_SECRET: 'mock-notion-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotionService,
        NotionOAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key]),
          },
        },
        {
          provide: deskiveService,
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockConnection),
          },
        },
      ],
    }).compile();

    service = module.get<NotionService>(NotionService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Action Tests (Fixture-based)
  // ===========================================
  describe('create_page', () => {
    const fixture = createPageFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(fixture.baseUrl)
          [testCase.mock.method.toLowerCase() as 'post'](testCase.mock.path)
          .matchHeader('authorization', 'Bearer secret_mock-notion-token')
          .matchHeader('notion-version', '2022-06-28')
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await service.createPage('user-123', 'workspace-456', testCase.input);

        expect(result).toMatchObject(testCase.expected.data);
      });
    });
  });

  describe('query_database', () => {
    it('should query Notion database', async () => {
      nock('https://api.notion.com')
        .post('/v1/databases/db-123/query')
        .reply(200, {
          results: [{ id: 'page-1' }, { id: 'page-2' }],
        });

      const result = await service.queryDatabase('user-123', 'workspace-456', 'db-123');
      expect(result.results).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('should search in Notion', async () => {
      nock('https://api.notion.com')
        .post('/v1/search')
        .reply(200, {
          results: [{ id: 'result-1' }],
        });

      const result = await service.search('user-123', 'workspace-456', 'test');
      expect(result.results).toBeDefined();
    });
  });
});
