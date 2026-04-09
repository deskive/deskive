// src/lib/api/monitoring-api.ts
import { api } from '@/lib/fetch';
import { useQuery } from '@tanstack/react-query';

// Types
export interface SystemHealthMetrics {
  cpu: {
    usage: number;
    cores: number;
    temperature?: number;
    loadAverage?: number[];
  };
  memory: {
    usage: number;
    total: number;
    available: number;
    used?: number;
    buffers?: number;
  };
  disk: {
    usage: number;
    total: number;
    available: number;
    used?: number;
    readSpeed?: number;
    writeSpeed?: number;
    iops?: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    packetsIn: number;
    packetsOut: number;
    bandwidth?: number;
    latency?: number;
    connections?: number;
  };
  uptime: number;
  timestamp: string;
}

export interface ApplicationPerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
    p50ResponseTime?: number;
    p90ResponseTime?: number;
    p99ResponseTime?: number;
    rps?: number;
  };
  errors: {
    total: number;
    errorRate: number;
    byType: Record<string, number>;
    status4xx?: number;
    status5xx?: number;
  };
  throughput: {
    requestsPerSecond: number;
    bytesPerSecond: number;
  };
  database?: {
    queryTime: number;
    activeConnections: number;
    slowQueries: number;
    connections?: number;
    activeQueries?: number;
  };
  cache?: {
    hitRate: number;
    missRate: number;
    evictions: number;
    memoryUsage?: number;
  };
  timestamp: string;
}

export interface UserActivityMetrics {
  activeUsers: number;
  totalSessions: number;
  averageSessionDuration: number;
  pageViews: number;
  uniqueVisitors: number;
  timestamp: string;
}

export interface APIEndpointMetrics {
  path: string;
  method: string;
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  statusCodes: Record<string, number>;
  endpoint?: string;
  p99ResponseTime?: number;
  throughput?: number;
  status2xx?: number;
  status4xx?: number;
  status5xx?: number;
}

export interface APIMonitoringMetrics {
  overall: {
    totalRequests: number;
    successRate: number;
    averageResponseTime: number;
    errorRate: number;
    uptime?: number;
  };
  endpoints: Array<APIEndpointMetrics>;
  timestamp: string;
  slowestEndpoints?: Array<APIEndpointMetrics>;
  errorProneEndpoints?: Array<APIEndpointMetrics>;
}

export interface SecurityMetrics {
  threats: {
    detected: number;
    blocked: number;
    severity: Record<string, number>;
  };
  authentication: {
    totalAttempts: number;
    failedLogins: number;
    successfulLogins: number;
  };
  vulnerabilities: Array<{
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    status: 'open' | 'resolved';
  }>;
  timestamp: string;
}

export interface MonitoringAlert {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  status: 'active' | 'acknowledged' | 'resolved';
  type?: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  tags?: string[];
  affectedComponents?: string[];
  createdAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  metadata?: any;
}

export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  timestamp: string;
  service?: string;
  source?: string;
  traceId?: string;
  userId?: string;
  requestId?: string;
  stackTrace?: string;
  metadata?: any;
}

export interface LogAggregation {
  totalLogs: number;
  byLevel: Record<string, number>;
  byService: Record<string, number>;
  recentLogs: LogEntry[];
  timestamp: string;
  summary?: any;
  trends?: any;
  logs?: LogEntry[];
}

