import React, { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import {
  RefreshCw,
  Link,
  Unlink,
  Calendar,
  Loader2,
  Check,
  AlertCircle,
  Clock,
  CheckCircle2,
  Timer,
  ChevronDown,
  ChevronUp,
  Settings2,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  useGoogleCalendarConnection,
  useGoogleCalendarSync,
  useGoogleCalendarDisconnect,
  useUpdateSelectedCalendars,
  useRefreshAvailableCalendars,
  googleCalendarApi,
} from '../../lib/api/calendar-api';
import type { GoogleCalendarInfo } from '../../lib/api/calendar-api';

export function GoogleCalendarConnect() {
  const intl = useIntl();
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id || '';

  const { data: connectionData, isLoading, refetch } = useGoogleCalendarConnection(workspaceId);
  const syncMutation = useGoogleCalendarSync(workspaceId);
  const disconnectMutation = useGoogleCalendarDisconnect(workspaceId);
  const updateCalendarsMutation = useUpdateSelectedCalendars(workspaceId);
  const refreshCalendarsMutation = useRefreshAvailableCalendars(workspaceId);

  const isConnected = connectionData?.connected;
  const connection = connectionData?.data;

  // State for calendar selection
  const [isCalendarSelectOpen, setIsCalendarSelectOpen] = useState(false);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selected calendars from connection data
  useEffect(() => {
    if (connection?.selectedCalendars) {
      const ids = connection.selectedCalendars.map(cal => cal.id);
      setSelectedCalendarIds(ids);
      setHasChanges(false);
    }
  }, [connection?.selectedCalendars]);

  const handleCalendarToggle = (calendarId: string, checked: boolean) => {
    setSelectedCalendarIds(prev => {
      const newIds = checked
        ? [...prev, calendarId]
        : prev.filter(id => id !== calendarId);

      // Check if there are changes from the original selection
      const originalIds = connection?.selectedCalendars?.map(cal => cal.id) || [];
      const hasChange = newIds.length !== originalIds.length ||
        newIds.some(id => !originalIds.includes(id)) ||
        originalIds.some(id => !newIds.includes(id));
      setHasChanges(hasChange);

      return newIds;
    });
  };

  const handleSaveCalendarSelection = async () => {
    if (selectedCalendarIds.length === 0) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.selectAtLeastOne', defaultMessage: 'Please select at least one calendar to sync' }));
      return;
    }

    try {
      await updateCalendarsMutation.mutateAsync(selectedCalendarIds);
      toast.success(intl.formatMessage({ id: 'modules.calendar.googleCalendar.selectionUpdated', defaultMessage: 'Calendar selection updated. Syncing events...' }));
      setHasChanges(false);
      // Trigger a sync after updating calendars
      await syncMutation.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Failed to update calendar selection:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.selectionUpdateFailed', defaultMessage: 'Failed to update calendar selection' }));
    }
  };

  const handleRefreshCalendars = async () => {
    try {
      await refreshCalendarsMutation.mutateAsync();
      toast.success(intl.formatMessage({ id: 'modules.calendar.googleCalendar.calendarsRefreshed', defaultMessage: 'Available calendars refreshed' }));
      refetch();
    } catch (error) {
      console.error('Failed to refresh calendars:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.calendarsRefreshFailed', defaultMessage: 'Failed to refresh calendars' }));
    }
  };

  const handleConnect = async () => {
    try {
      const { authorizationUrl } = await googleCalendarApi.getAuthUrl(
        workspaceId,
        window.location.href
      );
      window.location.href = authorizationUrl;
    } catch (error: any) {
      console.error('Failed to get auth URL:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
      toast.error(`${intl.formatMessage({ id: 'modules.calendar.googleCalendar.connectError', defaultMessage: 'Failed to connect to Google Calendar:' })} ${errorMessage}`);
    }
  };

  const handleSync = async () => {
    try {
      // Events are now fetched directly from Google API on-demand
      // This just refreshes the connection status and triggers a calendar refresh
      await syncMutation.mutateAsync();
      toast.success(intl.formatMessage({ id: 'modules.calendar.googleCalendar.calendarRefreshed', defaultMessage: 'Calendar refreshed! Events are now fetched directly from Google.' }));
      refetch();
    } catch (error) {
      console.error('Failed to refresh:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.syncError', defaultMessage: 'Failed to refresh calendar' }));
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync();
      toast.success(intl.formatMessage({ id: 'modules.calendar.googleCalendar.disconnectSuccess', defaultMessage: 'Google Calendar disconnected successfully' }));
      refetch();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.disconnectError', defaultMessage: 'Failed to disconnect Google Calendar' }));
    }
  };

  // Handle OAuth callback
  React.useEffect(() => {
    const url = new URL(window.location.href);
    const calendarConnected = url.searchParams.get('calendarConnected');
    const calendarError = url.searchParams.get('calendarError');

    if (calendarConnected) {
      toast.success(intl.formatMessage({ id: 'modules.calendar.googleCalendar.connectedSuccess', defaultMessage: 'Google Calendar connected successfully' }));
      refetch();
      // Clean URL
      url.searchParams.delete('calendarConnected');
      url.searchParams.delete('email');
      window.history.replaceState({}, '', url.toString());
    }

    if (calendarError) {
      toast.error(intl.formatMessage({ id: 'modules.calendar.googleCalendar.connectedError', defaultMessage: 'Failed to connect Google Calendar' }));
      // Clean URL
      url.searchParams.delete('calendarError');
      window.history.replaceState({}, '', url.toString());
    }
  }, [intl, refetch]);

  if (!workspaceId) return null;

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'modules.calendar.googleCalendar.loading', defaultMessage: 'Loading...' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Separator />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {intl.formatMessage({ id: 'modules.calendar.googleCalendar.title', defaultMessage: 'Google Calendar' })}
          </h3>
        </div>

        {isConnected && connection ? (
          <div className="space-y-3">
            {/* Connection status with sync indicator */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="gap-1 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-green-700 dark:text-green-400">
                  {intl.formatMessage({ id: 'modules.calendar.googleCalendar.connected', defaultMessage: 'Connected' })}
                </span>
              </Badge>
              {syncMutation.isPending && (
                <Badge variant="secondary" className="gap-1 animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span className="text-xs">{intl.formatMessage({ id: 'modules.calendar.googleCalendar.syncing', defaultMessage: 'Syncing...' })}</span>
                </Badge>
              )}
            </div>

            {/* Connected account info */}
            <div className="p-2 bg-muted/50 rounded-md space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-medium truncate flex-1" title={connection.googleEmail}>
                  {connection.googleEmail}
                </p>
              </div>

              {/* Sync status info */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {connection.lastSyncedAt ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help">
                            {formatDistanceToNow(new Date(connection.lastSyncedAt), { addSuffix: true })}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{new Date(connection.lastSyncedAt).toLocaleString()}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span>{intl.formatMessage({ id: 'modules.calendar.googleCalendar.neverSynced', defaultMessage: 'Never synced' })}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-muted-foreground/70">
                  <Timer className="h-3 w-3" />
                  <span>{intl.formatMessage({ id: 'modules.calendar.googleCalendar.autoSync', defaultMessage: 'Auto-sync: 10min' })}</span>
                </div>
              </div>
            </div>

            {/* Calendar Selection */}
            {connection.availableCalendars && connection.availableCalendars.length > 0 && (
              <Collapsible open={isCalendarSelectOpen} onOpenChange={setIsCalendarSelectOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-2 py-1.5 h-auto"
                  >
                    <div className="flex items-center gap-2">
                      <Settings2 className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">
                        {intl.formatMessage(
                          {
                            id: 'modules.calendar.googleCalendar.selectCalendars',
                            defaultMessage: 'Select Calendars to Sync ({selected}/{total})'
                          },
                          {
                            selected: selectedCalendarIds.length,
                            total: connection.availableCalendars.length
                          }
                        )}
                      </span>
                    </div>
                    {isCalendarSelectOpen ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-2">
                  <div className="p-2 bg-muted/30 rounded-md space-y-2 max-h-48 overflow-y-auto">
                    {connection.availableCalendars.map((calendar: GoogleCalendarInfo) => (
                      <div key={calendar.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`calendar-${calendar.id}`}
                          checked={selectedCalendarIds.includes(calendar.id)}
                          onCheckedChange={(checked) =>
                            handleCalendarToggle(calendar.id, checked as boolean)
                          }
                        />
                        <Label
                          htmlFor={`calendar-${calendar.id}`}
                          className="flex items-center gap-2 text-xs cursor-pointer flex-1 min-w-0"
                        >
                          {calendar.color && (
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: calendar.color }}
                            />
                          )}
                          <span className="truncate" title={calendar.name}>
                            {calendar.name}
                          </span>
                          {calendar.primary && (
                            <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                              {intl.formatMessage({ id: 'modules.calendar.googleCalendar.primary', defaultMessage: 'Primary' })}
                            </Badge>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>

                  {/* Calendar selection actions */}
                  <div className="flex gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={handleRefreshCalendars}
                            disabled={refreshCalendarsMutation.isPending}
                          >
                            {refreshCalendarsMutation.isPending ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{intl.formatMessage({ id: 'modules.calendar.googleCalendar.refreshAvailableCalendars', defaultMessage: 'Refresh available calendars' })}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    <Button
                      variant="default"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={handleSaveCalendarSelection}
                      disabled={
                        !hasChanges ||
                        updateCalendarsMutation.isPending ||
                        selectedCalendarIds.length === 0
                      }
                    >
                      {updateCalendarsMutation.isPending ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                          {intl.formatMessage({ id: 'modules.calendar.googleCalendar.saving', defaultMessage: 'Saving...' })}
                        </>
                      ) : (
                        <>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {intl.formatMessage({ id: 'modules.calendar.googleCalendar.saveAndSync', defaultMessage: 'Save & Sync' })}
                        </>
                      )}
                    </Button>
                  </div>

                  {selectedCalendarIds.length === 0 && (
                    <p className="text-xs text-destructive">
                      {intl.formatMessage({ id: 'modules.calendar.googleCalendar.pleaseSelectCalendar', defaultMessage: 'Please select at least one calendar' })}
                    </p>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleSync}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {syncMutation.isPending
                        ? intl.formatMessage({ id: 'modules.calendar.googleCalendar.refreshing', defaultMessage: 'Refreshing...' })
                        : intl.formatMessage({ id: 'modules.calendar.googleCalendar.sync', defaultMessage: 'Sync' })}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{intl.formatMessage({ id: 'modules.calendar.googleCalendar.syncTooltip', defaultMessage: 'Refresh calendar to fetch latest events from Google' })}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Unlink className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {intl.formatMessage({ id: 'modules.calendar.googleCalendar.disconnectTitle', defaultMessage: 'Disconnect Google Calendar' })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {intl.formatMessage({ id: 'modules.calendar.googleCalendar.disconnectDescription', defaultMessage: 'This will remove your Google Calendar connection and stop syncing events. You can reconnect at any time.' })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>
                      {intl.formatMessage({ id: 'common.cancel' })}
                    </AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90">
                      {intl.formatMessage({ id: 'modules.calendar.googleCalendar.disconnect', defaultMessage: 'Disconnect' })}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Not connected state */}
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {intl.formatMessage({ id: 'modules.calendar.googleCalendar.notConnected', defaultMessage: 'Not connected to Google Calendar' })}
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              {intl.formatMessage({ id: 'modules.calendar.googleCalendar.connectDescription', defaultMessage: 'Connect your Google Calendar to sync events and schedules.' })}
            </p>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleConnect}
            >
              <Link className="h-4 w-4 mr-2" />
              {intl.formatMessage({ id: 'modules.calendar.googleCalendar.connect', defaultMessage: 'Connect Google Calendar' })}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
