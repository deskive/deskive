import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDebouncedCallback } from 'use-debounce';
import {
  useEmailConnection,
  useSmtpImapConnection,
  useAllConnectionsList,
  useEmails,
  useSmtpImapEmails,
  useEmail,
  useSmtpImapEmail,
  useLabels,
  useSmtpImapLabels,
  useAnalyzeEmailPriority,
  useGetPrioritiesForConnection,
  emailService,
  SYSTEM_LABELS,
  getLabelDisplayName,
  type EmailProvider,
  type EmailConnection,
  type EmailPriority,
} from '@/lib/api/email-api';
import { EmailList, type EmailWithProvider } from '@/components/email/EmailList';
import { EmailDetail } from '@/components/email/EmailDetail';
import { EmailCompose } from '@/components/email/EmailCompose';
import { EmailConnect } from '@/components/email/EmailConnect';
import { EmailSidebar } from '@/components/email/EmailSidebar';
import { EmailAccountSelector } from '@/components/email/EmailAccountSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, RefreshCw, Search, PenSquare, X, Sparkles, SortAsc } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailPage() {
  const intl = useIntl();
  const { currentWorkspace } = useWorkspace();
  const { folder, messageId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const workspaceId = currentWorkspace?.id || '';

  // State
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(messageId || null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [emailPriorities, setEmailPriorities] = useState<Record<string, EmailPriority>>({});
  const [prioritySort, setPrioritySort] = useState<'none' | 'high-first' | 'high-only'>('none');

  // Current label/folder
  const currentLabel = folder || 'INBOX';

  // Queries - all hooks must be called before any early returns
  // Check both Gmail and SMTP/IMAP connections (for backward compatibility)
  const { data: gmailConnectionData, isLoading: isLoadingGmailConnection, refetch: refetchGmailConnection } = useEmailConnection(workspaceId);
  const { data: smtpImapConnectionData, isLoading: isLoadingSmtpImapConnection, refetch: refetchSmtpImapConnection } = useSmtpImapConnection(workspaceId);

  // Get all connections as array for tabs
  const { data: allConnectionsData, refetch: refetchAllConnections } = useAllConnectionsList(workspaceId);
  const allConnections: EmailConnection[] = allConnectionsData?.data || [];

  // Determine active provider
  const isGmailConnected = gmailConnectionData?.connected;
  const isSmtpImapConnected = smtpImapConnectionData?.connected;
  const isConnected = isGmailConnected || isSmtpImapConnected;

  // Support switching between connections via URL param (by connection ID)
  // null or 'all' means show all emails from all connected accounts
  const urlConnectionId = searchParams.get('connection');
  const isAllMailMode = !urlConnectionId || urlConnectionId === 'all';

  // Find active connection from URL param
  const activeConnectionFromUrl = urlConnectionId && urlConnectionId !== 'all'
    ? allConnections.find((c) => c.id === urlConnectionId)
    : null;

  // In All Mail mode, activeProvider is null (we fetch from all)
  // Otherwise, use the specific connection's provider
  const activeProvider: EmailProvider | null = isAllMailMode
    ? null
    : activeConnectionFromUrl?.provider ||
      (isGmailConnected ? 'gmail' : isSmtpImapConnected ? 'smtp_imap' : null);

  const activeConnection = activeConnectionFromUrl ||
    (!isAllMailMode && activeProvider === 'gmail' ? gmailConnectionData?.data :
     !isAllMailMode && activeProvider === 'smtp_imap' ? smtpImapConnectionData?.data : null);

  // Get the active connection IDs based on selected provider
  const activeGmailConnectionId = activeConnection?.provider === 'gmail' ? activeConnection.id : undefined;
  const activeSmtpConnectionId = activeConnection?.provider === 'smtp_imap' ? activeConnection.id : undefined;

  // Gmail queries - enabled when Gmail is connected and (in All Mail mode OR Gmail is active provider)
  const shouldFetchGmail = !!workspaceId && isGmailConnected && (isAllMailMode || activeProvider === 'gmail');
  const {
    data: gmailEmailsData,
    isLoading: isLoadingGmailEmails,
    isFetching: isFetchingGmailEmails,
    refetch: refetchGmailEmails,
    fetchNextPage: fetchNextGmailPage,
    hasNextPage: hasNextGmailPage,
    isFetchingNextPage: isFetchingNextGmailPage,
  } = useEmails(
    workspaceId,
    {
      labelId: currentLabel,
      query: activeSearch || undefined,
      enabled: shouldFetchGmail,
      connectionId: activeGmailConnectionId,
    }
  );
  const { data: gmailLabels } = useLabels(workspaceId, { enabled: shouldFetchGmail });
  const { data: gmailSelectedEmail, isLoading: isLoadingGmailEmail } = useEmail(
    workspaceId,
    selectedMessageId || '',
    { enabled: activeProvider === 'gmail' || (isAllMailMode && isGmailConnected), connectionId: activeGmailConnectionId }
  );

  // SMTP/IMAP queries - enabled when SMTP/IMAP is connected and (in All Mail mode OR SMTP/IMAP is active provider)
  const shouldFetchSmtpImap = !!workspaceId && isSmtpImapConnected && (isAllMailMode || activeProvider === 'smtp_imap');
  const {
    data: smtpImapEmailsData,
    isLoading: isLoadingSmtpImapEmails,
    isFetching: isFetchingSmtpImapEmails,
    refetch: refetchSmtpImapEmails,
    fetchNextPage: fetchNextSmtpImapPage,
    hasNextPage: hasNextSmtpImapPage,
    isFetchingNextPage: isFetchingNextSmtpImapPage,
  } = useSmtpImapEmails(
    workspaceId,
    {
      labelId: currentLabel,
      query: activeSearch || undefined,
      enabled: shouldFetchSmtpImap,
      connectionId: activeSmtpConnectionId,
    }
  );
  const { data: smtpImapLabels } = useSmtpImapLabels(workspaceId, { enabled: shouldFetchSmtpImap });
  const { data: smtpImapSelectedEmail, isLoading: isLoadingSmtpImapEmail } = useSmtpImapEmail(
    workspaceId,
    selectedMessageId || '',
    currentLabel,
    { enabled: activeProvider === 'smtp_imap' || (isAllMailMode && isSmtpImapConnected), connectionId: activeSmtpConnectionId }
  );

  // Flatten pages to get all emails with provider info
  const gmailEmailsWithProvider: EmailWithProvider[] = (gmailEmailsData?.pages.flatMap((page) => page?.emails || []) || [])
    .map(email => ({
      ...email,
      provider: 'gmail' as EmailProvider,
      connectionEmail: gmailConnectionData?.data?.emailAddress,
    }));

  const smtpImapEmailsWithProvider: EmailWithProvider[] = (smtpImapEmailsData?.pages.flatMap((page) => page?.emails || []) || [])
    .map(email => ({
      ...email,
      provider: 'smtp_imap' as EmailProvider,
      connectionEmail: smtpImapConnectionData?.data?.emailAddress,
    }));

  // Combine and sort emails for All Mail mode, or use single source
  const emailsBase: EmailWithProvider[] = isAllMailMode
    ? [...gmailEmailsWithProvider, ...smtpImapEmailsWithProvider].sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : 0;
        const dateB = b.date ? new Date(b.date).getTime() : 0;
        return dateB - dateA; // Newest first
      })
    : activeProvider === 'gmail'
      ? gmailEmailsWithProvider
      : smtpImapEmailsWithProvider;

  // Merge emails with priority data and apply sorting/filtering
  const emailsWithPriority: EmailWithProvider[] = emailsBase.map(email => ({
    ...email,
    priority: emailPriorities[email.id],
  }));

  // Apply priority sort/filter
  const emails: EmailWithProvider[] = (() => {
    if (prioritySort === 'none') return emailsWithPriority;

    if (prioritySort === 'high-only') {
      return emailsWithPriority.filter(email => email.priority?.level === 'high');
    }

    // high-first: sort by priority score (high to low), then by date
    const priorityOrder: Record<string, number> = { high: 4, medium: 3, low: 2, none: 1 };
    return [...emailsWithPriority].sort((a, b) => {
      const aPriority = priorityOrder[a.priority?.level || 'none'] || 0;
      const bPriority = priorityOrder[b.priority?.level || 'none'] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      // If same priority, sort by date
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      return dateB - dateA;
    });
  })();

  // Use combined labels in All Mail mode
  const labels = isAllMailMode
    ? [...(gmailLabels || []), ...(smtpImapLabels || [])]
    : activeProvider === 'gmail' ? gmailLabels : smtpImapLabels;

  // Selected email - try to find from either source in All Mail mode
  const selectedEmail = isAllMailMode
    ? (gmailSelectedEmail || smtpImapSelectedEmail)
    : activeProvider === 'gmail' ? gmailSelectedEmail : smtpImapSelectedEmail;

  // Loading states - ensure all are boolean (query states can be undefined when disabled)
  const isLoadingEmails: boolean = isAllMailMode
    ? Boolean((isGmailConnected && isLoadingGmailEmails) || (isSmtpImapConnected && isLoadingSmtpImapEmails))
    : Boolean(activeProvider === 'gmail' ? isLoadingGmailEmails : isLoadingSmtpImapEmails);

  const isFetchingEmails = isAllMailMode
    ? isFetchingGmailEmails || isFetchingSmtpImapEmails
    : activeProvider === 'gmail' ? isFetchingGmailEmails : isFetchingSmtpImapEmails;

  const isLoadingEmail = isAllMailMode
    ? isLoadingGmailEmail || isLoadingSmtpImapEmail
    : activeProvider === 'gmail' ? isLoadingGmailEmail : isLoadingSmtpImapEmail;

  const refetchEmails = () => {
    if (isAllMailMode) {
      if (isGmailConnected) refetchGmailEmails();
      if (isSmtpImapConnected) refetchSmtpImapEmails();
    } else if (activeProvider === 'gmail') {
      refetchGmailEmails();
    } else {
      refetchSmtpImapEmails();
    }
  };

  const fetchNextPage = isAllMailMode
    ? () => {
        if (hasNextGmailPage) fetchNextGmailPage();
        if (hasNextSmtpImapPage) fetchNextSmtpImapPage();
      }
    : activeProvider === 'gmail' ? fetchNextGmailPage : fetchNextSmtpImapPage;

  const hasNextPage = isAllMailMode
    ? hasNextGmailPage || hasNextSmtpImapPage
    : activeProvider === 'gmail' ? hasNextGmailPage : hasNextSmtpImapPage;

  const isFetchingNextPage = isAllMailMode
    ? isFetchingNextGmailPage || isFetchingNextSmtpImapPage
    : activeProvider === 'gmail' ? isFetchingNextGmailPage : isFetchingNextSmtpImapPage;
  const isLoadingConnection = isLoadingGmailConnection || isLoadingSmtpImapConnection;
  const refetchConnection = () => {
    refetchGmailConnection();
    refetchSmtpImapConnection();
    refetchAllConnections();
  };

  // Email priority analysis mutation
  const analyzePriorityMutation = useAnalyzeEmailPriority(workspaceId);

  // For fetching priorities, use activeConnection or fallback to first connection in All Mail mode
  const priorityConnectionId = activeConnection?.id || (allConnections.length > 0 ? allConnections[0].id : '');

  // Fetch stored priorities for the connection (synced from mobile/other devices)
  const { data: storedPrioritiesData } = useGetPrioritiesForConnection(
    workspaceId,
    priorityConnectionId
  );

  // For multi-account All Mail mode, also fetch priorities from other connections
  const secondConnectionId = isAllMailMode && allConnections.length > 1 ? allConnections[1].id : '';
  const { data: storedPrioritiesData2 } = useGetPrioritiesForConnection(
    workspaceId,
    secondConnectionId
  );

  // Populate emailPriorities from stored data when connection changes
  useEffect(() => {
    const priorityMap: Record<string, EmailPriority> = {};

    // Merge priorities from first connection
    if (storedPrioritiesData?.priorities && storedPrioritiesData.priorities.length > 0) {
      storedPrioritiesData.priorities.forEach(p => {
        priorityMap[p.emailId] = p.priority;
      });
    }

    // Merge priorities from second connection (if in All Mail mode)
    if (storedPrioritiesData2?.priorities && storedPrioritiesData2.priorities.length > 0) {
      storedPrioritiesData2.priorities.forEach(p => {
        priorityMap[p.emailId] = p.priority;
      });
    }

    if (Object.keys(priorityMap).length > 0) {
      setEmailPriorities(prev => ({ ...prev, ...priorityMap }));
    }
  }, [storedPrioritiesData, storedPrioritiesData2]);

  // Handler to analyze email priorities
  const handleAnalyzePriority = useCallback(async () => {
    if (emails.length === 0) {
      toast.error('No emails to analyze');
      return;
    }

    // Prepare emails for analysis (limit to first 10 unread emails to avoid AI truncation)
    const emailsToAnalyze = emails
      .filter(email => !email.isRead)
      .slice(0, 10)
      .map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        date: email.date,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
      }));

    if (emailsToAnalyze.length === 0) {
      // If no unread emails, analyze all emails
      const allEmailsToAnalyze = emails.slice(0, 10).map(email => ({
        id: email.id,
        from: email.from,
        subject: email.subject,
        snippet: email.snippet,
        date: email.date,
        isRead: email.isRead,
        hasAttachments: email.hasAttachments,
      }));

      if (allEmailsToAnalyze.length === 0) {
        toast.error('No emails to analyze');
        return;
      }

      try {
        toast.info('Analyzing email priorities...');
        const result = await analyzePriorityMutation.mutateAsync({
          emails: allEmailsToAnalyze,
          connectionId: priorityConnectionId || undefined, // Save to backend for cross-platform sync
        });

        // Store priorities in state
        const priorityMap: Record<string, EmailPriority> = {};
        result.priorities.forEach(p => {
          priorityMap[p.emailId] = p.priority;
        });
        setEmailPriorities(prev => ({ ...prev, ...priorityMap }));

        const highPriorityCount = result.priorities.filter(p => p.priority.level === 'high').length;
        toast.success(`Analysis complete! ${highPriorityCount} high priority email${highPriorityCount !== 1 ? 's' : ''} found.`);
      } catch (error) {
        console.error('Failed to analyze priorities:', error);
        toast.error('Failed to analyze email priorities');
      }
      return;
    }

    try {
      toast.info('Analyzing email priorities...');
      const result = await analyzePriorityMutation.mutateAsync({
        emails: emailsToAnalyze,
        connectionId: priorityConnectionId || undefined, // Save to backend for cross-platform sync
      });

      // Store priorities in state
      const priorityMap: Record<string, EmailPriority> = {};
      result.priorities.forEach(p => {
        priorityMap[p.emailId] = p.priority;
      });
      setEmailPriorities(prev => ({ ...prev, ...priorityMap }));

      const highPriorityCount = result.priorities.filter(p => p.priority.level === 'high').length;
      toast.success(`Analysis complete! ${highPriorityCount} high priority email${highPriorityCount !== 1 ? 's' : ''} found.`);
    } catch (error) {
      console.error('Failed to analyze priorities:', error);
      toast.error('Failed to analyze email priorities');
    }
  }, [emails, analyzePriorityMutation, priorityConnectionId]);

  // Handle URL params for OAuth callback
  useEffect(() => {
    if (!workspaceId) return;

    const emailConnected = searchParams.get('emailConnected');
    const emailError = searchParams.get('emailError');

    if (emailConnected) {
      refetchConnection();
      // Clean up URL
      navigate(`/workspaces/${workspaceId}/email`, { replace: true });
    }

    if (emailError) {
      console.error('Email connection error:', emailError);
      navigate(`/workspaces/${workspaceId}/email`, { replace: true });
    }
  }, [searchParams, workspaceId, navigate, refetchConnection]);

  // Update selected message from URL
  useEffect(() => {
    if (messageId) {
      setSelectedMessageId(messageId);
    }
  }, [messageId]);

  // Debounced search - triggers 500ms after user stops typing
  // NOTE: This hook MUST be called before any early returns to avoid hooks order violation
  const debouncedSearch = useDebouncedCallback((value: string) => {
    setActiveSearch(value);
  }, 500);

  // Don't render until workspace is loaded
  if (!workspaceId) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Cancel debounce and search immediately
    debouncedSearch.cancel();
    setActiveSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    debouncedSearch.cancel();
  };

  const handleSelectEmail = (id: string) => {
    setSelectedMessageId(id);
    // Preserve connection parameter when selecting an email
    const connectionParam = urlConnectionId && urlConnectionId !== 'all' ? `?connection=${urlConnectionId}` : '';
    navigate(`/workspaces/${workspaceId}/email/message/${id}${connectionParam}`);
  };

  const handleCloseDetail = () => {
    setSelectedMessageId(null);
    // Preserve connection parameter when closing detail
    const connectionParam = urlConnectionId ? `?connection=${urlConnectionId}` : '';
    navigate(`/workspaces/${workspaceId}/email/${currentLabel}${connectionParam}`);
  };

  const handleFolderChange = (labelId: string) => {
    setSelectedMessageId(null);
    setActiveSearch('');
    setSearchQuery('');
    // Preserve connection parameter when changing folder
    const connectionParam = urlConnectionId ? `?connection=${urlConnectionId}` : '';
    navigate(`/workspaces/${workspaceId}/email/${labelId}${connectionParam}`);
  };

  const handleConnect = async () => {
    try {
      const { authorizationUrl } = await emailService.getAuthUrl(
        workspaceId,
        window.location.href
      );
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to get auth URL:', error);
    }
  };

  // Loading state
  if (isLoadingConnection) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not connected state
  if (!isConnected) {
    return (
      <EmailConnect
        onConnect={handleConnect}
        onSmtpImapSuccess={() => refetchConnection()}
      />
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <EmailSidebar
        labels={labels || []}
        currentLabel={currentLabel}
        onSelectLabel={handleFolderChange}
        onCompose={() => setIsComposeOpen(true)}
        connection={activeConnection || undefined}
        provider={activeProvider}
        canAddAccount={true}
        onAddAccount={() => setIsAddAccountOpen(true)}
        isAllMailMode={isAllMailMode}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center gap-2 p-3 border-b bg-background">
          {/* Compose button - hidden in All Mail mode */}
          {!isAllMailMode && (
            <Button
              variant="default"
              size="sm"
              onClick={() => setIsComposeOpen(true)}
              className="gap-2"
            >
              <PenSquare className="h-4 w-4" />
              {intl.formatMessage({ id: 'modules.email.compose', defaultMessage: 'Compose' })}
            </Button>
          )}

          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={intl.formatMessage({ id: 'modules.email.search.placeholder', defaultMessage: 'Search emails...' })}
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 pr-8"
              />
              {(searchQuery || activeSearch) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={handleClearSearch}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!searchQuery && !activeSearch}
            >
              <Search className="h-4 w-4 mr-1" />
              Search
            </Button>
          </form>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchEmails()}
            disabled={isFetchingEmails}
          >
            <RefreshCw className={`h-4 w-4 ${isFetchingEmails ? 'animate-spin' : ''}`} />
          </Button>

          {/* AI Priority Analysis Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAnalyzePriority}
            disabled={analyzePriorityMutation.isPending || emails.length === 0}
            className="gap-2"
          >
            {analyzePriorityMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {analyzePriorityMutation.isPending
              ? intl.formatMessage({ id: 'modules.email.analyzePriority.analyzing', defaultMessage: 'Analyzing...' })
              : intl.formatMessage({ id: 'modules.email.analyzePriority.button', defaultMessage: 'Analyze Priority' })}
          </Button>

          {/* Priority Sort/Filter */}
          {Object.keys(emailPriorities).length > 0 && (
            <Select value={prioritySort} onValueChange={(value: 'none' | 'high-first' | 'high-only') => setPrioritySort(value)}>
              <SelectTrigger className="w-[160px] h-9">
                <SortAsc className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Default (by date)</SelectItem>
                <SelectItem value="high-first">Priority: High first</SelectItem>
                <SelectItem value="high-only">High priority only</SelectItem>
              </SelectContent>
            </Select>
          )}

          <div className="text-sm text-muted-foreground ml-auto">
            {isAllMailMode ? 'All Mail' : getLabelDisplayName(currentLabel)}
            {activeSearch && ` - Search: "${activeSearch}"`}
          </div>
        </div>

        {/* Account selector - shows when multiple connections exist */}
        {allConnections.length > 0 && (
          <div className="px-3 py-2 border-b bg-muted/30">
            <EmailAccountSelector
              connections={allConnections}
              activeConnectionId={isAllMailMode ? null : (activeConnection?.id || null)}
              onConnectionChange={(connectionId) => {
                if (connectionId === null) {
                  // All Mail mode - clear connection param or set to 'all'
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete('connection');
                  setSearchParams(newParams);
                } else {
                  setSearchParams({ connection: connectionId });
                }
              }}
            />
          </div>
        )}

        {/* Email list and detail */}
        <div className="flex-1 flex overflow-hidden">
          {/* Email list */}
          <div className={`${selectedMessageId ? 'w-2/5 border-r' : 'w-full'} overflow-hidden`}>
            <EmailList
              emails={emails}
              isLoading={isLoadingEmails}
              selectedId={selectedMessageId}
              onSelectEmail={handleSelectEmail}
              onRefresh={() => refetchEmails()}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
              showSource={isAllMailMode}
            />
          </div>

          {/* Email detail */}
          {selectedMessageId && (
            <div className="flex-1 overflow-hidden">
              <EmailDetail
                email={selectedEmail}
                isLoading={isLoadingEmail}
                onClose={handleCloseDetail}
                onReply={() => setIsComposeOpen(true)}
                workspaceId={workspaceId}
                provider={activeProvider}
                connectionId={activeConnection?.id}
                mailbox={currentLabel}
              />
            </div>
          )}
        </div>
      </div>

      {/* Compose modal */}
      {isComposeOpen && (
        <EmailCompose
          workspaceId={workspaceId}
          onClose={() => setIsComposeOpen(false)}
          replyTo={selectedEmail}
          provider={activeProvider}
          connectionId={activeConnection?.id}
        />
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Email Account</DialogTitle>
          </DialogHeader>
          <EmailConnect
            onConnect={handleConnect}
            onSmtpImapSuccess={() => {
              refetchConnection();
              setIsAddAccountOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
