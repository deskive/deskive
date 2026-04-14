/**
 * Trello Service Action Tests (Integration Pattern)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import nock from 'nock';
import { TrelloService } from '../trello.service';
import { TrelloOAuthService } from '../trello-oauth.service';
import { deskiveService } from '../../../deskive/deskive.service';
import { TestFixture } from '../../../../../test/helpers/connector-test.helper';

import createCardFixture from './fixtures/create_card.json';

describe('TrelloService - Actions', () => {
  let service: TrelloService;

  const mockConnection = {
    id: 'conn-123',
    workspace_id: 'workspace-456',
    user_id: 'user-123',
    integration_id: 'trello',
    access_token: 'mock-trello-token',
    api_key: 'mock-trello-api-key',
    is_active: true,
  };

  const mockConfig: Record<string, string> = {
    TRELLO_API_KEY: 'mock-trello-api-key',
    TRELLO_API_SECRET: 'mock-trello-api-secret',
    API_URL: 'http://localhost:3002',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrelloService,
        TrelloOAuthService,
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

    service = module.get<TrelloService>(TrelloService);
  });

  afterEach(() => {
    nock.cleanAll();
  });

  // ===========================================
  // Action Tests (Fixture-based)
  // ===========================================
  describe('create_card', () => {
    const fixture = createCardFixture as unknown as TestFixture;

    fixture.testCases.forEach((testCase) => {
      it(testCase.name, async () => {
        nock(fixture.baseUrl)
          [testCase.mock.method.toLowerCase() as 'post'](testCase.mock.path)
          .query({
            key: 'mock-trello-api-key',
            token: 'mock-trello-token',
            idList: 'list-123',
            name: testCase.input.name,
          })
          .reply(testCase.mock.status, testCase.mock.response);

        const result = await service.createCard(
          'user-123',
          'workspace-456',
          'list-123',
          testCase.input,
        );

        expect(result).toMatchObject(testCase.expected.data);
      });
    });
  });

  // ===========================================
  // Manual Tests
  // ===========================================
  describe('get_card', () => {
    it('should fetch card from Trello', async () => {
      nock('https://api.trello.com')
        .get('/1/cards/card-123')
        .query({
          key: 'mock-trello-api-key',
          token: 'mock-trello-token',
        })
        .reply(200, {
          id: 'card-123',
          name: 'Card 1',
        });

      const result = await service.getCard('user-123', 'workspace-456', 'card-123');
      expect(result.id).toBe('card-123');
    });
  });

  describe('create_board', () => {
    it('should create board in Trello', async () => {
      nock('https://api.trello.com')
        .post('/1/boards')
        .query({
          key: 'mock-trello-api-key',
          token: 'mock-trello-token',
          name: 'New Board',
        })
        .reply(200, {
          id: 'board-123',
          name: 'New Board',
        });

      const result = await service.createBoard('user-123', 'workspace-456', {
        name: 'New Board',
      });

      expect(result.id).toBe('board-123');
    });
  });
});
