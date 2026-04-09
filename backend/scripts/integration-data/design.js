/**
 * Design & Creative Integrations
 * Already implemented: figma
 */

const designIntegrations = [
  {
    slug: 'canva',
    name: 'Canva',
    description: 'Connect Canva for design collaboration.',
    category: 'DESIGN',
    provider: 'Canva',
    logoUrl: 'https://static.canva.com/static/images/favicon-1.ico',
    website: 'https://canva.com',
    documentationUrl: 'https://www.canva.com/developers/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.canva.com/api/oauth/authorize',
      tokenUrl: 'https://www.canva.com/api/oauth/token',
      scopes: ['design:content:read', 'design:content:write', 'asset:read', 'asset:write'],
      clientIdEnvKey: 'CANVA_CLIENT_ID',
      clientSecretEnvKey: 'CANVA_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.canva.com/rest/v1',
    capabilities: ['read_designs', 'create_designs', 'export_designs', 'manage_folders'],
    features: ['Design access', 'Template library', 'Brand kit', 'Export options'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'adobe-cc',
    name: 'Adobe Creative Cloud',
    description: 'Connect Adobe Creative Cloud for design assets.',
    category: 'DESIGN',
    provider: 'Adobe',
    logoUrl: 'https://www.adobe.com/favicon.ico',
    website: 'https://adobe.com/creativecloud',
    documentationUrl: 'https://developer.adobe.com/creative-cloud-libraries/docs/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://ims-na1.adobelogin.com/ims/authorize/v2',
      tokenUrl: 'https://ims-na1.adobelogin.com/ims/token/v3',
      userInfoUrl: 'https://ims-na1.adobelogin.com/ims/userinfo/v2',
      scopes: ['openid', 'creative_sdk', 'AdobeID', 'cc_files', 'cc_libraries'],
      clientIdEnvKey: 'ADOBE_CLIENT_ID',
      clientSecretEnvKey: 'ADOBE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://cc-api-storage.adobe.io',
    capabilities: ['read_assets', 'read_libraries', 'sync_files', 'manage_fonts'],
    features: ['CC Libraries', 'Asset sync', 'Font management', 'Stock integration'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'invision',
    name: 'InVision',
    description: 'Connect InVision for design prototyping.',
    category: 'DESIGN',
    provider: 'InVision',
    logoUrl: 'https://www.invisionapp.com/favicon.ico',
    website: 'https://invisionapp.com',
    documentationUrl: 'https://developers.invisionapp.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://projects.invisionapp.com/oauth',
      tokenUrl: 'https://projects.invisionapp.com/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'INVISION_CLIENT_ID',
      clientSecretEnvKey: 'INVISION_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.invisionapp.com/v1',
    capabilities: ['read_projects', 'read_screens', 'manage_prototypes', 'read_comments'],
    features: ['Prototype access', 'Screen management', 'Comments sync', 'Inspect mode'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'sketch',
    name: 'Sketch',
    description: 'Connect Sketch for design collaboration.',
    category: 'DESIGN',
    provider: 'Sketch',
    logoUrl: 'https://www.sketch.com/favicon.ico',
    website: 'https://sketch.com',
    documentationUrl: 'https://developer.sketch.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://sketch.cloud/oauth/authorize',
      tokenUrl: 'https://sketch.cloud/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'SKETCH_CLIENT_ID',
      clientSecretEnvKey: 'SKETCH_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.sketch.cloud/v1',
    capabilities: ['read_documents', 'read_artboards', 'export_assets', 'read_libraries'],
    features: ['Document access', 'Artboard export', 'Symbol libraries', 'Version history'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'miro',
    name: 'Miro',
    description: 'Connect Miro for visual collaboration.',
    category: 'DESIGN',
    provider: 'Miro',
    logoUrl: 'https://miro.com/favicon.ico',
    website: 'https://miro.com',
    documentationUrl: 'https://developers.miro.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://miro.com/oauth/authorize',
      tokenUrl: 'https://api.miro.com/v1/oauth/token',
      userInfoUrl: 'https://api.miro.com/v1/users/me',
      scopes: ['boards:read', 'boards:write', 'identity:read', 'team:read'],
      clientIdEnvKey: 'MIRO_CLIENT_ID',
      clientSecretEnvKey: 'MIRO_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.miro.com/v2',
    capabilities: ['read_boards', 'create_boards', 'manage_items', 'read_teams'],
    features: ['Board access', 'Widget creation', 'Team collaboration', 'Templates'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'framer',
    name: 'Framer',
    description: 'Connect Framer for interactive design.',
    category: 'DESIGN',
    provider: 'Framer',
    logoUrl: 'https://www.framer.com/favicon.ico',
    website: 'https://framer.com',
    documentationUrl: 'https://www.framer.com/developers/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://framer.com/oauth/authorize',
      tokenUrl: 'https://framer.com/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'FRAMER_CLIENT_ID',
      clientSecretEnvKey: 'FRAMER_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.framer.com/v1',
    capabilities: ['read_projects', 'export_code', 'manage_components'],
    features: ['Project access', 'Code export', 'Component library', 'Animations'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'zeplin',
    name: 'Zeplin',
    description: 'Connect Zeplin for design handoff.',
    category: 'DESIGN',
    provider: 'Zeplin',
    logoUrl: 'https://zeplin.io/favicon.ico',
    website: 'https://zeplin.io',
    documentationUrl: 'https://docs.zeplin.dev/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://api.zeplin.dev/v1/oauth/authorize',
      tokenUrl: 'https://api.zeplin.dev/v1/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'ZEPLIN_CLIENT_ID',
      clientSecretEnvKey: 'ZEPLIN_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.zeplin.dev/v1',
    capabilities: ['read_projects', 'read_screens', 'read_components', 'export_assets'],
    features: ['Design specs', 'Style guides', 'Asset export', 'Annotations'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'abstract',
    name: 'Abstract',
    description: 'Connect Abstract for design version control.',
    category: 'DESIGN',
    provider: 'Abstract',
    logoUrl: 'https://www.abstract.com/favicon.ico',
    website: 'https://abstract.com',
    documentationUrl: 'https://developer.abstract.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.abstract.com/oauth/authorize',
      tokenUrl: 'https://api.abstract.com/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'ABSTRACT_CLIENT_ID',
      clientSecretEnvKey: 'ABSTRACT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.abstract.com/v1',
    capabilities: ['read_projects', 'read_branches', 'read_commits', 'manage_collections'],
    features: ['Version control', 'Branching', 'Design reviews', 'Collections'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'marvel',
    name: 'Marvel',
    description: 'Connect Marvel for design and prototyping.',
    category: 'DESIGN',
    provider: 'Marvel',
    logoUrl: 'https://marvelapp.com/favicon.ico',
    website: 'https://marvelapp.com',
    documentationUrl: 'https://marvelapp.com/developers/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://marvelapp.com/oauth/authorize',
      tokenUrl: 'https://marvelapp.com/oauth/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'MARVEL_CLIENT_ID',
      clientSecretEnvKey: 'MARVEL_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.marvelapp.com/v1',
    capabilities: ['read_projects', 'create_screens', 'manage_prototypes', 'read_feedback'],
    features: ['Prototyping', 'User testing', 'Design specs', 'Handoff'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { designIntegrations };
