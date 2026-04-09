/**
 * Log Aggregation Display
 * Real-time log monitoring, filtering, search, and analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  FileText,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  AlertTriangle,
  Info,
  AlertCircle,
  Bug,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Terminal,
  Eye,
  EyeOff,
  Copy,
  Server,
  User,
  Database,
  Zap
} from 'lucide-react';

import type { 
  LogEntry, 
  LogAggregation 
} from '@/lib/api/monitoring-api';

interface LogAggregationProps {
  logs: LogAggregation;
  workspaceId: string;
  onRefresh: () => void;
  onExport: (format: 'csv' | 'json' | 'txt') => void;
  isRealTimeEnabled?: boolean;
  onToggleRealTime?: () => void;
}

// Log level configuration
const LOG_LEVEL_CONFIG = {
  fatal: {
    color: 'red',
    bg: 'bg-red-100',
    border: 'border-red-300',
    text: 'text-red-900',
    icon: AlertTriangle,
    badge: 'bg-red-200'
  },
  error: {
    color: 'red',
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: AlertTriangle,
    badge: 'bg-red-100'
  },
  warn: {
    color: 'yellow',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    icon: AlertCircle,
    badge: 'bg-yellow-100'
  },
  info: {
    color: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    icon: Info,
    badge: 'bg-blue-100'
  },
  debug: {
    color: 'gray',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    icon: Bug,
    badge: 'bg-gray-100'
  }
};

// Log source icons
const SOURCE_ICONS = {
  api: Server,
  database: Database,
  auth: User,
  system: Terminal,
  application: Zap
};

// Log Entry Component
const LogEntryCard: React.FC<{
  log: LogEntry;
  onCopy?: (content: string) => void;
  expanded?: boolean;
  onToggleExpand?: () => void;
}> = ({ log, onCopy, expanded = false, onToggleExpand }) => {
  const levelConfig = LOG_LEVEL_CONFIG[log.level];
  const LevelIcon = levelConfig.icon;
  const SourceIcon = SOURCE_ICONS[log.source as keyof typeof SOURCE_ICONS] || Terminal;

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const handleCopy = () => {
    const content = `[${log.level.toUpperCase()}] ${log.timestamp} - ${log.source}
${log.message}
${log.stackTrace ? `\nStack Trace:\n${log.stackTrace}` : ''}
${log.metadata ? `\nMetadata: ${JSON.stringify(log.metadata, null, 2)}` : ''}`;
    
    navigator.clipboard.writeText(content);
    onCopy?.(content);
  };

  return (
    <div className={`rounded-lg border transition-all ${levelConfig.bg} ${levelConfig.border}`}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <div className={`p-2 rounded-lg ${levelConfig.badge} ${levelConfig.text}`}>
              <LevelIcon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${levelConfig.badge} ${levelConfig.text}`}>
                  {log.level.toUpperCase()}
                </span>
                
                <span className="inline-flex items-center text-xs text-gray-600">
                  <SourceIcon className="w-3 h-3 mr-1" />
                  {log.source}
                </span>
                
                <span className="text-xs text-gray-500">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatTimestamp(log.timestamp)}
                </span>

                {log.userId && (
                  <span className="text-xs text-gray-500">
                    <User className="w-3 h-3 inline mr-1" />
                    {log.userId}
                  </span>
                )}

                {log.requestId && (
                  <span className="text-xs text-gray-500 font-mono">
                    #{log.requestId.slice(-8)}
                  </span>
                )}
              </div>
              
              <p className="text-gray-900 text-sm font-mono break-words">
                {log.message}
              </p>

              {expanded && (
                <div className="mt-3 space-y-2">
                  {log.stackTrace && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 mb-1">Stack Trace:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto font-mono text-gray-800">
                        {log.stackTrace}
                      </pre>
                    </div>
                  )}
                  
                  {log.metadata && (
                    <div>
                      <h4 className="text-xs font-medium text-gray-700 mb-1">Metadata:</h4>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto font-mono text-gray-800">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-1 ml-3">
            <button
              onClick={handleCopy}
              className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
              title="Copy log entry"
            >
              <Copy className="w-4 h-4" />
            </button>
            
            {(log.stackTrace || log.metadata) && (
              <button
                onClick={onToggleExpand}
                className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                title={expanded ? "Collapse details" : "Expand details"}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Log Filter Component
const LogFilters: React.FC<{
  onFilterChange: (filters: {
    level?: string;
    source?: string;
    search?: string;
    dateRange?: { start: string; end: string };
  }) => void;
  sources: string[];
}> = ({ onFilterChange, sources }) => {
  const [filters, setFilters] = useState({
    level: '',
    source: '',
    search: '',
    dateRange: { start: '', end: '' }
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Log Filters
        </h3>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          {showAdvanced ? 'Hide Advanced' : 'Advanced Filters'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Basic Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Messages
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search log messages..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Log Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log Level
            </label>
            <select
              value={filters.level}
              onChange={(e) => handleFilterChange('level', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Levels</option>
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Sources</option>
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateRange.start}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={filters.dateRange.end}
                  onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleFilterChange('level', 'error')}
            className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm hover:bg-red-200 transition-colors"
          >
            Errors Only
          </button>
          <button
            onClick={() => handleFilterChange('level', 'warn')}
            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm hover:bg-yellow-200 transition-colors"
          >
            Warnings Only
          </button>
          <button
            onClick={() => setFilters({ level: '', source: '', search: '', dateRange: { start: '', end: '' } })}
            className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm hover:bg-gray-200 transition-colors"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  );
};

// Log Statistics Charts
const LogStatistics: React.FC<{
  summary: LogAggregation['summary'];
  trends: LogAggregation['trends'];
}> = ({ summary, trends }) => {
  const levelData = Object.entries(summary.byLevel).map(([level, count]) => ({
    name: level.charAt(0).toUpperCase() + level.slice(1),
    value: count,
    color: LOG_LEVEL_CONFIG[level as keyof typeof LOG_LEVEL_CONFIG]?.color || 'gray'
  }));

  const sourceData = Object.entries(summary.bySource)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 8)
    .map(([source, count]) => ({
      name: source,
      value: count as number
    }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Log Level Distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Log Level Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={levelData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="value"
              nameKey="name"
            >
              {levelData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={
                    entry.color === 'red' ? '#ef4444' :
                    entry.color === 'yellow' ? '#f59e0b' :
                    entry.color === 'blue' ? '#3b82f6' :
                    '#6b7280'
                  } 
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Top Log Sources */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Top Log Sources</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sourceData} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey="name" width={80} />
            <Tooltip />
            <Bar dataKey="value" fill="#6366f1" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Log Trends Over Time */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">Log Volume Trends</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleTimeString()}
            />
            <Legend />
            <Line type="monotone" dataKey="error" stroke="#ef4444" name="Errors" strokeWidth={2} />
            <Line type="monotone" dataKey="warn" stroke="#f59e0b" name="Warnings" strokeWidth={2} />
            <Line type="monotone" dataKey="info" stroke="#3b82f6" name="Info" strokeWidth={2} />
            <Line type="monotone" dataKey="debug" stroke="#6b7280" name="Debug" strokeWidth={1} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Top Errors Component
