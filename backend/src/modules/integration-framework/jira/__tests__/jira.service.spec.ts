/**
 * Jira Service Action Tests (Integration Pattern)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { JiraService } from '../jira.service';
import { JiraOAuthService } from '../jira-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { TestFixture } from '../../../../../test/helpers/connector-test.helper';

import createIssueFixture from './fixtures/create_issue.json';

describe('JiraService - Actions', () => {
  let service: JiraService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'jira',
    access_token: 'mock-jira-token',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    JIRA_CLIENT_ID: 'mock-jira-client-id',
    JIRA_CLIENT_SECRET: 'mock-jira-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JiraService,
        JiraOAuthService,
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

    service = module.get<JiraService>(JiraService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Action Tests (Fixture-based)
  // ===========================================
  describe('create_issue', () => {
    const fixture = createIssueFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(fixture.baseUrl)
          [testCase.mock.method.toLowerCase() as 'post'](testCase.mock.path)
          .matchHeader('authorization', 'Bearer mock-jira-token')
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await service.createIssue(
          'user-123',
          'workspace-456',
          'cloud-123',
          testCase.input
        );

        expect(result).toMatchObject(testCase.expected.data);
      });
    });
  });

  describe('search_issues', () => {
    it('should search issues with JQL', async () => {
      nock('https://api.atlassian.com')
        .post('/ex/jira/cloud-123/rest/api/3/search')
        .reply(200, {
          issues: [{ key: 'TEST-1' }, { key: 'TEST-2' }],
        });

      const result = await service.searchIssues('user-123', 'workspace-456', 'cloud-123', 'project = TEST');
      expect(result.issues).toHaveLength(2);
    });
  });
});
