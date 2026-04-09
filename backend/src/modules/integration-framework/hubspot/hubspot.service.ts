import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { HubSpotOAuthService } from './hubspot-oauth.service';
import axios from 'axios';

@Injectable()
export class HubSpotService {
  private readonly logger = new Logger(HubSpotService.name);
  private readonly HUBSPOT_API_BASE = 'https://api.hubapi.com';

  constructor(
    private readonly db: DatabaseService,
    private oauthService: HubSpotOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'hubspot',
      is_active: true,
    });

    if (!connection) {
      throw new Error('HubSpot not connected');
    }

    return connection;
  }

  private async makeRequest(method: string, endpoint: string, connection: any, data?: any) {
    const response = await axios({
      method,
      url: `${this.HUBSPOT_API_BASE}${endpoint}`,
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== CONTACT ACTIONS ====================

  async createContact(userId: string, workspaceId: string, contactData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/crm/v3/objects/contacts', connection, { properties: contactData });
  }

  async updateContact(userId: string, workspaceId: string, contactId: string, updates: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PATCH', `/crm/v3/objects/contacts/${contactId}`, connection, { properties: updates });
  }

  async getContact(userId: string, workspaceId: string, contactId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/contacts/${contactId}`, connection);
  }

  async getContacts(userId: string, workspaceId: string, limit: number = 100) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/contacts?limit=${limit}`, connection);
  }

  async deleteContact(userId: string, workspaceId: string, contactId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('DELETE', `/crm/v3/objects/contacts/${contactId}`, connection);
  }

  // ==================== COMPANY ACTIONS ====================

  async createCompany(userId: string, workspaceId: string, companyData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/crm/v3/objects/companies', connection, { properties: companyData });
  }

  async getCompany(userId: string, workspaceId: string, companyId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/companies/${companyId}`, connection);
  }

  async getCompanies(userId: string, workspaceId: string, limit: number = 100) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/companies?limit=${limit}`, connection);
  }

  // ==================== DEAL ACTIONS ====================

  async createDeal(userId: string, workspaceId: string, dealData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/crm/v3/objects/deals', connection, { properties: dealData });
  }

  async getDeal(userId: string, workspaceId: string, dealId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/deals/${dealId}`, connection);
  }

  async getDeals(userId: string, workspaceId: string, limit: number = 100) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/crm/v3/objects/deals?limit=${limit}`, connection);
  }

  // ==================== SEARCH ACTIONS ====================

  async searchContacts(userId: string, workspaceId: string, query: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/crm/v3/objects/contacts/search', connection, {
      query,
      limit: 100,
    });
  }
}
