/**
 * Telegram Service Tests
 *
 * Tests for the Telegram Bot service including connection management,
 * message sending, updates, webhooks, and chat operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import nock from 'nock';
import { TelegramService } from '../telegram.service';
import { deskiveService } from '../../deskive/deskive.service';
import { MOCK_CREDENTIALS } from '../../../../test/helpers/mock-credentials';
import { cleanupOAuthMocks } from '../../../../test/helpers/oauth-mock.helper';

describe('TelegramService', () => {
  let service: TelegramService;
  let deskiveService: jest.Mocked<deskiveService>;

  const mockUserId = 'user-123';
  const mockWorkspaceId = 'workspace-456';
  const mockBotToken = MOCK_CREDENTIALS.telegram.botToken;

  const mockBotInfo = {
    id: 123456789,
    is_bot: true,
    first_name: 'TestBot',
    username: 'test_bot',
    can_join_groups: true,
    can_read_all_group_messages: false,
    supports_inline_queries: false,
  };

  const mockConnection = {
    id: 'connection-123',
    workspace_id: mockWorkspaceId,
    user_id: mockUserId,
    bot_token: mockBotToken,
    bot_id: '123456789',
    bot_username: 'test_bot',
    bot_name: 'TestBot',
    is_active: true,
    last_synced_at: null,
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
        TelegramService,
        {
          provide: deskiveService,
          useValue: mockdeskiveService,
        },
      ],
    }).compile();

    service = module.get<TelegramService>(TelegramService);
    deskiveService = module.get(deskiveService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('saveConnection', () => {
      it('should save a new connection with valid bot token', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getMe`)
          .reply(200, { ok: true, result: mockBotInfo });

        deskiveService.findOne.mockResolvedValue(null);
        deskiveService.insert.mockResolvedValue(mockConnection);

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, mockBotToken);

        expect(result).toBeDefined();
        expect(result.botUsername).toBe('test_bot');
        expect(result.isActive).toBe(true);
        expect(deskiveService.insert).toHaveBeenCalledWith(
          'telegram_connections',
          expect.objectContaining({
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            bot_token: mockBotToken,
            bot_username: 'test_bot',
            is_active: true,
          }),
        );
      });

      it('should update existing connection', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getMe`)
          .reply(200, { ok: true, result: mockBotInfo });

        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection });

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, mockBotToken);

        expect(result).toBeDefined();
        expect(deskiveService.update).toHaveBeenCalled();
      });

      it('should throw BadRequestException for invalid bot token', async () => {
        nock('https://api.telegram.org')
          .post('/botinvalid-token/getMe')
          .reply(401, {
            ok: false,
            error_code: 401,
            description: 'Unauthorized',
          });

        await expect(
          service.saveConnection(mockUserId, mockWorkspaceId, 'invalid-token'),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getConnection', () => {
      it('should return connection when found', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeDefined();
        expect(result?.botUsername).toBe('test_bot');
        expect(deskiveService.findOne).toHaveBeenCalledWith('telegram_connections', {
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
      it('should disconnect user from Telegram', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection, is_active: false });

        await service.disconnect(mockUserId, mockWorkspaceId);

        expect(deskiveService.update).toHaveBeenCalledWith(
          'telegram_connections',
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

    describe('testBotToken', () => {
      it('should return success with bot info for valid token', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getMe`)
          .reply(200, { ok: true, result: mockBotInfo });

        const result = await service.testBotToken(mockBotToken);

        expect(result.success).toBe(true);
        expect(result.botInfo).toBeDefined();
        expect(result.botInfo?.username).toBe('test_bot');
        expect(result.message).toContain('valid');
      });

      it('should return failure for invalid token', async () => {
        nock('https://api.telegram.org')
          .post('/botinvalid/getMe')
          .reply(401, {
            ok: false,
            error_code: 401,
            description: 'Unauthorized',
          });

        const result = await service.testBotToken('invalid');

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      });
    });
  });

  describe('Bot Info Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('getMe', () => {
      it('should get bot information', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getMe`)
          .reply(200, { ok: true, result: mockBotInfo });

        const result = await service.getMe(mockUserId, mockWorkspaceId);

        expect(result.id).toBe(123456789);
        expect(result.username).toBe('test_bot');
        expect(result.firstName).toBe('TestBot');
        expect(result.isBot).toBe(true);
      });

      it('should throw NotFoundException when not connected', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        await expect(service.getMe(mockUserId, mockWorkspaceId)).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Message Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
      deskiveService.update.mockResolvedValue(mockConnection);
    });

    describe('sendMessage', () => {
      it('should send a text message', async () => {
        const mockResponse = {
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 987654321 },
            date: 1704067200,
            text: 'Hello World',
          },
        };

        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/sendMessage`)
          .reply(200, mockResponse);

        const result = await service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '987654321',
          text: 'Hello World',
        });

        expect(result.messageId).toBe(12345);
        expect(result.chatId).toBe(987654321);
        expect(result.text).toBe('Hello World');
      });

      it('should send message with Markdown parse mode', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/sendMessage`, (body) => body.parse_mode === 'Markdown')
          .reply(200, {
            ok: true,
            result: {
              message_id: 12346,
              chat: { id: 987654321 },
              date: 1704067200,
              text: '*Bold* _italic_',
            },
          });

        const result = await service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '987654321',
          text: '*Bold* _italic_',
          parseMode: 'Markdown',
        });

        expect(result.messageId).toBe(12346);
      });

      it('should send message with disabled notification', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/sendMessage`, (body) => body.disable_notification === true)
          .reply(200, {
            ok: true,
            result: {
              message_id: 12347,
              chat: { id: 987654321 },
              date: 1704067200,
              text: 'Silent message',
            },
          });

        const result = await service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '987654321',
          text: 'Silent message',
          disableNotification: true,
        });

        expect(result.messageId).toBe(12347);
      });

      it('should send message as reply', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/sendMessage`, (body) => body.reply_to_message_id === 12340)
          .reply(200, {
            ok: true,
            result: {
              message_id: 12348,
              chat: { id: 987654321 },
              date: 1704067200,
              text: 'Reply text',
            },
          });

        const result = await service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '987654321',
          text: 'Reply text',
          replyToMessageId: 12340,
        });

        expect(result.messageId).toBe(12348);
      });

      it('should throw BadRequestException on API error', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/sendMessage`)
          .reply(400, {
            ok: false,
            error_code: 400,
            description: 'Bad Request: chat not found',
          });

        await expect(
          service.sendMessage(mockUserId, mockWorkspaceId, {
            chatId: 'invalid',
            text: 'Hello',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Updates Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
      deskiveService.update.mockResolvedValue(mockConnection);
    });

    describe('getUpdates', () => {
      it('should get updates', async () => {
        const mockUpdates = {
          ok: true,
          result: [
            {
              update_id: 123456789,
              message: {
                message_id: 100,
                from: {
                  id: 111222333,
                  is_bot: false,
                  first_name: 'John',
                  username: 'johndoe',
                },
                chat: {
                  id: 111222333,
                  type: 'private',
                  first_name: 'John',
                  username: 'johndoe',
                },
                date: 1704067200,
                text: 'Hello bot',
              },
            },
            {
              update_id: 123456790,
              message: {
                message_id: 101,
                from: { id: 111222333, is_bot: false, first_name: 'John' },
                chat: { id: 111222333, type: 'private' },
                date: 1704067201,
                text: 'Another message',
              },
            },
          ],
        };

        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getUpdates`)
          .reply(200, mockUpdates);

        const result = await service.getUpdates(mockUserId, mockWorkspaceId, {});

        expect(result.updates).toHaveLength(2);
        expect(result.count).toBe(2);
        expect(result.updates[0].updateId).toBe(123456789);
        expect(result.nextOffset).toBe(123456791);
      });

      it('should get updates with offset', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getUpdates`, (body) => body.offset === 123456790)
          .reply(200, { ok: true, result: [] });

        const result = await service.getUpdates(mockUserId, mockWorkspaceId, {
          offset: 123456790,
        });

        expect(result.updates).toHaveLength(0);
      });

      it('should respect limit parameter', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getUpdates`, (body) => body.limit === 10)
          .reply(200, { ok: true, result: [] });

        await service.getUpdates(mockUserId, mockWorkspaceId, { limit: 10 });

        expect(nock.isDone()).toBe(true);
      });

      it('should cap limit at 100', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getUpdates`, (body) => body.limit === 100)
          .reply(200, { ok: true, result: [] });

        await service.getUpdates(mockUserId, mockWorkspaceId, { limit: 200 });

        expect(nock.isDone()).toBe(true);
      });
    });
  });

  describe('Chat Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('getChat', () => {
      it('should get private chat info', async () => {
        const mockChat = {
          ok: true,
          result: {
            id: 111222333,
            type: 'private',
            first_name: 'John',
            last_name: 'Doe',
            username: 'johndoe',
          },
        };

        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getChat`)
          .reply(200, mockChat);

        const result = await service.getChat(mockUserId, mockWorkspaceId, '111222333');

        expect(result.id).toBe(111222333);
        expect(result.type).toBe('private');
        expect(result.firstName).toBe('John');
        expect(result.lastName).toBe('Doe');
      });

      it('should get group chat info', async () => {
        const mockChat = {
          ok: true,
          result: {
            id: -100123456789,
            type: 'supergroup',
            title: 'Test Group',
            username: 'testgroup',
            description: 'A test group',
            invite_link: 'https://t.me/joinchat/xxx',
          },
        };

        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getChat`)
          .reply(200, mockChat);

        const result = await service.getChat(mockUserId, mockWorkspaceId, '-100123456789');

        expect(result.id).toBe(-100123456789);
        expect(result.type).toBe('supergroup');
        expect(result.title).toBe('Test Group');
        expect(result.description).toBe('A test group');
      });

      it('should throw BadRequestException for invalid chat', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getChat`)
          .reply(400, {
            ok: false,
            error_code: 400,
            description: 'Bad Request: chat not found',
          });

        await expect(
          service.getChat(mockUserId, mockWorkspaceId, 'invalid'),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Webhook Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('setWebhook', () => {
      it('should set webhook successfully', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/setWebhook`, (body) =>
            body.url === 'https://example.com/webhook'
          )
          .reply(200, { ok: true, result: true, description: 'Webhook was set' });

        const result = await service.setWebhook(mockUserId, mockWorkspaceId, {
          url: 'https://example.com/webhook',
        });

        expect(result.success).toBe(true);
      });

      it('should set webhook with secret token', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/setWebhook`, (body) => body.secret_token === 'mysecret')
          .reply(200, { ok: true, result: true });

        const result = await service.setWebhook(mockUserId, mockWorkspaceId, {
          url: 'https://example.com/webhook',
          secretToken: 'mysecret',
        });

        expect(result.success).toBe(true);
      });

      it('should set webhook with max connections', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/setWebhook`, (body) => body.max_connections === 50)
          .reply(200, { ok: true, result: true });

        const result = await service.setWebhook(mockUserId, mockWorkspaceId, {
          url: 'https://example.com/webhook',
          maxConnections: 50,
        });

        expect(result.success).toBe(true);
      });

      it('should throw BadRequestException on error', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/setWebhook`)
          .reply(400, {
            ok: false,
            error_code: 400,
            description: 'Bad Request: bad webhook: HTTPS url must be provided',
          });

        await expect(
          service.setWebhook(mockUserId, mockWorkspaceId, {
            url: 'http://example.com/webhook', // HTTP not allowed
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('deleteWebhook', () => {
      it('should delete webhook successfully', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/deleteWebhook`)
          .reply(200, { ok: true, result: true, description: 'Webhook was deleted' });

        const result = await service.deleteWebhook(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(true);
      });

      it('should delete webhook and drop pending updates', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/deleteWebhook`, (body) => body.drop_pending_updates === true)
          .reply(200, { ok: true, result: true });

        const result = await service.deleteWebhook(mockUserId, mockWorkspaceId, true);

        expect(result.success).toBe(true);
      });
    });

    describe('getWebhookInfo', () => {
      it('should get webhook info', async () => {
        const mockWebhookInfo = {
          ok: true,
          result: {
            url: 'https://example.com/webhook',
            has_custom_certificate: false,
            pending_update_count: 5,
            ip_address: '1.2.3.4',
            max_connections: 40,
            allowed_updates: ['message', 'callback_query'],
          },
        };

        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getWebhookInfo`)
          .reply(200, mockWebhookInfo);

        const result = await service.getWebhookInfo(mockUserId, mockWorkspaceId);

        expect(result.url).toBe('https://example.com/webhook');
        expect(result.pendingUpdateCount).toBe(5);
        expect(result.hasCustomCertificate).toBe(false);
        expect(result.maxConnections).toBe(40);
      });

      it('should handle empty webhook', async () => {
        nock('https://api.telegram.org')
          .post(`/bot${mockBotToken}/getWebhookInfo`)
          .reply(200, {
            ok: true,
            result: {
              url: '',
              has_custom_certificate: false,
              pending_update_count: 0,
            },
          });

        const result = await service.getWebhookInfo(mockUserId, mockWorkspaceId);

        expect(result.url).toBe('');
        expect(result.pendingUpdateCount).toBe(0);
      });
    });
  });

  describe('Last Synced Timestamp', () => {
    it('should update last_synced_at when sending messages', async () => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
      deskiveService.update.mockResolvedValue(mockConnection);

      nock('https://api.telegram.org')
        .post(`/bot${mockBotToken}/sendMessage`)
        .reply(200, {
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 987654321 },
            date: 1704067200,
            text: 'Hello',
          },
        });

      await service.sendMessage(mockUserId, mockWorkspaceId, {
        chatId: '987654321',
        text: 'Hello',
      });

      expect(deskiveService.update).toHaveBeenCalledWith(
        'telegram_connections',
        mockConnection.id,
        expect.objectContaining({
          last_synced_at: expect.any(String),
        }),
      );
    });

    it('should update last_synced_at when getting updates', async () => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
      deskiveService.update.mockResolvedValue(mockConnection);

      nock('https://api.telegram.org')
        .post(`/bot${mockBotToken}/getUpdates`)
        .reply(200, { ok: true, result: [] });

      await service.getUpdates(mockUserId, mockWorkspaceId, {});

      expect(deskiveService.update).toHaveBeenCalledWith(
        'telegram_connections',
        mockConnection.id,
        expect.objectContaining({
          last_synced_at: expect.any(String),
        }),
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    it('should handle network errors', async () => {
      nock('https://api.telegram.org')
        .post(`/bot${mockBotToken}/getMe`)
        .replyWithError('Network error');

      await expect(service.getMe(mockUserId, mockWorkspaceId)).rejects.toThrow();
    });

    it('should handle Telegram API error response', async () => {
      nock('https://api.telegram.org')
        .post(`/bot${mockBotToken}/sendMessage`)
        .reply(403, {
          ok: false,
          error_code: 403,
          description: 'Forbidden: bot was blocked by the user',
        });

      await expect(
        service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '123',
          text: 'Hello',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when not connected', async () => {
      deskiveService.findOne.mockResolvedValue(null);

      await expect(
        service.sendMessage(mockUserId, mockWorkspaceId, {
          chatId: '123',
          text: 'Hello',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
