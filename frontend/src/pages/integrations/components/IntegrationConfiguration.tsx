/**
 * Integration Configuration Component
 * Manages integration settings and configuration
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Save, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  TestTube, 
  AlertCircle, 
  CheckCircle,
  Key,
  Power,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  type InstalledIntegration,
  integrationsService
} from '@/lib/api/integrations-api';

interface IntegrationConfigurationProps {
  integration: InstalledIntegration;
  onUpdate: () => void;
}

const configurationSchema = z.object({
  syncFrequency: z.enum(['REALTIME', '15MIN', '1HOUR', '6HOUR', '12HOUR', '24HOUR']),
  syncEnabled: z.boolean(),
  notificationsEnabled: z.boolean(),
  apiKey: z.string().optional(),
  customSettings: z.record(z.string(), z.any()).optional(),
});

type ConfigurationFormData = z.infer<typeof configurationSchema>;

const SYNC_FREQUENCY_OPTIONS = [
  { value: 'REALTIME', label: 'Real-time', description: 'Instant synchronization' },
  { value: '15MIN', label: 'Every 15 minutes', description: 'Sync every 15 minutes' },
  { value: '1HOUR', label: 'Hourly', description: 'Sync every hour' },
  { value: '6HOUR', label: 'Every 6 hours', description: 'Sync 4 times per day' },
  { value: '12HOUR', label: 'Twice daily', description: 'Sync twice per day' },
  { value: '24HOUR', label: 'Daily', description: 'Sync once per day' },
] as const;

export function IntegrationConfiguration({ integration, onUpdate }: IntegrationConfigurationProps) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);

  const form = useForm<ConfigurationFormData>({
    resolver: zodResolver(configurationSchema),
    defaultValues: {
      syncFrequency: (integration.configuration?.syncFrequency as any) ?? 'REALTIME',
      syncEnabled: integration.configuration?.syncEnabled ?? true,
      notificationsEnabled: integration.configuration?.notificationsEnabled ?? true,
      apiKey: integration.configuration?.authData?.apiKey ?? '',
      customSettings: integration.configuration?.settings ?? {},
    },
  });

  const handleSave = async (data: ConfigurationFormData) => {
    if (!currentWorkspace?.id) return;

    setLoading(true);

    try {
      const updatedConfiguration = {
        configuration: {
          ...integration.configuration,
          syncFrequency: data.syncFrequency,
          syncEnabled: data.syncEnabled,
          notificationsEnabled: data.notificationsEnabled,
          settings: data.customSettings || {},
          authData: data.apiKey 
            ? { ...integration.configuration?.authData, apiKey: data.apiKey }
            : integration.configuration?.authData,
        },
      };

      await integrationsService.updateIntegration(
        integration.id,
        updatedConfiguration as any
      );

      toast({
        title: "Configuration saved",
        description: "Integration settings have been updated successfully.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save configuration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!currentWorkspace?.id) return;

    setTesting(true);
    setTestResult(null);

    try {
      const result = await integrationsService.testIntegrationConnection(
        currentWorkspace.id, 
        integration.id
      );
      setTestResult(result);

      toast({
        title: result.success ? "Connection successful" : "Connection failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Connection test failed";
      setTestResult({ success: false, message });
      
      toast({
        title: "Connection test failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!currentWorkspace?.id || integration.authType !== 'OAUTH2') return;

    setRefreshingToken(true);

    try {
      await integrationsService.refreshOAuthToken(currentWorkspace.id, integration.id);
      
      toast({
        title: "Token refreshed",
        description: "OAuth token has been refreshed successfully.",
      });

      onUpdate();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to refresh token",
        variant: "destructive",
      });
    } finally {
      setRefreshingToken(false);
    }
  };

  const handleSync = async () => {
    if (!currentWorkspace?.id) return;

    try {
      const result = await integrationsService.syncIntegration(currentWorkspace.id, integration.id);
      
      toast({
        title: result.success ? "Sync completed" : "Sync failed",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });

      if (result.success) {
        onUpdate();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sync integration",
        variant: "destructive",
      });
    }
  };

  const formatTokenExpiry = (expiry?: string) => {
    if (!expiry) return 'Unknown';
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    const diffMs = expiryDate.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffMs < 0) return 'Expired';
    if (diffHours < 1) return 'Expires soon';
    if (diffHours < 24) return `${diffHours}h remaining`;
    return `${diffDays}d remaining`;
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Power className="w-5 h-5" />
            Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge 
                variant={integration.status === 'ACTIVE' ? 'default' : 'secondary'}
                className={integration.status === 'ACTIVE' ? 'bg-green-500' : ''}
              >
                {integration.status}
              </Badge>
              <div>
                <p className="text-sm font-medium">
                  Last sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString() : 'Never'}
                </p>
                {integration.nextSync && (
                  <p className="text-xs text-muted-foreground">
                    Next sync: {new Date(integration.nextSync).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? (
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                ) : (
                  <TestTube className="w-4 h-4 mr-2" />
                )}
                Test Connection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </div>
          </div>

          {testResult && (
            <Alert className={`mt-4 ${testResult.success ? 'border-green-200' : 'border-red-200'}`}>
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                {testResult.message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Authentication Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Authentication
          </CardTitle>
          <CardDescription>
            Manage authentication credentials and tokens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integration.authType === 'OAUTH2' && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>OAuth Token</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshToken}
                  disabled={refreshingToken}
                >
                  {refreshingToken ? (
                    <LoadingSpinner className="w-4 h-4 mr-2" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh Token
                </Button>
              </div>
              {integration.configuration?.authData?.tokenExpiry && (
                <p className="text-sm text-muted-foreground mb-2">
                  Status: {formatTokenExpiry(integration.configuration?.authData.tokenExpiry)}
                </p>
              )}
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  OAuth token is managed automatically. Click "Refresh Token" if you're experiencing authentication issues.
                </p>
              </div>
            </div>
          )}

          {integration.authType === 'API_KEY' && (
            <div>
              <Label htmlFor="apiKey">API Key</Label>
              <div className="relative mt-1">
                <Input
                  id="apiKey"
                  type={showApiKey ? 'text' : 'password'}
                  {...form.register('apiKey')}
                  placeholder="Enter your API key"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Synchronization Settings
          </CardTitle>
          <CardDescription>
            Configure how often data is synchronized between services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="syncEnabled">Enable Synchronization</Label>
              <p className="text-sm text-muted-foreground">
                Allow this integration to sync data automatically
              </p>
            </div>
            <Switch
              id="syncEnabled"
              checked={form.watch('syncEnabled')}
              onCheckedChange={(checked) => form.setValue('syncEnabled', checked)}
            />
          </div>

          <div>
            <Label htmlFor="syncFrequency">Sync Frequency</Label>
            <Select
              value={form.watch('syncFrequency')}
              onValueChange={(value) => form.setValue('syncFrequency', value as any)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_FREQUENCY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notificationsEnabled">Enable Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for sync events and errors
              </p>
            </div>
            <Switch
              id="notificationsEnabled"
              checked={form.watch('notificationsEnabled')}
              onCheckedChange={(checked) => form.setValue('notificationsEnabled', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Custom Settings */}
      {Object.keys(integration.configuration?.settings || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Custom Settings</CardTitle>
            <CardDescription>
              Integration-specific configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(integration.configuration?.settings || {}).map(([key, value]) => (
              <div key={key}>
                <Label htmlFor={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Label>
                {typeof value === 'boolean' ? (
                  <Switch
                    id={key}
                    checked={value}
                    onCheckedChange={(checked) => {
                      const currentSettings = form.getValues('customSettings') || {};
                      form.setValue('customSettings', { ...currentSettings, [key]: checked });
                    }}
                    className="mt-1"
                  />
                ) : typeof value === 'string' && value.length > 50 ? (
                  <Textarea
                    id={key}
                    value={value}
                    onChange={(e) => {
                      const currentSettings = form.getValues('customSettings') || {};
                      form.setValue('customSettings', { ...currentSettings, [key]: e.target.value });
                    }}
                    className="mt-1"
                  />
                ) : (
                  <Input
                    id={key}
                    value={String(value)}
                    onChange={(e) => {
                      const currentSettings = form.getValues('customSettings') || {};
                      form.setValue('customSettings', { ...currentSettings, [key]: e.target.value });
                    }}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>Permissions</CardTitle>
          <CardDescription>
            Current permissions granted to this integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {integration.permissions?.map((permission) => (
              <Badge key={permission} variant="outline">
                {permission}
              </Badge>
            )) ?? (
              <p className="text-sm text-muted-foreground">No permissions configured</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end">
        <Button
          onClick={form.handleSubmit(handleSave as any)}
          disabled={loading}
          className="min-w-[120px]"
        >
          {loading ? (
            <LoadingSpinner className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
      </div>
    </div>
  );
}