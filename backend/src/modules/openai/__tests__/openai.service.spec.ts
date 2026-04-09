/**
 * OpenAI Service Tests
 *
 * Tests for the OpenAI service including connection management,
 * model listing, chat completions, embeddings, and text completions.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import nock from 'nock';
import { OpenAIService } from '../openai.service';
import { deskiveService } from '../../deskive/deskive.service';
import { MOCK_CREDENTIALS } from '../../../../test/helpers/mock-credentials';
import { cleanupOAuthMocks } from '../../../../test/helpers/oauth-mock.helper';

describe('OpenAIService', () => {
  let service: OpenAIService;
  let deskiveService: jest.Mocked<deskiveService>;

  const mockUserId = 'user-123';
  const mockWorkspaceId = 'workspace-456';
  const mockApiKey = MOCK_CREDENTIALS.openai.apiKey;

  const mockConnection = {
    id: 'connection-123',
    workspace_id: mockWorkspaceId,
    user_id: mockUserId,
    api_key: mockApiKey,
    organization_id: null,
    is_validated: true,
    is_active: true,
    last_used_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockdeskiveService = {
      findOne: jest.fn(),
      findMany: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIService,
        {
          provide: deskiveService,
          useValue: mockdeskiveService,
        },
      ],
    }).compile();

    service = module.get<OpenAIService>(OpenAIService);
    deskiveService = module.get(deskiveService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('saveConnection', () => {
      it('should save a new connection with valid API key', async () => {
        // Mock API key validation
        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(200, { data: [{ id: 'gpt-4' }] });

        deskiveService.findOne.mockResolvedValue(null);
        deskiveService.insert.mockResolvedValue(mockConnection);

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, {
          apiKey: mockApiKey,
        });

        expect(result).toBeDefined();
        expect(result.isActive).toBe(true);
        expect(deskiveService.insert).toHaveBeenCalledWith(
          'openai_connections',
          expect.objectContaining({
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            api_key: mockApiKey,
            is_active: true,
          }),
        );
      });

      it('should update existing connection', async () => {
        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(200, { data: [{ id: 'gpt-4' }] });

        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection });

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, {
          apiKey: mockApiKey,
        });

        expect(result).toBeDefined();
        expect(deskiveService.update).toHaveBeenCalled();
      });

      it('should throw BadRequestException for invalid API key', async () => {
        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(401, { error: { message: 'Invalid API key' } });

        await expect(
          service.saveConnection(mockUserId, mockWorkspaceId, {
            apiKey: 'invalid-key',
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should save connection with organization ID', async () => {
        nock('https://api.openai.com')
          .get('/v1/models')
          .matchHeader('OpenAI-Organization', 'org-123')
          .reply(200, { data: [{ id: 'gpt-4' }] });

        deskiveService.findOne.mockResolvedValue(null);
        deskiveService.insert.mockResolvedValue({
          ...mockConnection,
          organization_id: 'org-123',
        });

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, {
          apiKey: mockApiKey,
          organizationId: 'org-123',
        });

        expect(result).toBeDefined();
        expect(result.organizationId).toBe('org-123');
      });
    });

    describe('getConnection', () => {
      it('should return connection when found', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeDefined();
        expect(result?.workspaceId).toBe(mockWorkspaceId);
        expect(deskiveService.findOne).toHaveBeenCalledWith('openai_connections', {
          workspace_id: mockWorkspaceId,
          user_id: mockUserId,
          is_active: true,
        });
      });

      it('should return null when connection not found', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeNull();
      });
    });

    describe('disconnect', () => {
      it('should disconnect user from OpenAI', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection, is_active: false });

        await service.disconnect(mockUserId, mockWorkspaceId);

        expect(deskiveService.update).toHaveBeenCalledWith(
          'openai_connections',
          mockConnection.id,
          expect.objectContaining({
            is_active: false,
          }),
        );
      });

      it('should throw NotFoundException when connection not found', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        await expect(service.disconnect(mockUserId, mockWorkspaceId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });

    describe('testConnection', () => {
      it('should return success when API key is valid', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(200, { data: [{ id: 'gpt-4' }] });

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(true);
        expect(result.message).toContain('valid');
      });

      it('should return failure when API key is invalid', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(401, { error: { message: 'Invalid API key' } });

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });

      it('should return failure when not connected', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(false);
        expect(result.error).toContain('not connected');
      });
    });
  });

  describe('Model Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('listModels', () => {
      it('should list available models', async () => {
        const mockModels = {
          data: [
            { id: 'gpt-4', object: 'model', created: 1687882411, owned_by: 'openai' },
            { id: 'gpt-3.5-turbo', object: 'model', created: 1677610602, owned_by: 'openai' },
          ],
        };

        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(200, mockModels);

        const result = await service.listModels(mockUserId, mockWorkspaceId);

        expect(result).toHaveLength(2);
        expect(result[0].id).toBe('gpt-4');
        expect(result[0].ownedBy).toBe('openai');
      });

      it('should throw NotFoundException when not connected', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
          NotFoundException,
        );
      });

      it('should throw BadRequestException on API error', async () => {
        nock('https://api.openai.com')
          .get('/v1/models')
          .reply(500, { error: { message: 'Server error' } });

        await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
          BadRequestException,
        );
      });
    });
  });

  describe('Chat Completions', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('chatCompletion', () => {
      it('should create chat completion successfully', async () => {
        const mockResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello! How can I help you today?',
              },
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 9,
            completion_tokens: 12,
            total_tokens: 21,
          },
        };

        nock('https://api.openai.com')
          .post('/v1/chat/completions')
          .reply(200, mockResponse);

        const result = await service.chatCompletion(mockUserId, mockWorkspaceId, {
          messages: [{ role: 'user', content: 'Hello' }],
          model: 'gpt-4',
        });

        expect(result.id).toBe('chatcmpl-123');
        expect(result.choices).toHaveLength(1);
        expect(result.choices[0].message.content).toBe('Hello! How can I help you today?');
        expect(result.usage.totalTokens).toBe(21);
      });

      it('should use default model when not specified', async () => {
        const mockResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hi!' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        };

        nock('https://api.openai.com')
          .post('/v1/chat/completions', (body) => body.model === 'gpt-3.5-turbo')
          .reply(200, mockResponse);

        const result = await service.chatCompletion(mockUserId, mockWorkspaceId, {
          messages: [{ role: 'user', content: 'Hi' }],
        });

        expect(result.model).toBe('gpt-3.5-turbo');
      });

      it('should pass temperature and max tokens parameters', async () => {
        const mockResponse = {
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: 1677652288,
          model: 'gpt-4',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        };

        nock('https://api.openai.com')
          .post('/v1/chat/completions', (body) =>
            body.temperature === 0.7 && body.max_tokens === 100
          )
          .reply(200, mockResponse);

        await service.chatCompletion(mockUserId, mockWorkspaceId, {
          messages: [{ role: 'user', content: 'Test' }],
          temperature: 0.7,
          maxTokens: 100,
        });

        expect(nock.isDone()).toBe(true);
      });

      it('should handle rate limit errors', async () => {
        nock('https://api.openai.com')
          .post('/v1/chat/completions')
          .reply(429, { error: { message: 'Rate limit exceeded' } });

        await expect(
          service.chatCompletion(mockUserId, mockWorkspaceId, {
            messages: [{ role: 'user', content: 'Hello' }],
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Embeddings', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('createEmbedding', () => {
      it('should create embeddings successfully', async () => {
        const mockEmbedding = {
          object: 'list',
          data: [
            {
              object: 'embedding',
              index: 0,
              embedding: [0.0023064255, -0.009327292, 0.015797347],
            },
          ],
          model: 'text-embedding-ada-002',
          usage: {
            prompt_tokens: 8,
            total_tokens: 8,
          },
        };

        nock('https://api.openai.com')
          .post('/v1/embeddings')
          .reply(200, mockEmbedding);

        const result = await service.createEmbedding(mockUserId, mockWorkspaceId, {
          input: 'Hello world',
        });

        expect(result.data).toHaveLength(1);
        expect(result.data[0].embedding).toHaveLength(3);
        expect(result.usage.totalTokens).toBe(8);
      });

      it('should handle array input', async () => {
        const mockEmbedding = {
          object: 'list',
          data: [
            { object: 'embedding', index: 0, embedding: [0.1, 0.2] },
            { object: 'embedding', index: 1, embedding: [0.3, 0.4] },
          ],
          model: 'text-embedding-ada-002',
          usage: { prompt_tokens: 10, total_tokens: 10 },
        };

        nock('https://api.openai.com')
          .post('/v1/embeddings', (body) => Array.isArray(body.input) && body.input.length === 2)
          .reply(200, mockEmbedding);

        const result = await service.createEmbedding(mockUserId, mockWorkspaceId, {
          input: ['Hello', 'World'],
        });

        expect(result.data).toHaveLength(2);
      });
    });
  });

  describe('Text Completions (Legacy)', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('textCompletion', () => {
      it('should create text completion successfully', async () => {
        const mockResponse = {
          id: 'cmpl-123',
          object: 'text_completion',
          created: 1677652288,
          model: 'gpt-3.5-turbo-instruct',
          choices: [
            {
              text: 'This is a test completion.',
              index: 0,
              logprobs: null,
              finish_reason: 'stop',
            },
          ],
          usage: {
            prompt_tokens: 5,
            completion_tokens: 6,
            total_tokens: 11,
          },
        };

        nock('https://api.openai.com')
          .post('/v1/completions')
          .reply(200, mockResponse);

        const result = await service.textCompletion(mockUserId, mockWorkspaceId, {
          prompt: 'Hello, this is',
        });

        expect(result.id).toBe('cmpl-123');
        expect(result.choices).toHaveLength(1);
        expect(result.choices[0].text).toBe('This is a test completion.');
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    it('should handle 401 unauthorized error', async () => {
      nock('https://api.openai.com')
        .get('/v1/models')
        .reply(401, { error: { message: 'Invalid API key' } });

      await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle 429 rate limit error', async () => {
      nock('https://api.openai.com')
        .get('/v1/models')
        .reply(429, { error: { message: 'Rate limit exceeded' } });

      await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle 500 server error', async () => {
      nock('https://api.openai.com')
        .get('/v1/models')
        .reply(500, { error: { message: 'Internal server error' } });

      await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle network errors', async () => {
      nock('https://api.openai.com')
        .get('/v1/models')
        .replyWithError('Network error');

      await expect(service.listModels(mockUserId, mockWorkspaceId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Last Used Timestamp', () => {
    it('should update last_used_at when making API calls', async () => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
      deskiveService.update.mockResolvedValue(mockConnection);

      nock('https://api.openai.com')
        .get('/v1/models')
        .reply(200, { data: [{ id: 'gpt-4' }] });

      await service.listModels(mockUserId, mockWorkspaceId);

      expect(deskiveService.update).toHaveBeenCalledWith(
        'openai_connections',
        mockConnection.id,
        expect.objectContaining({
          last_used_at: expect.any(String),
        }),
      );
    });
  });
});
