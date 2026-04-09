/**
 * Payments & Finance Integrations
 */

const paymentIntegrations = [
  {
    slug: 'stripe',
    name: 'Stripe',
    description: 'Connect Stripe for payment processing.',
    category: 'FINANCE',
    provider: 'Stripe',
    logoUrl: 'https://stripe.com/favicon.ico',
    website: 'https://stripe.com',
    documentationUrl: 'https://stripe.com/docs/api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
      tokenUrl: 'https://connect.stripe.com/oauth/token',
      revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
      scopes: ['read_write'],
      clientIdEnvKey: 'STRIPE_CLIENT_ID',
      clientSecretEnvKey: 'STRIPE_CLIENT_SECRET',
      extraAuthParams: { response_type: 'code' }
    },
    apiBaseUrl: 'https://api.stripe.com/v1',
    capabilities: ['read_payments', 'create_charges', 'manage_subscriptions', 'read_customers'],
    features: ['Payment processing', 'Subscriptions', 'Invoicing', 'Connect platform'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'paypal',
    name: 'PayPal',
    description: 'Connect PayPal for online payments.',
    category: 'FINANCE',
    provider: 'PayPal',
    logoUrl: 'https://www.paypal.com/favicon.ico',
    website: 'https://paypal.com',
    documentationUrl: 'https://developer.paypal.com/docs/api/overview/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.paypal.com/signin/authorize',
      tokenUrl: 'https://api-m.paypal.com/v1/oauth2/token',
      scopes: ['openid', 'profile', 'email'],
      clientIdEnvKey: 'PAYPAL_CLIENT_ID',
      clientSecretEnvKey: 'PAYPAL_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api-m.paypal.com/v2',
    capabilities: ['read_transactions', 'create_payments', 'manage_subscriptions', 'send_payouts'],
    features: ['Checkout', 'Subscriptions', 'Invoicing', 'Payouts'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'square',
    name: 'Square',
    description: 'Connect Square for payment and POS.',
    category: 'FINANCE',
    provider: 'Square',
    logoUrl: 'https://squareup.com/favicon.ico',
    website: 'https://squareup.com',
    documentationUrl: 'https://developer.squareup.com/reference/square',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://connect.squareup.com/oauth2/authorize',
      tokenUrl: 'https://connect.squareup.com/oauth2/token',
      revokeUrl: 'https://connect.squareup.com/oauth2/revoke',
      scopes: ['PAYMENTS_READ', 'PAYMENTS_WRITE', 'ORDERS_READ', 'ITEMS_READ'],
      clientIdEnvKey: 'SQUARE_CLIENT_ID',
      clientSecretEnvKey: 'SQUARE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://connect.squareup.com/v2',
    capabilities: ['read_payments', 'create_payments', 'manage_orders', 'manage_inventory'],
    features: ['POS integration', 'Online payments', 'Inventory management', 'Customer directory'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'braintree',
    name: 'Braintree',
    description: 'Connect Braintree for payment processing.',
    category: 'FINANCE',
    provider: 'PayPal',
    logoUrl: 'https://www.braintreepayments.com/favicon.ico',
    website: 'https://braintreepayments.com',
    documentationUrl: 'https://developer.paypal.com/braintree/docs',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Credentials',
      helpText: 'Find in Settings > API',
      fields: [
        { name: 'merchantId', label: 'Merchant ID', type: 'text' },
        { name: 'publicKey', label: 'Public Key', type: 'text' },
        { name: 'privateKey', label: 'Private Key', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://api.braintreegateway.com',
    capabilities: ['read_transactions', 'create_transactions', 'manage_customers', 'manage_subscriptions'],
    features: ['Payment processing', 'Vault storage', 'Subscriptions', 'Reporting'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'quickbooks',
    name: 'QuickBooks',
    description: 'Connect QuickBooks for accounting.',
    category: 'FINANCE',
    provider: 'Intuit',
    logoUrl: 'https://quickbooks.intuit.com/favicon.ico',
    website: 'https://quickbooks.intuit.com',
    documentationUrl: 'https://developer.intuit.com/app/developer/qbo/docs/develop',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://appcenter.intuit.com/connect/oauth2',
      tokenUrl: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
      revokeUrl: 'https://developer.api.intuit.com/v2/oauth2/tokens/revoke',
      scopes: ['com.intuit.quickbooks.accounting', 'com.intuit.quickbooks.payment'],
      clientIdEnvKey: 'QUICKBOOKS_CLIENT_ID',
      clientSecretEnvKey: 'QUICKBOOKS_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://quickbooks.api.intuit.com/v3',
    capabilities: ['read_invoices', 'create_invoices', 'read_customers', 'read_reports'],
    features: ['Invoicing', 'Expense tracking', 'Financial reports', 'Bank connections'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'xero',
    name: 'Xero',
    description: 'Connect Xero for cloud accounting.',
    category: 'FINANCE',
    provider: 'Xero',
    logoUrl: 'https://www.xero.com/favicon.ico',
    website: 'https://xero.com',
    documentationUrl: 'https://developer.xero.com/documentation/api/accounting/overview',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.xero.com/identity/connect/authorize',
      tokenUrl: 'https://identity.xero.com/connect/token',
      revokeUrl: 'https://identity.xero.com/connect/revocation',
      scopes: ['openid', 'profile', 'email', 'accounting.transactions', 'accounting.contacts', 'offline_access'],
      clientIdEnvKey: 'XERO_CLIENT_ID',
      clientSecretEnvKey: 'XERO_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.xero.com/api.xro/2.0',
    capabilities: ['read_invoices', 'create_invoices', 'read_contacts', 'read_reports'],
    features: ['Invoicing', 'Bank reconciliation', 'Expense claims', 'Financial reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'freshbooks',
    name: 'FreshBooks',
    description: 'Connect FreshBooks for small business accounting.',
    category: 'FINANCE',
    provider: 'FreshBooks',
    logoUrl: 'https://www.freshbooks.com/favicon.ico',
    website: 'https://freshbooks.com',
    documentationUrl: 'https://www.freshbooks.com/api/start',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.freshbooks.com/auth/oauth/authorize',
      tokenUrl: 'https://api.freshbooks.com/auth/oauth/token',
      scopes: [],
      clientIdEnvKey: 'FRESHBOOKS_CLIENT_ID',
      clientSecretEnvKey: 'FRESHBOOKS_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.freshbooks.com/accounting/account',
    capabilities: ['read_invoices', 'create_invoices', 'read_clients', 'read_expenses'],
    features: ['Invoicing', 'Time tracking', 'Expense management', 'Payments'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'wave',
    name: 'Wave',
    description: 'Connect Wave for free accounting.',
    category: 'FINANCE',
    provider: 'Wave',
    logoUrl: 'https://www.waveapps.com/favicon.ico',
    website: 'https://waveapps.com',
    documentationUrl: 'https://developer.waveapps.com/hc/en-us/articles/360019968212-API-Reference',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.waveapps.com/oauth2/authorize/',
      tokenUrl: 'https://api.waveapps.com/oauth2/token/',
      scopes: [],
      clientIdEnvKey: 'WAVE_CLIENT_ID',
      clientSecretEnvKey: 'WAVE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://gql.waveapps.com/graphql/public',
    capabilities: ['read_invoices', 'create_invoices', 'read_customers', 'read_transactions'],
    features: ['Free accounting', 'Invoicing', 'Receipt scanning', 'Financial reports'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'plaid',
    name: 'Plaid',
    description: 'Connect Plaid for bank account linking.',
    category: 'FINANCE',
    provider: 'Plaid',
    logoUrl: 'https://plaid.com/favicon.ico',
    website: 'https://plaid.com',
    documentationUrl: 'https://plaid.com/docs/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Credentials',
      helpText: 'Get credentials from Plaid Dashboard',
      fields: [
        { name: 'clientId', label: 'Client ID', type: 'text' },
        { name: 'secret', label: 'Secret', type: 'password' },
        { name: 'environment', label: 'Environment', type: 'select', options: ['sandbox', 'development', 'production'] }
      ]
    },
    apiBaseUrl: 'https://production.plaid.com',
    capabilities: ['link_accounts', 'read_transactions', 'read_balances', 'verify_identity'],
    features: ['Bank linking', 'Transaction history', 'Balance checks', 'Identity verification'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'wise',
    name: 'Wise',
    description: 'Connect Wise for international transfers.',
    category: 'FINANCE',
    provider: 'Wise',
    logoUrl: 'https://wise.com/favicon.ico',
    website: 'https://wise.com',
    documentationUrl: 'https://api-docs.wise.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://wise.com/oauth/authorize',
      tokenUrl: 'https://api.wise.com/oauth/token',
      scopes: ['transfers'],
      clientIdEnvKey: 'WISE_CLIENT_ID',
      clientSecretEnvKey: 'WISE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.wise.com/v1',
    capabilities: ['read_transfers', 'create_transfers', 'get_rates', 'read_balances'],
    features: ['International transfers', 'Multi-currency accounts', 'Batch payments', 'Rate alerts'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { paymentIntegrations };
