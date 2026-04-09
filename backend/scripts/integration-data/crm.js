/**
 * CRM & Sales Integrations
 * Already implemented: hubspot
 */

const crmIntegrations = [
  {
    slug: 'salesforce',
    name: 'Salesforce',
    description: 'Connect Salesforce CRM to sync leads, contacts, and opportunities.',
    category: 'CRM',
    provider: 'Salesforce',
    logoUrl: 'https://www.salesforce.com/favicon.ico',
    website: 'https://salesforce.com',
    documentationUrl: 'https://developer.salesforce.com/docs/apis',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.salesforce.com/services/oauth2/authorize',
      tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
      revokeUrl: 'https://login.salesforce.com/services/oauth2/revoke',
      userInfoUrl: 'https://login.salesforce.com/services/oauth2/userinfo',
      scopes: ['api', 'refresh_token', 'offline_access'],
      clientIdEnvKey: 'SALESFORCE_CLIENT_ID',
      clientSecretEnvKey: 'SALESFORCE_CLIENT_SECRET'
    },
    apiBaseUrl: '{instance_url}/services/data/v58.0',
    capabilities: ['read_contacts', 'create_leads', 'read_opportunities', 'manage_accounts'],
    features: ['Contact sync', 'Lead management', 'Opportunity tracking', 'Reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'pipedrive',
    name: 'Pipedrive',
    description: 'Connect Pipedrive CRM to sync deals, contacts, and activities.',
    category: 'CRM',
    provider: 'Pipedrive',
    logoUrl: 'https://www.pipedrive.com/favicon.ico',
    website: 'https://pipedrive.com',
    documentationUrl: 'https://developers.pipedrive.com/docs/api/v1',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://oauth.pipedrive.com/oauth/authorize',
      tokenUrl: 'https://oauth.pipedrive.com/oauth/token',
      userInfoUrl: 'https://api.pipedrive.com/v1/users/me',
      scopes: ['base', 'deals:read', 'deals:write', 'contacts:read', 'contacts:write'],
      clientIdEnvKey: 'PIPEDRIVE_CLIENT_ID',
      clientSecretEnvKey: 'PIPEDRIVE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.pipedrive.com/v1',
    capabilities: ['read_deals', 'create_deals', 'read_contacts', 'manage_activities'],
    features: ['Deal pipeline', 'Contact sync', 'Activity tracking', 'Sales reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'zoho-crm',
    name: 'Zoho CRM',
    description: 'Connect Zoho CRM to sync leads, contacts, and deals.',
    category: 'CRM',
    provider: 'Zoho',
    logoUrl: 'https://www.zoho.com/favicon.ico',
    website: 'https://zoho.com/crm',
    documentationUrl: 'https://www.zoho.com/crm/developer/docs/api/v5/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.zoho.com/oauth/v2/auth',
      tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
      revokeUrl: 'https://accounts.zoho.com/oauth/v2/token/revoke',
      userInfoUrl: 'https://www.zohoapis.com/crm/v5/users?type=CurrentUser',
      scopes: ['ZohoCRM.modules.ALL', 'ZohoCRM.users.READ', 'ZohoCRM.org.READ'],
      clientIdEnvKey: 'ZOHO_CLIENT_ID',
      clientSecretEnvKey: 'ZOHO_CLIENT_SECRET',
      extraAuthParams: { access_type: 'offline' }
    },
    apiBaseUrl: 'https://www.zohoapis.com/crm/v5',
    capabilities: ['read_leads', 'create_leads', 'read_deals', 'manage_contacts'],
    features: ['Lead management', 'Deal tracking', 'Contact sync', 'Workflow automation'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'freshsales',
    name: 'Freshsales',
    description: 'Connect Freshsales CRM for sales and lead management.',
    category: 'CRM',
    provider: 'Freshworks',
    logoUrl: 'https://www.freshworks.com/favicon.ico',
    website: 'https://freshsales.io',
    documentationUrl: 'https://developers.freshsales.io/api/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.freshworks.com/oauth/authorize',
      tokenUrl: 'https://accounts.freshworks.com/oauth/token',
      scopes: ['crm.read', 'crm.write'],
      clientIdEnvKey: 'FRESHSALES_CLIENT_ID',
      clientSecretEnvKey: 'FRESHSALES_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://{domain}.freshsales.io/api',
    capabilities: ['read_leads', 'create_leads', 'read_contacts', 'manage_deals'],
    features: ['Lead scoring', 'Contact management', 'Deal pipeline', 'Email tracking'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'close',
    name: 'Close',
    description: 'Connect Close CRM for sales automation and calling.',
    category: 'CRM',
    provider: 'Close',
    logoUrl: 'https://close.com/favicon.ico',
    website: 'https://close.com',
    documentationUrl: 'https://developer.close.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.close.com/oauth2/authorize',
      tokenUrl: 'https://api.close.com/oauth2/token',
      scopes: ['all:read', 'all:write'],
      clientIdEnvKey: 'CLOSE_CLIENT_ID',
      clientSecretEnvKey: 'CLOSE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.close.com/api/v1',
    capabilities: ['read_leads', 'create_leads', 'read_activities', 'manage_opportunities'],
    features: ['Lead management', 'Calling integration', 'Email sequences', 'Reporting'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'copper',
    name: 'Copper',
    description: 'Connect Copper CRM for Google Workspace-native CRM.',
    category: 'CRM',
    provider: 'Copper',
    logoUrl: 'https://www.copper.com/favicon.ico',
    website: 'https://copper.com',
    documentationUrl: 'https://developer.copper.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.copper.com/oauth/authorize',
      tokenUrl: 'https://app.copper.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'COPPER_CLIENT_ID',
      clientSecretEnvKey: 'COPPER_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.copper.com/developer_api/v1',
    capabilities: ['read_contacts', 'create_leads', 'read_opportunities', 'manage_tasks'],
    features: ['Gmail integration', 'Contact sync', 'Pipeline management', 'Activity tracking'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'insightly',
    name: 'Insightly',
    description: 'Connect Insightly CRM for relationship and project management.',
    category: 'CRM',
    provider: 'Insightly',
    logoUrl: 'https://www.insightly.com/favicon.ico',
    website: 'https://insightly.com',
    documentationUrl: 'https://api.insightly.com/v3.1/Help',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Find your API key in User Settings > API',
      headerName: 'Authorization',
      headerPrefix: 'Basic '
    },
    apiBaseUrl: 'https://api.insightly.com/v3.1',
    capabilities: ['read_contacts', 'create_leads', 'read_projects', 'manage_opportunities'],
    features: ['Contact management', 'Project tracking', 'Lead routing', 'Email integration'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'nimble',
    name: 'Nimble',
    description: 'Connect Nimble for social CRM and relationship management.',
    category: 'CRM',
    provider: 'Nimble',
    logoUrl: 'https://www.nimble.com/favicon.ico',
    website: 'https://nimble.com',
    documentationUrl: 'https://nimble.readthedocs.io/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.nimble.com/oauth/authorize',
      tokenUrl: 'https://api.nimble.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'NIMBLE_CLIENT_ID',
      clientSecretEnvKey: 'NIMBLE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.nimble.com/api/v1',
    capabilities: ['read_contacts', 'create_contacts', 'read_activities', 'manage_deals'],
    features: ['Social enrichment', 'Contact sync', 'Relationship insights', 'Deal tracking'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'keap',
    name: 'Keap (Infusionsoft)',
    description: 'Connect Keap for CRM and marketing automation.',
    category: 'CRM',
    provider: 'Keap',
    logoUrl: 'https://keap.com/favicon.ico',
    website: 'https://keap.com',
    documentationUrl: 'https://developer.keap.com/docs/rest/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.infusionsoft.com/app/oauth/authorize',
      tokenUrl: 'https://api.infusionsoft.com/token',
      userInfoUrl: 'https://api.infusionsoft.com/crm/rest/v1/oauth/connect/userinfo',
      scopes: ['full'],
      clientIdEnvKey: 'KEAP_CLIENT_ID',
      clientSecretEnvKey: 'KEAP_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.infusionsoft.com/crm/rest/v1',
    capabilities: ['read_contacts', 'create_contacts', 'manage_campaigns', 'read_orders'],
    features: ['Contact management', 'Email automation', 'Campaign builder', 'E-commerce'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { crmIntegrations };
