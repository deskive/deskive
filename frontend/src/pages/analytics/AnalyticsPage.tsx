/**
 * Analytics Page
 * Comprehensive analytics dashboard with multiple views and insights
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Users,
  FolderOpen,
  Calendar,
  FileText,
  Download,
  RefreshCw,
  BarChart3,
  TrendingDown,
  Clock,
  Award,
  Zap,
  AlertCircle,
  CheckCircle2,
  PlayCircle,
  UserCheck,
  Loader2
} from 'lucide-react';

// Services and types
import { analyticsService } from '@/lib/api/analytics-api';
import type {
  WorkspaceAnalytics,
  FileAnalytics,
  CalendarAnalytics,
  TeamPerformance,
  AnalyticsDateRange
} from '@/lib/api/analytics-api';

// Date range options
const DATE_RANGE_OPTIONS = [
  { label: 'Last 7 days', value: 7, period: 'day' as const },
  { label: 'Last 30 days', value: 30, period: 'day' as const },
  { label: 'Last 3 months', value: 90, period: 'week' as const },
  { label: 'Last 6 months', value: 180, period: 'week' as const },
  { label: 'Last year', value: 365, period: 'month' as const }
];

// Tab options
const ANALYTICS_TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'projects', label: 'Projects', icon: FolderOpen },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'calendar', label: 'Calendar', icon: Calendar }
];

// Chart colors
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

const AnalyticsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const intl = useIntl();

  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDateRange, setSelectedDateRange] = useState(DATE_RANGE_OPTIONS[1]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics data
  const [workspaceAnalytics, setWorkspaceAnalytics] = useState<WorkspaceAnalytics | null>(null);
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null);
  const [fileAnalytics, setFileAnalytics] = useState<FileAnalytics | null>(null);
  const [calendarAnalytics, setCalendarAnalytics] = useState<CalendarAnalytics | null>(null);

  // Date range calculation
  const getDateRange = (): AnalyticsDateRange => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - selectedDateRange.value);
    
    return {
      start: start.toISOString(),
      end: end.toISOString(),
      period: selectedDateRange.period
    };
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    if (!workspaceId) return;

    try {
      setLoading(true);
      setError(null);
      const dateRange = getDateRange();

      // Fetch all analytics data in parallel
      const [workspace, team, files, calendar] = await Promise.all([
        analyticsService.getWorkspaceAnalytics(workspaceId, dateRange),
        analyticsService.getTeamPerformance(workspaceId, dateRange),
        analyticsService.getFileAnalytics(workspaceId, dateRange),
        analyticsService.getCalendarAnalytics(workspaceId, dateRange)
      ]);

      setWorkspaceAnalytics(workspace);
      setTeamPerformance(team);
      setFileAnalytics(files);
      setCalendarAnalytics(calendar);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // Export analytics data
  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    if (!workspaceId) return;

    try {
      const dateRange = getDateRange();
      const blob = await analyticsService.exportAnalyticsData(
        workspaceId,
        'workspace',
        format,
        dateRange,
        { includeCharts: true }
      );

      // Download the file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  // Load data on mount and date range change
  useEffect(() => {
    fetchAnalyticsData();
  }, [workspaceId, selectedDateRange]);

  // Metric card component
  const MetricCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color?: string;
  }> = ({ title, value, icon, trend, color = 'indigo' }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-lg bg-${color}-100 text-${color}-600`}>
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
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

  // Overview tab content
  const OverviewContent: React.FC = () => {
    if (!workspaceAnalytics) return null;

    const { overview, activity, growth } = workspaceAnalytics;

    // Activity trend data for chart
    const activityData = workspaceAnalytics.trends.userActivityTrend.map((value, index) => ({
      name: `Day ${index + 1}`,
      users: value,
      projects: workspaceAnalytics.trends.projectProgressTrend[index] || 0,
      productivity: workspaceAnalytics.trends.productivityTrend[index] || 0
    }));

    return (
      <div className="space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Users"
            value={overview.totalUsers}
            icon={<Users className="w-6 h-6" />}
            trend={{ value: growth.userGrowthRate, isPositive: growth.userGrowthRate > 0 }}
          />
          <MetricCard
            title="Active Projects"
            value={overview.totalProjects}
            icon={<FolderOpen className="w-6 h-6" />}
            trend={{ value: growth.projectGrowthRate, isPositive: growth.projectGrowthRate > 0 }}
            color="green"
          />
          <MetricCard
            title="Completed Tasks"
            value={`${overview.completedTasks}/${overview.totalTasks}`}
            icon={<CheckCircle2 className="w-6 h-6" />}
            trend={{ value: growth.taskCompletionRate, isPositive: growth.taskCompletionRate > 0 }}
            color="blue"
          />
          <MetricCard
            title="Storage Used"
            value={`${Math.round(overview.storageUsed / 1024 / 1024 / 1024 * 100) / 100} GB`}
            icon={<FileText className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Trend Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Trends</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="users" stroke="#6366f1" name="Active Users" />
                <Line type="monotone" dataKey="projects" stroke="#10b981" name="Project Progress" />
                <Line type="monotone" dataKey="productivity" stroke="#f59e0b" name="Productivity" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
            <div className="space-y-4">
              {workspaceAnalytics.topPerformers.mostActiveUsers.slice(0, 5).map((user, index) => (
                <div key={user.userId} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                      <span className="text-indigo-600 text-sm font-medium">
                        {user.userName.charAt(0)}
                      </span>
                    </div>
                    <span className="font-medium">{user.userName}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">{user.activityCount} activities</span>
                    <div className={`w-2 h-2 rounded-full ${
                      index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Engagement Rate</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="80%" data={[
                  { name: 'Engagement', value: growth.engagementRate, fill: '#6366f1' }
                ]}>
                  <RadialBar dataKey="value" cornerRadius={10} />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold">
                    {growth.engagementRate}%
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Peak Activity</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Peak Hour:</span>
                <span className="font-medium">{activity.peakActivityHour}:00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Peak Day:</span>
                <span className="font-medium">{activity.peakActivityDay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg Session:</span>
                <span className="font-medium">{activity.averageSessionDuration}min</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Growth Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">User Growth:</span>
                <span className={`font-medium ${growth.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth.userGrowthRate > 0 ? '+' : ''}{growth.userGrowthRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Project Growth:</span>
                <span className={`font-medium ${growth.projectGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth.projectGrowthRate > 0 ? '+' : ''}{growth.projectGrowthRate}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Content Growth:</span>
                <span className={`font-medium ${growth.contentGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {growth.contentGrowthRate > 0 ? '+' : ''}{growth.contentGrowthRate}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Projects tab content
  const ProjectsContent: React.FC = () => {
    if (!workspaceAnalytics) return null;

    const { topPerformers } = workspaceAnalytics;
    
    // Mock project data for demonstration
    const projectData = topPerformers.mostProductiveProjects.map(project => ({
      name: project.projectName,
      completion: project.completionRate,
      tasks: project.taskCount,
      progress: Math.floor(Math.random() * 100)
    }));

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Project Performance Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Project Performance</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completion" fill="#6366f1" name="Completion Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Task Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="tasks"
                  nameKey="name"
                >
                  {projectData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project List */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Project Details</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {topPerformers.mostProductiveProjects.map((project) => (
                <div key={project.projectId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{project.projectName}</h4>
                    <p className="text-sm text-gray-600">{project.taskCount} tasks</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold">{project.completionRate}%</span>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${project.completionRate}%` }}
                      />
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

  // Team tab content
  const TeamContent: React.FC = () => {
    if (!teamPerformance || !workspaceAnalytics) return null;

    const teamData = workspaceAnalytics.topPerformers.mostActiveUsers.map(user => ({
      name: user.userName,
      activities: user.activityCount,
      score: user.score
    }));

    return (
      <div className="space-y-6">
        {/* Team Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Team Members"
            value={teamPerformance.overview.totalMembers}
            icon={<Users className="w-6 h-6" />}
          />
          <MetricCard
            title="Active Members"
            value={teamPerformance.overview.activeMembers}
            icon={<UserCheck className="w-6 h-6" />}
            color="green"
          />
          <MetricCard
            title="Team Velocity"
            value={teamPerformance.productivity.teamVelocity}
            icon={<Zap className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="Quality Score"
            value={`${teamPerformance.productivity.qualityScore}/100`}
            icon={<Award className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Team Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={teamData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="activities" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Scores */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Scores</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" />
                <Tooltip />
                <Bar dataKey="score" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Team Performance Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Productivity</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sprint Completion:</span>
                  <span className="font-medium">{teamPerformance.productivity.sprintCompletion}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cycle Time:</span>
                  <span className="font-medium">{teamPerformance.productivity.cycleTime} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Throughput:</span>
                  <span className="font-medium">{teamPerformance.productivity.throughput}/week</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Collaboration</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Knowledge Sharing:</span>
                  <span className="font-medium">{teamPerformance.collaboration.knowledgeSharing}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Communication:</span>
                  <span className="font-medium">{teamPerformance.collaboration.communicationFrequency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Meeting Efficiency:</span>
                  <span className="font-medium">{teamPerformance.collaboration.meetingEfficiency}/100</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Health</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Satisfaction:</span>
                  <span className="font-medium">{teamPerformance.health?.satisfactionScore ?? 0}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Work-Life Balance:</span>
                  <span className="font-medium">{teamPerformance.health?.wellnessMetrics.workLifeBalance ?? 0}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Job Satisfaction:</span>
                  <span className="font-medium">{teamPerformance.health?.wellnessMetrics.jobSatisfaction ?? 0}/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Files tab content
  const FilesContent: React.FC = () => {
    if (!fileAnalytics) return null;

    const { overview, types, activity } = fileAnalytics;

    // Add null guards for types, activity, and overview
    if (!types || !activity || !overview) {
      return <div className="text-center py-8 text-gray-500">Loading file analytics...</div>;
    }

    const fileTypeData = types.distribution.map(type => ({
      name: type.type,
      count: type.count,
      size: Math.round(type.size / 1024 / 1024), // MB
      percentage: type.percentage
    }));

    const activityData = activity.uploadsPerDay.map((uploads, index) => ({
      day: `Day ${index + 1}`,
      uploads,
      downloads: activity.downloadsPerDay?.[index] || 0,
      shares: activity.sharesPerDay?.[index] || 0
    }));

    return (
      <div className="space-y-6">
        {/* File Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Total Files"
            value={overview.totalFiles}
            icon={<FileText className="w-6 h-6" />}
          />
          <MetricCard
            title="Storage Used"
            value={`${Math.round(overview.totalSize / 1024 / 1024 / 1024 * 100) / 100} GB`}
            icon={<FileText className="w-6 h-6" />}
            color="green"
          />
          <MetricCard
            title="Storage Utilization"
            value={`${overview.storageUtilization}%`}
            icon={<BarChart3 className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="Duplicate Files"
            value={overview.duplicateFiles || 0}
            icon={<AlertCircle className="w-6 h-6" />}
            color="yellow"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* File Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">File Activity</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="uploads" stroke="#6366f1" name="Uploads" />
                <Line type="monotone" dataKey="downloads" stroke="#10b981" name="Downloads" />
                <Line type="monotone" dataKey="shares" stroke="#f59e0b" name="Shares" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* File Type Distribution */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">File Type Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fileTypeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="count"
                  nameKey="name"
                >
                  {fileTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* File Details */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Storage Breakdown</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {fileTypeData.map((type) => (
                <div key={type.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{type.name}</h4>
                    <p className="text-sm text-gray-600">{type.count} files</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-semibold">{type.size} MB</span>
                    <div className="text-sm text-gray-600">{type.percentage}% of total</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Calendar tab content
  const CalendarContent: React.FC = () => {
    if (!calendarAnalytics) return null;

    const { overview, patterns, meetings } = calendarAnalytics;

    const busyHoursData = patterns.busyHours.map(hour => ({
      hour: `${hour.hour}:00`,
      events: hour.eventCount,
      utilization: hour.utilizationRate
    }));

    const busyDaysData = patterns.busyDays.map(day => ({
      day: day.dayOfWeek,
      events: day.eventCount,
      duration: day.averageDuration
    }));

    return (
      <div className="space-y-6">
        {/* Calendar Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MetricCard
            title="Total Events"
            value={overview.totalEvents}
            icon={<Calendar className="w-6 h-6" />}
          />
          <MetricCard
            title="Meetings Held"
            value={overview.meetingsHeld}
            icon={<PlayCircle className="w-6 h-6" />}
            color="green"
          />
          <MetricCard
            title="Avg Duration"
            value={`${overview.averageMeetingDuration}min`}
            icon={<Clock className="w-6 h-6" />}
            color="blue"
          />
          <MetricCard
            title="On-Time Rate"
            value={`${meetings.onTimeRate}%`}
            icon={<CheckCircle2 className="w-6 h-6" />}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Busy Hours */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Peak Meeting Hours</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={busyHoursData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="events" fill="#6366f1" name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Busy Days */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Meeting Distribution by Day</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={busyDaysData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="events" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Meeting Insights */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Meeting Insights</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium mb-2">Attendance</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Average Attendees:</span>
                  <span className="font-medium">{meetings.averageAttendees}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">On-Time Rate:</span>
                  <span className="font-medium">{meetings.onTimeRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Completion Rate:</span>
                  <span className="font-medium">{meetings.completionRate}%</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Efficiency</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Productivity Score:</span>
                  <span className="font-medium">{meetings.productivityScore}/100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">No-Show Rate:</span>
                  <span className="font-medium">{overview.noShowRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Cancelled Events:</span>
                  <span className="font-medium">{overview.cancelledEvents}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Time Usage</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Total Meeting Time:</span>
                  <span className="font-medium">{overview.totalMeetingTime}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recurring Events:</span>
                  <span className="font-medium">{overview.recurringEvents}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Peak Day:</span>
                  <span className="font-medium">{patterns.peakMeetingDays[0] || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewContent />;
      case 'projects':
        return <ProjectsContent />;
      case 'team':
        return <TeamContent />;
      case 'files':
        return <FilesContent />;
      case 'calendar':
        return <CalendarContent />;
      default:
        return <OverviewContent />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Comprehensive insights and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Date Range Picker */}
          <select
            value={selectedDateRange.value}
            onChange={(e) => {
              const option = DATE_RANGE_OPTIONS.find(opt => opt.value === parseInt(e.target.value));
              if (option) setSelectedDateRange(option);
            }}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            {DATE_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Export Button */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value) {
                  handleExport(e.target.value as 'csv' | 'excel' | 'pdf');
                  e.target.value = '';
                }
              }}
              className="appearance-none bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <option value="">Export</option>
              <option value="csv">Export CSV</option>
              <option value="excel">Export Excel</option>
              <option value="pdf">Export PDF</option>
            </select>
            <Download className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none text-white" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchAnalyticsData}
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
        <nav className="-mb-px flex space-x-8">
          {ANALYTICS_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
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

export default AnalyticsPage;