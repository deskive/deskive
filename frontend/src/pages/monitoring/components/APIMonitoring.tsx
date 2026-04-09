/**
 * API Response Time Monitoring
 * Real-time API endpoint monitoring, response times, error rates, and throughput
 */

import React, { useState } from 'react';
import {
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
  Clock,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  Search,
  Eye,
  BarChart3
} from 'lucide-react';

import type { 
  APIMonitoringMetrics, 
  APIEndpointMetrics 
} from '@/lib/api/monitoring-api';

interface APIMonitoringProps {
  apiMetrics: APIMonitoringMetrics;
  historicalData?: Array<{
    timestamp: string;
    responseTime: number;
    errorRate: number;
    throughput: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
  }>;
}

// Status code colors
const STATUS_COLORS = {
  '2xx': '#10b981', // Green
  '4xx': '#f59e0b', // Orange
  '5xx': '#ef4444'  // Red
};


// API Health Status Card
const APIHealthCard: React.FC<{
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

// Endpoint Performance Table
const EndpointTable: React.FC<{
  endpoints: APIEndpointMetrics[];
  onSelectEndpoint?: (endpoint: APIEndpointMetrics) => void;
}> = ({ endpoints, onSelectEndpoint }) => {
  const [sortField, setSortField] = useState<keyof APIEndpointMetrics>('averageResponseTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');

  const sortedEndpoints = [...endpoints]
    .filter(endpoint =>
      filterText === '' ||
      (endpoint.endpoint || '').toLowerCase().includes(filterText.toLowerCase()) ||
      endpoint.method.toLowerCase().includes(filterText.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: keyof APIEndpointMetrics) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getMethodBadgeColor = (method: string) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      DELETE: 'bg-red-100 text-red-800',
      PATCH: 'bg-purple-100 text-purple-800'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (errorRate: number) => {
    if (errorRate < 1) return 'text-green-600';
    if (errorRate < 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">API Endpoints Performance</h3>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search endpoints..."
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
            <span className="text-sm text-gray-500">
              {sortedEndpoints.length} endpoints
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('endpoint')}
              >
                Endpoint
                {sortField === 'endpoint' && (
                  sortDirection === 'asc' ? <TrendingUp className="w-3 h-3 inline ml-1" /> : <TrendingDown className="w-3 h-3 inline ml-1" />
                )}
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Method
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('requestCount')}
              >
                Requests
                {sortField === 'requestCount' && (
                  sortDirection === 'asc' ? <TrendingUp className="w-3 h-3 inline ml-1" /> : <TrendingDown className="w-3 h-3 inline ml-1" />
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('averageResponseTime')}
              >
                Avg Response
                {sortField === 'averageResponseTime' && (
                  sortDirection === 'asc' ? <TrendingUp className="w-3 h-3 inline ml-1" /> : <TrendingDown className="w-3 h-3 inline ml-1" />
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('p99ResponseTime')}
              >
                P99
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('errorRate')}
              >
                Error Rate
                {sortField === 'errorRate' && (
                  sortDirection === 'asc' ? <TrendingUp className="w-3 h-3 inline ml-1" /> : <TrendingDown className="w-3 h-3 inline ml-1" />
                )}
              </th>
              <th 
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('throughput')}
              >
                Throughput
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status Codes
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEndpoints.map((endpoint) => (
              <tr key={`${endpoint.method}-${endpoint.endpoint}`} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm">
                  <div className="font-mono text-gray-900">{endpoint.endpoint}</div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getMethodBadgeColor(endpoint.method)}`}>
                    {endpoint.method}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {endpoint.requestCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  <span className={`font-medium ${
                    endpoint.averageResponseTime < 200 ? 'text-green-600' :
                    endpoint.averageResponseTime < 500 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {endpoint.averageResponseTime}ms
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {endpoint.p99ResponseTime}ms
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`font-medium ${getStatusColor(endpoint.errorRate)}`}>
                    {endpoint.errorRate.toFixed(2)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {(endpoint.throughput || 0).toFixed(1)} req/min
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex space-x-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                      2xx: {endpoint.status2xx}
                    </span>
                    {(endpoint.status4xx || 0) > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                        4xx: {endpoint.status4xx}
                      </span>
                    )}
                    {(endpoint.status5xx || 0) > 0 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                        5xx: {endpoint.status5xx}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <button
                    onClick={() => onSelectEndpoint?.(endpoint)}
                    className="text-indigo-600 hover:text-indigo-900 transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Response Time Distribution Chart
const ResponseTimeChart: React.FC<{
  data: APIMonitoringMetrics;
  historicalData: Array<{ timestamp: string; responseTime: number; throughput: number }>;
}> = ({ data, historicalData }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          API Response Time Trends
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Avg: {data.overall.averageResponseTime}ms
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            data.overall.averageResponseTime < 200 ? 'bg-green-100 text-green-800' :
            data.overall.averageResponseTime < 500 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {data.overall.averageResponseTime < 200 ? 'FAST' :
             data.overall.averageResponseTime < 500 ? 'MODERATE' : 'SLOW'}
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={historicalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
          />
          <YAxis yAxisId="time" orientation="left" />
          <YAxis yAxisId="throughput" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => new Date(value).toLocaleTimeString()}
            formatter={(value: number, name: string) => [
              name === 'responseTime' ? `${value}ms` : `${value} req/min`,
              name === 'responseTime' ? 'Response Time' : 'Throughput'
            ]}
          />
          <Legend />
          <Line 
            yAxisId="time"
            type="monotone" 
            dataKey="responseTime" 
            stroke="#6366f1" 
            name="Response Time"
            strokeWidth={2}
          />
          <Bar 
            yAxisId="throughput"
            dataKey="throughput" 
            fill="#10b981" 
            name="Throughput"
            opacity={0.7}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

// Status Code Distribution Chart
const StatusCodeChart: React.FC<{
  endpoints: APIEndpointMetrics[];
}> = ({ endpoints }) => {
  const statusData = endpoints.reduce((acc, endpoint) => {
    acc.status2xx += endpoint.status2xx || 0;
    acc.status4xx += endpoint.status4xx || 0;
    acc.status5xx += endpoint.status5xx || 0;
    return acc;
  }, { status2xx: 0, status4xx: 0, status5xx: 0 });

  const chartData = [
    { name: '2xx Success', value: statusData.status2xx, color: STATUS_COLORS['2xx'] },
    { name: '4xx Client Error', value: statusData.status4xx, color: STATUS_COLORS['4xx'] },
    { name: '5xx Server Error', value: statusData.status5xx, color: STATUS_COLORS['5xx'] }
  ].filter(item => item.value > 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-green-600" />
          HTTP Status Code Distribution
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">
            Total: {Object.values(statusData).reduce((a, b) => a + b, 0).toLocaleString()} requests
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                nameKey="name"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => value.toLocaleString()}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          {chartData.map((item) => (
            <div key={item.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium">{item.name}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{item.value.toLocaleString()}</div>
                <div className="text-sm text-gray-600">
                  {((item.value / Object.values(statusData).reduce((a, b) => a + b, 0)) * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Main API Monitoring Component
export const APIMonitoring: React.FC<APIMonitoringProps> = ({ 
  apiMetrics, 
  historicalData = [] 
}) => {
  const [_selectedEndpoint, setSelectedEndpoint] = useState<APIEndpointMetrics | null>(null);

  // Generate mock historical data if none provided
  const mockHistoricalData = historicalData.length > 0 ? historicalData : Array.from({ length: 20 }, (_, i) => ({
    timestamp: new Date(Date.now() - (19 - i) * 60000).toISOString(),
    responseTime: apiMetrics.overall.averageResponseTime + Math.random() * 100 - 50,
    throughput: 50 + Math.random() * 30,
    errorRate: apiMetrics.overall.errorRate + Math.random() * 2 - 1,
    status2xx: 200 + Math.random() * 50,
    status4xx: 10 + Math.random() * 20,
    status5xx: 2 + Math.random() * 8
  }));

  const getUptimeStatus = (uptime: number) => {
    if (uptime >= 99.9) return 'excellent';
    if (uptime >= 99.5) return 'good';
    if (uptime >= 99) return 'warning';
    return 'critical';
  };

  const getErrorRateStatus = (errorRate: number) => {
    if (errorRate < 0.5) return 'excellent';
    if (errorRate < 1) return 'good';
    if (errorRate < 3) return 'warning';
    return 'critical';
  };

  return (
    <div className="space-y-6">
      {/* API Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <APIHealthCard
          title="API Uptime"
          value={(apiMetrics.overall.uptime || 0).toFixed(2)}
          unit="%"
          icon={<CheckCircle className="w-5 h-5" />}
          status={getUptimeStatus(apiMetrics.overall.uptime || 0)}
          description="Service availability"
        />
        <APIHealthCard
          title="Total Requests"
          value={apiMetrics.overall.totalRequests.toLocaleString()}
          icon={<Activity className="w-5 h-5" />}
          status="good"
          description="Requests processed"
        />
        <APIHealthCard
          title="Average Response Time"
          value={apiMetrics.overall.averageResponseTime}
          unit="ms"
          icon={<Clock className="w-5 h-5" />}
          status={apiMetrics.overall.averageResponseTime < 200 ? 'excellent' : 
                 apiMetrics.overall.averageResponseTime < 500 ? 'good' : 'warning'}
          description="API responsiveness"
        />
        <APIHealthCard
          title="Error Rate"
          value={apiMetrics.overall.errorRate.toFixed(2)}
          unit="%"
          icon={<AlertTriangle className="w-5 h-5" />}
          status={getErrorRateStatus(apiMetrics.overall.errorRate)}
          description="Request failure rate"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ResponseTimeChart data={apiMetrics} historicalData={mockHistoricalData} />
        <StatusCodeChart endpoints={apiMetrics.endpoints} />
      </div>

      {/* Endpoints Table */}
      <EndpointTable 
        endpoints={apiMetrics.endpoints}
        onSelectEndpoint={setSelectedEndpoint}
      />

      {/* Slowest and Most Error-Prone Endpoints */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Slowest Endpoints */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-red-600" />
            Slowest Endpoints
          </h3>
          <div className="space-y-3">
            {(apiMetrics.slowestEndpoints || []).slice(0, 5).map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.endpoint}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-sm">{endpoint.endpoint}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {endpoint.requestCount} requests • {endpoint.errorRate.toFixed(1)}% errors
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-red-600">
                    {endpoint.averageResponseTime}ms
                  </div>
                  <div className="text-xs text-gray-600">
                    P99: {endpoint.p99ResponseTime}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error-Prone Endpoints */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-red-600" />
            Most Error-Prone Endpoints
          </h3>
          <div className="space-y-3">
            {(apiMetrics.errorProneEndpoints || []).slice(0, 5).map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.endpoint}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800' :
                      endpoint.method === 'POST' ? 'bg-green-100 text-green-800' :
                      endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                      endpoint.method === 'DELETE' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {endpoint.method}
                    </span>
                    <span className="font-mono text-sm">{endpoint.endpoint}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {endpoint.requestCount} requests • {endpoint.averageResponseTime}ms avg
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-red-600">
                    {endpoint.errorRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">
                    {(endpoint.status4xx || 0) + (endpoint.status5xx || 0)} errors
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};