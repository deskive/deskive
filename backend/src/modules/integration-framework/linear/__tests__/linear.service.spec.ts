/**
 * Linear Service Action Tests (Integration Pattern)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { LinearService } from '../linear.service';
import { LinearOAuthService } from '../linear-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { TestFixture } from '../../../../../test/helpers/connector-test.helper';

import createIssueFixture from './fixtures/create_issue.json';

describe('LinearService - Actions', () => {
  let service: LinearService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'linear',
    access_token: 'lin_api_mock-token',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    LINEAR_CLIENT_ID: 'mock-linear-client-id',
    LINEAR_CLIENT_SECRET: 'mock-linear-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LinearService,
        LinearOAuthService,
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

    service = module.get<LinearService>(LinearService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Action Tests (Fixture-based - GraphQL)
  // ===========================================
  describe('create_issue', () => {
    const fixture = createIssueFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(fixture.baseUrl)
          .post(testCase.mock.path, (body: any) => {
            // Validate GraphQL mutation
            expect(body.query).toContain('mutation IssueCreate');
            return true;
          })
          .matchHeader('authorization', 'lin_api_mock-token')
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await service.createIssue(
          'user-123',
          'workspace-456',
          testCase.input
        );

        expect(result).toMatchObject(testCase.expected.data);
      });
    });
  });

  describe('get_issues', () => {
    it('should fetch issues from Linear', async () => {
      nock('https://api.linear.app')
        .post('/graphql')
        .reply(200, {
          data: {
            issues: {
              nodes: [
                { id: 'issue-1', title: 'Issue 1' },
                { id: 'issue-2', title: 'Issue 2' },
              ],
            },
          },
        });

      const result = await service.getIssues('user-123', 'workspace-456');
      expect(result.issues.nodes).toHaveLength(2);
    });
  });
});