const TopErrors: React.FC<{
  topErrors: LogAggregation['summary']['topErrors'];
}> = ({ topErrors }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
        Top Error Messages
      </h3>
      
      {topErrors.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No errors found in the selected time period</p>
        </div>
      ) : (
        <div className="space-y-3">
          {topErrors.map((error: { message: string; count: number; lastSeen: string }, index: number) => (
            <div key={index} className="flex items-start justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex-1">
                <p className="font-mono text-sm text-gray-900 mb-1">
                  {error.message}
                </p>
                <div className="flex items-center space-x-4 text-xs text-gray-600">
                  <span>Count: {error.count}</span>
                  <span>Last seen: {new Date(error.lastSeen).toLocaleString()}</span>
                </div>
              </div>
              <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                {error.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Main Log Aggregation Component
export const LogAggregationComponent: React.FC<LogAggregationProps> = ({
  logs,
  workspaceId: _workspaceId,
  onRefresh,
  onExport,
  isRealTimeEnabled = false,
  onToggleRealTime
}) => {
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>(logs.logs || []);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Extract unique sources for filter dropdown
  const uniqueSources = Array.from(new Set((logs.logs || []).map(log => log.source).filter((source): source is string => !!source)));

  // Handle filter changes
  const handleFilterChange = (filters: any) => {
    let filtered = logs.logs || [];

    if (filters.level && filtered) {
      filtered = filtered.filter(log => log.level === filters.level);
    }

    if (filters.source && filtered) {
      filtered = filtered.filter(log => log.source === filters.source);
    }

    if (filters.search && filtered) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm) ||
        (log.source?.toLowerCase() || '').includes(searchTerm) ||
        (log.userId && log.userId.toLowerCase().includes(searchTerm)) ||
        (log.requestId && log.requestId.toLowerCase().includes(searchTerm))
      );
    }

    if ((filters.dateRange.start || filters.dateRange.end) && filtered) {
      filtered = filtered.filter(log => {
        const logTime = new Date(log.timestamp);
        const startTime = filters.dateRange.start ? new Date(filters.dateRange.start) : new Date(0);
        const endTime = filters.dateRange.end ? new Date(filters.dateRange.end) : new Date();
        return logTime >= startTime && logTime <= endTime;
      });
    }

    setFilteredLogs(filtered || []);
  };

  // Toggle expanded state for log entry
  const toggleLogExpansion = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isAutoScroll]);

  // Initialize filtered logs
  useEffect(() => {
    setFilteredLogs(logs.logs || []);
  }, [logs.logs]);

  const handleCopy = (_content: string) => {
    // You could show a toast notification here
    console.log('Copied log entry to clipboard');
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-semibold">Log Aggregation</h2>
          <span className="text-sm text-gray-600">
            {filteredLogs.length} of {logs.summary.total} logs
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onToggleRealTime && (
            <button
              onClick={onToggleRealTime}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isRealTimeEnabled
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {isRealTimeEnabled ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Real-time
            </button>
          )}

          <button
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isAutoScroll
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isAutoScroll ? <Eye className="w-4 h-4 mr-2" /> : <EyeOff className="w-4 h-4 mr-2" />}
            Auto-scroll
          </button>

          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  onExport(e.target.value as 'csv' | 'json' | 'txt');
                  e.target.value = '';
                }
              }}
              className="appearance-none bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <option value="">Export</option>
              <option value="csv">Export CSV</option>
              <option value="json">Export JSON</option>
              <option value="txt">Export TXT</option>
            </select>
            <Download className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white" />
          </div>
        </div>
      </div>

      {/* Log Statistics */}
      <LogStatistics summary={logs.summary} trends={logs.trends} />

      {/* Top Errors */}
      <TopErrors topErrors={logs.summary.topErrors} />

      {/* Filters */}
      <LogFilters onFilterChange={handleFilterChange} sources={uniqueSources} />

      {/* Logs List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Log Entries</h3>
        </div>
        
        <div className="max-h-[800px] overflow-y-auto p-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No logs found</p>
              <p className="text-sm">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log, index) => {
                const logId = `${log.timestamp}-${index}`;
                return (
                  <LogEntryCard
                    key={logId}
                    log={log}
                    onCopy={handleCopy}
                    expanded={expandedLogs.has(logId)}
                    onToggleExpand={() => toggleLogExpansion(logId)}
                  />
                );
              })}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};