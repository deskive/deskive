/**
 * Integrations Page
 * Main page for managing integrations and exploring the marketplace
 * Now uses the new Integration Framework API
 */

import { useState, useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Zap,
  Sparkles,
  TrendingUp,
  Shield,
  Star,
  Users,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  type IntegrationCatalogEntry,
  type IntegrationConnection,
  type IntegrationCategoryType,
  type CatalogFilters,
  useIntegrationCatalog,
  useUserConnections,
  useIntegrationCategories,
} from '@/lib/api/integrations-api';
import { IntegrationDetail } from './components/IntegrationDetail';
import { OAuthCallback } from './components/OAuthCallback';
import { IntegrationConnectButton } from './components/IntegrationConnectButton';

const CATEGORY_CONFIG: Record<IntegrationCategoryType, { icon: React.ReactNode; color: string }> = {
  'COMMUNICATION': { icon: <Users className="w-4 h-4" />, color: 'bg-blue-500/10 text-blue-700 dark:text-blue-300' },
  'PROJECT_MANAGEMENT': { icon: <Grid className="w-4 h-4" />, color: 'bg-green-500/10 text-green-700 dark:text-green-300' },
  'FILE_STORAGE': { icon: <Search className="w-4 h-4" />, color: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
  'CALENDAR': { icon: <Sparkles className="w-4 h-4" />, color: 'bg-purple-500/10 text-purple-700 dark:text-purple-300' },
  'EMAIL': { icon: <Zap className="w-4 h-4" />, color: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  'CRM': { icon: <Star className="w-4 h-4" />, color: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300' },
  'DEVELOPMENT': { icon: <Zap className="w-4 h-4" />, color: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300' },
  'ANALYTICS': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300' },
  'MARKETING': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-rose-500/10 text-rose-700 dark:text-rose-300' },
  'DOCUMENTATION': { icon: <Grid className="w-4 h-4" />, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  'DESIGN': { icon: <Sparkles className="w-4 h-4" />, color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  'TIME_TRACKING': { icon: <Zap className="w-4 h-4" />, color: 'bg-lime-500/10 text-lime-700 dark:text-lime-300' },
  'VIDEO_CONFERENCING': { icon: <Users className="w-4 h-4" />, color: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' },
  'AUTOMATION': { icon: <Zap className="w-4 h-4" />, color: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300' },
  'PRODUCTIVITY': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-teal-500/10 text-teal-700 dark:text-teal-300' },
  'HR': { icon: <Users className="w-4 h-4" />, color: 'bg-amber-500/10 text-amber-700 dark:text-amber-300' },
  'FINANCE': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  'SUPPORT': { icon: <Users className="w-4 h-4" />, color: 'bg-sky-500/10 text-sky-700 dark:text-sky-300' },
  'SECURITY': { icon: <Shield className="w-4 h-4" />, color: 'bg-red-500/10 text-red-700 dark:text-red-300' },
  'ECOMMERCE': { icon: <TrendingUp className="w-4 h-4" />, color: 'bg-lime-500/10 text-lime-700 dark:text-lime-300' },
  'SOCIAL_MEDIA': { icon: <Users className="w-4 h-4" />, color: 'bg-pink-500/10 text-pink-700 dark:text-pink-300' },
  'AI': { icon: <Sparkles className="w-4 h-4" />, color: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  'OTHER': { icon: <Grid className="w-4 h-4" />, color: 'bg-gray-500/10 text-gray-700 dark:text-gray-300' },
};

export default function IntegrationsPage() {
  return (
    <Routes>
      <Route path="/" element={<IntegrationsMain />} />
      <Route path="/detail/:integrationSlug" element={<IntegrationDetail />} />
      <Route path="/callback" element={<OAuthCallback />} />
      <Route path="/oauth/callback" element={<OAuthCallback />} />
    </Routes>
  );
}

function IntegrationsMain() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceId: paramWorkspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const intl = useIntl();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get workspace ID from context or params
  const workspaceId = currentWorkspace?.id || paramWorkspaceId || '';

  // State
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'marketplace');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(
    (localStorage.getItem('integrations-view-mode') as 'grid' | 'list') || 'grid'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategoryType | undefined>(
    searchParams.get('category') as IntegrationCategoryType || undefined
  );

  // Build filters
  const filters: CatalogFilters = useMemo(() => ({
    search: searchQuery || undefined,
    category: selectedCategory,
    page: 1,
    limit: 200,
    sortBy: 'installCount',
    sortOrder: 'desc',
  }), [searchQuery, selectedCategory]);

  // Fetch data using React Query
  const {
    data: catalogData,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog
  } = useIntegrationCatalog(filters);

  const {
    data: connectionsData,
    isLoading: connectionsLoading,
    refetch: refetchConnections
  } = useUserConnections(workspaceId);

  const {
    data: categoriesData,
  } = useIntegrationCategories();

  // Effects
  useEffect(() => {
    // Update URL params when filters change
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory) params.set('category', selectedCategory);
    if (activeTab !== 'marketplace') params.set('tab', activeTab);
    setSearchParams(params, { replace: true });
  }, [searchQuery, selectedCategory, activeTab, setSearchParams]);

  useEffect(() => {
    localStorage.setItem('integrations-view-mode', viewMode);
  }, [viewMode]);

  // Helper to find connection for an integration
  const getConnectionForIntegration = (integrationId: string): IntegrationConnection | undefined => {
    return connectionsData?.connections.find(c => c.integrationId === integrationId && c.status === 'active');
  };

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryClick = (category: IntegrationCategoryType) => {
    setSelectedCategory(prev => prev === category ? undefined : category);
  };

  const handleIntegrationClick = (integration: IntegrationCatalogEntry) => {
    navigate(`detail/${integration.slug}`);
  };

  const handleRefresh = () => {
    refetchCatalog();
    refetchConnections();
  };

  // Computed values
  const integrations = catalogData?.integrations || [];
  const connections = connectionsData?.connections || [];
  const categories = categoriesData || [];

  const isLoading = catalogLoading || connectionsLoading;
  const error = catalogError ? String(catalogError) : null;

  // Featured/popular integrations (verified ones with high install count)
  const popularIntegrations = useMemo(() =>
    integrations
      .filter(i => i.isVerified || i.isFeatured)
      .sort((a, b) => b.installCount - a.installCount)
      .slice(0, 8),
    [integrations]
  );

  // Format install count
  const formatInstallCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Get category label
  const getCategoryLabel = (category: IntegrationCategoryType): string => {
    const categoryKey = category.toLowerCase().replace(/_/g, '');
    const categoryKeys: Record<IntegrationCategoryType, string> = {
      'COMMUNICATION': 'communication',
      'FILE_STORAGE': 'fileStorage',
      'CALENDAR': 'calendar',
      'EMAIL': 'email',
      'PROJECT_MANAGEMENT': 'projectManagement',
      'CRM': 'crm',
      'DEVELOPMENT': 'development',
      'ANALYTICS': 'analytics',
      'MARKETING': 'marketing',
      'DOCUMENTATION': 'documentation',
      'DESIGN': 'design',
      'TIME_TRACKING': 'timeTracking',
      'VIDEO_CONFERENCING': 'videoConferencing',
      'AUTOMATION': 'automation',
      'PRODUCTIVITY': 'productivity',
      'HR': 'hr',
      'FINANCE': 'finance',
      'SUPPORT': 'support',
      'SECURITY': 'security',
      'ECOMMERCE': 'ecommerce',
      'SOCIAL_MEDIA': 'socialMedia',
      'AI': 'ai',
      'OTHER': 'other',
    };
    const key = categoryKeys[category] || 'other';
    return intl.formatMessage({
      id: `modules.integrations.categories.${key}`,
      defaultMessage: category
    });
  };

  if (isLoading && !catalogData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2">
          {intl.formatMessage({ id: 'modules.integrations.page.loading', defaultMessage: 'Loading integrations...' })}
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {intl.formatMessage({ id: 'modules.integrations.page.title', defaultMessage: 'Integrations' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {intl.formatMessage({ id: 'modules.integrations.page.subtitle', defaultMessage: 'Connect your favorite tools and services to streamline your workflow' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-muted' : ''}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={intl.formatMessage({ id: 'modules.integrations.page.searchPlaceholder', defaultMessage: 'Search integrations...' })}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Active Filter Badges */}
      {selectedCategory && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'modules.integrations.page.filterBy', defaultMessage: 'Filtering by:' })}
          </span>
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setSelectedCategory(undefined)}
          >
            {getCategoryLabel(selectedCategory)}
            <span className="ml-1">&times;</span>
          </Badge>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="marketplace">
            {intl.formatMessage({ id: 'modules.integrations.tabs.marketplace', defaultMessage: 'Marketplace' })}
            <Badge variant="secondary" className="ml-2">
              {catalogData?.total || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="connected">
            {intl.formatMessage({ id: 'modules.integrations.tabs.connected', defaultMessage: 'Connected' })}
            <Badge variant="secondary" className="ml-2">
              {connections.filter(c => c.status === 'active').length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-6">
          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {categories.map((cat) => {
              const config = CATEGORY_CONFIG[cat.category as IntegrationCategoryType] || CATEGORY_CONFIG['OTHER'];
              const isSelected = selectedCategory === cat.category;

              return (
                <Card
                  key={cat.category}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleCategoryClick(cat.category as IntegrationCategoryType)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {getCategoryLabel(cat.category as IntegrationCategoryType)}
                        </h3>
                        <p className="text-xs text-muted-foreground">{cat.count}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Popular Integrations */}
          {popularIntegrations.length > 0 && !selectedCategory && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-semibold">
                  {intl.formatMessage({ id: 'modules.integrations.sections.popular', defaultMessage: 'Popular' })}
                </h2>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {popularIntegrations.map((integration) => (
                  <Card
                    key={integration.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleIntegrationClick(integration)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={integration.logoUrl} alt={integration.name} />
                          <AvatarFallback>{integration.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate">{integration.name}</h3>
                          <div className="flex items-center gap-1 mt-1">
                            {integration.isVerified && <Shield className="w-3 h-3 text-blue-500" />}
                            <span className="text-xs text-muted-foreground">{integration.provider}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All Integrations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {selectedCategory
                  ? getCategoryLabel(selectedCategory)
                  : intl.formatMessage({ id: 'modules.integrations.sections.all', defaultMessage: 'All Integrations' })
                }
                <span className="text-muted-foreground font-normal ml-2">
                  ({integrations.length})
                </span>
              </h2>
            </div>

            {integrations.length > 0 ? (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'space-y-4'
              }>
                {integrations.map((integration) => {
                  const connection = getConnectionForIntegration(integration.id);
                  const isConnected = !!connection;

                  if (viewMode === 'grid') {
                    return (
                      <Card
                        key={integration.id}
                        className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group"
                      >
                        <CardHeader className="pb-3" onClick={() => handleIntegrationClick(integration)}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-12 h-12">
                                <AvatarImage src={integration.logoUrl} alt={integration.name} />
                                <AvatarFallback>{integration.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-lg truncate group-hover:text-primary">
                                  {integration.name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {integration.provider}
                                </p>
                              </div>
                            </div>
                            {isConnected && (
                              <Badge variant="outline" className="text-green-600 border-green-300">
                                {intl.formatMessage({ id: 'modules.integrations.status.connected', defaultMessage: 'Connected' })}
                              </Badge>
                            )}
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-3" onClick={() => handleIntegrationClick(integration)}>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {integration.description}
                          </p>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              variant="secondary"
                              className={CATEGORY_CONFIG[integration.category]?.color || CATEGORY_CONFIG['OTHER'].color}
                            >
                              {getCategoryLabel(integration.category)}
                            </Badge>
                            {integration.isVerified && (
                              <Badge variant="outline" className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {intl.formatMessage({ id: 'modules.integrations.status.verified', defaultMessage: 'Verified' })}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{integration.rating || '-'}</span>
                              <span className="text-muted-foreground">
                                ({integration.reviewCount})
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Users className="w-4 h-4" />
                              <span>{formatInstallCount(integration.installCount)}</span>
                            </div>
                          </div>

                          <Badge variant="outline" className={
                            integration.pricingType === 'free'
                              ? 'text-green-600 border-green-200'
                              : integration.pricingType === 'freemium'
                              ? 'text-blue-600 border-blue-200'
                              : 'text-orange-600 border-orange-200'
                          }>
                            {integration.pricingType === 'free'
                              ? intl.formatMessage({ id: 'modules.integrations.pricing.free', defaultMessage: 'Free' })
                              : integration.pricingType === 'freemium'
                              ? intl.formatMessage({ id: 'modules.integrations.pricing.freemium', defaultMessage: 'Freemium' })
                              : intl.formatMessage({ id: 'modules.integrations.pricing.paid', defaultMessage: 'Paid' })}
                          </Badge>
                        </CardContent>

                        <CardFooter className="pt-3">
                          <IntegrationConnectButton
                            integration={integration}
                            connection={connection}
                            className="w-full"
                          />
                        </CardFooter>
                      </Card>
                    );
                  } else {
                    // List view
                    return (
                      <Card key={integration.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-12 h-12" onClick={() => handleIntegrationClick(integration)}>
                              <AvatarImage src={integration.logoUrl} alt={integration.name} />
                              <AvatarFallback>{integration.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0" onClick={() => handleIntegrationClick(integration)}>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold truncate">{integration.name}</h3>
                                {integration.isVerified && <Shield className="w-4 h-4 text-blue-500" />}
                              </div>
                              <p className="text-sm text-muted-foreground truncate">{integration.description}</p>
                              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                <span>{integration.provider}</span>
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                  {integration.rating || '-'}
                                </span>
                                <span>
                                  {formatInstallCount(integration.installCount)}{' '}
                                  {intl.formatMessage({ id: 'modules.integrations.detail.installs', defaultMessage: 'installs' })}
                                </span>
                              </div>
                            </div>
                            <IntegrationConnectButton
                              integration={integration}
                              connection={connection}
                              size="sm"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  }
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {intl.formatMessage({ id: 'modules.integrations.page.noResults', defaultMessage: 'No integrations found' })}
                  </h3>
                  <p className="text-muted-foreground">
                    {intl.formatMessage({ id: 'modules.integrations.page.noResultsDesc', defaultMessage: 'Try adjusting your search or filters.' })}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Connected Tab */}
        <TabsContent value="connected" className="space-y-6">
          {connections.filter(c => c.status === 'active').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {connections
                .filter(c => c.status === 'active')
                .map((connection) => (
                  <Card key={connection.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={connection.integration?.logoUrl} alt={connection.integration?.name} />
                          <AvatarFallback>
                            {connection.integration?.name?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{connection.integration?.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground truncate">
                            {connection.externalEmail || connection.integration?.provider}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-green-600 border-green-300">
                          Connected
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-2">
                      {connection.integration?.category && (
                        <Badge
                          variant="secondary"
                          className={CATEGORY_CONFIG[connection.integration.category as IntegrationCategoryType]?.color || CATEGORY_CONFIG['OTHER'].color}
                        >
                          {getCategoryLabel(connection.integration.category as IntegrationCategoryType)}
                        </Badge>
                      )}
                      {connection.lastSyncedAt && (
                        <p className="text-xs text-muted-foreground">
                          Last synced: {new Date(connection.lastSyncedAt).toLocaleDateString()}
                        </p>
                      )}
                    </CardContent>

                    <CardFooter className="pt-3">
                      {connection.integration && (
                        <IntegrationConnectButton
                          integration={{
                            id: connection.integrationId,
                            slug: connection.integration.slug,
                            name: connection.integration.name,
                            category: connection.integration.category as IntegrationCategoryType,
                            provider: connection.integration.provider,
                            logoUrl: connection.integration.logoUrl,
                            authType: connection.authType as 'oauth2' | 'api_key',
                            supportsWebhooks: false,
                            capabilities: [],
                            features: [],
                            pricingType: 'free',
                            isVerified: false,
                            isFeatured: false,
                            isActive: true,
                            installCount: 0,
                            reviewCount: 0,
                            createdAt: connection.createdAt,
                            updatedAt: connection.updatedAt,
                          }}
                          connection={connection}
                          className="w-full"
                        />
                      )}
                    </CardFooter>
                  </Card>
                ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {intl.formatMessage({ id: 'modules.integrations.empty.noConnected', defaultMessage: 'No connected integrations' })}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {intl.formatMessage({ id: 'modules.integrations.empty.noConnectedDesc', defaultMessage: 'Get started by connecting your first integration from the marketplace.' })}
                </p>
                <Button onClick={() => setActiveTab('marketplace')}>
                  <Plus className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.integrations.empty.browse', defaultMessage: 'Browse Marketplace' })}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
