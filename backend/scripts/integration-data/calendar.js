/**
 * Calendar & Scheduling Integrations
 * Already implemented: google-calendar
 */

const calendarIntegrations = [
  {
    slug: 'outlook-calendar',
    name: 'Outlook Calendar',
    description: 'Connect Outlook Calendar to sync events and schedules.',
    category: 'CALENDAR',
    provider: 'Microsoft',
    logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Microsoft_Office_Outlook_%282018%E2%80%93present%29.svg',
    website: 'https://outlook.com/calendar',
    documentationUrl: 'https://docs.microsoft.com/en-us/graph/outlook-calendar-concept-overview',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      userInfoUrl: 'https://graph.microsoft.com/v1.0/me',
      scopes: ['Calendars.Read', 'Calendars.ReadWrite', 'User.Read', 'offline_access'],
      clientIdEnvKey: 'MICROSOFT_CLIENT_ID',
      clientSecretEnvKey: 'MICROSOFT_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://graph.microsoft.com/v1.0',
    capabilities: ['read_events', 'create_events', 'update_events', 'read_calendars'],
    features: ['Calendar sync', 'Event creation', 'Meeting scheduling', 'Free/busy lookup'],
    pricingType: 'free',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'calendly',
    name: 'Calendly',
    description: 'Connect Calendly for automated scheduling.',
    category: 'CALENDAR',
    provider: 'Calendly',
    logoUrl: 'https://calendly.com/favicon.ico',
    website: 'https://calendly.com',
    documentationUrl: 'https://developer.calendly.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://auth.calendly.com/oauth/authorize',
      tokenUrl: 'https://auth.calendly.com/oauth/token',
      userInfoUrl: 'https://api.calendly.com/users/me',
      scopes: ['default'],
      clientIdEnvKey: 'CALENDLY_CLIENT_ID',
      clientSecretEnvKey: 'CALENDLY_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.calendly.com',
    capabilities: ['read_events', 'read_event_types', 'manage_scheduling_links', 'webhooks'],
    features: ['Booking pages', 'Event notifications', 'Team scheduling', 'Integrations'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: true
  },
  {
    slug: 'calcom',
    name: 'Cal.com',
    description: 'Connect Cal.com for open-source scheduling infrastructure.',
    category: 'CALENDAR',
    provider: 'Cal.com',
    logoUrl: 'https://cal.com/favicon.ico',
    website: 'https://cal.com',
    documentationUrl: 'https://cal.com/docs/api-reference',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://app.cal.com/oauth/authorize',
      tokenUrl: 'https://app.cal.com/oauth/token',
      scopes: ['READ_PROFILE', 'READ_BOOKING', 'WRITE_BOOKING'],
      clientIdEnvKey: 'CALCOM_CLIENT_ID',
      clientSecretEnvKey: 'CALCOM_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.cal.com/v1',
    capabilities: ['read_bookings', 'create_bookings', 'read_availability', 'manage_event_types'],
    features: ['Scheduling', 'Team availability', 'Custom booking pages', 'Webhooks'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Connect Acuity for appointment scheduling.',
    category: 'CALENDAR',
    provider: 'Squarespace',
    logoUrl: 'https://acuityscheduling.com/favicon.ico',
    website: 'https://acuityscheduling.com',
    documentationUrl: 'https://developers.acuityscheduling.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://acuityscheduling.com/oauth2/authorize',
      tokenUrl: 'https://acuityscheduling.com/oauth2/token',
      scopes: ['api-v1'],
      clientIdEnvKey: 'ACUITY_CLIENT_ID',
      clientSecretEnvKey: 'ACUITY_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://acuityscheduling.com/api/v1',
    capabilities: ['read_appointments', 'create_appointments', 'read_availability', 'manage_clients'],
    features: ['Online booking', 'Client management', 'Payment collection', 'Reminders'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'doodle',
    name: 'Doodle',
    description: 'Connect Doodle for group scheduling and polls.',
    category: 'CALENDAR',
    provider: 'Doodle',
    logoUrl: 'https://doodle.com/favicon.ico',
    website: 'https://doodle.com',
    documentationUrl: 'https://developer.doodle.com/',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://doodle.com/api/v2.0/oauth2/authorize',
      tokenUrl: 'https://doodle.com/api/v2.0/oauth2/token',
      scopes: ['read', 'write'],
      clientIdEnvKey: 'DOODLE_CLIENT_ID',
      clientSecretEnvKey: 'DOODLE_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://doodle.com/api/v2.0',
    capabilities: ['create_polls', 'read_polls', 'manage_bookings'],
    features: ['Group scheduling', 'Poll creation', 'Booking pages', 'Time zone support'],
    pricingType: 'freemium',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'youcanbookme',
    name: 'YouCanBook.me',
    description: 'Connect YouCanBook.me for online booking.',
    category: 'CALENDAR',
    provider: 'YouCanBook.me',
    logoUrl: 'https://youcanbook.me/favicon.ico',
    website: 'https://youcanbook.me',
    documentationUrl: 'https://api.youcanbook.me/',
    authType: 'api_key',
    authConfig: {
      fieldLabel: 'API Key',
      helpText: 'Get your API key from Account Settings',
      headerName: 'Authorization',
      headerPrefix: 'Bearer '
    },
    apiBaseUrl: 'https://api.youcanbook.me/v1',
    capabilities: ['read_bookings', 'manage_profiles', 'read_availability'],
    features: ['Booking pages', 'Calendar sync', 'Custom branding', 'Notifications'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  },
  {
    slug: 'savvycal',
    name: 'SavvyCal',
    description: 'Connect SavvyCal for personalized scheduling.',
    category: 'CALENDAR',
    provider: 'SavvyCal',
    logoUrl: 'https://savvycal.com/favicon.ico',
    website: 'https://savvycal.com',
    documentationUrl: 'https://savvycal.com/docs/api',
    authType: 'oauth2',
    authConfig: {
      authorizationUrl: 'https://savvycal.com/oauth/authorize',
      tokenUrl: 'https://savvycal.com/oauth/token',
      scopes: ['read_events', 'write_events', 'read_profile'],
      clientIdEnvKey: 'SAVVYCAL_CLIENT_ID',
      clientSecretEnvKey: 'SAVVYCAL_CLIENT_SECRET'
    },
    apiBaseUrl: 'https://api.savvycal.com',
    capabilities: ['read_events', 'create_links', 'read_availability'],
    features: ['Overlay scheduling', 'Ranked availability', 'Team scheduling', 'Personalized links'],
    pricingType: 'paid',
    isVerified: true,
    isFeatured: false
  }
];

module.exports = { calendarIntegrations };
