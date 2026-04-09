/**
 * Automation & Integration Integrations
 */

const automationIntegrations = [
  {
    slug: 'zapier',
    name: 'Zapier',
    description: 'Connect Zapier for workflow automation.',
    category: 'AUTOMATION',
    provider: 'Zapier',
    logoUrl: 'https://zapier.com/favicon.ico',
    website: 'https://zapier.com',
    documentationUrl: 'https://platform.zapier.com/docs/start',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://zapier.com/oauth/authorize/',
      tokenUrl: 'https://zapier.com/oauth/token/',
      scopes: ['zap', 'profile'],
      clientIdEnvKey: 'ZAPIER_CLIENT_ID',
      clientSecretEnvKey: 'ZAPIER_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://zapier.com/api/v4',
    capabilities: ['trigger_zaps', 'read_zaps', 'manage_connections'],
    features: ['Workflow automation', 'App connections', 'Webhooks', 'Scheduled triggers'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'make',
    name: 'Make (Integromat)',
    description: 'Connect Make for visual automation.',
    category: 'AUTOMATION',
    provider: 'Make',
    logoUrl: 'https://www.make.com/favicon.ico',
    website: 'https://make.com',
    documentationUrl: 'https://www.make.com/en/api-documentation',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.make.com/oauth/authorize',
      tokenUrl: 'https://www.make.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'MAKE_CLIENT_ID',
      clientSecretEnvKey: 'MAKE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://eu1.make.com/api/v2',
    capabilities: ['trigger_scenarios', 'read_scenarios', 'manage_connections'],
    features: ['Visual builder', 'Scenario automation', 'Data transformation', 'Webhooks'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'n8n',
    name: 'n8n',
    description: 'Connect n8n for workflow automation.',
    category: 'AUTOMATION',
    provider: 'n8n',
    logoUrl: 'https://n8n.io/favicon.ico',
    website: 'https://n8n.io',
    documentationUrl: 'https://docs.n8n.io/api/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Generate API key in n8n Settings',
      headerName: 'X-N8N-API-KEY'
    },
    apiBaseUrl: '{instance}/api/v1',
    capabilities: ['trigger_workflows', 'read_workflows', 'manage_executions'],
    features: ['Self-hosted', 'Visual workflows', 'Custom nodes', 'Fair-code license'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'ifttt',
    name: 'IFTTT',
    description: 'Connect IFTTT for simple automations.',
    category: 'AUTOMATION',
    provider: 'IFTTT',
    logoUrl: 'https://ifttt.com/favicon.ico',
    website: 'https://ifttt.com',
    documentationUrl: 'https://ifttt.com/docs/connect_api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://ifttt.com/oauth/authorize',
      tokenUrl: 'https://ifttt.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'IFTTT_CLIENT_ID',
      clientSecretEnvKey: 'IFTTT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://connect.ifttt.com/v2',
    capabilities: ['trigger_applets', 'read_applets', 'manage_connections'],
    features: ['If-then recipes', 'Smart home', 'Mobile triggers', 'Widgets'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'workato',
    name: 'Workato',
    description: 'Connect Workato for enterprise automation.',
    category: 'AUTOMATION',
    provider: 'Workato',
    logoUrl: 'https://www.workato.com/favicon.ico',
    website: 'https://workato.com',
    documentationUrl: 'https://docs.workato.com/workato-api.html',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.workato.com/oauth/authorize',
      tokenUrl: 'https://app.workato.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'WORKATO_CLIENT_ID',
      clientSecretEnvKey: 'WORKATO_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://app.workato.com/api',
    capabilities: ['trigger_recipes', 'read_recipes', 'manage_connections', 'read_jobs'],
    features: ['Enterprise recipes', 'API management', 'Bot automation', 'Insights'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'trayio',
    name: 'Tray.io',
    description: 'Connect Tray.io for general automation.',
    category: 'AUTOMATION',
    provider: 'Tray.io',
    logoUrl: 'https://tray.io/favicon.ico',
    website: 'https://tray.io',
    documentationUrl: 'https://tray.io/documentation',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.tray.io/oauth/authorize',
      tokenUrl: 'https://app.tray.io/oauth/token',
      scopes: [],
      clientIdEnvKey: 'TRAYIO_CLIENT_ID',
      clientSecretEnvKey: 'TRAYIO_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.tray.io/v1',
    capabilities: ['trigger_workflows', 'read_workflows', 'manage_solutions'],
    features: ['Low-code automation', 'Universal connectors', 'API builder', 'Embedded iPaaS'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'automateio',
    name: 'Automate.io',
    description: 'Connect Automate.io for cloud app integration.',
    category: 'AUTOMATION',
    provider: 'Notion',
    logoUrl: 'https://automate.io/favicon.ico',
    website: 'https://automate.io',
    documentationUrl: 'https://automate.io/integration',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get your API key from Automate.io settings',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.automate.io/v1',
    capabilities: ['trigger_bots', 'read_bots', 'manage_connections'],
    features: ['Multi-action bots', 'Conditional logic', 'Scheduled workflows', 'Webhooks'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'pipedream',
    name: 'Pipedream',
    description: 'Connect Pipedream for developer workflows.',
    category: 'AUTOMATION',
    provider: 'Pipedream',
    logoUrl: 'https://pipedream.com/favicon.ico',
    website: 'https://pipedream.com',
    documentationUrl: 'https://pipedream.com/docs',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://pipedream.com/oauth/authorize',
      tokenUrl: 'https://pipedream.com/oauth/token',
      scopes: [],
      clientIdEnvKey: 'PIPEDREAM_CLIENT_ID',
      clientSecretEnvKey: 'PIPEDREAM_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.pipedream.com/v1',
    capabilities: ['trigger_workflows', 'read_workflows', 'manage_sources'],
    features: ['Code-first', 'Serverless', 'Pre-built triggers', 'Free tier'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { automationIntegrations };