export interface MonitoringDashboardConfig {
  refreshInterval: number;
  enabledWidgets: string[];
  layout: any;
  preferences: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description?: string;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  enabled: boolean;
  actions: string[];
  duration?: number;
  notifications?: {
    email?: boolean;
    slack?: boolean;
    webhook?: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DateRange {
  start: string;
  end: string;
}

// Query Keys
export const monitoringKeys = {
  all: ['monitoring'] as const,
  metrics: (workspaceId: string) => [...monitoringKeys.all, 'metrics', workspaceId] as const,
  logs: (workspaceId: string) => [...monitoringKeys.all, 'logs', workspaceId] as const,
  systemHealth: (workspaceId: string) => [...monitoringKeys.all, 'system-health', workspaceId] as const,
  performance: (workspaceId: string) => [...monitoringKeys.all, 'performance', workspaceId] as const,
  alerts: (workspaceId: string) => [...monitoringKeys.all, 'alerts', workspaceId] as const,
};

// API Functions
export const monitoringApi = {
  // System Health
  async getSystemHealthMetrics(workspaceId: string): Promise<SystemHealthMetrics> {
    return api.get<SystemHealthMetrics>(`/workspaces/${workspaceId}/monitoring/system-health`);
  },

  // Application Performance
  async getApplicationPerformanceMetrics(workspaceId: string): Promise<ApplicationPerformanceMetrics> {
    return api.get<ApplicationPerformanceMetrics>(`/workspaces/${workspaceId}/monitoring/performance`);
  },

  // User Activity
  async getUserActivityMetrics(workspaceId: string, dateRange: DateRange): Promise<UserActivityMetrics> {
    return api.post<UserActivityMetrics>(`/workspaces/${workspaceId}/monitoring/user-activity`, dateRange);
  },

  // API Monitoring
  async getAPIMonitoringMetrics(workspaceId: string, dateRange: DateRange): Promise<APIMonitoringMetrics> {
    return api.post<APIMonitoringMetrics>(`/workspaces/${workspaceId}/monitoring/api-metrics`, dateRange);
  },

  // Security
  async getSecurityMetrics(workspaceId: string): Promise<SecurityMetrics> {
    return api.get<SecurityMetrics>(`/workspaces/${workspaceId}/monitoring/security`);
  },

  // Alerts
  async getActiveAlerts(workspaceId: string): Promise<MonitoringAlert[]> {
    return api.get<MonitoringAlert[]>(`/workspaces/${workspaceId}/monitoring/alerts`);
  },

  async acknowledgeAlert(workspaceId: string, alertId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/monitoring/alerts/${alertId}/acknowledge`, null);
  },

  async resolveAlert(workspaceId: string, alertId: string): Promise<void> {
    await api.post(`/workspaces/${workspaceId}/monitoring/alerts/${alertId}/resolve`, null);
  },

  // Alert Rules
  async getAlertRules(workspaceId: string): Promise<AlertRule[]> {
    return api.get<AlertRule[]>(`/workspaces/${workspaceId}/monitoring/alert-rules`);
  },

  async saveAlertRule(workspaceId: string, rule: Partial<AlertRule>): Promise<AlertRule> {
    if (rule.id) {
      return api.put<AlertRule>(`/workspaces/${workspaceId}/monitoring/alert-rules/${rule.id}`, rule);
    }
    return api.post<AlertRule>(`/workspaces/${workspaceId}/monitoring/alert-rules`, rule);
  },

  async deleteAlertRule(workspaceId: string, ruleId: string): Promise<void> {
    await api.delete(`/workspaces/${workspaceId}/monitoring/alert-rules/${ruleId}`);
  },

  // Logs
  async getLogs(workspaceId: string, limit = 100): Promise<LogEntry[]> {
    return api.get<LogEntry[]>(`/workspaces/${workspaceId}/monitoring/logs?limit=${limit}`);
  },

  async getLogAggregation(workspaceId: string, options: {
    dateRange: DateRange;
    limit?: number;
    level?: string;
    service?: string;
  }): Promise<LogAggregation> {
    return api.post<LogAggregation>(`/workspaces/${workspaceId}/monitoring/logs/aggregate`, options);
  },

  // Dashboard Config
  async getDashboardConfig(workspaceId: string): Promise<MonitoringDashboardConfig> {
    return api.get<MonitoringDashboardConfig>(`/workspaces/${workspaceId}/monitoring/config`);
  },

  async saveDashboardConfig(workspaceId: string, config: Partial<MonitoringDashboardConfig>): Promise<MonitoringDashboardConfig> {
    return api.put<MonitoringDashboardConfig>(`/workspaces/${workspaceId}/monitoring/config`, config);
  },

  // Export
  async exportMonitoringData(
    workspaceId: string,
    format: 'csv' | 'json' | 'pdf',
    dateRange: DateRange,
    dataTypes: string[]
  ): Promise<Blob> {
    const response = await api.post(
      `/workspaces/${workspaceId}/monitoring/export`,
      { format, dateRange, dataTypes }
    );
    return response as any; // Blob response
  },

  // Real-time Monitoring
  startRealTimeMonitoring(
    workspaceId: string,
    onMetricsUpdate: (metrics: {
      systemHealth: SystemHealthMetrics;
      appPerformance: ApplicationPerformanceMetrics;
      userActivity?: UserActivityMetrics;
    }) => void,
    onAlert: (alert: MonitoringAlert) => void
  ): () => void {
    // In a real implementation, this would establish a WebSocket connection
    // For now, we'll use polling
    const interval = setInterval(async () => {
      try {
        const [systemHealth, appPerformance] = await Promise.all([
          monitoringApi.getSystemHealthMetrics(workspaceId),
          monitoringApi.getApplicationPerformanceMetrics(workspaceId),
        ]);

        onMetricsUpdate({
          systemHealth,
          appPerformance,
        });
      } catch (error) {
        console.error('Real-time monitoring error:', error);
      }
    }, 5000); // Update every 5 seconds

    // Cleanup function
    return () => {
      clearInterval(interval);
    };
  },
};

// React Query Hooks
export const useSystemMetrics = (workspaceId: string) => {
  return useQuery({
    queryKey: monitoringKeys.metrics(workspaceId),
    queryFn: () => monitoringApi.getSystemHealthMetrics(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useSystemLogs = (workspaceId: string, limit = 100) => {
  return useQuery({
    queryKey: [...monitoringKeys.logs(workspaceId), limit],
    queryFn: () => monitoringApi.getLogs(workspaceId, limit),
    enabled: !!workspaceId,
  });
};

export const useSystemHealth = (workspaceId: string) => {
  return useQuery({
    queryKey: monitoringKeys.systemHealth(workspaceId),
    queryFn: () => monitoringApi.getSystemHealthMetrics(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 10000,
  });
};

export const usePerformanceMetrics = (workspaceId: string) => {
  return useQuery({
    queryKey: monitoringKeys.performance(workspaceId),
    queryFn: () => monitoringApi.getApplicationPerformanceMetrics(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });
};

export const useActiveAlerts = (workspaceId: string) => {
  return useQuery({
    queryKey: monitoringKeys.alerts(workspaceId),
    queryFn: () => monitoringApi.getActiveAlerts(workspaceId),
    enabled: !!workspaceId,
    refetchInterval: 60000,
  });
};

// Backward compatibility: export as monitoringService
export const monitoringService = monitoringApi;
