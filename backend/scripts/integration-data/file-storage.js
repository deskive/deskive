/**
 * File Storage & Documents Integrations
 * Already implemented: google-drive, dropbox
 */

const fileStorageIntegrations = [
  {
    slug: 'onedrive',
    name: 'OneDrive',
    description: 'Connect OneDrive to access and manage files in Microsoft cloud storage.',
    category: 'FILE_STORAGE',
    provider: 'Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Microsoft_Office_OneDrive_%282019%E2%80%93present%29.svg',
    website: 'https://onedrive.live.com',
    documentationUrl: 'https://docs.microsoft.com/en-us/onedrive/developer/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['Files.Read', 'Files.ReadWrite', 'User.Read', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    capabilities: ['read_files', 'write_files', 'list_folders', 'share_files'],
    features: ['File sync', 'Folder browsing', 'File sharing', 'Search files'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'box',
    name: 'Box',
    description: 'Connect Box for secure cloud content management.',
    category: 'FILE_STORAGE',
    provider: 'Box',
    logoUrl: 'https://www.box.com/favicon.ico',
    website: 'https://box.com',
    documentationUrl: 'https://developer.box.com/reference/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://account.box.com/api/oauth2/authorize',
      tokenUrl: 'https://api.box.com/oauth2/token',
      revokeUrl: 'https://api.box.com/oauth2/revoke',
      userInfoUrl: 'https://api.box.com/2.0/users/me',
      scopes: ['root_readonly', 'root_readwrite'],
      clientIdEnvKey: 'BOX_CLIENT_ID',
      clientSecretEnvKey: 'BOX_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.box.com/2.0',
    capabilities: ['read_files', 'write_files', 'manage_folders', 'share_files'],
    features: ['File sync', 'Secure sharing', 'Version history', 'Collaboration'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'sharepoint',
    name: 'SharePoint',
    description: 'Connect SharePoint for enterprise document management.',
    category: 'FILE_STORAGE',
    provider: 'Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Microsoft_Office_SharePoint_%282019%E2%80%93present%29.svg',
    website: 'https://sharepoint.com',
    documentationUrl: 'https://docs.microsoft.com/en-us/sharepoint/dev/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['Sites.Read.All', 'Sites.ReadWrite.All', 'Files.Read.All', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    capabilities: ['read_sites', 'read_files', 'write_files', 'manage_lists'],
    features: ['Site access', 'Document libraries', 'List management', 'Search'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'pcloud',
    name: 'pCloud',
    description: 'Connect pCloud for secure cloud file storage.',
    category: 'FILE_STORAGE',
    provider: 'pCloud',
    logoUrl: 'https://www.pcloud.com/favicon.ico',
    website: 'https://pcloud.com',
    documentationUrl: 'https://docs.pcloud.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://my.pcloud.com/oauth2/authorize',
      tokenUrl: 'https://api.pcloud.com/oauth2_token',
      userInfoUrl: 'https://api.pcloud.com/userinfo',
      scopes: [],
      clientIdEnvKey: 'PCLOUD_CLIENT_ID',
      clientSecretEnvKey: 'PCLOUD_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.pcloud.com',
    capabilities: ['read_files', 'write_files', 'list_folders', 'share_links'],
    features: ['File sync', 'Public links', 'Media streaming', 'Encryption'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'egnyte',
    name: 'Egnyte',
    description: 'Connect Egnyte for enterprise file sharing and governance.',
    category: 'FILE_STORAGE',
    provider: 'Egnyte',
    logoUrl: 'https://www.egnyte.com/favicon.ico',
    website: 'https://egnyte.com',
    documentationUrl: 'https://developers.egnyte.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://{domain}.egnyte.com/puboauth/token',
      tokenUrl: 'https://{domain}.egnyte.com/puboauth/token',
      scopes: ['Egnyte.filesystem', 'Egnyte.link', 'Egnyte.user'],
      clientIdEnvKey: 'EGNYTE_CLIENT_ID',
      clientSecretEnvKey: 'EGNYTE_CLIENT_SECRET',
      requiresSubdomain: true
    },
    apiBaseUrl: 'https://{domain}.egnyte.com/pubapi/v1',
    capabilities: ['read_files', 'write_files', 'manage_permissions', 'create_links'],
    features: ['File governance', 'Permission management', 'Audit trails', 'Secure links'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'nextcloud',
    name: 'Nextcloud',
    description: 'Connect self-hosted Nextcloud for file sync and collaboration.',
    category: 'FILE_STORAGE',
    provider: 'Nextcloud',
    logoUrl: 'https://nextcloud.com/c/uploads/2022/03/favicon.png',
    website: 'https://nextcloud.com',
    documentationUrl: 'https://docs.nextcloud.com/server/latest/developer_manual/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: '{instance}/index.php/apps/oauth2/authorize',
      tokenUrl: '{instance}/index.php/apps/oauth2/api/v1/token',
      userInfoUrl: '{instance}/ocs/v2.php/cloud/user',
      scopes: [],
      clientIdEnvKey: 'NEXTCLOUD_CLIENT_ID',
      clientSecretEnvKey: 'NEXTCLOUD_CLIENT_SECRET',
      requiresInstanceUrl: true
    },
    apiBaseUrl: '{instance}/remote.php/dav',
    capabilities: ['read_files', 'write_files', 'share_files', 'manage_calendars'],
    features: ['File sync', 'Calendar', 'Contacts', 'Collaborative editing'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'mega',
    name: 'MEGA',
    description: 'Connect MEGA for encrypted cloud storage.',
    category: 'FILE_STORAGE',
    provider: 'MEGA',
    logoUrl: 'https://mega.io/favicon.ico',
    website: 'https://mega.io',
    documentationUrl: 'https://mega.io/developers',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Generate an API key from your MEGA account settings'
    },
    apiBaseUrl: 'https://g.api.mega.co.nz',
    capabilities: ['read_files', 'write_files', 'share_folders', 'encryption'],
    features: ['End-to-end encryption', 'Large file transfer', 'Folder sharing'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'icloud',
    name: 'iCloud Drive',
    description: 'Connect iCloud Drive for Apple ecosystem file storage.',
    category: 'FILE_STORAGE',
    provider: 'Apple',
    logoUrl: 'https://www.apple.com/favicon.ico',
    website: 'https://icloud.com',
    documentationUrl: 'https://developer.apple.com/documentation/cloudkitjs',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://appleid.apple.com/auth/authorize',
      tokenUrl: 'https://appleid.apple.com/auth/token',
      scopes: ['name', 'email'],
      clientIdEnvKey: 'APPLE_CLIENT_ID',
      clientSecretEnvKey: 'APPLE_CLIENT_SECRET',
      extraAuthParams: { response_mode: 'form_post' }
    },
    apiBaseUrl: 'https://api.apple-cloudkit.com',
    capabilities: ['read_files', 'write_files'],
    features: ['Apple ecosystem sync', 'Document storage'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { fileStorageIntegrations };
