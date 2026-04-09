/**
 * Monitoring Page
 * Comprehensive system health and performance monitoring dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  Server,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download,
  Shield,
  FileText,
  Globe,
  Loader2,
  AlertCircle,
  Info,
  XCircle,
  Play,
  Pause,
  BarChart3
} from 'lucide-react';

// Services and types
import { monitoringService } from '@/lib/api/monitoring-api';
import type {
  SystemHealthMetrics,
  ApplicationPerformanceMetrics,
  UserActivityMetrics,
  APIMonitoringMetrics,
  SecurityMetrics,
  MonitoringAlert,
  LogAggregation,
  MonitoringDashboardConfig,
  AlertRule
} from '@/lib/api/monitoring-api';

// Components
import { 
  RealTimeMetrics, 
  PerformanceCharts, 
  AlertManagement, 
  APIMonitoring, 
  LogAggregation as LogAggregationComponent 
} from './components';

// Tab options
const MONITORING_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'system', label: 'System Health', icon: Server },
  { id: 'performance', label: 'Performance', icon: Activity },
  { id: 'api', label: 'API Metrics', icon: Globe },
  { id: 'users', label: 'User Activity', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  { id: 'logs', label: 'Logs', icon: FileText }
];


// Time range options
const TIME_RANGES = [
  { label: 'Last 1 hour', value: 1, unit: 'hour' },
  { label: 'Last 6 hours', value: 6, unit: 'hour' },
  { label: 'Last 24 hours', value: 24, unit: 'hour' },
  { label: 'Last 7 days', value: 7, unit: 'day' },
  { label: 'Last 30 days', value: 30, unit: 'day' }
];

const MonitoringPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(TIME_RANGES[2]);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Monitoring data state
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null);
  const [appPerformance, setAppPerformance] = useState<ApplicationPerformanceMetrics | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivityMetrics | undefined>(undefined);
  const [apiMetrics, setApiMetrics] = useState<APIMonitoringMetrics | undefined>(undefined);
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetrics | null>(null);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [logs, setLogs] = useState<LogAggregation | null>(null);
  const [_dashboardConfig, _setDashboardConfig] = useState<MonitoringDashboardConfig | undefined>(undefined);

  // Real-time monitoring cleanup
  const [realTimeCleanup, setRealTimeCleanup] = useState<(() => void) | null>(null);

  // Fetch initial data
  const fetchMonitoringData = useCallback(async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);

      const endTime = new Date();
      const startTime = new Date();
      if (selectedTimeRange.unit === 'hour') {
        startTime.setHours(startTime.getHours() - selectedTimeRange.value);
      } else {
        startTime.setDate(startTime.getDate() - selectedTimeRange.value);
      }

      const dateRange = {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      };

      // Fetch all data in parallel
      const [
        systemHealthData,
        appPerformanceData,
        userActivityData,
        apiMetricsData,
        securityData,
        alertsData,
        logsData,
        configData
      ] = await Promise.all([
        monitoringService.getSystemHealthMetrics(workspaceId),
        monitoringService.getApplicationPerformanceMetrics(workspaceId),
        monitoringService.getUserActivityMetrics(workspaceId, dateRange),
        monitoringService.getAPIMonitoringMetrics(workspaceId, dateRange),
        monitoringService.getSecurityMetrics(workspaceId),
        monitoringService.getActiveAlerts(workspaceId),
        monitoringService.getLogAggregation(workspaceId, {
          dateRange,
          limit: 1000
        }),
        monitoringService.getDashboardConfig(workspaceId)
      ]);

      setSystemHealth(systemHealthData);
      setAppPerformance(appPerformanceData);
      setUserActivity(userActivityData);
      setApiMetrics(apiMetricsData);
      setSecurityMetrics(securityData);
      setAlerts(alertsData);
      setLogs(logsData);
      _setDashboardConfig(configData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      console.error('Error fetching monitoring data:', err);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, selectedTimeRange]);

  // Start/stop real-time monitoring
  const toggleRealTimeMonitoring = useCallback(() => {
    if (!workspaceId) return;

    if (isRealTimeEnabled && !realTimeCleanup) {
      // Start real-time monitoring
      const cleanup = monitoringService.startRealTimeMonitoring(
        workspaceId,
        (metrics) => {
          setSystemHealth(metrics.systemHealth);
          setAppPerformance(metrics.appPerformance);
          setUserActivity(metrics.userActivity);
        },
        (alert) => {
          setAlerts(prev => [alert, ...prev]);
        }
      );
      setRealTimeCleanup(() => cleanup);
    } else if (realTimeCleanup) {
      // Stop real-time monitoring
      realTimeCleanup();
      setRealTimeCleanup(null);
    }

    setIsRealTimeEnabled(!isRealTimeEnabled);
  }, [workspaceId, isRealTimeEnabled, realTimeCleanup]);

  // Export monitoring data
  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    if (!workspaceId) return;

    try {
      const endTime = new Date();
      const startTime = new Date();
      if (selectedTimeRange.unit === 'hour') {
        startTime.setHours(startTime.getHours() - selectedTimeRange.value);
      } else {
        startTime.setDate(startTime.getDate() - selectedTimeRange.value);
      }

      const dateRange = {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      };

      const blob = await monitoringService.exportMonitoringData(
        workspaceId,
        format,
        dateRange,
        ['system', 'application', 'user', 'api', 'security', 'logs']
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `monitoring-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Load data on mount and time range change
  useEffect(() => {
    fetchMonitoringData();
  }, [fetchMonitoringData]);

  // Cleanup real-time monitoring on unmount
  useEffect(() => {
    return () => {
      if (realTimeCleanup) {
        realTimeCleanup();
      }
    };
  }, [realTimeCleanup]);

  // Metric card component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    status?: 'good' | 'warning' | 'critical';
    trend?: { value: number; isPositive: boolean };
    unit?: string;
  }> = ({ title, value, icon, status = 'good', trend, unit }) => {
    const statusColors = {
      good: 'text-green-600 bg-green-100',
      warning: 'text-yellow-600 bg-yellow-100',
      critical: 'text-red-600 bg-red-100'
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-lg ${statusColors[status]}`}>
            {icon}
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">
                {value}
                {unit && <span className="text-sm text-gray-500 ml-1">{unit}</span>}
              </p>
              {trend && (
                <div className={`ml-2 flex items-center text-sm ${
                  trend.isPositive ? 'text-green-600' : 'text-red-600'
                }`}>
                  {trend.isPositive ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {Math.abs(trend.value)}%
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Alert badge component
  const AlertBadge: React.FC<{ alert: MonitoringAlert }> = ({ alert }) => {
    const severityColors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800',
      info: 'bg-gray-100 text-gray-800'
    };

    const severityIcons = {
      critical: <XCircle className="w-4 h-4" />,
      high: <AlertTriangle className="w-4 h-4" />,
      medium: <AlertCircle className="w-4 h-4" />,
      low: <Info className="w-4 h-4" />,
      info: <Info className="w-4 h-4" />
    };

    return (
      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityColors[alert.severity]}`}>
        {severityIcons[alert.severity]}
        <span className="ml-1">{alert.severity.toUpperCase()}</span>
      </div>
    );
  };

  // Overview tab content
  const OverviewContent: React.FC = () => {
    if (!systemHealth || !appPerformance || !userActivity) return null;

    // Create overview metrics
    const overviewMetrics = [
      {
        title: 'System Status',
        value: systemHealth.cpu.usage < 80 ? 'Healthy' : 'Warning',
        icon: <Server className="w-6 h-6" />,
        status: systemHealth.cpu.usage < 80 ? 'good' : 'warning' as const
      },
      {
        title: 'Active Users',
        value: userActivity.activeUsers,
        icon: <Users className="w-6 h-6" />,
        status: 'good' as const
      },
      {
        title: 'Response Time',
        value: appPerformance.requests.averageResponseTime,
        icon: <Clock className="w-6 h-6" />,
        unit: 'ms',
        status: appPerformance.requests.averageResponseTime < 500 ? 'good' : 'warning' as const
      },
      {
        title: 'Error Rate',
        value: appPerformance.errors.errorRate.toFixed(2),
        icon: <AlertTriangle className="w-6 h-6" />,
        unit: '%',
        status: appPerformance.errors.errorRate < 1 ? 'good' : 'warning' as const
      }
    ];

    // System overview chart data
    const systemOverviewData = [
      { name: 'CPU', usage: systemHealth.cpu.usage, color: '#6366f1' },
      { name: 'Memory', usage: systemHealth.memory.usage, color: '#8b5cf6' },
      { name: 'Disk', usage: systemHealth.disk.usage, color: '#ec4899' },
      { name: 'Network', usage: 45, color: '#f59e0b' } // Mock network usage
    ];

    return (
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {overviewMetrics.map((metric, index) => (
            <MetricCard key={index} {...metric} status={metric.status as 'good' | 'warning' | 'critical'} />
          ))}
        </div>

        {/* Active Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
              Active Alerts ({alerts.length})
            </h3>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertBadge alert={alert} />
                    <div>
                      <p className="font-medium">{alert.title}</p>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(alert.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* System Resource Usage */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">System Resources</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={systemOverviewData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="usage" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Trend */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={[
                { time: '00:00', response: 200, errors: 2 },
                { time: '06:00', response: 180, errors: 1 },
                { time: '12:00', response: 220, errors: 3 },
                { time: '18:00', response: 190, errors: 1 },
                { time: '24:00', response: 210, errors: 2 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="response" stroke="#6366f1" name="Response Time (ms)" />
                <Line type="monotone" dataKey="errors" stroke="#ef4444" name="Errors" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real-time Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">System Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <p className="font-medium">All Systems Operational</p>
              <p className="text-sm text-gray-600">Uptime: {Math.floor(systemHealth.uptime / 3600)}h</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-medium">Performance Good</p>
              <p className="text-sm text-gray-600">Avg Response: {appPerformance.requests.averageResponseTime}ms</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <p className="font-medium">Users Active</p>
              <p className="text-sm text-gray-600">{userActivity.activeUsers} online now</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // System Health tab content
  const SystemHealthContent: React.FC = () => {
    if (!systemHealth) return null;

    return (
      <RealTimeMetrics 
        systemHealth={systemHealth}
        // Mock historical data - in a real app, this would come from the API
        historicalData={Array.from({ length: 20 }, (_, i) => ({
          timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
          cpu: systemHealth.cpu.usage + Math.random() * 20 - 10,
          memory: systemHealth.memory.usage + Math.random() * 15 - 7,
          disk: systemHealth.disk.usage + Math.random() * 10 - 5,
          network: systemHealth.network.bytesIn / 1024 / 1024
        }))}
      />
    );
  };

  // Handle alert actions
  const handleAcknowledgeAlert = async (alertId: string) => {
    if (!workspaceId) return;
    try {
      await monitoringService.acknowledgeAlert(workspaceId, alertId);
      // Update local alerts state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert
      ));
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    if (!workspaceId) return;
    try {
      await monitoringService.resolveAlert(workspaceId, alertId);
      // Update local alerts state
      setAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, status: 'resolved', resolvedAt: new Date().toISOString() } : alert
      ));
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const handleCreateRule = async (rule: Partial<AlertRule>) => {
    if (!workspaceId) return;
    try {
      await monitoringService.saveAlertRule(workspaceId, rule);
      // Refresh alerts to show any new ones triggered by the rule
      fetchMonitoringData();
    } catch (error) {
      console.error('Failed to create alert rule:', error);
    }
  };

  const handleUpdateRule = async (rule: AlertRule) => {
    if (!workspaceId) return;
    try {
      await monitoringService.saveAlertRule(workspaceId, rule);
    } catch (error) {
      console.error('Failed to update alert rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!workspaceId) return;
    try {
      await monitoringService.deleteAlertRule(workspaceId, ruleId);
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
    }
  };

  // Handle log export
  const handleLogExport = async (format: 'csv' | 'json' | 'txt') => {
    if (!workspaceId) return;
    try {
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 7); // Last 7 days

      const exportFormat = format === 'txt' ? 'pdf' : format; // Convert txt to pdf since txt is not valid
      const blob = await monitoringService.exportMonitoringData(
        workspaceId,
        exportFormat,
        { start: startTime.toISOString(), end: endTime.toISOString() },
        ['logs']
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `logs-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Log export failed:', err);
    }
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent />;
      case 'system':
        return <SystemHealthContent />;
      case 'performance':
        return appPerformance ? (
          <PerformanceCharts 
            appPerformance={appPerformance}
            apiMetrics={apiMetrics}
            userActivity={userActivity}
            historicalData={Array.from({ length: 20 }, (_, i) => ({
              timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
              responseTime: appPerformance.requests.averageResponseTime + Math.random() * 100 - 50,
              errorRate: appPerformance.errors.errorRate + Math.random() * 2 - 1,
              throughput: 50 + Math.random() * 30,
              activeUsers: userActivity?.activeUsers || 0 + Math.random() * 10
            }))}
          />
        ) : <div className="text-center py-8 text-gray-500">Loading performance metrics...</div>;
      case 'api':
        return apiMetrics ? (
          <APIMonitoring 
            apiMetrics={apiMetrics}
            historicalData={Array.from({ length: 20 }, (_, i) => ({
              timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
              responseTime: apiMetrics.overall.averageResponseTime + Math.random() * 100 - 50,
              errorRate: apiMetrics.overall.errorRate + Math.random() * 2 - 1,
              throughput: 50 + Math.random() * 30,
              status2xx: 200 + Math.random() * 50,
              status4xx: 10 + Math.random() * 20,
              status5xx: 2 + Math.random() * 8
            }))}
          />
        ) : <div className="text-center py-8 text-gray-500">Loading API metrics...</div>;
      case 'users':
        return userActivity ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">User Activity Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{userActivity.activeUsers}</div>
                <div className="text-sm text-blue-600">Active Users</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{userActivity.totalSessions}</div>
                <div className="text-sm text-green-600">Total Sessions</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{userActivity.averageSessionDuration.toFixed(1)}min</div>
                <div className="text-sm text-purple-600">Avg Session Duration</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{userActivity.pageViews}</div>
                <div className="text-sm text-orange-600">Page Views</div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-8 text-gray-500">Loading user activity...</div>;
      case 'security':
        return securityMetrics ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Security Metrics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{securityMetrics.threats.blocked}</div>
                <div className="text-sm text-red-600">Threats Blocked</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{securityMetrics.authentication.failedLogins}</div>
                <div className="text-sm text-yellow-600">Failed Logins</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{securityMetrics.vulnerabilities.length}</div>
                <div className="text-sm text-green-600">Vulnerabilities</div>
              </div>
            </div>
          </div>
        ) : <div className="text-center py-8 text-gray-500">Loading security metrics...</div>;
      case 'alerts':
        return workspaceId ? (
          <AlertManagement
            alerts={alerts}
            workspaceId={workspaceId}
            onAcknowledgeAlert={handleAcknowledgeAlert}
            onResolveAlert={handleResolveAlert}
            onCreateRule={handleCreateRule}
            onUpdateRule={handleUpdateRule}
            onDeleteRule={handleDeleteRule}
          />
        ) : <div className="text-center py-8 text-gray-500">Loading alerts...</div>;
      case 'logs':
        return logs && workspaceId ? (
          <LogAggregationComponent
            logs={logs}
            workspaceId={workspaceId}
            onRefresh={fetchMonitoringData}
            onExport={handleLogExport}
            isRealTimeEnabled={isRealTimeEnabled}
            onToggleRealTime={toggleRealTimeMonitoring}
          />
        ) : <div className="text-center py-8 text-gray-500">Loading logs...</div>;
      default:
        return <OverviewContent />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-gray-600">Real-time system health and performance monitoring</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Time Range Picker */}
          <select
            value={selectedTimeRange.value}
            onChange={(e) => {
              const range = TIME_RANGES.find(r => r.value === parseInt(e.target.value));
              if (range) setSelectedTimeRange(range);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            {TIME_RANGES.map((range) => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>

          {/* Real-time Toggle */}
          <button
            onClick={toggleRealTimeMonitoring}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              isRealTimeEnabled
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isRealTimeEnabled ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            Real-time
          </button>

          {/* Export Button */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value as 'csv' | 'json' | 'pdf');
                  e.target.value = '';
                }
              }}
              className="appearance-none bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <option value="">Export</option>
              <option value="csv">Export CSV</option>
              <option value="json">Export JSON</option>
              <option value="pdf">Export PDF</option>
            </select>
            <Download className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchMonitoringData}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {MONITORING_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default MonitoringPage;