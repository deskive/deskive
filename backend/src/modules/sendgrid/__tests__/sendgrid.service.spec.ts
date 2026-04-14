/**
 * SendGrid Service Tests
 *
 * Tests for the SendGrid service including connection management,
 * email sending, templates, statistics, and bulk email operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import nock from 'nock';
import { SendGridService } from '../sendgrid.service';
import { deskiveService } from '../../deskive/deskive.service';
import { MOCK_CREDENTIALS } from '../../../../test/helpers/mock-credentials';
import { cleanupOAuthMocks } from '../../../../test/helpers/oauth-mock.helper';

describe('SendGridService', () => {
  let service: SendGridService;
  let deskiveService: jest.Mocked<deskiveService>;

  const mockUserId = 'user-123';
  const mockWorkspaceId = 'workspace-456';
  const mockApiKey = MOCK_CREDENTIALS.sendgrid.apiKey;

  const mockConnection = {
    id: 'connection-123',
    workspace_id: mockWorkspaceId,
    user_id: mockUserId,
    api_key: mockApiKey,
    sender_email: 'sender@example.com',
    sender_name: 'Test Sender',
    is_active: true,
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
        SendGridService,
        {
          provide: deskiveService,
          useValue: mockdeskiveService,
        },
      ],
    }).compile();

    service = module.get<SendGridService>(SendGridService);
    deskiveService = module.get(deskiveService);
  });

  afterEach(() => {
    cleanupOAuthMocks();
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    describe('saveConnection', () => {
      it('should save a new connection with valid API key', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(200, { scopes: ['mail.send', 'templates.read'] });

        deskiveService.findOne.mockResolvedValue(null);
        deskiveService.insert.mockResolvedValue(mockConnection);

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, {
          apiKey: mockApiKey,
          senderEmail: 'sender@example.com',
          senderName: 'Test Sender',
        });

        expect(result).toBeDefined();
        expect(result.isActive).toBe(true);
        expect(result.senderEmail).toBe('sender@example.com');
        expect(deskiveService.insert).toHaveBeenCalledWith(
          'sendgrid_connections',
          expect.objectContaining({
            workspace_id: mockWorkspaceId,
            user_id: mockUserId,
            api_key: mockApiKey,
            sender_email: 'sender@example.com',
            is_active: true,
          }),
        );
      });

      it('should update existing connection', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(200, { scopes: ['mail.send'] });

        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection });

        const result = await service.saveConnection(mockUserId, mockWorkspaceId, {
          apiKey: mockApiKey,
          senderEmail: 'sender@example.com',
        });

        expect(result).toBeDefined();
        expect(deskiveService.update).toHaveBeenCalled();
      });

      it('should throw BadRequestException for invalid API key', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(401, { errors: [{ message: 'Invalid API key' }] });

        await expect(
          service.saveConnection(mockUserId, mockWorkspaceId, {
            apiKey: 'invalid-key',
            senderEmail: 'sender@example.com',
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });

    describe('getConnection', () => {
      it('should return connection when found', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        const result = await service.getConnection(mockUserId, mockWorkspaceId);

        expect(result).toBeDefined();
        expect(result?.workspaceId).toBe(mockWorkspaceId);
        expect(result?.senderEmail).toBe('sender@example.com');
        expect(deskiveService.findOne).toHaveBeenCalledWith('sendgrid_connections', {
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
      it('should disconnect user from SendGrid', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);
        deskiveService.update.mockResolvedValue({ ...mockConnection, is_active: false });

        await service.disconnect(mockUserId, mockWorkspaceId);

        expect(deskiveService.update).toHaveBeenCalledWith(
          'sendgrid_connections',
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

        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(200, { scopes: ['mail.send'] });

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(true);
        expect(result.senderEmail).toBe('sender@example.com');
        expect(result.senderName).toBe('Test Sender');
      });

      it('should return failure when API key is invalid', async () => {
        deskiveService.findOne.mockResolvedValue(mockConnection);

        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(401, { errors: [{ message: 'Invalid API key' }] });

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(false);
        expect(result.message).toBeDefined();
      });

      it('should return failure when not connected', async () => {
        deskiveService.findOne.mockResolvedValue(null);

        const result = await service.testConnection(mockUserId, mockWorkspaceId);

        expect(result.success).toBe(false);
        expect(result.message).toContain('not connected');
      });
    });
  });

  describe('Email Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('sendEmail', () => {
      it('should send email successfully', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send')
          .reply(202, null, { 'x-message-id': 'msg-123' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com', name: 'Recipient' }],
          subject: 'Test Email',
          html: '<p>Hello World</p>',
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      it('should send email with text content', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send', (body) => body.content.some((c: any) => c.type === 'text/plain'))
          .reply(202, null, { 'x-message-id': 'msg-124' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Email',
          text: 'Hello World',
        });

        expect(result.success).toBe(true);
      });

      it('should send email with CC and BCC', async () => {
        nock('https://api.sendgrid.com')
          .post(
            '/v3/mail/send',
            (body) =>
              body.personalizations[0].cc?.length > 0 && body.personalizations[0].bcc?.length > 0,
          )
          .reply(202, null, { 'x-message-id': 'msg-125' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Email',
          html: '<p>Hello</p>',
          cc: [{ email: 'cc@example.com' }],
          bcc: [{ email: 'bcc@example.com' }],
        });

        expect(result.success).toBe(true);
      });

      it('should send email with template', async () => {
        nock('https://api.sendgrid.com')
          .post(
            '/v3/mail/send',
            (body) =>
              body.template_id === 'd-template123' &&
              body.personalizations[0].dynamic_template_data?.name === 'John',
          )
          .reply(202, null, { 'x-message-id': 'msg-126' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Email',
          templateId: 'd-template123',
          dynamicTemplateData: { name: 'John' },
        });

        expect(result.success).toBe(true);
      });

      it('should send email with attachments', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send', (body) => body.attachments?.length === 1)
          .reply(202, null, { 'x-message-id': 'msg-127' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Test Email',
          html: '<p>See attachment</p>',
          attachments: [
            {
              content: 'SGVsbG8gV29ybGQ=',
              filename: 'test.txt',
              type: 'text/plain',
            },
          ],
        });

        expect(result.success).toBe(true);
      });

      it('should handle scheduled send', async () => {
        const sendAt = new Date(Date.now() + 3600 * 1000).toISOString();

        nock('https://api.sendgrid.com')
          .post('/v3/mail/send', (body) => body.send_at !== undefined)
          .reply(202, null, { 'x-message-id': 'msg-128' });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'recipient@example.com' }],
          subject: 'Scheduled Email',
          html: '<p>Hello</p>',
          sendAt,
        });

        expect(result.success).toBe(true);
      });

      it('should throw error when no content provided', async () => {
        await expect(
          service.sendEmail(mockUserId, mockWorkspaceId, {
            to: [{ email: 'recipient@example.com' }],
            subject: 'Test Email',
            // No text, html, or templateId
          }),
        ).rejects.toThrow(BadRequestException);
      });

      it('should return failure on API error', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send')
          .reply(400, { errors: [{ message: 'Invalid email address' }] });

        const result = await service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'invalid-email' }],
          subject: 'Test Email',
          html: '<p>Hello</p>',
        });

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    });

    describe('sendBulkEmail', () => {
      it('should send bulk emails successfully', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send', (body) => body.personalizations.length === 3)
          .reply(202, null, { 'x-message-id': 'bulk-msg-123' });

        const result = await service.sendBulkEmail(mockUserId, mockWorkspaceId, {
          recipients: [
            { email: 'user1@example.com', templateData: { name: 'User 1' } },
            { email: 'user2@example.com', templateData: { name: 'User 2' } },
            { email: 'user3@example.com', templateData: { name: 'User 3' } },
          ],
          templateId: 'd-template123',
          globalData: { company: 'Test Company' },
        });

        expect(result.status).toBe('sent');
        expect(result.totalRecipients).toBe(3);
        expect(result.successCount).toBe(3);
        expect(result.failureCount).toBe(0);
      });

      it('should handle bulk email failure', async () => {
        nock('https://api.sendgrid.com')
          .post('/v3/mail/send')
          .reply(400, { errors: [{ message: 'Invalid template' }] });

        const result = await service.sendBulkEmail(mockUserId, mockWorkspaceId, {
          recipients: [{ email: 'user@example.com' }],
          templateId: 'invalid-template',
        });

        expect(result.status).toBe('failed');
        expect(result.failureCount).toBe(1);
      });
    });
  });

  describe('Template Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('listTemplates', () => {
      it('should list templates', async () => {
        const mockTemplates = {
          result: [
            {
              id: 'd-template1',
              name: 'Welcome Email',
              generation: 'dynamic',
              updated_at: '2024-01-01T00:00:00Z',
              versions: [{ id: 'v1', name: 'v1', active: 1 }],
            },
            {
              id: 'd-template2',
              name: 'Newsletter',
              generation: 'dynamic',
              updated_at: '2024-01-02T00:00:00Z',
              versions: [{ id: 'v1', name: 'v1', active: 1 }],
            },
          ],
          _metadata: { count: 2 },
        };

        nock('https://api.sendgrid.com').get('/v3/templates').query(true).reply(200, mockTemplates);

        const result = await service.listTemplates(mockUserId, mockWorkspaceId);

        expect(result.templates).toHaveLength(2);
        expect(result.templates[0].name).toBe('Welcome Email');
        expect(result.templates[0].generation).toBe('dynamic');
      });

      it('should handle pagination', async () => {
        const mockTemplates = {
          result: [{ id: 'd-template1', name: 'Template 1', generation: 'dynamic' }],
          _metadata: { count: 1 },
        };

        nock('https://api.sendgrid.com')
          .get('/v3/templates')
          .query({ generations: 'dynamic', page_size: '10', page_token: 'token123' })
          .reply(200, mockTemplates);

        const result = await service.listTemplates(mockUserId, mockWorkspaceId, {
          generations: 'dynamic',
          pageSize: 10,
          pageToken: 'token123',
        });

        expect(result.templates).toHaveLength(1);
      });
    });

    describe('getTemplate', () => {
      it('should get template by ID', async () => {
        const mockTemplate = {
          id: 'd-template1',
          name: 'Welcome Email',
          generation: 'dynamic',
          updated_at: '2024-01-01T00:00:00Z',
          versions: [{ id: 'v1', name: 'Version 1', subject: 'Welcome!', active: 1 }],
        };

        nock('https://api.sendgrid.com').get('/v3/templates/d-template1').reply(200, mockTemplate);

        const result = await service.getTemplate(mockUserId, mockWorkspaceId, 'd-template1');

        expect(result.id).toBe('d-template1');
        expect(result.name).toBe('Welcome Email');
        expect(result.activeVersionId).toBe('v1');
      });

      it('should throw NotFoundException for non-existent template', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/templates/invalid')
          .reply(404, { errors: [{ message: 'Template not found' }] });

        await expect(service.getTemplate(mockUserId, mockWorkspaceId, 'invalid')).rejects.toThrow(
          NotFoundException,
        );
      });
    });
  });

  describe('Statistics Operations', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    describe('getStats', () => {
      it('should get email statistics', async () => {
        const mockStats = [
          {
            date: '2024-01-01',
            stats: [
              {
                metrics: {
                  requests: 100,
                  delivered: 95,
                  opens: 50,
                  unique_opens: 40,
                  clicks: 20,
                  unique_clicks: 15,
                  bounces: 3,
                  blocks: 1,
                  spam_reports: 1,
                  unsubscribes: 0,
                },
              },
            ],
          },
          {
            date: '2024-01-02',
            stats: [
              {
                metrics: {
                  requests: 150,
                  delivered: 145,
                  opens: 75,
                  unique_opens: 60,
                  clicks: 30,
                  unique_clicks: 25,
                  bounces: 4,
                  blocks: 0,
                  spam_reports: 1,
                  unsubscribes: 2,
                },
              },
            ],
          },
        ];

        nock('https://api.sendgrid.com').get('/v3/stats').query(true).reply(200, mockStats);

        const result = await service.getStats(mockUserId, mockWorkspaceId, {
          startDate: '2024-01-01',
          endDate: '2024-01-02',
        });

        expect(result.stats).toHaveLength(2);
        expect(result.stats[0].requests).toBe(100);
        expect(result.stats[0].delivered).toBe(95);
        expect(result.stats[0].opens).toBe(50);
        expect(result.stats[0].bounces).toBe(3);
      });

      it('should handle aggregation by week', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/stats')
          .query({ start_date: '2024-01-01', aggregated_by: 'week' })
          .reply(200, []);

        const result = await service.getStats(mockUserId, mockWorkspaceId, {
          startDate: '2024-01-01',
          aggregatedBy: 'week',
        });

        expect(result.stats).toHaveLength(0);
      });
    });
  });

  describe('API Key Validation', () => {
    describe('validateApiKey', () => {
      it('should return valid for correct API key', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(200, { scopes: ['mail.send', 'templates.read'] });

        const result = await service.validateApiKey(mockApiKey);

        expect(result.valid).toBe(true);
        expect(result.scopes).toContain('mail.send');
      });

      it('should return invalid for incorrect API key', async () => {
        nock('https://api.sendgrid.com')
          .get('/v3/scopes')
          .reply(401, { errors: [{ message: 'Invalid API key' }] });

        const result = await service.validateApiKey('invalid-key');

        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      deskiveService.findOne.mockResolvedValue(mockConnection);
    });

    it('should handle 401 unauthorized error', async () => {
      nock('https://api.sendgrid.com')
        .get('/v3/templates')
        .query(true)
        .reply(401, { errors: [{ message: 'Invalid API key' }] });

      await expect(service.listTemplates(mockUserId, mockWorkspaceId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when not connected', async () => {
      deskiveService.findOne.mockResolvedValue(null);

      await expect(
        service.sendEmail(mockUserId, mockWorkspaceId, {
          to: [{ email: 'test@example.com' }],
          subject: 'Test',
          html: '<p>Test</p>',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
