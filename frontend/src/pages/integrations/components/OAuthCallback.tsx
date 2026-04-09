/**
 * OAuth Callback Component
 * Handles OAuth authorization callbacks from third-party services
 *
 * The new integration framework handles OAuth server-side.
 * This component displays the result after the backend redirects back.
 */

import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useIntl } from 'react-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { integrationFrameworkKeys } from '@/lib/api/integrations-api';
import { useQueryClient } from '@tanstack/react-query';

type CallbackState = 'loading' | 'success' | 'error';

export function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const intl = useIntl();
  const queryClient = useQueryClient();

  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);
  const [integrationName, setIntegrationName] = useState<string>('');

  // Get the workspace ID from params or context
  const effectiveWorkspaceId = workspaceId || currentWorkspace?.id;

  useEffect(() => {
    handleOAuthResult();
  }, []);

  const handleOAuthResult = async () => {
    try {
      // The new backend redirects back with query params indicating success/error
      const success = searchParams.get('success');
      const errorMsg = searchParams.get('error');
      const integrationSlug = searchParams.get('integration');
      const integrationNameParam = searchParams.get('name');

      // Also support legacy format
      const code = searchParams.get('code');
      const stateParam = searchParams.get('state');
      const oauthError = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // New backend format: ?success=true&integration=google-drive&name=Google%20Drive
      if (success === 'true') {
        setIntegrationName(integrationNameParam || integrationSlug || 'Integration');
        setState('success');

        // Invalidate connections to refresh the list
        if (effectiveWorkspaceId) {
          queryClient.invalidateQueries({
            queryKey: integrationFrameworkKeys.connections(effectiveWorkspaceId)
          });
        }

        toast({
          title: intl.formatMessage({ id: 'modules.integrations.connected', defaultMessage: 'Integration connected' }),
          description: intl.formatMessage(
            { id: 'modules.integrations.connectedDescription', defaultMessage: '{name} has been successfully connected to your workspace.' },
            { name: integrationNameParam || integrationSlug || 'Integration' }
          ),
        });

        // Redirect after a short delay
        setTimeout(() => {
          navigateToIntegrations();
        }, 2000);

        return;
      }

      // New backend format: ?error=error_message
      if (errorMsg) {
        throw new Error(decodeURIComponent(errorMsg));
      }

      // Legacy OAuth error format
      if (oauthError) {
        let errorMessage = 'Authorization failed';
        if (oauthError === 'access_denied') {
          errorMessage = intl.formatMessage({ id: 'modules.integrations.accessDenied', defaultMessage: 'Access was denied by the user' });
        } else if (errorDescription) {
          errorMessage = decodeURIComponent(errorDescription);
        }
        throw new Error(errorMessage);
      }

      // If we have code and state, we might be in legacy mode - show loading
      // The new backend should handle everything server-side
      if (code && stateParam) {
        // This shouldn't happen with the new backend, but handle gracefully
        throw new Error(intl.formatMessage({
          id: 'modules.integrations.callbackNotProcessed',
          defaultMessage: 'Callback was not processed by the server. Please try again.'
        }));
      }

      // No recognizable parameters
      throw new Error(intl.formatMessage({
        id: 'modules.integrations.invalidCallback',
        defaultMessage: 'Invalid callback parameters'
      }));

    } catch (err) {
      console.error('OAuth callback error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete OAuth authorization';
      setError(errorMessage);
      setState('error');

      toast({
        title: intl.formatMessage({ id: 'modules.integrations.authFailed', defaultMessage: 'Authorization failed' }),
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const navigateToIntegrations = () => {
    if (effectiveWorkspaceId) {
      navigate(`/workspaces/${effectiveWorkspaceId}/integrations`);
    } else {
      navigate('/integrations');
    }
  };

  const handleRetry = () => {
    // Go back to integrations page to try again
    navigateToIntegrations();
  };

  const handleGoBack = () => {
    navigateToIntegrations();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {state === 'loading' && (
              <div className="p-4 bg-blue-500/10 rounded-full">
                <LoadingSpinner className="w-8 h-8 text-blue-600" />
              </div>
            )}
            {state === 'success' && (
              <div className="p-4 bg-green-500/10 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            )}
            {state === 'error' && (
              <div className="p-4 bg-red-500/10 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
          </div>
          <CardTitle>
            {state === 'loading' && intl.formatMessage({ id: 'modules.integrations.connecting', defaultMessage: 'Connecting Integration' })}
            {state === 'success' && intl.formatMessage({ id: 'modules.integrations.connected', defaultMessage: 'Integration Connected' })}
            {state === 'error' && intl.formatMessage({ id: 'modules.integrations.connectionFailed', defaultMessage: 'Connection Failed' })}
          </CardTitle>
          <CardDescription>
            {state === 'loading' && intl.formatMessage({ id: 'modules.integrations.pleaseWait', defaultMessage: 'Please wait while we complete the authorization process...' })}
            {state === 'success' && intl.formatMessage(
              { id: 'modules.integrations.successDescription', defaultMessage: '{name} has been successfully connected to your workspace.' },
              { name: integrationName }
            )}
            {state === 'error' && intl.formatMessage({ id: 'modules.integrations.errorDescription', defaultMessage: 'There was a problem connecting the integration.' })}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'loading' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.integrations.dontClose', defaultMessage: "This usually takes just a few seconds. Please don't close this window." })}
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {intl.formatMessage({ id: 'modules.integrations.redirecting', defaultMessage: "You're being redirected back to the integrations page..." })}
              </p>
              <Button onClick={handleGoBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {intl.formatMessage({ id: 'modules.integrations.backToIntegrations', defaultMessage: 'Back to Integrations' })}
              </Button>
            </div>
          )}

          {state === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  {error}
                </AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={handleRetry} className="w-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.integrations.tryAgain', defaultMessage: 'Try Again' })}
                </Button>
                <Button variant="outline" onClick={handleGoBack} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.integrations.backToIntegrations', defaultMessage: 'Back to Integrations' })}
                </Button>
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {intl.formatMessage({ id: 'modules.integrations.persistentError', defaultMessage: 'If the problem persists, please try connecting the integration again from the marketplace.' })}
                </p>
              </div>
            </div>
          )}

          {/* Debug Info (only in development) */}
          {import.meta.env.DEV && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {JSON.stringify({
                  success: searchParams.get('success'),
                  error: searchParams.get('error'),
                  integration: searchParams.get('integration'),
                  name: searchParams.get('name'),
                  code: searchParams.get('code'),
                  state: searchParams.get('state'),
                  workspace: effectiveWorkspaceId,
                  url: window.location.href,
                }, null, 2)}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
