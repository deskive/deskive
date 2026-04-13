import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { googleDriveApi, type GoogleDriveConnection } from '@/lib/api/google-drive-api';
import { emailService, type EmailConnection } from '@/lib/api/email-api';
import { googleCalendarApi, type GoogleCalendarConnection } from '@/lib/api/calendar-api';
import { githubApi, type GitHubConnection } from '@/lib/api/github-api';
import { googleSheetsApi, type GoogleSheetsConnection } from '@/lib/api/google-sheets-api';
import dropboxApi, { type DropboxConnection } from '@/lib/api/dropbox-api';
import {
  useIntegrationCatalog,
  useUserConnections,
  type IntegrationCatalogEntry,
  type IntegrationConnection,
} from '@/lib/api/integrations-api';
import { IntegrationConnectButton } from '@/pages/integrations/components/IntegrationConnectButton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Check, ExternalLink, LogOut, Github, FileSpreadsheet, Search, Grid3X3, List } from 'lucide-react';
import { GoogleDriveBrowser } from './GoogleDriveBrowser';
import GoogleSheetsBrowser from './GoogleSheetsBrowser';
import { cn } from '@/lib/utils';

// Whether a catalog integration is "connectable right now" is decided
// by the backend: each catalog entry returns `credentialConfigured`,
// which is true when the operator has set the required env vars
// (OAuth client id/secret, or the api_key env var). No hardcoded
// list here — previously a 6-slug whitelist silently hid every other
// integration in the catalog.

// Category tab definitions - grouped by functionality
const CATEGORY_TABS: Array<{ id: string; categories: string[] }> = [
  { id: 'all', categories: [] },
  { id: 'communication', categories: ['COMMUNICATION', 'VIDEO_CONFERENCING', 'SOCIAL_MEDIA'] },
  { id: 'productivity', categories: ['FILE_STORAGE', 'CALENDAR', 'EMAIL', 'DOCUMENTATION', 'PRODUCTIVITY'] },
  { id: 'development', categories: ['DEVELOPMENT'] },
  { id: 'business', categories: ['CRM', 'FINANCE', 'HR', 'ECOMMERCE', 'PROJECT_MANAGEMENT'] },
  { id: 'marketing', categories: ['MARKETING', 'ANALYTICS'] },
  { id: 'design', categories: ['DESIGN'] },
  { id: 'ai', categories: ['AI', 'AUTOMATION'] },
  { id: 'security', categories: ['SECURITY', 'SUPPORT'] },
];

// App logos
const GoogleDriveLogo = () => (
  <img src="/icons/drive.png" alt="Google Drive" className="w-10 h-10 object-contain" />
);

const GmailLogo = () => (
  <img src="/icons/gmail.png" alt="Gmail" className="w-10 h-10 object-contain" />
);

const GoogleCalendarLogo = () => (
  <img src="/icons/calendar.png" alt="Google Calendar" className="w-10 h-10 object-contain" />
);

const GitHubLogo = () => (
  <div className="w-10 h-10 flex items-center justify-center">
    <Github className="w-8 h-8 text-foreground" />
  </div>
);

const GoogleSheetsLogo = () => (
  <div className="w-10 h-10 flex items-center justify-center rounded bg-green-100 dark:bg-green-900/30">
    <FileSpreadsheet className="w-7 h-7 text-green-600 dark:text-green-400" />
  </div>
);

const DropboxLogo = () => (
  <img src="https://cfl.dropboxstatic.com/static/images/logo_catalog/dropbox_logo_glyph_2024.svg" alt="Dropbox" className="w-10 h-10 object-contain" />
);

interface AppCardProps {
  name: string;
  description: string;
  icon: React.ReactNode;
  category?: string;
  isConnected: boolean;
  isLoading: boolean;
  connectionInfo?: string;
  onConnect: () => void;
  onOpen: () => void;
  onDisconnect: () => void;
}

