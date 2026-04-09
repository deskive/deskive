import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2, Bell, CalendarPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  type EmailConnection,
  useConnectionSettings,
  useUpdateConnectionSettings,
} from '@/lib/api/email-api';

interface EmailSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connection: EmailConnection;
}

export function EmailSettingsDialog({
  open,
  onOpenChange,
  connection,
}: EmailSettingsDialogProps) {
  const intl = useIntl();
  const { toast } = useToast();

  const {
    data: settings,
    isLoading,
    error,
  } = useConnectionSettings(connection.workspaceId, connection.id, {
    enabled: open,
  });

  const updateSettingsMutation = useUpdateConnectionSettings(
    connection.workspaceId,
    connection.id
  );

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        notificationsEnabled: enabled,
      });
      toast({
        title: intl.formatMessage({
          id: enabled
            ? 'modules.email.settings.notifications.enabled'
            : 'modules.email.settings.notifications.disabled',
        }),
        description: intl.formatMessage({
          id: enabled
            ? 'modules.email.settings.notifications.enabledDesc'
            : 'modules.email.settings.notifications.disabledDesc',
        }),
      });
    } catch (error) {
      console.error('Failed to update notifications setting:', error);
      toast({
        title: intl.formatMessage({ id: 'common.error' }),
        description: intl.formatMessage({
          id: 'modules.email.settings.notifications.error',
        }),
        variant: 'destructive',
      });
    }
  };

  const handleToggleAutoCreateEvents = async (enabled: boolean) => {
    try {
      await updateSettingsMutation.mutateAsync({
        autoCreateEvents: enabled,
      });
      toast({
        title: intl.formatMessage({
          id: enabled
            ? 'modules.email.settings.autoCreateEvents.enabled'
            : 'modules.email.settings.autoCreateEvents.disabled',
        }),
        description: intl.formatMessage({
          id: enabled
            ? 'modules.email.settings.autoCreateEvents.enabledDesc'
            : 'modules.email.settings.autoCreateEvents.disabledDesc',
        }),
      });
    } catch (error) {
      console.error('Failed to update auto-create events setting:', error);
      toast({
        title: intl.formatMessage({ id: 'common.error' }),
        description: intl.formatMessage({
          id: 'modules.email.settings.autoCreateEvents.error',
        }),
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {intl.formatMessage({ id: 'modules.email.settings.title' })}
          </DialogTitle>
          <DialogDescription>
            {intl.formatMessage(
              { id: 'modules.email.settings.description' },
              { email: connection.emailAddress }
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="py-4 text-center text-sm text-destructive">
            {intl.formatMessage({ id: 'modules.email.settings.loadError' })}
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-start gap-3">
                <Bell className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <Label
                    htmlFor="notifications"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {intl.formatMessage({
                      id: 'modules.email.settings.notifications.title',
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: 'modules.email.settings.notifications.description',
                    })}
                  </p>
                </div>
              </div>
              <Switch
                id="notifications"
                checked={settings?.notificationsEnabled ?? false}
                onCheckedChange={handleToggleNotifications}
                disabled={updateSettingsMutation.isPending}
              />
            </div>

            {/* Auto-Create Events Toggle */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex items-start gap-3">
                <CalendarPlus className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <Label
                    htmlFor="auto-create-events"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {intl.formatMessage({
                      id: 'modules.email.settings.autoCreateEvents.title',
                    })}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {intl.formatMessage({
                      id: 'modules.email.settings.autoCreateEvents.description',
                    })}
                  </p>
                </div>
              </div>
              <Switch
                id="auto-create-events"
                checked={settings?.autoCreateEvents ?? false}
                onCheckedChange={handleToggleAutoCreateEvents}
                disabled={updateSettingsMutation.isPending}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
