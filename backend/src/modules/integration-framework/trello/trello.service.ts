import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { TrelloOAuthService } from './trello-oauth.service';
import axios from 'axios';

@Injectable()
export class TrelloService {
  private readonly logger = new Logger(TrelloService.name);
  private readonly TRELLO_API_BASE = 'https://api.trello.com/1';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: TrelloOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'trello',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Trello not connected');
    }

    return connection;
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    connection: any,
    params?: any,
    data?: any,
  ) {
    const queryParams = new URLSearchParams({
      key: connection.api_key || '',
      token: connection.access_token || '',
      ...params,
    });

    const response = await axios({
      method,
      url: `${this.TRELLO_API_BASE}${endpoint}?${queryParams.toString()}`,
      headers: {
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== CARD ACTIONS ====================

  async createCard(userId: string, workspaceId: string, listId: string, cardData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/cards', connection, { idList: listId, ...cardData });
  }

  async updateCard(userId: string, workspaceId: string, cardId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PUT', `/cards/${cardId}`, connection, updates);
  }

  async getCard(userId: string, workspaceId: string, cardId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/cards/${cardId}`, connection);
  }

  async getCards(userId: string, workspaceId: string, listId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/lists/${listId}/cards`, connection);
  }

  async deleteCard(userId: string, workspaceId: string, cardId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('DELETE', `/cards/${cardId}`, connection);
  }

  // ==================== BOARD ACTIONS ====================

  async createBoard(userId: string, workspaceId: string, boardData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/boards', connection, boardData);
  }

  async getBoard(userId: string, workspaceId: string, boardId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/boards/${boardId}`, connection);
  }

  async getBoards(userId: string, workspaceId: string, memberId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/members/${memberId}/boards`, connection);
  }

  // ==================== LIST ACTIONS ====================

  async createList(userId: string, workspaceId: string, boardId: string, name: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/lists', connection, { idBoard: boardId, name });
  }

  async getLists(userId: string, workspaceId: string, boardId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/boards/${boardId}/lists`, connection);
  }

  // ==================== COMMENT ACTIONS ====================

  async addComment(userId: string, workspaceId: string, cardId: string, text: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', `/cards/${cardId}/actions/comments`, connection, { text });
  }

  async getComments(userId: string, workspaceId: string, cardId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/cards/${cardId}/actions`, connection, {
      filter: 'commentCard',
    });
  }

  // ==================== USER ACTIONS ====================

  async getCurrentUser(userId: string, workspaceId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', '/members/me', connection);
  }
}
