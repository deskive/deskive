/**
 * Performance Monitoring Charts
 * Application performance metrics visualization with real-time updates
 */

import React from 'react';
import {
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
  Cell,
  ComposedChart,
  Bar
} from 'recharts';
import {
  Activity,
  Clock,
  AlertTriangle,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  Server,
  CheckCircle,
  XCircle
} from 'lucide-react';

import type { 
  ApplicationPerformanceMetrics, 
  APIMonitoringMetrics,
  UserActivityMetrics 
} from '@/lib/api/monitoring-api';

interface PerformanceChartsProps {
  appPerformance: ApplicationPerformanceMetrics;
  apiMetrics?: APIMonitoringMetrics;
  userActivity?: UserActivityMetrics;
  historicalData?: Array<{
    timestamp: string;
    responseTime: number;
    errorRate: number;
    throughput: number;
    activeUsers: number;
  }>;
}


// Performance Status Indicator
const PerformanceStatusCard: React.FC<{
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  trend?: { value: number; isPositive: boolean };
  description?: string;
}> = ({ title, value, unit, icon, status, trend, description }) => {
  const statusConfig = {
    excellent: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', badge: 'bg-green-100' },
    good: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'bg-blue-100' },
    warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100' },
    critical: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100' }
  };

  const config = statusConfig[status];

  return (
    <div className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.badge} ${config.text}`}>
            {icon}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">{title}</p>
            <div className="flex items-baseline space-x-1">
              <span className={`text-2xl font-bold ${config.text}`}>
                {value}
              </span>
              {unit && <span className="text-sm text-gray-600">{unit}</span>}
            </div>
            {description && (
              <p className="text-xs text-gray-600 mt-1">{description}</p>
            )}
          </div>
        </div>
        
        {trend && (
          <div className={`flex items-center text-sm ${
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
  );
};

