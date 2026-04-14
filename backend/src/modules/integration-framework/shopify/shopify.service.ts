import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ShopifyOAuthService } from './shopify-oauth.service';
import axios from 'axios';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);

  constructor(
    private readonly db: DatabaseService,
    private oauthService: ShopifyOAuthService,
  ) {}

  async getConnection(userId: string, workspaceId: string) {
    const connection = await this.db.findOne('integration_connections', {
      workspace_id: workspaceId,
      user_id: userId,
      integration_id: 'shopify',
      is_active: true,
    });

    if (!connection) {
      throw new Error('Shopify not connected');
    }

    return connection;
  }

  private async makeRequest(
    method: string,
    endpoint: string,
    connection: any,
    shop: string,
    data?: any,
  ) {
    const response = await axios({
      method,
      url: `https://${shop}.myshopify.com/admin/api/2024-01${endpoint}`,
      headers: {
        'X-Shopify-Access-Token': connection.access_token,
        'Content-Type': 'application/json',
      },
      ...(data && { data }),
    });

    return response.data;
  }

  // ==================== PRODUCT ACTIONS ====================

  async getProducts(userId: string, workspaceId: string, shop: string, limit: number = 50) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/products.json?limit=${limit}`, connection, shop);
  }

  async getProduct(userId: string, workspaceId: string, shop: string, productId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/products/${productId}.json`, connection, shop);
  }

  async createProduct(userId: string, workspaceId: string, shop: string, productData: any) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('POST', '/products.json', connection, shop, { product: productData });
  }

  async updateProduct(
    userId: string,
    workspaceId: string,
    shop: string,
    productId: string,
    updates: any,
  ) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('PUT', `/products/${productId}.json`, connection, shop, {
      product: updates,
    });
  }

  // ==================== ORDER ACTIONS ====================

  async getOrders(userId: string, workspaceId: string, shop: string, limit: number = 50) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/orders.json?limit=${limit}`, connection, shop);
  }

  async getOrder(userId: string, workspaceId: string, shop: string, orderId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/orders/${orderId}.json`, connection, shop);
  }

  // ==================== CUSTOMER ACTIONS ====================

  async getCustomers(userId: string, workspaceId: string, shop: string, limit: number = 50) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/customers.json?limit=${limit}`, connection, shop);
  }

  async getCustomer(userId: string, workspaceId: string, shop: string, customerId: string) {
    const connection = await this.getConnection(userId, workspaceId);
    return this.makeRequest('GET', `/customers/${customerId}.json`, connection, shop);
  }
}
