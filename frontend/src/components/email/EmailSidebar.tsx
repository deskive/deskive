import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Inbox,
  Send,
  FileEdit,
  Star,
  Trash2,
  AlertCircle,
  Tag,
  PenSquare,
  LogOut,
  Server,
  Plus,
  Settings,
} from 'lucide-react';
import { EmailSettingsDialog } from './EmailSettingsDialog';
import {
  type Label,
  type EmailConnection,
  type EmailProvider,
  getLabelDisplayName,
  SYSTEM_LABELS,
  useDisconnectEmail,
  useDisconnectSmtpImap,
} from '@/lib/api/email-api';

interface EmailSidebarProps {
  labels: Label[];
  currentLabel: string;
  onSelectLabel: (labelId: string) => void;
  onCompose: () => void;
  connection?: EmailConnection;
  provider?: EmailProvider | null;
  canAddAccount?: boolean;
  onAddAccount?: () => void;
  isAllMailMode?: boolean;
}

export function EmailSidebar({
  labels,
  currentLabel,
  onSelectLabel,
  onCompose,
  connection,
  provider,
  canAddAccount,
  onAddAccount,
  isAllMailMode = false,
}: EmailSidebarProps) {
  const intl = useIntl();
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const { toast } = useToast();
  const disconnectGmailMutation = useDisconnectEmail(connection?.workspaceId || '');
  const disconnectSmtpImapMutation = useDisconnectSmtpImap(connection?.workspaceId || '');

  // System labels with translated names
  const systemLabelConfig = [
    { id: SYSTEM_LABELS.INBOX, icon: Inbox, name: intl.formatMessage({ id: 'modules.email.labels.inbox', defaultMessage: 'Inbox' }) },
    { id: SYSTEM_LABELS.STARRED, icon: Star, name: intl.formatMessage({ id: 'modules.email.labels.starred', defaultMessage: 'Starred' }) },
    { id: SYSTEM_LABELS.SENT, icon: Send, name: intl.formatMessage({ id: 'modules.email.labels.sent', defaultMessage: 'Sent' }) },
    { id: SYSTEM_LABELS.DRAFT, icon: FileEdit, name: intl.formatMessage({ id: 'modules.email.labels.drafts', defaultMessage: 'Drafts' }) },
    { id: SYSTEM_LABELS.TRASH, icon: Trash2, name: intl.formatMessage({ id: 'modules.email.labels.trash', defaultMessage: 'Trash' }) },
    { id: SYSTEM_LABELS.SPAM, icon: AlertCircle, name: intl.formatMessage({ id: 'modules.email.labels.spam', defaultMessage: 'Spam' }) },
  ];

  // Get unread count for a label
  const getUnreadCount = (labelId: string) => {
    const label = labels.find((l) => l.id === labelId);
    return label?.messagesUnread || 0;
  };

  // Get custom labels (non-system)
  const customLabels = labels.filter(
    (label) =>
      label.type === 'user' &&
      !Object.values(SYSTEM_LABELS).includes(label.id as any)
  );

  const handleDisconnect = async () => {
    try {
      if (provider === 'gmail') {
        await disconnectGmailMutation.mutateAsync();
      } else {
        await disconnectSmtpImapMutation.mutateAsync();
      }
      toast({
        title: 'Disconnected',
        description: 'Your email account has been disconnected successfully.',
      });
      window.location.reload();
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect email account. Please try again.',
        variant: 'destructive',
      });
    }
    setShowDisconnectDialog(false);
  };

  const getProviderLabel = () => {
    if (provider === 'gmail') return 'Gmail';
    if (provider === 'smtp_imap') return 'SMTP/IMAP';
    return 'Email';
  };

  return (
    <div className="w-56 flex flex-col border-r bg-muted/30">
      {/* Compose button - hidden in All Mail mode */}
      {!isAllMailMode && (
        <div className="p-3">
          <Button onClick={onCompose} className="w-full gap-2" size="sm">
            <PenSquare className="h-4 w-4" />
            {intl.formatMessage({ id: 'modules.email.compose', defaultMessage: 'Compose' })}
          </Button>
        </div>
      )}

      {/* All Mail mode header */}
      {isAllMailMode && (
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Inbox className="h-4 w-4" />
            <span>All Mail</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Viewing emails from all accounts
          </p>
        </div>
      )}

      {/* System labels - hidden in All Mail mode */}
      {!isAllMailMode && (
        <nav className="flex-1 overflow-auto px-2">
          <div className="space-y-1">
            {systemLabelConfig.map((item) => {
              const unreadCount = getUnreadCount(item.id);
              const isActive = currentLabel === item.id;
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelectLabel(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="flex-1 text-left truncate">{item.name}</span>
                  {unreadCount > 0 && (
                    <span className="text-xs font-medium bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Custom labels - only for Gmail */}
          {provider === 'gmail' && customLabels.length > 0 && (
            <div className="mt-4">
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Labels
              </div>
              <div className="space-y-1">
                {customLabels.map((label) => {
                  const isActive = currentLabel === label.id;

                  return (
                    <button
                      key={label.id}
                      onClick={() => onSelectLabel(label.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Tag
                        className="h-4 w-4 flex-shrink-0"
                        style={{
                          color: label.color?.backgroundColor,
                        }}
                      />
                      <span className="flex-1 text-left truncate">{label.name}</span>
                      {label.messagesUnread && label.messagesUnread > 0 && (
                        <span className="text-xs">{label.messagesUnread}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>
      )}

      {/* Spacer when in All Mail mode */}
      {isAllMailMode && <div className="flex-1" />}

      {/* Account info */}
      {connection && (
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-8 w-8">
              {connection.profilePicture ? (
                <AvatarImage src={connection.profilePicture} />
              ) : null}
              <AvatarFallback>
                {provider === 'smtp_imap' ? (
                  <Server className="h-4 w-4" />
                ) : (
                  connection.displayName?.[0] || connection.emailAddress?.[0]
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">
                  {connection.displayName || connection.emailAddress?.split('@')[0]}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {getProviderLabel()}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {connection.emailAddress}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {canAddAccount && onAddAccount && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-2"
                onClick={onAddAccount}
              >
                <Plus className="h-4 w-4" />
                {intl.formatMessage({ id: 'modules.email.addAccount', defaultMessage: 'Add' })}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setShowSettingsDialog(true)}
              title="Email Settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => setShowDisconnectDialog(true)}
              disabled={disconnectGmailMutation.isPending || disconnectSmtpImapMutation.isPending}
              title="Disconnect"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Disconnect confirmation dialog */}
      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Email Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to disconnect your {provider === 'gmail' ? 'Gmail' : 'email'} account?
              You will need to reconnect to access your emails again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={disconnectGmailMutation.isPending || disconnectSmtpImapMutation.isPending}
            >
              {(disconnectGmailMutation.isPending || disconnectSmtpImapMutation.isPending)
                ? 'Disconnecting...'
                : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Email Settings Dialog */}
      {connection && (
        <EmailSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          connection={connection}
        />
      )}
    </div>
  );
}
