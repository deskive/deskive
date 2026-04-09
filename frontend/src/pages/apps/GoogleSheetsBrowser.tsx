import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import {
  googleSheetsApi,
  type GoogleSheetsConnection,
  type Spreadsheet,
  formatLastSync,
} from '@/lib/api/google-sheets-api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Search,
  RefreshCw,
  ExternalLink,
  Link2,
  Unlink,
  FileSpreadsheet,
  ChevronLeft,
  ArrowLeft,
  Plus,
} from 'lucide-react';

export default function GoogleSheetsBrowser() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  const wsId = workspaceId || currentWorkspace?.id || '';

  // Connection state
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<GoogleSheetsConnection | null>(null);

  // Spreadsheets state
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loadingSheets, setLoadingSheets] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected spreadsheet for viewing
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<Spreadsheet | null>(null);
  const [iframeLoading, setIframeLoading] = useState(true);

  useEffect(() => {
    if (wsId) {
      loadConnection();
    }
  }, [wsId]);

  const loadConnection = async () => {
    try {
      const conn = await googleSheetsApi.getConnection(wsId);
      setConnection(conn);
      if (conn) {
        loadSpreadsheets();
      }
    } catch (error) {
      console.error('Failed to load connection:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSpreadsheets = async () => {
    setLoadingSheets(true);
    try {
      const result = await googleSheetsApi.listSpreadsheets(wsId);
      setSpreadsheets(result.spreadsheets);
    } catch (error) {
      console.error('Failed to load spreadsheets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load spreadsheets',
        variant: 'destructive',
      });
    } finally {
      setLoadingSheets(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const returnUrl = window.location.href;
      const result = await googleSheetsApi.connect(wsId, returnUrl);
      window.location.href = result.authorizationUrl;
    } catch (error) {
      console.error('Failed to connect:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate Google Sheets connection',
        variant: 'destructive',
      });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await googleSheetsApi.disconnect(wsId);
      setConnection(null);
      setSpreadsheets([]);
      toast({
        title: 'Disconnected',
        description: 'Google Sheets has been disconnected',
      });
    } catch (error) {
      console.error('Failed to disconnect:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect Google Sheets',
        variant: 'destructive',
      });
    }
  };

  const handleSpreadsheetClick = (spreadsheet: Spreadsheet) => {
    setSelectedSpreadsheet(spreadsheet);
    setIframeLoading(true);
  };

  const handleBack = () => {
    if (selectedSpreadsheet) {
      setSelectedSpreadsheet(null);
    } else {
      navigate(`/workspaces/${wsId}/apps`);
    }
  };

  const handleCreateNew = () => {
    window.open('https://docs.google.com/spreadsheets/create', '_blank');
  };

  // Filter spreadsheets
  const filteredSpreadsheets = spreadsheets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  // Not connected
  if (!connection) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>Connect Google Sheets</CardTitle>
            <CardDescription>
              Connect your Google account to access your spreadsheets within Deskive.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={handleConnect} disabled={connecting} size="lg">
              {connecting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4 mr-2" />
              )}
              Connect Google Sheets
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Viewing a specific spreadsheet - embed it
  if (selectedSpreadsheet) {
    const embedUrl = `https://docs.google.com/spreadsheets/d/${selectedSpreadsheet.id}/edit?embedded=true`;

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="border-b bg-card px-4 py-2.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-semibold truncate max-w-[300px]">{selectedSpreadsheet.name}</h1>
              <p className="text-xs text-muted-foreground">Google Sheets</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIframeLoading(true)}
            >
              <RefreshCw className={cn('w-4 h-4', iframeLoading && 'animate-spin')} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(selectedSpreadsheet.webViewLink || `https://docs.google.com/spreadsheets/d/${selectedSpreadsheet.id}`, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>

        {/* Embedded spreadsheet */}
        <div className="flex-1 relative">
          {iframeLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-green-600" />
                <p className="text-sm text-muted-foreground">Loading spreadsheet...</p>
              </div>
            </div>
          )}
          <iframe
            src={embedUrl}
            className="w-full h-full border-0"
            onLoad={() => setIframeLoading(false)}
            allow="clipboard-read; clipboard-write"
            title={selectedSpreadsheet.name}
          />
        </div>
      </div>
    );
  }

  // Spreadsheet list view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleBack}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-base font-semibold">Google Sheets</h1>
              <p className="text-xs text-muted-foreground">{connection.googleEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              New Sheet
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="text-muted-foreground hover:text-destructive"
            >
              <Unlink className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search spreadsheets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={loadSpreadsheets} disabled={loadingSheets}>
            <RefreshCw className={cn('w-4 h-4', loadingSheets && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Spreadsheet list */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {loadingSheets ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : filteredSpreadsheets.length > 0 ? (
            <div className="space-y-1">
              {filteredSpreadsheets.map((spreadsheet) => (
                <div
                  key={spreadsheet.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSpreadsheetClick(spreadsheet)}
                >
                  <div className="w-10 h-10 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{spreadsheet.name}</p>
                    {spreadsheet.modifiedTime && (
                      <p className="text-xs text-muted-foreground">
                        Modified {formatLastSync(spreadsheet.modifiedTime)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileSpreadsheet className="w-12 h-12 mb-4 opacity-50" />
              <p className="font-medium">
                {searchQuery ? 'No spreadsheets found' : 'No spreadsheets yet'}
              </p>
              <p className="text-sm mt-1">
                {searchQuery ? 'Try a different search' : 'Create a new spreadsheet to get started'}
              </p>
              {!searchQuery && (
                <Button variant="outline" className="mt-4" onClick={handleCreateNew}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Sheet
                </Button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
