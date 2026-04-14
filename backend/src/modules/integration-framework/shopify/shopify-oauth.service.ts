import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface ShopifyOAuthTokens {
  accessToken: string;
  scope: string;
}

export interface ShopifyShopInfo {
  id: number;
  name: string;
  email: string;
  domain: string;
  currency: string;
  timezone: string;
}

@Injectable()
export class ShopifyOAuthService {
  private readonly logger = new Logger(ShopifyOAuthService.name);

  constructor(private configService: ConfigService) {}

  private getClientCredentials(shop: string) {
    const clientId = this.configService.get<string>('SHOPIFY_API_KEY');
    const clientSecret = this.configService.get<string>('SHOPIFY_API_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Shopify OAuth credentials not configured');
    }

    const apiUrl = this.configService.get<string>('API_URL') || 'http://localhost:3002';
    const redirectUri = `${apiUrl}/api/v1/integrations/oauth/callback`;

    return { clientId, clientSecret, redirectUri, shop };
  }

  isConfigured(): boolean {
    try {
      const clientId = this.configService.get<string>('SHOPIFY_API_KEY');
      const clientSecret = this.configService.get<string>('SHOPIFY_API_SECRET');
      return !!(clientId && clientSecret);
    } catch {
      return false;
    }
  }

  generateState(userId: string, workspaceId: string, shop: string, returnUrl?: string): string {
    const stateData = {
      service: 'shopify',
      userId,
      workspaceId,
      shop,
      returnUrl: returnUrl || '',
      timestamp: Date.now(),
      nonce: Math.random().toString(36).substring(2, 15),
    };

    return Buffer.from(JSON.stringify(stateData)).toString('base64url');
  }

  decodeState(state: string): {
    userId: string;
    workspaceId: string;
    shop: string;
    returnUrl?: string;
  } {
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8');
      const stateData = JSON.parse(decoded);

      const maxAge = 10 * 60 * 1000;
      if (Date.now() - stateData.timestamp > maxAge) {
        throw new Error('State expired');
      }

      return stateData;
    } catch (error) {
      this.logger.error('Failed to decode state:', error);
      throw new UnauthorizedException('Invalid state parameter');
    }
  }

  getAuthorizationUrl(
    userId: string,
    workspaceId: string,
    shop: string,
    returnUrl?: string,
  ): { authorizationUrl: string; state: string } {
    const { clientId, redirectUri } = this.getClientCredentials(shop);
    const state = this.generateState(userId, workspaceId, shop, returnUrl);

    const params = new URLSearchParams({
      client_id: clientId,
      scope: 'read_products,write_products,read_orders,write_orders',
      redirect_uri: redirectUri,
      state,
    });

    const authorizationUrl = `https://${shop}.myshopify.com/admin/oauth/authorize?${params.toString()}`;

    return { authorizationUrl, state };
  }

  async exchangeCodeForTokens(code: string, shop: string): Promise<ShopifyOAuthTokens> {
    const { clientId, clientSecret } = this.getClientCredentials(shop);

    try {
      const response = await axios.post(
        `https://${shop}.myshopify.com/admin/oauth/access_token`,
        {
          client_id: clientId,
          client_secret: clientSecret,
          code,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data;

      return {
        accessToken: data.access_token,
        scope: data.scope,
      };
    } catch (error) {
      this.logger.error('Failed to exchange code:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to exchange authorization code');
    }
  }

  async getShopInfo(accessToken: string, shop: string): Promise<ShopifyShopInfo> {
    try {
      const response = await axios.get(
        `https://${shop}.myshopify.com/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
          },
        },
      );

      const shopData = response.data.shop;

      return {
        id: shopData.id,
        name: shopData.name,
        email: shopData.email,
        domain: shopData.domain,
        currency: shopData.currency,
        timezone: shopData.timezone,
      };
    } catch (error) {
      this.logger.error('Failed to get shop info:', error.response?.data || error.message);
      throw new UnauthorizedException('Failed to get shop info from Shopify');
    }
  }
}
