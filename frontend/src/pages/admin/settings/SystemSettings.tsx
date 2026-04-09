/**
 * System Settings Component
 * Interface for configuring system-wide settings and preferences
 */

import React, { useState, useEffect } from 'react';
import {
  Save,
  Globe,
  Mail,
  Database,
  Shield,
  Zap,
  BarChart3,
  AlertTriangle,
  Link,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Switch } from '../../../components/ui/switch';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Separator } from '../../../components/ui/separator';
import { useToast } from '../../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type { SystemConfig } from '@/lib/api/admin-api';


const SystemSettings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSystemConfig();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      setLoading(true);
      const data = await adminService.getSystemConfig();
      setConfig(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch system configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config || !hasChanges) return;

    try {
      setSaving(true);
      await adminService.updateSystemConfig(config);
      toast({
        title: 'Success',
        description: 'System configuration updated successfully',
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update system configuration',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section: keyof SystemConfig, key: string, value: any) => {
    if (!config) return;

    const updatedConfig = {
      ...config,
      [section]: {
        ...config[section],
        [key]: value,
      },
    };

    setConfig(updatedConfig);
    setHasChanges(true);
  };

  // updateNestedConfig function removed as it was unused

  // Remove unused settingsSections variable since it's not being used

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load configuration</h3>
          <p className="text-muted-foreground mb-4">There was an error loading the system configuration.</p>
          <Button onClick={fetchSystemConfig}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground">
            Configure system-wide settings and preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchSystemConfig}
            disabled={saving}
          >
            Reset Changes
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
          >
            {saving ? <LoadingSpinner size="sm" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="limits">Limits</TabsTrigger>
          <TabsTrigger value="email">Email</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Basic system configuration and site information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name *</Label>
                  <Input
                    id="siteName"
                    value={config.general?.siteName || ''}
                    onChange={(e) => updateConfig('general', 'siteName', e.target.value)}
                    placeholder="Your Site Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteUrl">Site URL *</Label>
                  <Input
                    id="siteUrl"
                    value={config.general?.siteUrl || ''}
                    onChange={(e) => updateConfig('general', 'siteUrl', e.target.value)}
                    placeholder="https://yoursite.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={config.general?.adminEmail || ''}
                    onChange={(e) => updateConfig('general', 'adminEmail', e.target.value)}
                    placeholder="admin@yoursite.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={config.general?.supportEmail || ''}
                    onChange={(e) => updateConfig('general', 'supportEmail', e.target.value)}
                    placeholder="support@yoursite.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={config.general?.timezone || 'UTC'}
                    onValueChange={(value) => updateConfig('general', 'timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Default Language</Label>
                  <Select
                    value={config.general?.language || 'en'}
                    onValueChange={(value) => updateConfig('general', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                      <SelectItem value="ko">Korean</SelectItem>
                      <SelectItem value="zh">Chinese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Maintenance Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, only admins can access the system
                  </p>
                </div>
                <Switch
                  checked={config.general?.maintenanceMode || false}
                  onCheckedChange={(checked) => updateConfig('general', 'maintenanceMode', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Settings */}
        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Feature Settings
              </CardTitle>
              <CardDescription>
                Enable or disable platform features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {Object.entries(config.features || {}).map(([key, enabled]) => (
                  <div key={key} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label className="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        {getFeatureDescription(key)}
                      </p>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) => updateConfig('features', key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Limits */}
        <TabsContent value="limits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Limits
              </CardTitle>
              <CardDescription>
                Configure usage limits and quotas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxUsersPerOrganization">Max Users per Organization</Label>
                  <Input
                    id="maxUsersPerOrganization"
                    type="number"
                    min="1"
                    value={config.limits.maxUsersPerOrganization}
                    onChange={(e) => updateConfig('limits', 'maxUsersPerOrganization', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxWorkspacesPerUser">Max Workspaces per User</Label>
                  <Input
                    id="maxWorkspacesPerUser"
                    type="number"
                    min="1"
                    value={config.limits.maxWorkspacesPerUser}
                    onChange={(e) => updateConfig('limits', 'maxWorkspacesPerUser', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    min="1"
                    value={config.limits.maxFileSize}
                    onChange={(e) => updateConfig('limits', 'maxFileSize', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxStoragePerUser">Max Storage per User (GB)</Label>
                  <Input
                    id="maxStoragePerUser"
                    type="number"
                    min="1"
                    value={config.limits.maxStoragePerUser}
                    onChange={(e) => updateConfig('limits', 'maxStoragePerUser', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="apiRateLimit">API Rate Limit (requests per minute)</Label>
                <Input
                  id="apiRateLimit"
                  type="number"
                  min="1"
                  value={config.limits.apiRateLimit}
                  onChange={(e) => updateConfig('limits', 'apiRateLimit', parseInt(e.target.value))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email Configuration */}
        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration
              </CardTitle>
              <CardDescription>
                Configure email service provider and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="emailProvider">Email Provider</Label>
                <Select
                  value={config.email?.provider || 'SMTP'}
                  onValueChange={(value: any) => updateConfig('email', 'provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SMTP">SMTP</SelectItem>
                    <SelectItem value="SENDGRID">SendGrid</SelectItem>
                    <SelectItem value="MAILGUN">Mailgun</SelectItem>
                    <SelectItem value="SES">Amazon SES</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromName">From Name</Label>
                  <Input
                    id="fromName"
                    value={config.email?.fromName || ''}
                    onChange={(e) => updateConfig('email', 'fromName', e.target.value)}
                    placeholder="Your App Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">From Email</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={config.email?.fromEmail || ''}
                    onChange={(e) => updateConfig('email', 'fromEmail', e.target.value)}
                    placeholder="noreply@yourapp.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="replyTo">Reply-To Email</Label>
                <Input
                  id="replyTo"
                  type="email"
                  value={config.email?.replyTo || ''}
                  onChange={(e) => updateConfig('email', 'replyTo', e.target.value)}
                  placeholder="support@yourapp.com"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage Configuration */}
        <TabsContent value="storage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Storage Configuration
              </CardTitle>
              <CardDescription>
                Configure file storage provider and settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="storageProvider">Storage Provider</Label>
                <Select
                  value={config.storage?.provider || 'LOCAL'}
                  onValueChange={(value: any) => updateConfig('storage', 'provider', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOCAL">Local Storage</SelectItem>
                    <SelectItem value="S3">Amazon S3</SelectItem>
                    <SelectItem value="CLOUDINARY">Cloudinary</SelectItem>
                    <SelectItem value="GCS">Google Cloud Storage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {config.storage?.provider !== 'LOCAL' && (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="bucketName">Bucket Name</Label>
                      <Input
                        id="bucketName"
                        value={config.storage?.bucketName || ''}
                        onChange={(e) => updateConfig('storage', 'bucketName', e.target.value)}
                        placeholder="your-bucket-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Input
                        id="region"
                        value={config.storage?.region || ''}
                        onChange={(e) => updateConfig('storage', 'region', e.target.value)}
                        placeholder="us-east-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="publicUrl">Public URL</Label>
                    <Input
                      id="publicUrl"
                      value={config.storage?.publicUrl || ''}
                      onChange={(e) => updateConfig('storage', 'publicUrl', e.target.value)}
                      placeholder="https://your-cdn.com"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Analytics
                </CardTitle>
                <CardDescription>
                  Configure analytics and tracking services
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="googleAnalyticsId">Google Analytics ID</Label>
                  <Input
                    id="googleAnalyticsId"
                    value={config.analytics.googleAnalyticsId || ''}
                    onChange={(e) => updateConfig('analytics', 'googleAnalyticsId', e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mixpanelToken">Mixpanel Token</Label>
                  <Input
                    id="mixpanelToken"
                    value={config.analytics.mixpanelToken || ''}
                    onChange={(e) => updateConfig('analytics', 'mixpanelToken', e.target.value)}
                    placeholder="your-mixpanel-token"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hotjarId">Hotjar Site ID</Label>
                  <Input
                    id="hotjarId"
                    value={config.analytics.hotjarId || ''}
                    onChange={(e) => updateConfig('analytics', 'hotjarId', e.target.value)}
                    placeholder="1234567"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link className="h-5 w-5" />
                  OAuth Providers
                </CardTitle>
                <CardDescription>
                  Configure OAuth integration settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slackClientId">Slack Client ID</Label>
                  <Input
                    id="slackClientId"
                    value={config.integrations.slackClientId || ''}
                    onChange={(e) => updateConfig('integrations', 'slackClientId', e.target.value)}
                    placeholder="123456789.123456789"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="googleClientId">Google Client ID</Label>
                  <Input
                    id="googleClientId"
                    value={config.integrations.googleClientId || ''}
                    onChange={(e) => updateConfig('integrations', 'googleClientId', e.target.value)}
                    placeholder="123456789-abc.apps.googleusercontent.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="microsoftClientId">Microsoft Client ID</Label>
                  <Input
                    id="microsoftClientId"
                    value={config.integrations.microsoftClientId || ''}
                    onChange={(e) => updateConfig('integrations', 'microsoftClientId', e.target.value)}
                    placeholder="12345678-1234-1234-1234-123456789012"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="githubClientId">GitHub Client ID</Label>
                  <Input
                    id="githubClientId"
                    value={config.integrations.githubClientId || ''}
                    onChange={(e) => updateConfig('integrations', 'githubClientId', e.target.value)}
                    placeholder="1234567890abcdef1234"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {hasChanges && (
        <div className="fixed bottom-4 right-4 bg-background border rounded-lg p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <p className="font-medium">You have unsaved changes</p>
              <p className="text-muted-foreground">Don't forget to save your configuration</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={fetchSystemConfig}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <LoadingSpinner size="sm" /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to get feature descriptions
const getFeatureDescription = (feature: string): string => {
  const descriptions: Record<string, string> = {
    userRegistration: 'Allow new users to register accounts',
    emailVerification: 'Require email verification for new accounts',
    twoFactorAuth: 'Enable two-factor authentication option',
    socialLogin: 'Allow social media login (OAuth)',
    fileUploads: 'Enable file upload functionality',
    realTimeChat: 'Enable real-time messaging features',
    videoConferencing: 'Enable video call functionality',
    integrations: 'Allow third-party integrations',
  };
  return descriptions[feature] || `Enable ${feature} functionality`;
};

export default SystemSettings;