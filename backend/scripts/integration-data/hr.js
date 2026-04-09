/**
 * HR & People Integrations
 */

const hrIntegrations = [
  {
    slug: 'bamboohr',
    name: 'BambooHR',
    description: 'Connect BambooHR for HR management.',
    category: 'HR',
    provider: 'BambooHR',
    logoUrl: 'https://www.bamboohr.com/favicon.ico',
    website: 'https://bamboohr.com',
    documentationUrl: 'https://documentation.bamboohr.com/reference',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key & Subdomain',
      helpText: 'Get API key from Account > API Keys',
      fields: [
        { name: 'subdomain', label: 'Subdomain', type: 'text' },
        { name: 'apiKey', label: 'API Key', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://api.bamboohr.com/api/gateway.php/{subdomain}/v1',
    capabilities: ['read_employees', 'manage_time_off', 'read_reports'],
    features: ['Employee directory', 'Time-off tracking', 'Performance reviews'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'workday',
    name: 'Workday',
    description: 'Connect Workday for enterprise HCM.',
    category: 'HR',
    provider: 'Workday',
    logoUrl: 'https://www.workday.com/favicon.ico',
    website: 'https://workday.com',
    documentationUrl: 'https://community.workday.com/sites/default/files/file-hosting/restapi/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: '{instance}/oauth2/{tenant}/authorize',
      tokenUrl: '{instance}/oauth2/{tenant}/token',
      scopes: ['Staffing'],
      clientIdEnvKey: 'WORKDAY_CLIENT_ID',
      clientSecretEnvKey: 'WORKDAY_CLIENT_SECRET',
      requiresInstanceUrl: true
    },
    apiBaseUrl: '{instance}/ccx/api/v1/{tenant}',
    capabilities: ['read_workers', 'manage_time_off', 'read_payroll'],
    features: ['HCM', 'Payroll', 'Benefits', 'Talent management'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'greenhouse',
    name: 'Greenhouse',
    description: 'Connect Greenhouse for recruiting.',
    category: 'HR',
    provider: 'Greenhouse',
    logoUrl: 'https://www.greenhouse.io/favicon.ico',
    website: 'https://greenhouse.io',
    documentationUrl: 'https://developers.greenhouse.io/harvest.html',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Create in Configure > Dev Center > API Credential Management',
      headerName: 'Authorization',
      headerPrefix: 'Basic '
    },
    apiBaseUrl: 'https://harvest.greenhouse.io/v1',
    capabilities: ['read_candidates', 'manage_jobs', 'read_applications'],
    features: ['Applicant tracking', 'Interview scheduling', 'Offer management'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'lever',
    name: 'Lever',
    description: 'Connect Lever for recruiting.',
    category: 'HR',
    provider: 'Lever',
    logoUrl: 'https://www.lever.co/favicon.ico',
    website: 'https://lever.co',
    documentationUrl: 'https://hire.lever.co/developer/documentation',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://auth.lever.co/authorize',
      tokenUrl: 'https://auth.lever.co/oauth/token',
      scopes: ['offline_access', 'candidates:read:admin', 'postings:read:admin'],
      clientIdEnvKey: 'LEVER_CLIENT_ID',
      clientSecretEnvKey: 'LEVER_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.lever.co/v1',
    capabilities: ['read_candidates', 'manage_postings', 'read_interviews'],
    features: ['ATS', 'CRM', 'Analytics', 'Scheduling'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'gusto',
    name: 'Gusto',
    description: 'Connect Gusto for payroll and HR.',
    category: 'HR',
    provider: 'Gusto',
    logoUrl: 'https://gusto.com/favicon.ico',
    website: 'https://gusto.com',
    documentationUrl: 'https://docs.gusto.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.gusto.com/oauth/authorize',
      tokenUrl: 'https://api.gusto.com/oauth/token',
      scopes: ['employees:read', 'payrolls:read', 'companies:read'],
      clientIdEnvKey: 'GUSTO_CLIENT_ID',
      clientSecretEnvKey: 'GUSTO_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.gusto.com/v1',
    capabilities: ['read_employees', 'read_payrolls', 'manage_benefits'],
    features: ['Payroll', 'Benefits', 'HR tools', 'Compliance'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'rippling',
    name: 'Rippling',
    description: 'Connect Rippling for workforce platform.',
    category: 'HR',
    provider: 'Rippling',
    logoUrl: 'https://www.rippling.com/favicon.ico',
    website: 'https://rippling.com',
    documentationUrl: 'https://developer.rippling.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.rippling.com/oauth/authorize',
      tokenUrl: 'https://app.rippling.com/api/o/token/',
      scopes: ['employee:read', 'company:read'],
      clientIdEnvKey: 'RIPPLING_CLIENT_ID',
      clientSecretEnvKey: 'RIPPLING_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.rippling.com/platform/api',
    capabilities: ['read_employees', 'manage_devices', 'read_apps'],
    features: ['HR', 'IT', 'Finance', 'App management'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'adp',
    name: 'ADP',
    description: 'Connect ADP for payroll and HR.',
    category: 'HR',
    provider: 'ADP',
    logoUrl: 'https://www.adp.com/favicon.ico',
    website: 'https://adp.com',
    documentationUrl: 'https://developers.adp.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.adp.com/auth/oauth/v2/authorize',
      tokenUrl: 'https://accounts.adp.com/auth/oauth/v2/token',
      scopes: ['api'],
      clientIdEnvKey: 'ADP_CLIENT_ID',
      clientSecretEnvKey: 'ADP_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.adp.com',
    capabilities: ['read_workers', 'read_payroll', 'manage_time'],
    features: ['Payroll', 'HR', 'Benefits', 'Time tracking'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'deel',
    name: 'Deel',
    description: 'Connect Deel for global payroll.',
    category: 'HR',
    provider: 'Deel',
    logoUrl: 'https://www.deel.com/favicon.ico',
    website: 'https://deel.com',
    documentationUrl: 'https://developer.deel.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.deel.com/oauth2/authorize',
      tokenUrl: 'https://app.deel.com/oauth2/token',
      scopes: ['contracts:read', 'workers:read', 'payments:read'],
      clientIdEnvKey: 'DEEL_CLIENT_ID',
      clientSecretEnvKey: 'DEEL_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.deel.com/rest/v2',
    capabilities: ['read_contracts', 'read_workers', 'read_payments'],
    features: ['Global payroll', 'Compliance', 'Contracts', 'EOR'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { hrIntegrations };
