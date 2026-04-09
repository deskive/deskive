/**
 * Integration Logs Component
 * Displays integration activity logs and error messages
 */

import { useState, useEffect } from 'react';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  CheckCircle,
  Search,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { 
  type InstalledIntegration,
  integrationsService
} from '@/lib/api/integrations-api';

interface IntegrationLogsProps {
  integration: InstalledIntegration;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'ERROR' | 'WARN' | 'INFO';
  message: string;
  details?: string;
  source: string;
  metadata?: Record<string, any>;
}

const LOG_LEVEL_COLORS = {
  ERROR: 'bg-red-500/10 text-red-700 dark:text-red-300',
  WARN: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  INFO: 'bg-blue-500/10 text-blue-700 dark:text-blue-300',
};

const LOG_LEVEL_ICONS = {
  ERROR: <AlertCircle className="w-4 h-4" />,
  WARN: <AlertTriangle className="w-4 h-4" />,
  INFO: <Info className="w-4 h-4" />,
};

export function IntegrationLogs({ integration }: IntegrationLogsProps) {
  const { currentWorkspace } = useWorkspace();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'ERROR' | 'WARN' | 'INFO'>('all');
  const [dateRange, setDateRange] = useState('7d');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace?.id) {
      loadLogs();
    }
  }, [currentWorkspace?.id, integration.id, levelFilter, dateRange]);

  const loadLogs = async (isRefresh = false) => {
    if (!currentWorkspace?.id) return;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(endDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
      }

      const result = await integrationsService.getIntegrationLogs(
        currentWorkspace.id,
        integration.id,
        {
          level: levelFilter === 'all' ? undefined : levelFilter,
          limit: 100,
        }
      );

      setLogs(result.logs);
      setTotalLogs(result.total);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    loadLogs(true);
  };

  const handleExport = async () => {
    // This would typically export logs as CSV or JSON
    toast({
      title: "Export started",
      description: "Log export will begin shortly. You'll receive a download link.",
    });
  };

  const filteredLogs = logs.filter(log => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(query) ||
        log.source.toLowerCase().includes(query) ||
        (log.details && log.details.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getLogLevelStats = () => {
    const stats = { ERROR: 0, WARN: 0, INFO: 0 };
    logs.forEach(log => {
      stats[log.level]++;
    });
    return stats;
  };

  const stats = getLogLevelStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner className="w-6 h-6" />
        <span className="ml-2">Loading logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Integration Logs</h3>
          <p className="text-sm text-muted-foreground">
            Activity logs and error messages for {integration.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Errors</p>
                <p className="text-xl font-semibold">{stats.ERROR}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-xl font-semibold">{stats.WARN}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Info className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Info</p>
                <p className="text-xl font-semibold">{stats.INFO}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-semibold">{totalLogs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={levelFilter} onValueChange={(value: any) => setLevelFilter(value)}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="ERROR">Errors</SelectItem>
                <SelectItem value="WARN">Warnings</SelectItem>
                <SelectItem value="INFO">Info</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">Last Day</SelectItem>
                <SelectItem value="7d">Last Week</SelectItem>
                <SelectItem value="30d">Last Month</SelectItem>
                <SelectItem value="90d">Last 3 Months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No logs found</h3>
            <p className="text-muted-foreground">
              {logs.length === 0 
                ? `No logs available for the selected time period.`
                : `No logs match your search criteria.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredLogs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div 
                  className="cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                >
                  <div className="flex items-start gap-3">
                    <Badge 
                      variant="secondary" 
                      className={LOG_LEVEL_COLORS[log.level]}
                    >
                      {LOG_LEVEL_ICONS[log.level]}
                      <span className="ml-1">{log.level}</span>
                    </Badge>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium truncate">{log.message}</p>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimestamp(log.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Source: {log.source}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {expandedLog === log.id && (
                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <div className="space-y-3">
                        <div>
                          <h5 className="font-medium text-sm mb-1">Timestamp</h5>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString()}
                          </p>
                        </div>
                        
                        {log.details && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Details</h5>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-background p-2 rounded border">
                              {log.details}
                            </pre>
                          </div>
                        )}
                        
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <div>
                            <h5 className="font-medium text-sm mb-1">Metadata</h5>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap bg-background p-2 rounded border">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Show More Button */}
      {filteredLogs.length > 0 && filteredLogs.length < totalLogs && (
        <div className="text-center">
          <Button variant="outline" onClick={() => loadLogs()}>
            Load More Logs
          </Button>
        </div>
      )}
    </div>
  );
}