function AppCard({
  name,
  description,
  icon,
  category,
  isConnected,
  isLoading,
  connectionInfo,
  onConnect,
  onOpen,
  onDisconnect,
}: AppCardProps) {
  const intl = useIntl();

  return (
    <Card className="hover:border-primary/50 transition-colors h-full flex flex-col">
      <CardHeader className="flex flex-row items-start gap-4 flex-1">
        <div className="p-2 bg-muted rounded-lg shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base truncate">{name}</CardTitle>
            {isConnected && (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 shrink-0">
                <Check className="w-3 h-3 mr-1" />
                {intl.formatMessage({ id: 'integrations.status.connected', defaultMessage: 'Connected' })}
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1 line-clamp-2 text-sm">{description}</CardDescription>
          {category && (
            <Badge variant="outline" className="mt-2 text-xs">
              {category}
            </Badge>
          )}
          {connectionInfo && isConnected && (
            <p className="text-xs text-muted-foreground mt-2 truncate">{connectionInfo}</p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex gap-2">
          {isConnected ? (
            <>
              <Button onClick={onOpen} size="sm" className="flex-1">
                <ExternalLink className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'apps.actions.open', defaultMessage: 'Open' })}
              </Button>
              <Button variant="outline" size="sm" onClick={onDisconnect} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
              </Button>
            </>
          ) : (
            <Button onClick={onConnect} disabled={isLoading} size="sm" className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {intl.formatMessage({ id: 'apps.actions.connecting', defaultMessage: 'Connecting...' })}
                </>
              ) : (
                intl.formatMessage({ id: 'apps.actions.connect', defaultMessage: 'Connect' })
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Integration card for catalog items
function IntegrationCard({
  integration,
  connection,
  isConfigured = false,
}: {
  integration: IntegrationCatalogEntry;
  connection?: IntegrationConnection;
  isConfigured?: boolean;
}) {
  const intl = useIntl();
  const isConnected = !!connection;

  return (
    <Card className={cn(
      "transition-colors h-full flex flex-col",
      isConfigured
        ? "hover:border-primary/50"
        : "opacity-60 bg-muted/30 border-dashed"
    )}>
      <CardHeader className="flex flex-row items-start gap-4 flex-1">
        <div className={cn(
          "p-2 rounded-lg shrink-0",
          isConfigured ? "bg-muted" : "bg-muted/50"
        )}>
          <Avatar className={cn("w-10 h-10", !isConfigured && "grayscale")}>
            <AvatarImage src={integration.logoUrl} alt={integration.name} />
            <AvatarFallback>{integration.name.substring(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className={cn("text-base truncate", !isConfigured && "text-muted-foreground")}>
              {integration.name}
            </CardTitle>
            {isConnected ? (
              <Badge variant="secondary" className="bg-green-500/10 text-green-600 shrink-0">
                <Check className="w-3 h-3 mr-1" />
                {intl.formatMessage({ id: 'integrations.status.connected', defaultMessage: 'Connected' })}
              </Badge>
            ) : !isConfigured && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 text-xs">
                {intl.formatMessage({ id: 'integrations.status.comingSoon', defaultMessage: 'Coming Soon' })}
              </Badge>
            )}
          </div>
          <CardDescription className={cn("mt-1 line-clamp-2 text-sm", !isConfigured && "text-muted-foreground/70")}>
            {integration.description}
          </CardDescription>
          {integration.category && (
            <Badge variant="outline" className={cn("mt-2 text-xs", !isConfigured && "opacity-50")}>
              {integration.category.replace(/_/g, ' ')}
            </Badge>
          )}
          {connection?.externalEmail && (
            <p className="text-xs text-muted-foreground mt-2 truncate">
              {intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} {connection.externalEmail}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isConfigured ? (
          <IntegrationConnectButton
            integration={integration}
            connection={connection}
            className="w-full"
            size="sm"
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled
            className="w-full text-muted-foreground"
          >
            {intl.formatMessage({ id: 'apps.actions.notAvailable', defaultMessage: 'Not Available' })}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function AppsGrid() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const intl = useIntl();

  // UI State
  const [selectedTab, setSelectedTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Connection states for hardcoded integrations
  const [googleDriveConnection, setGoogleDriveConnection] = useState<GoogleDriveConnection | null>(null);
  const [gmailConnection, setGmailConnection] = useState<EmailConnection | null>(null);
  const [calendarConnection, setCalendarConnection] = useState<GoogleCalendarConnection | null>(null);
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);
  const [googleSheetsConnection, setGoogleSheetsConnection] = useState<GoogleSheetsConnection | null>(null);
  const [dropboxConnection, setDropboxConnection] = useState<DropboxConnection | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);
  const [isDisconnectingDrive, setIsDisconnectingDrive] = useState(false);
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isDisconnectingGmail, setIsDisconnectingGmail] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [isDisconnectingGithub, setIsDisconnectingGithub] = useState(false);
  const [isConnectingSheets, setIsConnectingSheets] = useState(false);
  const [isDisconnectingSheets, setIsDisconnectingSheets] = useState(false);
  const [isConnectingDropbox, setIsConnectingDropbox] = useState(false);
  const [isDisconnectingDropbox, setIsDisconnectingDropbox] = useState(false);

  // Fetch catalog integrations
  const { data: catalogData, isLoading: catalogLoading } = useIntegrationCatalog({ limit: 200 });
  const { data: connectionsData } = useUserConnections(workspaceId || '');

  // Slugs of integrations that have hardcoded handlers
  const hardcodedSlugs = ['google-drive', 'gmail', 'google-calendar', 'github', 'google-sheets', 'dropbox'];

  // Filter integrations by selected tab and search query
  const filteredIntegrations = useMemo(() => {
    let integrations = catalogData?.integrations?.filter(
      (integration) => !hardcodedSlugs.includes(integration.slug)
    ) || [];

    // Filter by category tab
    if (selectedTab !== 'all') {
      const tab = CATEGORY_TABS.find(t => t.id === selectedTab);
      if (tab && tab.categories.length > 0) {
        integrations = integrations.filter(i =>
          i.category && tab.categories.includes(i.category)
        );
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      integrations = integrations.filter(i =>
        i.name.toLowerCase().includes(query) ||
        i.description?.toLowerCase().includes(query) ||
        i.category?.toLowerCase().includes(query) ||
        i.provider?.toLowerCase().includes(query)
      );
    }

    return integrations;
  }, [catalogData, selectedTab, searchQuery]);

  // Get connection for an integration
  const getConnection = (integrationId: string): IntegrationConnection | undefined => {
    return connectionsData?.connections?.find(
      (c) => c.integrationId === integrationId && c.status === 'active'
    );
  };

  // Check for OAuth callback result in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const driveSuccess = urlParams.get('google_drive_success');
    const driveError = urlParams.get('google_drive_error');
    const emailConnected = urlParams.get('emailConnected');
    const calendarConnected = urlParams.get('calendarConnected');
    const githubConnected = urlParams.get('githubConnected');
    const githubError = urlParams.get('githubError');
    const sheetsConnected = urlParams.get('google_sheets_success');
    const sheetsError = urlParams.get('google_sheets_error');

    if (driveSuccess === 'true' || emailConnected || calendarConnected || githubConnected || sheetsConnected === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      loadConnections();
    } else if (driveError || githubError || sheetsError) {
      console.error('OAuth error:', driveError || githubError || sheetsError);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Load connection status on mount
  useEffect(() => {
    loadConnections();
  }, [workspaceId]);

  const loadConnections = async () => {
    if (!workspaceId) return;

    try {
      setIsLoading(true);
      const [driveConn, emailConn, calendarConn, githubConn, sheetsConn, dropboxConn] = await Promise.all([
        googleDriveApi.getConnection(workspaceId).catch(() => null),
        emailService.getConnection(workspaceId).catch(() => null),
        googleCalendarApi.getConnection(workspaceId).catch(() => null),
        githubApi.getConnection(workspaceId).catch(() => null),
        googleSheetsApi.getConnection(workspaceId).catch(() => null),
        dropboxApi.getConnection(workspaceId).catch(() => null),
      ]);

      setGoogleDriveConnection(driveConn);
      setGmailConnection(emailConn?.data ?? null);
      setCalendarConnection(calendarConn?.data ?? null);
      setGithubConnection(githubConn);
      setGoogleSheetsConnection(sheetsConn);
      setDropboxConnection(dropboxConn);
    } catch (error) {
      console.error('Failed to load connections:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handlers for hardcoded integrations
  const handleConnectGoogleDrive = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingDrive(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await googleDriveApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Google Drive auth URL:', error);
      setIsConnectingDrive(false);
    }
  };

  const handleDisconnectGoogleDrive = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingDrive(true);
      await googleDriveApi.disconnect(workspaceId);
      setGoogleDriveConnection(null);
    } catch (error) {
      console.error('Failed to disconnect Google Drive:', error);
    } finally {
      setIsDisconnectingDrive(false);
    }
  };

  const handleOpenGoogleDrive = () => navigate(`/workspaces/${workspaceId}/apps/google-drive`);

  const handleConnectGmail = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingGmail(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await emailService.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Gmail auth URL:', error);
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingGmail(true);
      await emailService.disconnect(workspaceId);
      setGmailConnection(null);
    } catch (error) {
      console.error('Failed to disconnect Gmail:', error);
    } finally {
      setIsDisconnectingGmail(false);
    }
  };

  const handleOpenGmail = () => navigate(`/workspaces/${workspaceId}/email`);

  const handleConnectCalendar = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingCalendar(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await googleCalendarApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Calendar auth URL:', error);
      setIsConnectingCalendar(false);
    }
  };

  const handleDisconnectCalendar = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingCalendar(true);
      await googleCalendarApi.disconnect(workspaceId);
      setCalendarConnection(null);
    } catch (error) {
      console.error('Failed to disconnect Calendar:', error);
    } finally {
      setIsDisconnectingCalendar(false);
    }
  };

  const handleOpenCalendar = () => navigate(`/workspaces/${workspaceId}/calendar`);

  const handleConnectGithub = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingGithub(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await githubApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get GitHub auth URL:', error);
      setIsConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingGithub(true);
      await githubApi.disconnect(workspaceId);
      setGithubConnection(null);
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error);
    } finally {
      setIsDisconnectingGithub(false);
    }
  };

  const handleOpenGithub = () => {
    if (githubConnection?.githubLogin) {
      window.open(`https://github.com/${githubConnection.githubLogin}`, '_blank');
    }
  };

  const handleConnectGoogleSheets = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingSheets(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await googleSheetsApi.connect(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Google Sheets auth URL:', error);
      setIsConnectingSheets(false);
    }
  };

  const handleDisconnectGoogleSheets = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingSheets(true);
      await googleSheetsApi.disconnect(workspaceId);
      setGoogleSheetsConnection(null);
    } catch (error) {
      console.error('Failed to disconnect Google Sheets:', error);
    } finally {
      setIsDisconnectingSheets(false);
    }
  };

  const handleOpenGoogleSheets = () => navigate(`/workspaces/${workspaceId}/apps/google-sheets`);

  const handleConnectDropbox = async () => {
    if (!workspaceId) return;
    try {
      setIsConnectingDropbox(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await dropboxApi.getAuthUrl(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get Dropbox auth URL:', error);
      setIsConnectingDropbox(false);
    }
  };

  const handleDisconnectDropbox = async () => {
    if (!workspaceId) return;
    try {
      setIsDisconnectingDropbox(true);
      await dropboxApi.disconnect(workspaceId);
      setDropboxConnection(null);
    } catch (error) {
      console.error('Failed to disconnect Dropbox:', error);
    } finally {
      setIsDisconnectingDropbox(false);
    }
  };

  const handleOpenDropbox = () => navigate(`/workspaces/${workspaceId}/apps/dropbox`);

  // Check if hardcoded apps should show based on selected category
  const shouldShowHardcodedApps = useMemo(() => {
    if (selectedTab === 'all') return true;
    const tab = CATEGORY_TABS.find(t => t.id === selectedTab);
    if (!tab) return false;

    // Map hardcoded apps to their categories
    const hardcodedCategories: Record<string, string[]> = {
      gmail: ['EMAIL', 'PRODUCTIVITY'],
      'google-calendar': ['CALENDAR', 'PRODUCTIVITY'],
      'google-drive': ['FILE_STORAGE', 'PRODUCTIVITY'],
      github: ['DEVELOPMENT'],
      'google-sheets': ['FILE_STORAGE', 'PRODUCTIVITY'],
      dropbox: ['FILE_STORAGE', 'PRODUCTIVITY'],
    };

    // Check if any hardcoded app matches the selected category
    return Object.values(hardcodedCategories).some(cats =>
      cats.some(cat => tab.categories.includes(cat))
    );
  }, [selectedTab]);

  // Individual hardcoded app visibility
  const showGmail = selectedTab === 'all' || selectedTab === 'productivity';
  const showCalendar = selectedTab === 'all' || selectedTab === 'productivity';
  const showDrive = selectedTab === 'all' || selectedTab === 'productivity';
  const showGithub = selectedTab === 'all' || selectedTab === 'development';
  const showSheets = selectedTab === 'all' || selectedTab === 'productivity';
  const showDropbox = selectedTab === 'all' || selectedTab === 'productivity';

  // Filter hardcoded apps by search
  const searchFilteredHardcoded = useMemo(() => {
    if (!searchQuery.trim()) {
      return { gmail: showGmail, calendar: showCalendar, drive: showDrive, github: showGithub, sheets: showSheets, dropbox: showDropbox };
    }
    const query = searchQuery.toLowerCase();
    return {
      gmail: showGmail && 'gmail email'.includes(query),
      calendar: showCalendar && 'google calendar'.includes(query),
      drive: showDrive && 'google drive storage'.includes(query),
      github: showGithub && 'github development code'.includes(query),
      sheets: showSheets && 'google sheets spreadsheet'.includes(query),
      dropbox: showDropbox && 'dropbox storage files'.includes(query),
    };
  }, [searchQuery, showGmail, showCalendar, showDrive, showGithub, showSheets, showDropbox]);

  const hasHardcodedApps = Object.values(searchFilteredHardcoded).some(Boolean);

  if (isLoading || catalogLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalCount = (hasHardcodedApps ? Object.values(searchFilteredHardcoded).filter(Boolean).length : 0) + filteredIntegrations.length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{intl.formatMessage({ id: 'apps.page.title', defaultMessage: 'Connectors' })}</h1>
        <p className="text-muted-foreground mt-1">
          {intl.formatMessage({ id: 'apps.page.subtitle', defaultMessage: "Connect external apps to extend Deskive's capabilities" })}
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'apps.page.searchPlaceholder', defaultMessage: 'Search connectors...' })}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="text-sm text-muted-foreground self-center">
          {intl.formatMessage(
            { id: 'apps.page.connectorsAvailable', defaultMessage: '{count} connectors available' },
            { count: totalCount, plural: totalCount !== 1 ? 's' : '' }
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {CATEGORY_TABS.map((tab) => (
            <Button
              key={tab.id}
              variant={selectedTab === tab.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTab(tab.id)}
              className={cn(
                'whitespace-nowrap',
                selectedTab === tab.id && 'shadow-sm'
              )}
            >
              {intl.formatMessage({
                id: `apps.categories.${tab.id === 'ai' ? 'aiAutomation' : tab.id}`,
                defaultMessage: tab.id === 'all' ? 'All' :
                               tab.id === 'communication' ? 'Communication' :
                               tab.id === 'productivity' ? 'Productivity' :
                               tab.id === 'development' ? 'Development' :
                               tab.id === 'business' ? 'Business' :
                               tab.id === 'marketing' ? 'Marketing' :
                               tab.id === 'design' ? 'Design' :
                               tab.id === 'ai' ? 'AI & Automation' :
                               tab.id === 'security' ? 'Security' : tab.id
              })}
            </Button>
          ))}
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {/* Hardcoded Google/GitHub integrations */}
        {searchFilteredHardcoded.gmail && (
          <AppCard
            name="Gmail"
            description={intl.formatMessage({ id: 'apps.descriptions.gmail', defaultMessage: 'Connect your Gmail account to manage emails' })}
            icon={<GmailLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.email', defaultMessage: 'Email' })}
            isConnected={!!gmailConnection}
            isLoading={isConnectingGmail || isDisconnectingGmail}
            connectionInfo={gmailConnection?.emailAddress ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} ${gmailConnection.emailAddress}` : undefined}
            onConnect={handleConnectGmail}
            onOpen={handleOpenGmail}
            onDisconnect={handleDisconnectGmail}
          />
        )}

        {searchFilteredHardcoded.calendar && (
          <AppCard
            name="Google Calendar"
            description={intl.formatMessage({ id: 'apps.descriptions.googleCalendar', defaultMessage: 'Sync and manage your Google Calendar' })}
            icon={<GoogleCalendarLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.calendar', defaultMessage: 'Calendar' })}
            isConnected={!!calendarConnection}
            isLoading={isConnectingCalendar || isDisconnectingCalendar}
            connectionInfo={calendarConnection?.googleEmail ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} ${calendarConnection.googleEmail}` : undefined}
            onConnect={handleConnectCalendar}
            onOpen={handleOpenCalendar}
            onDisconnect={handleDisconnectCalendar}
          />
        )}

        {searchFilteredHardcoded.drive && (
          <AppCard
            name="Google Drive"
            description={intl.formatMessage({ id: 'apps.descriptions.googleDrive', defaultMessage: 'Access and manage your Google Drive files' })}
            icon={<GoogleDriveLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.fileStorage', defaultMessage: 'File Storage' })}
            isConnected={!!googleDriveConnection}
            isLoading={isConnectingDrive || isDisconnectingDrive}
            connectionInfo={googleDriveConnection?.googleEmail ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} ${googleDriveConnection.googleEmail}` : undefined}
            onConnect={handleConnectGoogleDrive}
            onOpen={handleOpenGoogleDrive}
            onDisconnect={handleDisconnectGoogleDrive}
          />
        )}

        {searchFilteredHardcoded.github && (
          <AppCard
            name="GitHub"
            description={intl.formatMessage({ id: 'apps.descriptions.github', defaultMessage: 'Connect your GitHub repositories and issues' })}
            icon={<GitHubLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.development', defaultMessage: 'Development' })}
            isConnected={!!githubConnection}
            isLoading={isConnectingGithub || isDisconnectingGithub}
            connectionInfo={githubConnection?.githubLogin ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} @${githubConnection.githubLogin}` : undefined}
            onConnect={handleConnectGithub}
            onOpen={handleOpenGithub}
            onDisconnect={handleDisconnectGithub}
          />
        )}

        {searchFilteredHardcoded.sheets && (
          <AppCard
            name="Google Sheets"
            description={intl.formatMessage({ id: 'apps.descriptions.googleSheets', defaultMessage: 'Work with Google Sheets spreadsheets' })}
            icon={<GoogleSheetsLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.fileStorage', defaultMessage: 'File Storage' })}
            isConnected={!!googleSheetsConnection}
            isLoading={isConnectingSheets || isDisconnectingSheets}
            connectionInfo={googleSheetsConnection?.googleEmail ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} ${googleSheetsConnection.googleEmail}` : undefined}
            onConnect={handleConnectGoogleSheets}
            onOpen={handleOpenGoogleSheets}
            onDisconnect={handleDisconnectGoogleSheets}
          />
        )}

        {searchFilteredHardcoded.dropbox && (
          <AppCard
            name="Dropbox"
            description={intl.formatMessage({ id: 'apps.descriptions.dropbox', defaultMessage: 'Access and manage your Dropbox files' })}
            icon={<DropboxLogo />}
            category={intl.formatMessage({ id: 'apps.categoryLabels.fileStorage', defaultMessage: 'File Storage' })}
            isConnected={!!dropboxConnection}
            isLoading={isConnectingDropbox || isDisconnectingDropbox}
            connectionInfo={dropboxConnection?.dropboxEmail ? `${intl.formatMessage({ id: 'integrations.connectedAs', defaultMessage: 'Connected as' })} ${dropboxConnection.dropboxEmail}` : undefined}
            onConnect={handleConnectDropbox}
            onOpen={handleOpenDropbox}
            onDisconnect={handleDisconnectDropbox}
          />
        )}

        {/* Catalog integrations. `isConfigured` comes from the server
            (`credentialConfigured`), which is true iff the operator has
            set the required OAuth / api_key env vars for this integration. */}
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            connection={getConnection(integration.id)}
            isConfigured={integration.credentialConfigured ?? false}
          />
        ))}
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              {intl.formatMessage({ id: 'apps.page.noConnectorsFound', defaultMessage: 'No connectors found' })}
            </h3>
            <p className="text-sm">
              {searchQuery
                ? intl.formatMessage({ id: 'apps.page.noConnectorsMatch', defaultMessage: 'No connectors match "{query}"' }, { query: searchQuery })
                : intl.formatMessage(
                    { id: 'apps.page.noConnectorsInCategory', defaultMessage: 'No connectors in {category}' },
                    { category: intl.formatMessage({
                      id: `apps.categories.${selectedTab === 'ai' ? 'aiAutomation' : selectedTab}`,
                      defaultMessage: selectedTab === 'all' ? 'All' :
                                     selectedTab === 'communication' ? 'Communication' :
                                     selectedTab === 'productivity' ? 'Productivity' :
                                     selectedTab === 'development' ? 'Development' :
                                     selectedTab === 'business' ? 'Business' :
                                     selectedTab === 'marketing' ? 'Marketing' :
                                     selectedTab === 'design' ? 'Design' :
                                     selectedTab === 'ai' ? 'AI & Automation' :
                                     selectedTab === 'security' ? 'Security' : selectedTab
                    }) }
                  )
              }
            </p>
            {(searchQuery || selectedTab !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTab('all');
                }}
              >
                {intl.formatMessage({ id: 'apps.page.clearFilters', defaultMessage: 'Clear filters' })}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AppsPage() {
  return (
    <Routes>
      <Route path="/" element={<AppsGrid />} />
      <Route path="/google-drive/*" element={<GoogleDriveBrowser />} />
      <Route path="/google-sheets/*" element={<GoogleSheetsBrowser />} />
    </Routes>
  );
}

export default AppsPage;
