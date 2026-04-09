/**
 * Project Management Integrations
 * Already implemented: jira, trello, asana, linear, notion
 */

const projectManagementIntegrations = [
  {
    slug: 'monday',
    name: 'Monday.com',
    description: 'Connect Monday.com to sync boards, items, and workflows.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'Monday.com',
    logoUrl: 'https://dapulse-res.cloudinary.com/image/upload/f_auto,q_auto/remote_mondaycom_static/img/monday-logo-x2.png',
    website: 'https://monday.com',
    documentationUrl: 'https://developer.monday.com/api-reference/docs',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://auth.monday.com/oauth2/authorize',
      tokenUrl: 'https://auth.monday.com/oauth2/token',
      scopes: ['me:read', 'boards:read', 'boards:write', 'workspaces:read'],
      clientIdEnvKey: 'MONDAY_CLIENT_ID',
      clientSecretEnvKey: 'MONDAY_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.monday.com/v2',
    capabilities: ['read_boards', 'create_items', 'update_items', 'read_workspaces'],
    features: ['Board sync', 'Item management', 'Status updates', 'Timeline tracking'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'clickup',
    name: 'ClickUp',
    description: 'Connect ClickUp to sync tasks, lists, and project workflows.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'ClickUp',
    logoUrl: 'https://clickup.com/landing/images/clickup-symbol_color.svg',
    website: 'https://clickup.com',
    documentationUrl: 'https://clickup.com/api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.clickup.com/api',
      tokenUrl: 'https://api.clickup.com/api/v2/oauth/token',
      userInfoUrl: 'https://api.clickup.com/api/v2/user',
      scopes: [],
      clientIdEnvKey: 'CLICKUP_CLIENT_ID',
      clientSecretEnvKey: 'CLICKUP_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.clickup.com/api/v2',
    capabilities: ['read_tasks', 'create_tasks', 'update_tasks', 'read_spaces'],
    features: ['Task sync', 'List management', 'Time tracking', 'Custom fields'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'basecamp',
    name: 'Basecamp',
    description: 'Connect Basecamp for project management and team collaboration.',
    category: 'PROJECT_MANAGEMENT',
    provider: '37signals',
    logoUrl: 'https://basecamp.com/favicon.ico',
    website: 'https://basecamp.com',
    documentationUrl: 'https://github.com/basecamp/bc3-api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://launchpad.37signals.com/authorization/new',
      tokenUrl: 'https://launchpad.37signals.com/authorization/token',
      userInfoUrl: 'https://launchpad.37signals.com/authorization.json',
      scopes: [],
      clientIdEnvKey: 'BASECAMP_CLIENT_ID',
      clientSecretEnvKey: 'BASECAMP_CLIENT_SECRET',
      extraAuthParams: { type: 'web_server' }
    },
    apiBaseUrl: 'https://3.basecampapi.com',
    capabilities: ['read_projects', 'create_todos', 'read_messages', 'manage_schedules'],
    features: ['Project overview', 'To-do lists', 'Message boards', 'Schedules'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'wrike',
    name: 'Wrike',
    description: 'Connect Wrike for project management and collaboration.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'Wrike',
    logoUrl: 'https://www.wrike.com/tp/build-f3e9d9c/images/logo/icon-wrike-2021.svg',
    website: 'https://wrike.com',
    documentationUrl: 'https://developers.wrike.com/api/v4/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.wrike.com/oauth2/authorize/v4',
      tokenUrl: 'https://login.wrike.com/oauth2/token',
      userInfoUrl: 'https://www.wrike.com/api/v4/contacts?me=true',
      scopes: ['wsReadOnly', 'wsReadWrite', 'amReadOnlyWorkflow', 'amReadWriteWorkflow'],
      clientIdEnvKey: 'WRIKE_CLIENT_ID',
      clientSecretEnvKey: 'WRIKE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://www.wrike.com/api/v4',
    capabilities: ['read_tasks', 'create_tasks', 'read_folders', 'manage_workflows'],
    features: ['Task sync', 'Folder management', 'Custom workflows', 'Time tracking'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'smartsheet',
    name: 'Smartsheet',
    description: 'Connect Smartsheet for work management and collaboration.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'Smartsheet',
    logoUrl: 'https://www.smartsheet.com/sites/default/files/2022-03/smartsheet-logo-blue-new.svg',
    website: 'https://smartsheet.com',
    documentationUrl: 'https://smartsheet.redoc.ly/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.smartsheet.com/b/authorize',
      tokenUrl: 'https://api.smartsheet.com/2.0/token',
      userInfoUrl: 'https://api.smartsheet.com/2.0/users/me',
      scopes: ['READ_SHEETS', 'WRITE_SHEETS', 'READ_USERS', 'CREATE_SHEETS'],
      clientIdEnvKey: 'SMARTSHEET_CLIENT_ID',
      clientSecretEnvKey: 'SMARTSHEET_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.smartsheet.com/2.0',
    capabilities: ['read_sheets', 'create_sheets', 'update_rows', 'manage_workspaces'],
    features: ['Sheet sync', 'Row management', 'Automated workflows', 'Reports'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'airtable',
    name: 'Airtable',
    description: 'Connect Airtable to sync bases, tables, and records.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'Airtable',
    logoUrl: 'https://airtable.com/images/favicon/baymax/favicon-32x32.png',
    website: 'https://airtable.com',
    documentationUrl: 'https://airtable.com/developers/web/api/introduction',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://airtable.com/oauth2/v1/authorize',
      tokenUrl: 'https://airtable.com/oauth2/v1/token',
      userInfoUrl: 'https://api.airtable.com/v0/meta/whoami',
      scopes: ['data.records:read', 'data.records:write', 'schema.bases:read', 'user.email:read'],
      clientIdEnvKey: 'AIRTABLE_CLIENT_ID',
      clientSecretEnvKey: 'AIRTABLE_CLIENT_SECRET',
      usePKCE: true
    },
    apiBaseUrl: 'https://api.airtable.com/v0',
    capabilities: ['read_records', 'create_records', 'update_records', 'read_bases'],
    features: ['Base sync', 'Record management', 'View filtering', 'Field mapping'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'teamwork',
    name: 'Teamwork',
    description: 'Connect Teamwork for project management and team collaboration.',
    category: 'PROJECT_MANAGEMENT',
    provider: 'Teamwork',
    logoUrl: 'https://www.teamwork.com/favicon.ico',
    website: 'https://teamwork.com',
    documentationUrl: 'https://developer.teamwork.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.teamwork.com/launchpad/login',
      tokenUrl: 'https://www.teamwork.com/launchpad/v1/token.json',
      userInfoUrl: 'https://{subdomain}.teamwork.com/me.json',
      scopes: [],
      clientIdEnvKey: 'TEAMWORK_CLIENT_ID',
      clientSecretEnvKey: 'TEAMWORK_CLIENT_SECRET',
      requiresSubdomain: true
    },
    apiBaseUrl: 'https://{subdomain}.teamwork.com',
    capabilities: ['read_projects', 'create_tasks', 'read_time_entries', 'manage_milestones'],
    features: ['Project sync', 'Task lists', 'Time tracking', 'Milestones'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { projectManagementIntegrations };
