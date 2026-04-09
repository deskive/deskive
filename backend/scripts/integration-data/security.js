/**
 * Security & Identity Integrations
 */

const securityIntegrations = [
  {
    slug: 'okta',
    name: 'Okta',
    description: 'Connect Okta for identity management.',
    category: 'SECURITY',
    provider: 'Okta',
    logoUrl: 'https://www.okta.com/favicon.ico',
    website: 'https://okta.com',
    documentationUrl: 'https://developer.okta.com/docs/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{domain}.okta.com/oauth2/v1/authorize',
      tokenUrl: 'https://{domain}.okta.com/oauth2/v1/token',
      scopes: ['openid', 'profile', 'email', 'okta.users.read'],
      clientIdEnvKey: 'OKTA_CLIENT_ID',
      clientSecretEnvKey: 'OKTA_CLIENT_SECRET',
      requiresSubdomain: true,
      subdomainField: 'domain'
    },
    apiBaseUrl: 'https://{domain}.okta.com/api/v1',
    capabilities: ['read_users', 'manage_groups', 'read_apps'],
    features: ['SSO', 'MFA', 'Lifecycle management', 'Universal directory'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'auth0',
    name: 'Auth0',
    description: 'Connect Auth0 for authentication.',
    category: 'SECURITY',
    provider: 'Okta',
    logoUrl: 'https://cdn.auth0.com/website/assets/pages/press/img/favicon.png',
    website: 'https://auth0.com',
    documentationUrl: 'https://auth0.com/docs/api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{tenant}.auth0.com/authorize',
      tokenUrl: 'https://{tenant}.auth0.com/oauth/token',
      scopes: ['openid', 'profile', 'email', 'read:users', 'read:connections'],
      clientIdEnvKey: 'AUTH0_CLIENT_ID',
      clientSecretEnvKey: 'AUTH0_CLIENT_SECRET',
      requiresSubdomain: true,
      subdomainField: 'tenant'
    },
    apiBaseUrl: 'https://{tenant}.auth0.com/api/v2',
    capabilities: ['read_users', 'manage_connections', 'read_logs'],
    features: ['Universal login', 'MFA', 'Social connections', 'Rules'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'onelogin',
    name: 'OneLogin',
    description: 'Connect OneLogin for IAM.',
    category: 'SECURITY',
    provider: 'OneLogin',
    logoUrl: 'https://www.onelogin.com/favicon.ico',
    website: 'https://onelogin.com',
    documentationUrl: 'https://developers.onelogin.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{subdomain}.onelogin.com/oidc/2/auth',
      tokenUrl: 'https://{subdomain}.onelogin.com/oidc/2/token',
      scopes: ['openid', 'profile'],
      clientIdEnvKey: 'ONELOGIN_CLIENT_ID',
      clientSecretEnvKey: 'ONELOGIN_CLIENT_SECRET',
      requiresSubdomain: true
    },
    apiBaseUrl: 'https://api.{region}.onelogin.com/api/2',
    capabilities: ['read_users', 'manage_apps', 'read_events'],
    features: ['SSO', 'MFA', 'Directory sync', 'RADIUS'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'onepassword',
    name: '1Password',
    description: 'Connect 1Password for password management.',
    category: 'SECURITY',
    provider: '1Password',
    logoUrl: 'https://1password.com/favicon.ico',
    website: 'https://1password.com',
    documentationUrl: 'https://developer.1password.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://my.1password.com/v2/auth',
      tokenUrl: 'https://my.1password.com/v2/auth/token',
      scopes: ['vaults.read', 'items.read'],
      clientIdEnvKey: 'ONEPASSWORD_CLIENT_ID',
      clientSecretEnvKey: 'ONEPASSWORD_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://events.1password.com/api/v1',
    capabilities: ['read_events', 'read_items', 'manage_vaults'],
    features: ['Password vault', 'Secret management', 'Watchtower', 'Travel mode'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'lastpass',
    name: 'LastPass',
    description: 'Connect LastPass for password management.',
    category: 'SECURITY',
    provider: 'LastPass',
    logoUrl: 'https://lastpass.com/favicon.ico',
    website: 'https://lastpass.com',
    documentationUrl: 'https://support.lastpass.com/help/about-the-lastpass-api-lp010068',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'Provisioning Hash',
      helpText: 'Get from Admin Console > API',
      fields: [
        { name: 'cid', label: 'Account Number', type: 'text' },
        { name: 'provhash', label: 'Provisioning Hash', type: 'password' }
      ]
    },
    apiBaseUrl: 'https://lastpass.com/enterpriseapi.php',
    capabilities: ['read_users', 'manage_groups', 'read_events'],
    features: ['Password vault', 'Admin console', 'Directory sync', 'Policies'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { securityIntegrations };