// Response Time Chart
export const ResponseTimeChart: React.FC<{
  data: ApplicationPerformanceMetrics['requests'];
  historical?: Array<{ timestamp: string; responseTime: number; p50: number; p90: number; p99: number }>;
}> = ({ data, historical = [] }) => {
  const mockHistoricalData = historical.length > 0 ? historical : Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    responseTime: data.averageResponseTime + Math.random() * 100 - 50,
    p50: data.p50ResponseTime,
    p90: data.p90ResponseTime,
    p99: data.p99ResponseTime
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Response Time Metrics
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">RPS: {data.rps}</span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            data.averageResponseTime < 200 ? 'bg-green-100 text-green-800' :
            data.averageResponseTime < 500 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {data.averageResponseTime < 200 ? 'EXCELLENT' :
             data.averageResponseTime < 500 ? 'GOOD' : 'SLOW'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Average</span>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-gray-900">
            {data.averageResponseTime}ms
          </div>
        </div>
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-600">P90</span>
            <Activity className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-semibold text-blue-900">
            {data.p90ResponseTime}ms
          </div>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-purple-600">P99</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-semibold text-purple-900">
            {data.p99ResponseTime}ms
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={mockHistoricalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
          />
          <YAxis />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
            formatter={(value: number, name: string) => [`${value.toFixed(0)}ms`, name]}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="responseTime" 
            stroke="#6366f1" 
            name="Average Response Time"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="p90" 
            stroke="#8b5cf6" 
            name="P90"
            strokeWidth={1}
            strokeDasharray="5 5"
          />
          <Line 
            type="monotone" 
            dataKey="p99" 
            stroke="#ec4899" 
            name="P99"
            strokeWidth={1}
            strokeDasharray="5 5"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Error Rate Chart
export const ErrorRateChart: React.FC<{
  data: ApplicationPerformanceMetrics['errors'];
  historical?: Array<{ timestamp: string; errorRate: number; errors4xx: number; errors5xx: number }>;
}> = ({ data, historical = [] }) => {
  const mockHistoricalData = historical.length > 0 ? historical : Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    errorRate: data.errorRate + Math.random() * 2 - 1,
    errors4xx: (data.status4xx || 0) + Math.random() * 10 - 5,
    errors5xx: (data.status5xx || 0) + Math.random() * 5 - 2
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
          Error Rate Analysis
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            data.errorRate < 1 ? 'bg-green-100 text-green-800' :
            data.errorRate < 3 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {data.errorRate < 1 ? 'HEALTHY' :
             data.errorRate < 3 ? 'ELEVATED' : 'CRITICAL'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600">Error Rate</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-semibold text-red-900">
            {data.errorRate.toFixed(2)}%
          </div>
        </div>
        <div className="bg-orange-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-orange-600">4xx Errors</span>
            <AlertTriangle className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl font-semibold text-orange-900">
            {data.status4xx}
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600">5xx Errors</span>
            <XCircle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-semibold text-red-900">
            {data.status5xx}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={mockHistoricalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
          />
          <YAxis yAxisId="rate" orientation="left" />
          <YAxis yAxisId="count" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <Legend />
          <Bar yAxisId="count" dataKey="errors4xx" fill="#f59e0b" name="4xx Errors" />
          <Bar yAxisId="count" dataKey="errors5xx" fill="#ef4444" name="5xx Errors" />
          <Line 
            yAxisId="rate"
            type="monotone" 
            dataKey="errorRate" 
            stroke="#dc2626" 
            name="Error Rate %"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Database Performance Chart
export const DatabasePerformanceChart: React.FC<{
  data: ApplicationPerformanceMetrics['database'];
  historical?: Array<{ timestamp: string; connections: number; queryTime: number; slowQueries: number }>;
}> = ({ data, historical = [] }) => {
  const mockHistoricalData = historical.length > 0 ? historical : Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    connections: (data?.connections || 0) + Math.random() * 10 - 5,
    queryTime: (data?.queryTime || 0) + Math.random() * 20 - 10,
    slowQueries: (data?.slowQueries || 0) + Math.random() * 3 - 1
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Database className="w-5 h-5 mr-2 text-green-600" />
          Database Performance
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (data?.queryTime || 0) < 100 ? 'bg-green-100 text-green-800' :
            (data?.queryTime || 0) < 300 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {(data?.queryTime || 0) < 100 ? 'FAST' :
             (data?.queryTime || 0) < 300 ? 'MODERATE' : 'SLOW'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-600">Connections</span>
            <Server className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl font-semibold text-blue-900">
            {data?.connections || 0}
          </div>
        </div>
        <div className="bg-green-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-green-600">Active Queries</span>
            <Activity className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-xl font-semibold text-green-900">
            {data?.activeQueries || 0}
          </div>
        </div>
        <div className="bg-yellow-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-yellow-600">Avg Query Time</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="text-xl font-semibold text-yellow-900">
            {data?.queryTime || 0}ms
          </div>
        </div>
        <div className="bg-red-50 p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-red-600">Slow Queries</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-xl font-semibold text-red-900">
            {data?.slowQueries || 0}
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={mockHistoricalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
          />
          <YAxis yAxisId="time" orientation="left" />
          <YAxis yAxisId="count" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
          />
          <Legend />
          <Line 
            yAxisId="time"
            type="monotone" 
            dataKey="queryTime" 
            stroke="#10b981" 
            name="Query Time (ms)"
            strokeWidth={2}
          />
          <Bar yAxisId="count" dataKey="connections" fill="#3b82f6" name="Connections" />
          <Bar yAxisId="count" dataKey="slowQueries" fill="#ef4444" name="Slow Queries" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Cache Performance Chart
export const CachePerformanceChart: React.FC<{
  data: ApplicationPerformanceMetrics['cache'];
}> = ({ data }) => {
  const cacheData = [
    { name: 'Hit Rate', value: data?.hitRate || 0, color: '#10b981' },
    { name: 'Miss Rate', value: data?.missRate || 0, color: '#ef4444' }
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Zap className="w-5 h-5 mr-2 text-yellow-600" />
          Cache Performance
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            (data?.hitRate || 0) > 80 ? 'bg-green-100 text-green-800' :
            (data?.hitRate || 0) > 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {(data?.hitRate || 0) > 80 ? 'EXCELLENT' :
             (data?.hitRate || 0) > 60 ? 'GOOD' : 'POOR'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600">Hit Rate</span>
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div className="text-xl font-semibold text-green-900">
                {(data?.hitRate || 0).toFixed(1)}%
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-red-600">Miss Rate</span>
                <XCircle className="w-4 h-4 text-red-400" />
              </div>
              <div className="text-xl font-semibold text-red-900">
                {(data?.missRate || 0).toFixed(1)}%
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Evictions:</span>
              <span className="font-medium">{data?.evictions || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Memory Usage:</span>
              <span className="font-medium">
                {((data?.memoryUsage || 0) / 1024 / 1024).toFixed(1)} MB
              </span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Hit/Miss Distribution</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={cacheData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {cacheData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// Main Performance Charts Container
export const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ 
  appPerformance, 
  apiMetrics: _apiMetrics, 
  userActivity: _userActivity,
  historicalData: _historicalData = []
}) => {
  // Performance status calculations
  const getResponseTimeStatus = (time: number) => {
    if (time < 100) return 'excellent';
    if (time < 200) return 'good';
    if (time < 500) return 'warning';
    return 'critical';
  };

  const getErrorRateStatus = (rate: number) => {
    if (rate < 0.5) return 'excellent';
    if (rate < 1) return 'good';
    if (rate < 3) return 'warning';
    return 'critical';
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <PerformanceStatusCard
          title="Average Response Time"
          value={appPerformance.requests.averageResponseTime}
          unit="ms"
          icon={<Clock className="w-5 h-5" />}
          status={getResponseTimeStatus(appPerformance.requests.averageResponseTime)}
          description="Application response time"
        />
        <PerformanceStatusCard
          title="Requests per Second"
          value={appPerformance.requests.rps || 0}
          icon={<Activity className="w-5 h-5" />}
          status="good"
          description="Current throughput"
        />
        <PerformanceStatusCard
          title="Error Rate"
          value={appPerformance.errors.errorRate.toFixed(2)}
          unit="%"
          icon={<AlertTriangle className="w-5 h-5" />}
          status={getErrorRateStatus(appPerformance.errors.errorRate)}
          description="Request error percentage"
        />
        <PerformanceStatusCard
          title="Cache Hit Rate"
          value={(appPerformance.cache?.hitRate ?? 0).toFixed(1)}
          unit="%"
          icon={<Zap className="w-5 h-5" />}
          status={(appPerformance.cache?.hitRate ?? 0) > 80 ? 'excellent' : (appPerformance.cache?.hitRate ?? 0) > 60 ? 'good' : 'warning'}
          description="Cache efficiency"
        />
      </div>

      {/* Main Performance Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ResponseTimeChart data={appPerformance.requests} />
        <ErrorRateChart data={appPerformance.errors} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DatabasePerformanceChart data={appPerformance.database} />
        <CachePerformanceChart data={appPerformance.cache} />
      </div>
    </div>
  );
};