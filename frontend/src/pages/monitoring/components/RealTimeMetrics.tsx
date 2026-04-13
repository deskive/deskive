/**
 * Real-Time Metrics Components
 * Live system health monitoring with real-time updates
 */

import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Network,
  Activity,
  Thermometer
} from 'lucide-react';

import type { SystemHealthMetrics } from '@/lib/api/monitoring-api';

interface RealTimeMetricsProps {
  systemHealth: SystemHealthMetrics;
  historicalData?: Array<{
    timestamp: string;
    cpu: number;
    memory: number;
    disk: number;
    network: number;
  }>;
}

// Circular progress component
const CircularProgress: React.FC<{
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  unit?: string;
  status?: 'good' | 'warning' | 'critical';
}> = ({ 
  value, 
  max = 100, 
  size = 120, 
  strokeWidth = 8, 
  color,
  label, 
  unit = '%',
  status = 'good'
}) => {
  const percentage = (value / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
  
  // Auto-determine color based on status if not provided
  const statusColors = {
    good: '#10b981',
    warning: '#f59e0b',
    critical: '#ef4444'
  };
  
  const finalColor = color || statusColors[status];

  return (
    <div className="relative">
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f3f4f6"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={finalColor}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gray-900">
          {value.toFixed(1)}{unit}
        </span>
        <span className="text-sm text-gray-600">{label}</span>
      </div>
    </div>
  );
};

// CPU Metrics Component
export const CPUMetrics: React.FC<{ 
  cpu: SystemHealthMetrics['cpu'];
  historical?: Array<{ timestamp: string; cpu: number }>;
}> = ({ cpu, historical = [] }) => {
  const getStatus = (usage: number) => {
    if (usage < 70) return 'good';
    if (usage < 85) return 'warning';
    return 'critical';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Cpu className="w-5 h-5 mr-2 text-blue-600" />
          CPU Usage
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatus(cpu.usage) === 'good' ? 'bg-green-100 text-green-800' :
            getStatus(cpu.usage) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {getStatus(cpu.usage).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU Usage Circular Chart */}
        <div className="flex flex-col items-center">
          <CircularProgress
            value={cpu.usage}
            label="CPU"
            status={getStatus(cpu.usage)}
            size={140}
          />
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cores:</span>
              <span className="font-medium">{cpu.cores}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Load Avg:</span>
              <span className="font-medium">{cpu.loadAverage?.[0]?.toFixed(2) || 'N/A'}</span>
            </div>
            {cpu.temperature && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Temperature:</span>
                <span className="font-medium flex items-center">
                  <Thermometer className="w-3 h-3 mr-1" />
                  {cpu.temperature}°C
                </span>
              </div>
            )}
          </div>
        </div>

        {/* CPU Historical Chart */}
        {historical.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">CPU Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historical.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'CPU Usage']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cpu" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Memory Metrics Component
export const MemoryMetrics: React.FC<{ 
  memory: SystemHealthMetrics['memory'];
  historical?: Array<{ timestamp: string; memory: number }>;
}> = ({ memory, historical = [] }) => {
  const getStatus = (usage: number) => {
    if (usage < 75) return 'good';
    if (usage < 90) return 'warning';
    return 'critical';
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <MemoryStick className="w-5 h-5 mr-2 text-purple-600" />
          Memory Usage
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatus(memory.usage) === 'good' ? 'bg-green-100 text-green-800' :
            getStatus(memory.usage) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {getStatus(memory.usage).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Memory Usage Circular Chart */}
        <div className="flex flex-col items-center">
          <CircularProgress
            value={memory.usage}
            label="Memory"
            status={getStatus(memory.usage)}
            size={140}
            color="#8b5cf6"
          />
          <div className="mt-4 space-y-2 w-full">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{formatBytes(memory.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Used:</span>
              <span className="font-medium">{formatBytes(memory.used ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available:</span>
              <span className="font-medium">{formatBytes(memory.available)}</span>
            </div>
            {memory.buffers && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Buffers:</span>
                <span className="font-medium">{formatBytes(memory.buffers)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Memory Historical Chart */}
        {historical.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historical.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Memory Usage']}
                />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#8b5cf6" 
                  fill="#8b5cf6" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Disk Metrics Component
export const DiskMetrics: React.FC<{ 
  disk: SystemHealthMetrics['disk'];
  historical?: Array<{ timestamp: string; disk: number }>;
}> = ({ disk, historical = [] }) => {
  const getStatus = (usage: number) => {
    if (usage < 80) return 'good';
    if (usage < 95) return 'warning';
    return 'critical';
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <HardDrive className="w-5 h-5 mr-2 text-green-600" />
          Disk Usage
        </h3>
        <div className="flex items-center space-x-2">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            getStatus(disk.usage) === 'good' ? 'bg-green-100 text-green-800' :
            getStatus(disk.usage) === 'warning' ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {getStatus(disk.usage).toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disk Usage Circular Chart */}
        <div className="flex flex-col items-center">
          <CircularProgress
            value={disk.usage}
            label="Disk"
            status={getStatus(disk.usage)}
            size={140}
            color="#10b981"
          />
          <div className="mt-4 space-y-2 w-full">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total:</span>
              <span className="font-medium">{formatBytes(disk.total)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Used:</span>
              <span className="font-medium">{formatBytes(disk.used ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Available:</span>
              <span className="font-medium">{formatBytes(disk.available)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Read Speed:</span>
              <span className="font-medium">{(disk.readSpeed ?? 0).toFixed(1)} MB/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Write Speed:</span>
              <span className="font-medium">{(disk.writeSpeed ?? 0).toFixed(1)} MB/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">IOPS:</span>
              <span className="font-medium">{disk.iops ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Disk Historical Chart */}
        {historical.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Disk Usage Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={historical.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Disk Usage']}
                />
                <Area 
                  type="monotone" 
                  dataKey="disk" 
                  stroke="#10b981" 
                  fill="#10b981" 
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Network Metrics Component
export const NetworkMetrics: React.FC<{ 
  network: SystemHealthMetrics['network'];
  historical?: Array<{ timestamp: string; bytesIn: number; bytesOut: number }>;
}> = ({ network, historical = [] }) => {
  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const formatBandwidth = (mbps: number) => {
    if (mbps < 1) return `${(mbps * 1000).toFixed(0)} Kbps`;
    if (mbps < 1000) return `${mbps.toFixed(1)} Mbps`;
    return `${(mbps / 1000).toFixed(2)} Gbps`;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <Network className="w-5 h-5 mr-2 text-orange-600" />
          Network I/O
        </h3>
        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            ACTIVE
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Stats */}
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-600">In</span>
                <Activity className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-lg font-semibold text-blue-900">
                {formatBytes(network.bytesIn)}/s
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-600">Out</span>
                <Activity className="w-4 h-4 text-green-600" />
              </div>
              <div className="text-lg font-semibold text-green-900">
                {formatBytes(network.bytesOut)}/s
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Bandwidth:</span>
              <span className="font-medium">{formatBandwidth(network.bandwidth ?? 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Latency:</span>
              <span className="font-medium">{network.latency ?? 0}ms</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Connections:</span>
              <span className="font-medium">{network.connections ?? 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Packets In:</span>
              <span className="font-medium">{network.packetsIn.toLocaleString()}/s</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Packets Out:</span>
              <span className="font-medium">{network.packetsOut.toLocaleString()}/s</span>
            </div>
          </div>
        </div>

        {/* Network Historical Chart */}
        {historical.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Network Traffic Over Time</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={historical.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(value) => new Date(value).toLocaleTimeString().slice(0, 5)}
                />
                <YAxis 
                  tickFormatter={(value) => formatBytes(value)}
                />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleTimeString()}
                  formatter={(value, name) => [
                    formatBytes(Number(value)),
                    name === 'bytesIn' ? 'Incoming' : 'Outgoing'
                  ]}
                />
                <Line 
                  type="monotone" 
                  dataKey="bytesIn" 
                  stroke="#3b82f6" 
                  name="Incoming"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="bytesOut" 
                  stroke="#10b981" 
                  name="Outgoing"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Real-Time Metrics Container
export const RealTimeMetrics: React.FC<RealTimeMetricsProps> = ({ 
  systemHealth, 
  historicalData = [] 
}) => {
  // Transform historical data for individual components
  const cpuHistorical = historicalData.map(d => ({
    timestamp: d.timestamp,
    cpu: d.cpu
  }));

  const memoryHistorical = historicalData.map(d => ({
    timestamp: d.timestamp,
    memory: d.memory
  }));

  const diskHistorical = historicalData.map(d => ({
    timestamp: d.timestamp,
    disk: d.disk
  }));

  const networkHistorical = historicalData.map(d => ({
    timestamp: d.timestamp,
    bytesIn: d.network * 1024 * 1024, // Convert MB to bytes for display
    bytesOut: d.network * 1024 * 1024 * 0.8 // Mock outbound data
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CPUMetrics cpu={systemHealth.cpu} historical={cpuHistorical} />
        <MemoryMetrics memory={systemHealth.memory} historical={memoryHistorical} />
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <DiskMetrics disk={systemHealth.disk} historical={diskHistorical} />
        <NetworkMetrics network={systemHealth.network} historical={networkHistorical} />
      </div>
    </div>
  );
};