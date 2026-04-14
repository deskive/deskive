/**
 * Asana Service Action Tests (Integration Pattern)
 * Tests actual Asana API actions using fixtures and ConnectorTestHelper
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { AsanaService } from '../asana.service';
import { AsanaOAuthService } from '../asana-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import {
  ConnectorTestHelper,
  TestFixture,
} from '../../../../../test/helpers/connector-test.helper';

// Import fixtures
import createTaskFixture from './fixtures/create_task.json';
import getTasksFixture from './fixtures/get_tasks.json';

describe('AsanaService - Actions', () => {
  let service: AsanaService;
  let deskiveService: deskiveService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'asana',
    access_token: 'mock-asana-token',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    ASANA_CLIENT_ID: 'mock-asana-client-id',
    ASANA_CLIENT_SECRET: 'mock-asana-client-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsanaService,
        AsanaOAuthService,
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
            insert: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AsanaService>(AsanaService);
    deskiveService = module.get<deskiveService>(deskiveService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Connection Tests
  // ===========================================
  describe('testConnection', () => {
    it('should return success when Asana is connected', async () => {
      nock('https://app.asana.com')
        .get('/api/1.0/users/me')
        .matchHeader('authorization', 'Bearer mock-asana-token')
        .reply(200, {
          data: { gid: 'user-123', email: 'test@test.com' },
        });

      const connection = await service.getConnection('user-123', 'workspace-456');

      expect(connection).toBeDefined();
      expect(connection.access_token).toBe('mock-asana-token');
    });

    it('should throw error when not connected', async () => {
      jest.spyOn(deskiveService, 'findOne').mockResolvedValue(null);

      await expect(service.getConnection('user-123', 'workspace-456')).rejects.toThrow(
        'Asana not connected',
      );
    });
  });

  // ===========================================
  // Action Tests (Fixture-based)
  // ===========================================
  describe('create_task', () => {
    const fixture = createTaskFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup nock from fixture
        nock(fixture.baseUrl)
          [testCase.mock.method.toLowerCase() as 'post'](testCase.mock.path)
          .matchHeader('authorization', 'Bearer mock-asana-token')
          .reply(testCase.mock.status, testCase.mock.response);

        if (testCase.expected.success) {
          // Success case: expect normal response
          const result = await service.createTask('user-123', 'workspace-456', testCase.input);
          expect(result).toMatchObject(testCase.expected.data);
        } else {
          // Error case: expect service to throw
          await expect(
            service.createTask('user-123', 'workspace-456', testCase.input),
          ).rejects.toThrow();
        }
      });
    });
  });

  describe('get_tasks', () => {
    const fixture = getTasksFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        // Setup nock from fixture
        const method = testCase.mock.method.toLowerCase() as 'get';
        nock(fixture.baseUrl)
          [method](testCase.mock.path)
          .query(true) // Match any query params
          .matchHeader('authorization', 'Bearer mock-asana-token')
          .reply(testCase.mock.status, testCase.mock.response);

        // Execute action
        const result = await service.getTasks('user-123', 'workspace-456', testCase.input);

        // Assert
        expect(result).toHaveLength(testCase.expected.data.length);
        expect(result[0]).toMatchObject(testCase.expected.data[0]);
      });
    });
  });

  // ===========================================
  // Manual Tests (Non-fixture)
  // ===========================================
  describe('update_task', () => {
    it('should update task in Asana', async () => {
      nock('https://app.asana.com')
        .put('/api/1.0/tasks/task-123')
        .matchHeader('authorization', 'Bearer mock-asana-token')
        .reply(200, {
          data: {
            gid: 'task-123',
            name: 'Updated Task',
          },
        });

      const result = await service.updateTask('user-123', 'workspace-456', 'task-123', {
        name: 'Updated Task',
      });

      expect(result.name).toBe('Updated Task');
    });
  });

  describe('delete_task', () => {
    it('should delete task from Asana', async () => {
      nock('https://app.asana.com')
        .delete('/api/1.0/tasks/task-123')
        .matchHeader('authorization', 'Bearer mock-asana-token')
        .reply(200, { data: {} });

      const result = await service.deleteTask('user-123', 'workspace-456', 'task-123');

      expect(result).toBeDefined();
    });
  });

  // ===========================================
  // Error Handling Tests
  // ===========================================
  describe('error handling', () => {
    it('should handle API errors', async () => {
      nock('https://app.asana.com')
        .post('/api/1.0/tasks')
        .reply(400, {
          errors: [
            {
              message: 'Invalid project',
            },
          ],
        });

      await expect(
        service.createTask('user-123', 'workspace-456', { name: 'Task' }),
      ).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      nock('https://app.asana.com').post('/api/1.0/tasks').replyWithError('Network error');

      await expect(
        service.createTask('user-123', 'workspace-456', { name: 'Task' }),
      ).rejects.toThrow();
    });
  });
});
