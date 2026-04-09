/**
 * Example Dashboard implementation using the new dashboard components
 * This shows how to use DashboardFilters, MetricCard, and QuickActions together
 */

import React, { useState } from 'react';
import { MessageSquare, FolderOpen, Upload, Users } from 'lucide-react';
import { startOfToday, subDays } from 'date-fns';
import DashboardFilters, { type DateRange } from './DashboardFilters';
import MetricCard from './MetricCard';
import QuickActions from './QuickActions';

const DashboardExample: React.FC = () => {
  // State for filters
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(startOfToday(), 29),
    to: startOfToday(),
  });
  
  const [aggregationPeriod, setAggregationPeriod] = useState('day');

  // Sample metric data
  const metrics = [
    {
      title: 'Messages',
      value: 24,
      icon: MessageSquare,
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-100',
      trend: {
        value: 12,
        isPositive: true,
        label: 'from last week',
      },
    },
    {
      title: 'Projects',
      value: 8,
      icon: FolderOpen,
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-100',
      trend: {
        value: 8,
        isPositive: true,
        label: 'from last month',
      },
    },
    {
      title: 'Files',
      value: 156,
      icon: Upload,
      iconColor: 'text-yellow-600',
      iconBgColor: 'bg-yellow-100',
      trend: {
        value: 5,
        isPositive: false,
        label: 'from yesterday',
      },
    },
    {
      title: 'Members',
      value: 12,
      icon: Users,
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to your workspace overview
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        aggregationPeriod={aggregationPeriod}
        onAggregationPeriodChange={setAggregationPeriod}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard
            key={index}
            title={metric.title}
            value={metric.value}
            icon={metric.icon}
            iconColor={metric.iconColor}
            iconBgColor={metric.iconBgColor}
            trend={metric.trend}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Additional Dashboard Content */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">JD</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  John Doe created a new project "Website Redesign"
                </p>
                <p className="text-sm text-gray-500">2 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm font-medium">SM</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  Sarah Miller uploaded 3 files to "Project Resources"
                </p>
                <p className="text-sm text-gray-500">4 hours ago</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 text-sm font-medium">RJ</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  Robert Johnson completed task "UI Mockups"
                </p>
                <p className="text-sm text-gray-500">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardExample;