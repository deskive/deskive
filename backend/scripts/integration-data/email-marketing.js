/**
 * Email & Marketing Integrations
 * Already implemented: gmail, sendgrid
 */

const emailMarketingIntegrations = [
  {
    slug: 'outlook',
    name: 'Outlook',
    description: 'Connect Outlook to access and manage emails from Microsoft.',
    category: 'EMAIL',
    provider: 'Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    website: 'https://outlook.com',
    documentationUrl: 'https://docs.microsoft.com/en-us/graph/outlook-mail-concept-overview',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['Mail.Read', 'Mail.Send', 'Mail.ReadWrite', 'User.Read', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    capabilities: ['read_email', 'send_email', 'manage_folders', 'search_email'],
    features: ['Email sync', 'Send emails', 'Folder management', 'Calendar integration'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'mailchimp',
    name: 'Mailchimp',
    description: 'Connect Mailchimp for email marketing and automation.',
    category: 'MARKETING',
    provider: 'Intuit Mailchimp',
    logoUrl: 'https://mailchimp.com/favicon.ico',
    website: 'https://mailchimp.com',
    documentationUrl: 'https://mailchimp.com/developer/marketing/api/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
      tokenUrl: 'https://login.mailchimp.com/oauth2/token',
      userInfoUrl: 'https://login.mailchimp.com/oauth2/metadata',
      scopes: [],
      clientIdEnvKey: 'MAILCHIMP_CLIENT_ID',
      clientSecretEnvKey: 'MAILCHIMP_CLIENT_SECRET',
      tokenResponseMapping: { apiEndpoint: 'api_endpoint', dc: 'dc' }
    },
    apiBaseUrl: 'https://{dc}.api.mailchimp.com/3.0',
    capabilities: ['read_lists', 'manage_campaigns', 'read_reports', 'manage_subscribers'],
    features: ['Campaign management', 'List segmentation', 'A/B testing', 'Analytics'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'convertkit',
    name: 'ConvertKit',
    description: 'Connect ConvertKit for creator-focused email marketing.',
    category: 'MARKETING',
    provider: 'ConvertKit',
    logoUrl: 'https://convertkit.com/favicon.ico',
    website: 'https://convertkit.com',
    documentationUrl: 'https://developers.convertkit.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key & Secret',
      helpText: 'Find your API credentials in ConvertKit Settings > Advanced',
      fields: [
        { name: 'apiKey', label: 'API Key', type: 'text' },
        { name: 'apiSecret', label: 'API Secret', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://api.convertkit.com/v3',
    capabilities: ['read_subscribers', 'manage_sequences', 'create_broadcasts', 'manage_tags'],
    features: ['Subscriber management', 'Email sequences', 'Landing pages', 'Creator network'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'activecampaign',
    name: 'ActiveCampaign',
    description: 'Connect ActiveCampaign for email marketing and automation.',
    category: 'MARKETING',
    provider: 'ActiveCampaign',
    logoUrl: 'https://www.activecampaign.com/favicon.ico',
    website: 'https://activecampaign.com',
    documentationUrl: 'https://developers.activecampaign.com/reference',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API URL & Key',
      helpText: 'Find your API credentials in Settings > Developer',
      fields: [
        { name: 'apiUrl', label: 'API URL', type: 'text' },
        { name: 'apiKey', label: 'API Key', type: 'password' }
      ]
    },
    apiBaseUrl: '{apiUrl}/api/3',
    capabilities: ['read_contacts', 'manage_automations', 'create_campaigns', 'read_deals'],
    features: ['Marketing automation', 'CRM integration', 'Sales automation', 'Messaging'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'klaviyo',
    name: 'Klaviyo',
    description: 'Connect Klaviyo for e-commerce email and SMS marketing.',
    category: 'MARKETING',
    provider: 'Klaviyo',
    logoUrl: 'https://www.klaviyo.com/favicon.ico',
    website: 'https://klaviyo.com',
    documentationUrl: 'https://developers.klaviyo.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'Private API Key',
      helpText: 'Create an API key in Account > Settings > API Keys',
      headerName: 'Authorization',
      headerPrefix: 'Klaviyo-API-Key '
    },
    apiBaseUrl: 'https://a.klaviyo.com/api',
    capabilities: ['read_profiles', 'manage_lists', 'create_campaigns', 'track_events'],
    features: ['E-commerce integration', 'Segmentation', 'Flow automation', 'SMS marketing'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'constant-contact',
    name: 'Constant Contact',
    description: 'Connect Constant Contact for email marketing.',
    category: 'MARKETING',
    provider: 'Constant Contact',
    logoUrl: 'https://www.constantcontact.com/favicon.ico',
    website: 'https://constantcontact.com',
    documentationUrl: 'https://developer.constantcontact.com/api_reference/index.html',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://authz.constantcontact.com/oauth2/default/v1/authorize',
      tokenUrl: 'https://authz.constantcontact.com/oauth2/default/v1/token',
      scopes: ['contact_data', 'campaign_data', 'account_read'],
      clientIdEnvKey: 'CONSTANT_CONTACT_CLIENT_ID',
      clientSecretEnvKey: 'CONSTANT_CONTACT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.cc.email/v3',
    capabilities: ['read_contacts', 'manage_lists', 'create_campaigns', 'read_reports'],
    features: ['Email campaigns', 'Contact management', 'Signup forms', 'Event marketing'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'mailgun',
    name: 'Mailgun',
    description: 'Connect Mailgun for transactional email delivery.',
    category: 'EMAIL',
    provider: 'Sinch Mailgun',
    logoUrl: 'https://www.mailgun.com/favicon.ico',
    website: 'https://mailgun.com',
    documentationUrl: 'https://documentation.mailgun.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Find your API key in Mailgun Dashboard > API Security',
      headerName: 'Authorization',
      headerPrefix: 'Basic ',
      basicAuthUser: 'api'
    },
    apiBaseUrl: 'https://api.mailgun.net/v3',
    capabilities: ['send_email', 'read_logs', 'manage_routes', 'validate_email'],
    features: ['Email sending', 'Webhooks', 'Email validation', 'Analytics'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'postmark',
    name: 'Postmark',
    description: 'Connect Postmark for reliable transactional email.',
    category: 'EMAIL',
    provider: 'ActiveCampaign',
    logoUrl: 'https://postmarkapp.com/favicon.ico',
    website: 'https://postmarkapp.com',
    documentationUrl: 'https://postmarkapp.com/developer',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'Server API Token',
      helpText: 'Find your token in Server > API Tokens',
      headerName: 'X-Postmark-Server-Token'
    },
    apiBaseUrl: 'https://api.postmarkapp.com',
    capabilities: ['send_email', 'read_stats', 'manage_templates', 'read_bounces'],
    features: ['Fast delivery', 'Email templates', 'Delivery stats', 'Bounce handling'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'brevo',
    name: 'Brevo (Sendinblue)',
    description: 'Connect Brevo for email, SMS, and marketing automation.',
    category: 'MARKETING',
    provider: 'Brevo',
    logoUrl: 'https://www.brevo.com/favicon.ico',
    website: 'https://brevo.com',
    documentationUrl: 'https://developers.brevo.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Generate an API key in SMTP & API > API Keys',
      headerName: 'api-key'
    },
    apiBaseUrl: 'https://api.brevo.com/v3',
    capabilities: ['send_email', 'manage_contacts', 'create_campaigns', 'send_sms'],
    features: ['Email marketing', 'SMS campaigns', 'Marketing automation', 'CRM'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'campaign-monitor',
    name: 'Campaign Monitor',
    description: 'Connect Campaign Monitor for email marketing.',
    category: 'MARKETING',
    provider: 'Campaign Monitor',
    logoUrl: 'https://www.campaignmonitor.com/favicon.ico',
    website: 'https://campaignmonitor.com',
    documentationUrl: 'https://www.campaignmonitor.com/api/v3.3/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.createsend.com/oauth',
      tokenUrl: 'https://api.createsend.com/oauth/token',
      scopes: ['ViewReports', 'ManageLists', 'CreateCampaigns', 'SendCampaigns'],
      clientIdEnvKey: 'CAMPAIGN_MONITOR_CLIENT_ID',
      clientSecretEnvKey: 'CAMPAIGN_MONITOR_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.createsend.com/api/v3.3',
    capabilities: ['read_campaigns', 'manage_lists', 'create_campaigns', 'read_stats'],
    features: ['Email builder', 'List management', 'Journey automation', 'Analytics'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { emailMarketingIntegrations };
