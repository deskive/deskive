/**
 * Analytics & BI Integrations
 */

const analyticsIntegrations = [
  {
    slug: 'google-analytics',
    name: 'Google Analytics',
    description: 'Connect Google Analytics for website analytics.',
    category: 'ANALYTICS',
    provider: 'Google',
    logoUrl: 'https://www.gstatic.com/analytics-suite/header/suite/v2/ic_analytics.svg',
    website: 'https://analytics.google.com',
    documentationUrl: 'https://developers.google.com/analytics/devguides/reporting/data/v1',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['analytics.readonly', 'userinfo.email'],
      scopePrefix: 'https://www.googleapis.com/auth/',
      clientIdEnvKey: 'GOOGLE_OAUTH_CLIENT_ID',
      clientSecretEnvKey: 'GOOGLE_OAUTH_CLIENT_SECRET',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' }
    },
    apiBaseUrl: 'https://analyticsdata.googleapis.com/v1beta',
    capabilities: ['read_reports', 'read_realtime', 'read_audiences', 'read_properties'],
    features: ['Traffic reports', 'Real-time data', 'Audience insights', 'Conversion tracking'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'mixpanel',
    name: 'Mixpanel',
    description: 'Connect Mixpanel for product analytics.',
    category: 'ANALYTICS',
    provider: 'Mixpanel',
    logoUrl: 'https://mixpanel.com/favicon.ico',
    website: 'https://mixpanel.com',
    documentationUrl: 'https://developer.mixpanel.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'Project Token & API Secret',
      helpText: 'Find credentials in Project Settings',
      fields: [
        { name: 'projectToken', label: 'Project Token', type: 'text' },
        { name: 'apiSecret', label: 'API Secret', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://mixpanel.com/api/2.0',
    capabilities: ['read_events', 'read_funnels', 'read_retention', 'track_events'],
    features: ['Event tracking', 'Funnel analysis', 'Retention reports', 'User profiles'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'amplitude',
    name: 'Amplitude',
    description: 'Connect Amplitude for digital analytics.',
    category: 'ANALYTICS',
    provider: 'Amplitude',
    logoUrl: 'https://amplitude.com/favicon.ico',
    website: 'https://amplitude.com',
    documentationUrl: 'https://developers.amplitude.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key & Secret',
      helpText: 'Find in Settings > Projects > API Keys',
      fields: [
        { name: 'apiKey', label: 'API Key', type: 'text' },
        { name: 'secretKey', label: 'Secret Key', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://amplitude.com/api/2',
    capabilities: ['read_events', 'read_charts', 'read_cohorts', 'export_data'],
    features: ['Behavioral analytics', 'Cohort analysis', 'User journeys', 'Experiments'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'segment',
    name: 'Segment',
    description: 'Connect Segment for customer data platform.',
    category: 'ANALYTICS',
    provider: 'Twilio Segment',
    logoUrl: 'https://segment.com/favicon.ico',
    website: 'https://segment.com',
    documentationUrl: 'https://segment.com/docs/connections/sources/catalog/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'Write Key',
      helpText: 'Find in Sources > Your Source > API Keys',
      headerName: 'Authorization',
      headerPrefix: 'Basic '
    },
    apiBaseUrl: 'https://api.segment.io/v1',
    capabilities: ['track_events', 'identify_users', 'read_sources', 'manage_destinations'],
    features: ['Data collection', 'Identity resolution', 'Connections', 'Protocols'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'hotjar',
    name: 'Hotjar',
    description: 'Connect Hotjar for behavior analytics.',
    category: 'ANALYTICS',
    provider: 'Hotjar',
    logoUrl: 'https://www.hotjar.com/favicon.ico',
    website: 'https://hotjar.com',
    documentationUrl: 'https://help.hotjar.com/hc/en-us/sections/360007738733-APIs',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Generate in Organization Settings > API Keys',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.hotjar.com',
    capabilities: ['read_heatmaps', 'read_recordings', 'read_surveys', 'read_feedback'],
    features: ['Heatmaps', 'Session recordings', 'Surveys', 'Feedback widgets'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'heap',
    name: 'Heap',
    description: 'Connect Heap for autocapture analytics.',
    category: 'ANALYTICS',
    provider: 'Heap',
    logoUrl: 'https://heap.io/favicon.ico',
    website: 'https://heap.io',
    documentationUrl: 'https://developers.heap.io/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Credentials',
      helpText: 'Find in Account > Manage > API',
      fields: [
        { name: 'appId', label: 'App ID', type: 'text' },
        { name: 'apiKey', label: 'API Key', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://heapanalytics.com/api',
    capabilities: ['read_events', 'read_users', 'track_events', 'manage_definitions'],
    features: ['Auto-capture', 'Retroactive analysis', 'User segments', 'Funnels'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'tableau',
    name: 'Tableau',
    description: 'Connect Tableau for business intelligence.',
    category: 'ANALYTICS',
    provider: 'Salesforce',
    logoUrl: 'https://www.tableau.com/favicon.ico',
    website: 'https://tableau.com',
    documentationUrl: 'https://help.tableau.com/current/api/rest_api/en-us/REST/rest_api.htm',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://online.tableau.com/oauth/authorize',
      tokenUrl: 'https://online.tableau.com/oauth/token',
      scopes: ['tableau:content:read', 'tableau:insight:read'],
      clientIdEnvKey: 'TABLEAU_CLIENT_ID',
      clientSecretEnvKey: 'TABLEAU_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://online.tableau.com/api/3.16',
    capabilities: ['read_workbooks', 'read_views', 'export_images', 'read_datasources'],
    features: ['Dashboards', 'Data visualization', 'Embedded analytics', 'Data prep'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'looker',
    name: 'Looker',
    description: 'Connect Looker for business intelligence.',
    category: 'ANALYTICS',
    provider: 'Google',
    logoUrl: 'https://looker.com/favicon.ico',
    website: 'https://looker.com',
    documentationUrl: 'https://developers.looker.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: '{instance}/oauth/authorize',
      tokenUrl: '{instance}/oauth/token',
      scopes: [],
      clientIdEnvKey: 'LOOKER_CLIENT_ID',
      clientSecretEnvKey: 'LOOKER_CLIENT_SECRET',
      requiresInstanceUrl: true
    },
    apiBaseUrl: '{instance}/api/4.0',
    capabilities: ['read_looks', 'read_dashboards', 'run_queries', 'manage_schedules'],
    features: ['LookML modeling', 'Embedded analytics', 'Data actions', 'Alerts'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'metabase',
    name: 'Metabase',
    description: 'Connect Metabase for open-source BI.',
    category: 'ANALYTICS',
    provider: 'Metabase',
    logoUrl: 'https://www.metabase.com/favicon.ico',
    website: 'https://metabase.com',
    documentationUrl: 'https://www.metabase.com/docs/latest/api-documentation',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key or Session Token',
      helpText: 'Generate in Admin > API Keys',
      fields: [
        { name: 'instanceUrl', label: 'Metabase URL', type: 'text' },
        { name: 'apiKey', label: 'API Key', type: 'password' }
      ]
    },
    apiBaseUrl: '{instanceUrl}/api',
    capabilities: ['read_questions', 'read_dashboards', 'run_queries', 'embed_questions'],
    features: ['Self-hosted', 'Natural language queries', 'Embedding', 'Alerts'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'powerbi',
    name: 'Power BI',
    description: 'Connect Power BI for Microsoft business analytics.',
    category: 'ANALYTICS',
    provider: 'Microsoft',
    logoUrl: 'https://powerbi.microsoft.com/favicon.ico',
    website: 'https://powerbi.microsoft.com',
    documentationUrl: 'https://docs.microsoft.com/en-us/rest/api/power-bi/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['https://analysis.windows.net/powerbi/api/.default', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.powerbi.com/v1.0/myorg',
    capabilities: ['read_reports', 'read_dashboards', 'embed_reports', 'refresh_datasets'],
    features: ['Interactive reports', 'Real-time dashboards', 'Natural language Q&A', 'Mobile app'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { analyticsIntegrations };
