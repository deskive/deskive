/**
 * Integration Detail Component
 * Detailed view and management for individual integrations
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { 
  ArrowLeft, 
  Star, 
  Download, 
  Shield, 
  ExternalLink, 
  CheckCircle, 
  Settings,
  Activity,
  Webhook,
  FileText,
  AlertTriangle,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  type Integration, 
  type InstalledIntegration,
  integrationsService
} from '@/lib/api/integrations-api';
import { IntegrationConfiguration } from './IntegrationConfiguration';
import { IntegrationWebhooks } from './IntegrationWebhooks';
import { IntegrationLogs } from './IntegrationLogs';

export function IntegrationDetail() {
  const intl = useIntl();
  const { integrationId, installationId } = useParams();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [integration, setIntegration] = useState<Integration | null>(null);
  const [installedIntegration, setInstalledIntegration] = useState<InstalledIntegration | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadIntegrationData();
    }
  }, [currentWorkspace?.id, integrationId, installationId]);

  const loadIntegrationData = async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      if (installationId) {
        // Loading installed integration details
        const installed = await integrationsService.getInstalledIntegration(
          currentWorkspace.id, 
          installationId
        );
        setInstalledIntegration(installed);
        
        // Also load the marketplace data for this integration
        if (installed.integrationId) {
          const marketplace = await integrationsService.getIntegrationDetails(
            currentWorkspace.id,
            installed.integrationId
          );
          setIntegration(marketplace);
        }
      } else if (integrationId) {
        // Loading marketplace integration details
        const marketplace = await integrationsService.getIntegrationDetails(
          currentWorkspace.id, 
          integrationId
        );
        setIntegration(marketplace);
        
        // Check if it's already installed
        const installed = await integrationsService.getInstalledIntegrations(currentWorkspace.id);
        const existingInstallation = installed.find(i => i.integrationId === integrationId);
        if (existingInstallation) {
          setInstalledIntegration(existingInstallation);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integration details');
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async () => {
    if (!currentWorkspace?.id || !integration) return;

    setInstalling(true);

    try {
      // For OAuth integrations, initiate OAuth flow
      if (integration.supportedAuthTypes?.includes('OAUTH2')) {
        const oauthResponse = await integrationsService.initiateOAuth(currentWorkspace.id, {
          integrationId: integration.id,
          redirectUri: `${window.location.origin}/integrations/oauth/callback`,
        });

        // Redirect to OAuth provider
        window.location.href = oauthResponse.authUrl;
        return;
      }

      // For non-OAuth integrations, install directly
      const installed = await integrationsService.installIntegration(currentWorkspace.id, {
        integrationId: integration.id,
      });
      
      setInstalledIntegration(installed);
      
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.detail.integrationInstalled', defaultMessage: 'Integration installed' }),
        description: intl.formatMessage(
          { id: 'modules.integrations.connectedDescription', defaultMessage: 'Successfully connected to {name}' },
          { name: integration.name }
        ),
      });
      
      // Navigate to the installed integration view
      navigate(`/integrations/installed/${installed.id}`);
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.detail.installationFailed', defaultMessage: 'Installation failed' }),
        description: error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.integrations.connectError', defaultMessage: 'Connection Error' }),
        variant: "destructive",
      });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstall = async () => {
    if (!currentWorkspace?.id || !installedIntegration) return;

    try {
      await integrationsService.uninstallIntegration(currentWorkspace.id, installedIntegration.id);
      
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.detail.integrationUninstalled', defaultMessage: 'Integration uninstalled' }),
        description: intl.formatMessage(
          { id: 'modules.integrations.disconnectedDescription', defaultMessage: 'Successfully disconnected from {name}' },
          { name: installedIntegration.name }
        ),
      });
      
      navigate('/integrations');
    } catch (error) {
      toast({
        title: intl.formatMessage({ id: 'common.error', defaultMessage: 'Error' }),
        description: error instanceof Error ? error.message : intl.formatMessage({ id: 'modules.integrations.disconnectError', defaultMessage: 'Disconnect Error' }),
        variant: "destructive",
      });
    }
  };

  const formatInstallCount = (count: number): string => {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner className="w-8 h-8" />
        <span className="ml-2">
          {intl.formatMessage({ id: 'modules.integrations.detail.loading', defaultMessage: 'Loading integration...' })}
        </span>
      </div>
    );
  }

  if (error || !integration) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/integrations')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {intl.formatMessage({ id: 'modules.integrations.actions.backToIntegrations', defaultMessage: 'Back to Integrations' })}
        </Button>
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            {error || 'Integration not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/integrations')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {intl.formatMessage({ id: 'modules.integrations.actions.back', defaultMessage: 'Back' })}
        </Button>
      </div>

      {/* Integration Header */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex items-start gap-4 flex-1">
          <Avatar className="w-20 h-20 flex-shrink-0">
            <AvatarImage src={integration.logo} alt={integration.name} />
            <AvatarFallback className="text-2xl">
              {integration.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{integration.name}</h1>
              {installedIntegration && (
                <CheckCircle className="w-6 h-6 text-green-500" />
              )}
              {integration.isVerified && (
                <Shield className="w-6 h-6 text-blue-500" />
              )}
            </div>
            
            <p className="text-muted-foreground mb-3">
              by {integration.provider}
            </p>

            <p className="text-lg mb-4">
              {integration.description}
            </p>

            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{integration.rating}</span>
                <span className="text-muted-foreground">
                  ({integration.reviewCount} {intl.formatMessage({ id: 'modules.integrations.detail.reviews', defaultMessage: 'reviews' })})
                </span>
              </div>
              
              <div className="flex items-center gap-1 text-muted-foreground">
                <Download className="w-4 h-4" />
                <span>
                  {formatInstallCount(integration.installCount || 0)}{' '}
                  {intl.formatMessage({ id: 'modules.integrations.detail.installs', defaultMessage: 'installs' })}
                </span>
              </div>

              <div className="text-muted-foreground">
                Version {integration.version}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 lg:w-48">
          {installedIntegration ? (
            <>
              <Badge 
                variant="secondary" 
                className="justify-center py-2 text-green-700 bg-green-500/10"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.status.installed', defaultMessage: 'Installed' })}
              </Badge>
              <Button variant="outline" onClick={handleUninstall}>
                <Trash2 className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.actions.uninstall', defaultMessage: 'Uninstall' })}
              </Button>
            </>
          ) : (
            <>
              {integration.pricing?.type === 'FREE' && (
                <Badge variant="outline" className="justify-center py-2 text-green-600 border-green-200">
                  {intl.formatMessage({ id: 'modules.integrations.pricing.free', defaultMessage: 'Free' })}
                </Badge>
              )}
              {integration.pricing?.type === 'PAID' && integration.pricing?.cost && (
                <Badge variant="outline" className="justify-center py-2 text-orange-600 border-orange-200">
                  ${integration.pricing?.cost}/{integration.pricing?.interval || 'month'}
                </Badge>
              )}
              <Button 
                onClick={handleInstall} 
                disabled={installing}
                className="w-full"
              >
                {installing ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : null}
                {intl.formatMessage({ id: 'modules.integrations.actions.install', defaultMessage: 'Install Integration' })}
              </Button>
            </>
          )}
          
          {integration.website && (
            <Button variant="outline" onClick={() => window.open(integration.website, '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {intl.formatMessage({ id: 'modules.integrations.actions.visitWebsite', defaultMessage: 'Visit Website' })}
            </Button>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            {intl.formatMessage({ id: 'modules.integrations.detail.overview', defaultMessage: 'Overview' })}
          </TabsTrigger>
          {installedIntegration && (
            <>
              <TabsTrigger value="configuration">
                <Settings className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.detail.configuration', defaultMessage: 'Configuration' })}
              </TabsTrigger>
              <TabsTrigger value="webhooks">
                <Webhook className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.detail.webhooks', defaultMessage: 'Webhooks' })}
              </TabsTrigger>
              <TabsTrigger value="logs">
                <FileText className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.detail.logs', defaultMessage: 'Logs' })}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Features */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {intl.formatMessage({ id: 'modules.integrations.detail.features', defaultMessage: 'Features' })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {integration.features?.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Screenshots */}
              {(integration.screenshots?.length || 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {intl.formatMessage({ id: 'modules.integrations.detail.screenshots', defaultMessage: 'Screenshots' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {integration.screenshots?.map((screenshot, index) => (
                        <img
                          key={index}
                          src={screenshot}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-40 object-cover rounded-lg border"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {/* Integration Info */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {intl.formatMessage({ id: 'modules.integrations.detail.details', defaultMessage: 'Integration Details' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-1">
                      {intl.formatMessage({ id: 'modules.integrations.detail.category', defaultMessage: 'Category' })}
                    </h4>
                    <Badge variant="secondary">
                      {integration.category?.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                      ).join(' ')}
                    </Badge>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-1">
                      {intl.formatMessage({ id: 'modules.integrations.detail.authentication', defaultMessage: 'Authentication' })}
                    </h4>
                    <div className="space-y-1">
                      {integration.supportedAuthTypes?.map(authType => (
                        <Badge key={authType} variant="outline" className="mr-1">
                          {authType.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-1">
                      {intl.formatMessage({ id: 'modules.integrations.detail.webhookSupport', defaultMessage: 'Webhook Support' })}
                    </h4>
                    <Badge variant={integration.webhookSupport ? "secondary" : "outline"}>
                      {integration.webhookSupport
                        ? intl.formatMessage({ id: 'modules.integrations.detail.supported', defaultMessage: 'Supported' })
                        : intl.formatMessage({ id: 'modules.integrations.detail.notSupported', defaultMessage: 'Not Supported' })}
                    </Badge>
                  </div>

                  {integration.lastUpdated && (
                    <div>
                      <h4 className="font-medium mb-1">
                        {intl.formatMessage({ id: 'modules.integrations.detail.lastUpdated', defaultMessage: 'Last Updated' })}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(integration.lastUpdated).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Support */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    {intl.formatMessage({ id: 'modules.integrations.detail.support', defaultMessage: 'Support & Documentation' })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => window.open(integration.apiDocumentation, '_blank')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.integrations.detail.apiDocumentation', defaultMessage: 'API Documentation' })}
                  </Button>
                  
                  {integration.supportEmail && (
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = `mailto:${integration.supportEmail}`}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.integrations.detail.contactSupport', defaultMessage: 'Contact Support' })}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Installation Stats */}
              {installedIntegration && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {intl.formatMessage({ id: 'modules.integrations.detail.usageStats', defaultMessage: 'Usage Statistics' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.integrations.detail.successRate', defaultMessage: 'Success Rate' })}
                      </p>
                      <p className="text-lg font-semibold">
                        {installedIntegration.usage?.totalRequests && installedIntegration.usage.totalRequests > 0
                          ? `${((installedIntegration.usage.successfulRequests / installedIntegration.usage.totalRequests) * 100).toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.integrations.detail.totalRequests', defaultMessage: 'Total Requests' })}
                      </p>
                      <p className="text-lg font-semibold">
                        {installedIntegration.usage?.totalRequests?.toLocaleString() ?? '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.integrations.detail.avgResponseTime', defaultMessage: 'Avg Response Time' })}
                      </p>
                      <p className="text-lg font-semibold">
                        {installedIntegration.usage?.averageResponseTime ?? 0}ms
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Configuration Tab */}
        {installedIntegration && (
          <TabsContent value="configuration">
            <IntegrationConfiguration
              integration={installedIntegration}
              onUpdate={loadIntegrationData}
            />
          </TabsContent>
        )}

        {/* Webhooks Tab */}
        {installedIntegration && (
          <TabsContent value="webhooks">
            <IntegrationWebhooks
              integration={installedIntegration}
              onUpdate={loadIntegrationData}
            />
          </TabsContent>
        )}

        {/* Logs Tab */}
        {installedIntegration && (
          <TabsContent value="logs">
            <IntegrationLogs integration={installedIntegration} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}