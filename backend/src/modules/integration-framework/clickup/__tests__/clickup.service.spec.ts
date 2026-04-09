/**
 * ClickUp Service Action Tests (Integration Pattern)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { ClickUpService } from '../clickup.service';
import { ClickUpOAuthService } from '../clickup-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { TestFixture } from '../../../../../test/helpers/connector-test.helper';

// Import fixtures
import createTaskFixture from './fixtures/create_task.json';

describe('ClickUpService - Actions', () => {
  let service: ClickUpService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'clickup',
    access_token: 'mock-clickup-token',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    CLICKUP_CLIENT_ID: 'mock-clickup-client-id',
    CLICKUP_CLIENT_SECRET: 'mock-clickup-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClickUpService,
        ClickUpOAuthService,
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

    service = module.get<ClickUpService>(ClickUpService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Action Tests (Fixture-based)
  // ===========================================
  describe('create_task', () => {
    const fixture = createTaskFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(fixture.baseUrl)
          [testCase.mock.method.toLowerCase() as 'post'](testCase.mock.path)
          .matchHeader('authorization', 'mock-clickup-token')
          .reply(testCase.mock.status, testCase.mock.response);

        if (testCase.expected.success) {
          const result = await service.createTask(
            'user-123',
            'workspace-456',
            'list-123',
            testCase.input
          );
          expect(result).toMatchObject(testCase.expected.data);
        } else {
          await expect(
            service.createTask('user-123', 'workspace-456', 'list-123', testCase.input)
          ).rejects.toThrow();
        }
      });
    });
  });

  // ===========================================
  // Manual Tests
  // ===========================================
  describe('get_task', () => {
    it('should fetch task from ClickUp', async () => {
      nock('https://api.clickup.com')
        .get('/api/v2/task/task-123')
        .reply(200, {
          id: 'task-123',
          name: 'Task 1',
        });

      const result = await service.getTask('user-123', 'workspace-456', 'task-123');
      expect(result.id).toBe('task-123');
    });
  });
});
