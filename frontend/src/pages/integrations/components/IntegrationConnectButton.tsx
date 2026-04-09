/**
 * Integration Connect Button
 * A reusable button component that handles OAuth/API Key connection flow for any integration
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Link, Unlink, Key, ExternalLink, AlertCircle } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import dropboxApi from '@/lib/api/dropbox-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  type IntegrationCatalogEntry,
  type IntegrationConnection,
  useInitiateOAuth,
  useConnectWithApiKey,
  useDisconnectIntegration,
  integrationFrameworkKeys,
} from '@/lib/api/integrations-api';
import { useQueryClient } from '@tanstack/react-query';

interface IntegrationConnectButtonProps {
  integration: IntegrationCatalogEntry;
  connection?: IntegrationConnection | null;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  onConnected?: (connection: IntegrationConnection) => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
}

export function IntegrationConnectButton({
  integration,
  connection,
  variant = 'default',
  size = 'default',
  className,
  onConnected,
  onDisconnected,
  onError,
}: IntegrationConnectButtonProps) {
  const intl = useIntl();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { workspaceId } = useParams<{ workspaceId: string }>();

  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const initiateOAuth = useInitiateOAuth();
  const connectWithApiKey = useConnectWithApiKey();
  const disconnectIntegration = useDisconnectIntegration();

  const isConnected = !!connection && connection.status === 'active';
  const isLoading = initiateOAuth.isPending || connectWithApiKey.isPending || disconnectIntegration.isPending || isRedirecting;

  const handleConnect = async () => {
    if (!workspaceId) {
      toast({
        title: intl.formatMessage({ id: 'error.noWorkspace', defaultMessage: 'Error' }),
        description: intl.formatMessage({ id: 'error.workspaceRequired', defaultMessage: 'Workspace is required' }),
        variant: 'destructive',
      });
      return;
    }

    // For API key integrations, show dialog
    if (integration.authType === 'api_key') {
      setShowApiKeyDialog(true);
      return;
    }

    // For OAuth integrations, redirect to authorization URL
    try {
      setIsRedirecting(true);
      const returnUrl = `${window.location.origin}/workspaces/${workspaceId}/apps`;

      // Use dedicated Dropbox API instead of generic
      if (integration.slug === 'dropbox') {
        const response = await dropboxApi.getAuthUrl(workspaceId, returnUrl);
        window.location.href = response.authorizationUrl;
        return;
      }

      // Generic OAuth for other integrations
      const response = await initiateOAuth.mutateAsync({
        workspaceId,
        slug: integration.slug,
        returnUrl,
      });

      // Redirect to OAuth provider
      window.location.href = response.authUrl;
    } catch (error) {
      setIsRedirecting(false);
      const err = error instanceof Error ? error : new Error('Failed to initiate OAuth');
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.connectError', defaultMessage: 'Connection Error' }),
        description: err.message,
        variant: 'destructive',
      });
      onError?.(err);
    }
  };

  const handleApiKeyConnect = async () => {
    if (!workspaceId || !apiKey.trim()) return;

    try {
      const newConnection = await connectWithApiKey.mutateAsync({
        workspaceId,
        slug: integration.slug,
        apiKey: apiKey.trim(),
      });

      setShowApiKeyDialog(false);
      setApiKey('');

      toast({
        title: intl.formatMessage({ id: 'modules.integrations.connected', defaultMessage: 'Connected' }),
        description: intl.formatMessage(
          { id: 'modules.integrations.connectedDescription', defaultMessage: 'Successfully connected to {name}' },
          { name: integration.name }
        ),
      });

      // Invalidate connections query
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connections(workspaceId) });

      onConnected?.(newConnection);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to connect');
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.connectError', defaultMessage: 'Connection Error' }),
        description: err.message,
        variant: 'destructive',
      });
      onError?.(err);
    }
  };

  const handleDisconnect = async () => {
    if (!workspaceId || !connection) return;

    try {
      // Use dedicated Dropbox API instead of generic
      if (integration.slug === 'dropbox') {
        await dropboxApi.disconnect(workspaceId);
      } else {
        await disconnectIntegration.mutateAsync({
          workspaceId,
          connectionId: connection.id,
        });
      }

      setShowDisconnectDialog(false);

      toast({
        title: intl.formatMessage({ id: 'modules.integrations.disconnected', defaultMessage: 'Disconnected' }),
        description: intl.formatMessage(
          { id: 'modules.integrations.disconnectedDescription', defaultMessage: 'Successfully disconnected from {name}' },
          { name: integration.name }
        ),
      });

      // Invalidate connections query
      queryClient.invalidateQueries({ queryKey: integrationFrameworkKeys.connections(workspaceId) });

      onDisconnected?.();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to disconnect');
      toast({
        title: intl.formatMessage({ id: 'modules.integrations.disconnectError', defaultMessage: 'Disconnect Error' }),
        description: err.message,
        variant: 'destructive',
      });
      onError?.(err);
    }
  };

  // Render connection status indicator for error states
  const renderConnectionStatus = () => {
    if (!connection) return null;

    if (connection.status === 'error') {
      return (
        <Alert variant="destructive" className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connection.errorMessage || intl.formatMessage({ id: 'modules.integrations.connectionError', defaultMessage: 'Connection error' })}
          </AlertDescription>
        </Alert>
      );
    }

    if (connection.status === 'expired') {
      return (
        <Alert variant="default" className="mt-2 border-yellow-500">
          <AlertCircle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700 dark:text-yellow-400">
            {intl.formatMessage({ id: 'modules.integrations.tokenExpired', defaultMessage: 'Token expired. Please reconnect.' })}
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  };

  return (
    <>
      <div className={className}>
        {isConnected ? (
          <Button
            variant="outline"
            size={size}
            onClick={() => setShowDisconnectDialog(true)}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Unlink className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: 'modules.integrations.disconnect', defaultMessage: 'Disconnect' })}
          </Button>
        ) : (
          <Button
            variant={variant}
            size={size}
            onClick={handleConnect}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : integration.authType === 'api_key' ? (
              <Key className="h-4 w-4" />
            ) : (
              <Link className="h-4 w-4" />
            )}
            {intl.formatMessage({ id: 'modules.integrations.connect', defaultMessage: 'Connect' })}
          </Button>
        )}
        {renderConnectionStatus()}
      </div>

      {/* API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              {intl.formatMessage(
                { id: 'modules.integrations.connectWithApiKey', defaultMessage: 'Connect {name}' },
                { name: integration.name }
              )}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage(
                { id: 'modules.integrations.apiKeyDescription', defaultMessage: 'Enter your {name} API key to connect.' },
                { name: integration.name }
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">
                {intl.formatMessage({ id: 'modules.integrations.apiKey', defaultMessage: 'API Key' })}
              </Label>
              <Input
                id="apiKey"
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
              />
            </div>

            {integration.documentationUrl && (
              <a
                href={integration.documentationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                {intl.formatMessage({ id: 'modules.integrations.findApiKey', defaultMessage: 'How to find your API key' })}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              onClick={handleApiKeyConnect}
              disabled={!apiKey.trim() || connectWithApiKey.isPending}
            >
              {connectWithApiKey.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {intl.formatMessage({ id: 'modules.integrations.connect', defaultMessage: 'Connect' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {intl.formatMessage(
                { id: 'modules.integrations.disconnectTitle', defaultMessage: 'Disconnect {name}?' },
                { name: integration.name }
              )}
            </DialogTitle>
            <DialogDescription>
              {intl.formatMessage(
                { id: 'modules.integrations.disconnectWarning', defaultMessage: 'This will remove the connection to {name}. You can reconnect at any time.' },
                { name: integration.name }
              )}
            </DialogDescription>
          </DialogHeader>

          {connection?.externalEmail && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.integrations.connectedAs', defaultMessage: 'Connected as:' })}
              </p>
              <p className="text-sm font-medium">{connection.externalEmail}</p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisconnectDialog(false)}>
              {intl.formatMessage({ id: 'common.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={disconnectIntegration.isPending}
            >
              {disconnectIntegration.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {intl.formatMessage({ id: 'modules.integrations.disconnect', defaultMessage: 'Disconnect' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
