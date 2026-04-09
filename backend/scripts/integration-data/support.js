/**
 * Customer Support Integrations
 */

const supportIntegrations = [
  {
    slug: 'zendesk',
    name: 'Zendesk',
    description: 'Connect Zendesk for customer support.',
    category: 'SUPPORT',
    provider: 'Zendesk',
    logoUrl: 'https://d1eipm3vz40ber.cloudfront.net/images/p-zendesk-logo.svg',
    website: 'https://zendesk.com',
    documentationUrl: 'https://developer.zendesk.com/api-reference/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{subdomain}.zendesk.com/oauth/authorizations/new',
      tokenUrl: 'https://{subdomain}.zendesk.com/oauth/tokens',
      scopes: ['read', 'write', 'tickets:read', 'tickets:write'],
      clientIdEnvKey: 'ZENDESK_CLIENT_ID',
      clientSecretEnvKey: 'ZENDESK_CLIENT_SECRET',
      requiresSubdomain: true
    },
    apiBaseUrl: 'https://{subdomain}.zendesk.com/api/v2',
    capabilities: ['read_tickets', 'create_tickets', 'manage_users'],
    features: ['Ticketing', 'Knowledge base', 'Live chat', 'Analytics'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'freshdesk',
    name: 'Freshdesk',
    description: 'Connect Freshdesk for helpdesk.',
    category: 'SUPPORT',
    provider: 'Freshworks',
    logoUrl: 'https://www.freshworks.com/favicon.ico',
    website: 'https://freshdesk.com',
    documentationUrl: 'https://developers.freshdesk.com/api/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.freshworks.com/oauth/authorize',
      tokenUrl: 'https://accounts.freshworks.com/oauth/token',
      scopes: ['tickets:read', 'tickets:write'],
      clientIdEnvKey: 'FRESHDESK_CLIENT_ID',
      clientSecretEnvKey: 'FRESHDESK_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://{domain}.freshdesk.com/api/v2',
    capabilities: ['read_tickets', 'create_tickets', 'manage_contacts'],
    features: ['Ticketing', 'Automations', 'Knowledge base', 'SLA management'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'helpscout',
    name: 'Help Scout',
    description: 'Connect Help Scout for customer support.',
    category: 'SUPPORT',
    provider: 'Help Scout',
    logoUrl: 'https://www.helpscout.com/favicon.ico',
    website: 'https://helpscout.com',
    documentationUrl: 'https://developer.helpscout.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://secure.helpscout.net/authentication/authorizeClientApplication',
      tokenUrl: 'https://api.helpscout.net/v2/oauth2/token',
      scopes: [],
      clientIdEnvKey: 'HELPSCOUT_CLIENT_ID',
      clientSecretEnvKey: 'HELPSCOUT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.helpscout.net/v2',
    capabilities: ['read_conversations', 'create_conversations', 'manage_customers'],
    features: ['Shared inbox', 'Knowledge base', 'Beacon', 'Reporting'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'front',
    name: 'Front',
    description: 'Connect Front for shared inbox.',
    category: 'SUPPORT',
    provider: 'Front',
    logoUrl: 'https://front.com/favicon.ico',
    website: 'https://front.com',
    documentationUrl: 'https://dev.frontapp.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.frontapp.com/oauth/authorize',
      tokenUrl: 'https://app.frontapp.com/oauth/token',
      scopes: ['shared:read', 'shared:write'],
      clientIdEnvKey: 'FRONT_CLIENT_ID',
      clientSecretEnvKey: 'FRONT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api2.frontapp.com',
    capabilities: ['read_conversations', 'send_messages', 'manage_teammates'],
    features: ['Shared inbox', 'Team collaboration', 'Analytics', 'Integrations'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'intercom-support',
    name: 'Intercom Support',
    description: 'Connect Intercom for customer support.',
    category: 'SUPPORT',
    provider: 'Intercom',
    logoUrl: 'https://static.intercomassets.com/favicon.ico',
    website: 'https://intercom.com',
    documentationUrl: 'https://developers.intercom.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.intercom.com/oauth',
      tokenUrl: 'https://api.intercom.io/auth/eagle/token',
      scopes: [],
      clientIdEnvKey: 'INTERCOM_CLIENT_ID',
      clientSecretEnvKey: 'INTERCOM_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.intercom.io',
    capabilities: ['read_conversations', 'send_messages', 'manage_contacts'],
    features: ['Live chat', 'Help center', 'Product tours', 'Bots'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'kayako',
    name: 'Kayako',
    description: 'Connect Kayako for customer service.',
    category: 'SUPPORT',
    provider: 'Kayako',
    logoUrl: 'https://www.kayako.com/favicon.ico',
    website: 'https://kayako.com',
    documentationUrl: 'https://developer.kayako.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: '{instance}/oauth/authorize',
      tokenUrl: '{instance}/oauth/token',
      scopes: [],
      clientIdEnvKey: 'KAYAKO_CLIENT_ID',
      clientSecretEnvKey: 'KAYAKO_CLIENT_SECRET',
      requiresInstanceUrl: true
    },
    apiBaseUrl: '{instance}/api/v1',
    capabilities: ['read_tickets', 'create_tickets', 'manage_users'],
    features: ['Unified inbox', 'Help center', 'Customer journey'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'groove',
    name: 'Groove',
    description: 'Connect Groove for simple helpdesk.',
    category: 'SUPPORT',
    provider: 'Groove',
    logoUrl: 'https://www.groovehq.com/favicon.ico',
    website: 'https://groovehq.com',
    documentationUrl: 'https://www.groovehq.com/docs',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get from Settings > API',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.groovehq.com/v1',
    capabilities: ['read_tickets', 'create_tickets', 'read_customers'],
    features: ['Shared inbox', 'Knowledge base', 'Reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'happyfox',
    name: 'HappyFox',
    description: 'Connect HappyFox for helpdesk.',
    category: 'SUPPORT',
    provider: 'HappyFox',
    logoUrl: 'https://www.happyfox.com/favicon.ico',
    website: 'https://happyfox.com',
    documentationUrl: 'https://happyfox.com/developers/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Credentials',
      fields: [
        { name: 'domain', label: 'Domain', type: 'text' },
        { name: 'apiKey', label: 'API Key', type: 'text' },
        { name: 'authCode', label: 'Auth Code', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://{domain}.happyfox.com/api/1.1/json',
    capabilities: ['read_tickets', 'create_tickets', 'manage_categories'],
    features: ['Ticketing', 'Knowledge base', 'Automation', 'Reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'gorgias',
    name: 'Gorgias',
    description: 'Connect Gorgias for e-commerce support.',
    category: 'SUPPORT',
    provider: 'Gorgias',
    logoUrl: 'https://www.gorgias.com/favicon.ico',
    website: 'https://gorgias.com',
    documentationUrl: 'https://developers.gorgias.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{subdomain}.gorgias.com/oauth/authorize',
      tokenUrl: 'https://{subdomain}.gorgias.com/oauth/token',
      scopes: ['openid', 'offline', 'write'],
      clientIdEnvKey: 'GORGIAS_CLIENT_ID',
      clientSecretEnvKey: 'GORGIAS_CLIENT_SECRET',
      requiresSubdomain: true
    },
    apiBaseUrl: 'https://{subdomain}.gorgias.com/api',
    capabilities: ['read_tickets', 'respond_tickets', 'manage_macros'],
    features: ['E-commerce focus', 'Macros', 'Automation', 'Revenue tracking'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'kustomer',
    name: 'Kustomer',
    description: 'Connect Kustomer for CX platform.',
    category: 'SUPPORT',
    provider: 'Kustomer',
    logoUrl: 'https://www.kustomer.com/favicon.ico',
    website: 'https://kustomer.com',
    documentationUrl: 'https://developer.kustomer.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Create in Settings > API Keys',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.kustomerapp.com/v1',
    capabilities: ['read_conversations', 'create_messages', 'manage_customers'],
    features: ['Timeline view', 'CRM', 'AI assistance', 'Omnichannel'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { supportIntegrations };
