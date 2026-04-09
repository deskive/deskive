/**
 * E-commerce Integrations
 */

const ecommerceIntegrations = [
  {
    slug: 'shopify',
    name: 'Shopify',
    description: 'Connect Shopify for e-commerce management.',
    category: 'ECOMMERCE',
    provider: 'Shopify',
    logoUrl: 'https://cdn.shopify.com/shopifycloud/brochure/assets/brand-assets/favicon-ab7a2f0dc2052453.svg',
    website: 'https://shopify.com',
    documentationUrl: 'https://shopify.dev/docs/api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{shop}.myshopify.com/admin/oauth/authorize',
      tokenUrl: 'https://{shop}.myshopify.com/admin/oauth/access_token',
      scopes: ['read_products', 'write_products', 'read_orders', 'read_customers'],
      clientIdEnvKey: 'SHOPIFY_CLIENT_ID',
      clientSecretEnvKey: 'SHOPIFY_CLIENT_SECRET',
      requiresSubdomain: true,
      subdomainField: 'shop'
    },
    apiBaseUrl: 'https://{shop}.myshopify.com/admin/api/2024-01',
    capabilities: ['read_products', 'manage_orders', 'read_customers', 'manage_inventory'],
    features: ['Product management', 'Order tracking', 'Customer data', 'Inventory sync'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'woocommerce',
    name: 'WooCommerce',
    description: 'Connect WooCommerce for WordPress e-commerce.',
    category: 'ECOMMERCE',
    provider: 'Automattic',
    logoUrl: 'https://woocommerce.com/favicon.ico',
    website: 'https://woocommerce.com',
    documentationUrl: 'https://woocommerce.github.io/woocommerce-rest-api-docs/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'WooCommerce API Keys',
      helpText: 'Generate keys in WooCommerce > Settings > Advanced > REST API',
      fields: [
        { name: 'siteUrl', label: 'Store URL', type: 'text' },
        { name: 'consumerKey', label: 'Consumer Key', type: 'text' },
        { name: 'consumerSecret', label: 'Consumer Secret', type: 'password' }
      ]
    },
    apiBaseUrl: '{siteUrl}/wp-json/wc/v3',
    capabilities: ['read_products', 'manage_orders', 'read_customers', 'manage_inventory'],
    features: ['Product sync', 'Order management', 'Customer data', 'Inventory tracking'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'bigcommerce',
    name: 'BigCommerce',
    description: 'Connect BigCommerce for enterprise e-commerce.',
    category: 'ECOMMERCE',
    provider: 'BigCommerce',
    logoUrl: 'https://www.bigcommerce.com/favicon.ico',
    website: 'https://bigcommerce.com',
    documentationUrl: 'https://developer.bigcommerce.com/docs/rest-management',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.bigcommerce.com/oauth2/authorize',
      tokenUrl: 'https://login.bigcommerce.com/oauth2/token',
      scopes: ['store_v2_products', 'store_v2_orders', 'store_v2_customers'],
      clientIdEnvKey: 'BIGCOMMERCE_CLIENT_ID',
      clientSecretEnvKey: 'BIGCOMMERCE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.bigcommerce.com/stores/{store_hash}/v3',
    capabilities: ['read_products', 'manage_orders', 'read_customers', 'manage_catalog'],
    features: ['Catalog management', 'Order processing', 'Multi-channel selling', 'SEO tools'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'magento',
    name: 'Magento',
    description: 'Connect Magento for Adobe Commerce.',
    category: 'ECOMMERCE',
    provider: 'Adobe',
    logoUrl: 'https://magento.com/favicon.ico',
    website: 'https://magento.com',
    documentationUrl: 'https://developer.adobe.com/commerce/webapi/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: '{instance}/oauth/authorize',
      tokenUrl: '{instance}/oauth/token',
      scopes: [],
      clientIdEnvKey: 'MAGENTO_CLIENT_ID',
      clientSecretEnvKey: 'MAGENTO_CLIENT_SECRET',
      requiresInstanceUrl: true
    },
    apiBaseUrl: '{instance}/rest/V1',
    capabilities: ['read_products', 'manage_orders', 'read_customers', 'manage_inventory'],
    features: ['Product catalog', 'Order management', 'Customer segments', 'B2B features'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'squarespace',
    name: 'Squarespace',
    description: 'Connect Squarespace for website commerce.',
    category: 'ECOMMERCE',
    provider: 'Squarespace',
    logoUrl: 'https://www.squarespace.com/favicon.ico',
    website: 'https://squarespace.com',
    documentationUrl: 'https://developers.squarespace.com/commerce-apis',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.squarespace.com/api/1/login/oauth/provider/authorize',
      tokenUrl: 'https://login.squarespace.com/api/1/login/oauth/provider/tokens',
      scopes: ['website.orders', 'website.orders.read', 'website.products', 'website.inventory'],
      clientIdEnvKey: 'SQUARESPACE_CLIENT_ID',
      clientSecretEnvKey: 'SQUARESPACE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.squarespace.com/1.0',
    capabilities: ['read_products', 'read_orders', 'manage_inventory', 'read_transactions'],
    features: ['Order sync', 'Product management', 'Inventory updates', 'Transaction history'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'wix',
    name: 'Wix',
    description: 'Connect Wix for e-commerce and websites.',
    category: 'ECOMMERCE',
    provider: 'Wix',
    logoUrl: 'https://www.wix.com/favicon.ico',
    website: 'https://wix.com',
    documentationUrl: 'https://dev.wix.com/docs/rest',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.wix.com/installer/install',
      tokenUrl: 'https://www.wixapis.com/oauth/access',
      scopes: ['WIX_STORES.READ_PRODUCTS', 'WIX_STORES.READ_ORDERS', 'WIX_STORES.MODIFY_INVENTORY'],
      clientIdEnvKey: 'WIX_CLIENT_ID',
      clientSecretEnvKey: 'WIX_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://www.wixapis.com',
    capabilities: ['read_products', 'read_orders', 'manage_inventory', 'read_contacts'],
    features: ['Store management', 'Order tracking', 'Inventory sync', 'Contact management'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'amazon-seller',
    name: 'Amazon Seller',
    description: 'Connect Amazon Seller Central for marketplace selling.',
    category: 'ECOMMERCE',
    provider: 'Amazon',
    logoUrl: 'https://www.amazon.com/favicon.ico',
    website: 'https://sellercentral.amazon.com',
    documentationUrl: 'https://developer-docs.amazon.com/sp-api/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://sellercentral.amazon.com/apps/authorize/consent',
      tokenUrl: 'https://api.amazon.com/auth/o2/token',
      scopes: [],
      clientIdEnvKey: 'AMAZON_SELLER_CLIENT_ID',
      clientSecretEnvKey: 'AMAZON_SELLER_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://sellingpartnerapi-na.amazon.com',
    capabilities: ['read_orders', 'manage_inventory', 'read_reports', 'manage_listings'],
    features: ['Order management', 'Inventory sync', 'Sales reports', 'Listing management'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'etsy',
    name: 'Etsy',
    description: 'Connect Etsy for handmade marketplace.',
    category: 'ECOMMERCE',
    provider: 'Etsy',
    logoUrl: 'https://www.etsy.com/favicon.ico',
    website: 'https://etsy.com',
    documentationUrl: 'https://developer.etsy.com/documentation/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.etsy.com/oauth/connect',
      tokenUrl: 'https://api.etsy.com/v3/public/oauth/token',
      scopes: ['listings_r', 'listings_w', 'transactions_r', 'profile_r'],
      clientIdEnvKey: 'ETSY_CLIENT_ID',
      clientSecretEnvKey: 'ETSY_CLIENT_SECRET',
      usePKCE: true
    },
    apiBaseUrl: 'https://openapi.etsy.com/v3/application',
    capabilities: ['read_listings', 'manage_listings', 'read_orders', 'read_reviews'],
    features: ['Listing management', 'Order tracking', 'Shop statistics', 'Review monitoring'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { ecommerceIntegrations };
