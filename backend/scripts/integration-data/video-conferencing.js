/**
 * Video Conferencing Integrations
 * Already implemented: zoom
 */

const videoConferencingIntegrations = [
  {
    slug: 'google-meet',
    name: 'Google Meet',
    description: 'Connect Google Meet for video conferencing.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Google',
    logoUrl: 'https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/192px.svg',
    website: 'https://meet.google.com',
    documentationUrl: 'https://developers.google.com/calendar/api/guides/create-events#conferencing',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
      scopes: ['calendar.events', 'calendar.readonly'],
      scopePrefix: 'https://www.googleapis.com/auth/',
      clientIdEnvKey: 'GOOGLE_OAUTH_CLIENT_ID',
      clientSecretEnvKey: 'GOOGLE_OAUTH_CLIENT_SECRET',
      extraAuthParams: { access_type: 'offline', prompt: 'consent' }
    },
    apiBaseUrl: 'https://www.googleapis.com/calendar/v3',
    capabilities: ['create_meetings', 'read_meetings'],
    features: ['Meeting creation', 'Calendar integration', 'Screen sharing'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'webex-meetings',
    name: 'Webex Meetings',
    description: 'Connect Cisco Webex for video meetings.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Cisco',
    logoUrl: 'https://www.webex.com/content/dam/wbx/us/images/favicon/favicon.ico',
    website: 'https://webex.com',
    documentationUrl: 'https://developer.webex.com/docs/meetings',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://webexapis.com/v1/authorize',
      tokenUrl: 'https://webexapis.com/v1/access_token',
      userInfoUrl: 'https://webexapis.com/v1/people/me',
      scopes: ['meeting:schedules_read', 'meeting:schedules_write', 'spark:people_read'],
      clientIdEnvKey: 'WEBEX_CLIENT_ID',
      clientSecretEnvKey: 'WEBEX_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://webexapis.com/v1',
    capabilities: ['create_meetings', 'list_meetings', 'manage_recordings'],
    features: ['Meeting scheduling', 'Recording', 'Breakout rooms', 'Transcription'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'gotomeeting',
    name: 'GoToMeeting',
    description: 'Connect GoToMeeting for online meetings.',
    category: 'VIDEO_CONFERENCING',
    provider: 'GoTo',
    logoUrl: 'https://www.goto.com/favicon.ico',
    website: 'https://gotomeeting.com',
    documentationUrl: 'https://developer.goto.com/GoToMeetingV1',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://authentication.logmeininc.com/oauth/authorize',
      tokenUrl: 'https://authentication.logmeininc.com/oauth/token',
      userInfoUrl: 'https://api.getgo.com/admin/rest/v1/me',
      scopes: ['identity:scim.me', 'cr.users.read', 'collab:meetings.operations'],
      clientIdEnvKey: 'GOTOMEETING_CLIENT_ID',
      clientSecretEnvKey: 'GOTOMEETING_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.getgo.com/G2M/rest/v1',
    capabilities: ['create_meetings', 'list_meetings', 'get_recordings'],
    features: ['Meeting scheduling', 'Recording', 'Drawing tools', 'Mobile app'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'loom',
    name: 'Loom',
    description: 'Connect Loom for async video messaging.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Loom',
    logoUrl: 'https://www.loom.com/favicon.ico',
    website: 'https://loom.com',
    documentationUrl: 'https://dev.loom.com/docs',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://www.loom.com/oauth/authorize',
      tokenUrl: 'https://www.loom.com/oauth/token',
      scopes: ['read:account', 'read:videos', 'read:folders'],
      clientIdEnvKey: 'LOOM_CLIENT_ID',
      clientSecretEnvKey: 'LOOM_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://developer.api.loom.com',
    capabilities: ['read_videos', 'embed_videos', 'manage_folders'],
    features: ['Video library', 'Embed SDK', 'Analytics', 'Team management'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'whereby',
    name: 'Whereby',
    description: 'Connect Whereby for embedded video meetings.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Whereby',
    logoUrl: 'https://whereby.com/favicon.ico',
    website: 'https://whereby.com',
    documentationUrl: 'https://docs.whereby.com/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get your API key from Whereby Dashboard > Integrations',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.whereby.dev/v1',
    capabilities: ['create_rooms', 'delete_rooms', 'get_recordings'],
    features: ['Embeddable rooms', 'Customization', 'Recording', 'Breakout groups'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'around',
    name: 'Around',
    description: 'Connect Around for minimal video calls.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Around',
    logoUrl: 'https://www.around.co/favicon.ico',
    website: 'https://around.co',
    documentationUrl: 'https://developers.around.co/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://around.co/oauth/authorize',
      tokenUrl: 'https://around.co/oauth/token',
      scopes: ['meetings:read', 'meetings:write'],
      clientIdEnvKey: 'AROUND_CLIENT_ID',
      clientSecretEnvKey: 'AROUND_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.around.co/v1',
    capabilities: ['create_rooms', 'list_meetings'],
    features: ['Floating video', 'Auto-adjusting audio', 'Reactions', 'Noise cancellation'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'microsoft-teams-video',
    name: 'Microsoft Teams Video',
    description: 'Connect Microsoft Teams for video meetings.',
    category: 'VIDEO_CONFERENCING',
    provider: 'Microsoft',
    logoUrl: 'https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RE4OAgf',
    website: 'https://teams.microsoft.com',
    documentationUrl: 'https://docs.microsoft.com/en-us/graph/api/resources/onlinemeeting',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['OnlineMeetings.ReadWrite', 'User.Read', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    capabilities: ['create_meetings', 'list_meetings', 'get_recordings'],
    features: ['Meeting scheduling', 'Recording', 'Live transcription', 'Together mode'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { videoConferencingIntegrations };
