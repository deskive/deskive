/**
 * Admin Dashboard Component
 * Main admin dashboard with analytics and system overview
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  FileText,
  Settings,
  Shield,
  TrendingUp,
  AlertCircle,
  Activity,
  Database,
  Globe,
  UserCheck,
  DollarSign,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { LoadingSpinner } from '../../components/ui/loading-spinner';
import { useToast } from '../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type { AdminAnalytics } from '@/lib/api/admin-api';

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  href?: string;
  color?: 'default' | 'success' | 'warning' | 'danger';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  icon, 
  href, 
  color = 'default' 
}) => {
  const navigate = useNavigate();
  
  const colorClasses = {
    default: 'bg-blue-500',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    danger: 'bg-red-500',
  };

  const handleClick = () => {
    if (href) {
      navigate(href);
    }
  };

  return (
    <Card 
      className={`${href ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
      onClick={handleClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground">
            <span className={change >= 0 ? 'text-green-600' : 'text-red-600'}>
              {change >= 0 ? '+' : ''}{change}%
            </span>{' '}
            from last month
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Quick Action Component
interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}

const QuickAction: React.FC<QuickActionProps> = ({ 
  title, 
  description, 
  icon, 
  href, 
  color 
}) => {
  return (
    <Link
      to={href}
      className="block p-4 rounded-lg border hover:shadow-md transition-shadow"
    >
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-lg ${color}`}>
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
      </div>
    </Link>
  );
};

// System Health Component
interface SystemHealthProps {
  health: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    diskUsage: number;
    memoryUsage: number;
  };
}

const SystemHealth: React.FC<SystemHealthProps> = ({ health }) => {
  const getHealthStatus = (value: number, thresholds: { warning: number; danger: number }) => {
    if (value >= thresholds.danger) return 'danger';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    return `${days}d ${hours}h`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <CardDescription>
          Current system performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm">Uptime</span>
            <Badge variant="outline" className="text-green-600 border-green-200">
              {formatUptime(health.uptime)}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Response Time</span>
            <Badge 
              variant={getHealthStatus(health.responseTime, { warning: 200, danger: 500 }) === 'success' ? 'default' : 'destructive'}
            >
              {health.responseTime}ms
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Error Rate</span>
            <Badge 
              variant={getHealthStatus(health.errorRate, { warning: 1, danger: 5 }) === 'success' ? 'default' : 'destructive'}
            >
              {health.errorRate}%
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Disk Usage</span>
            <Badge 
              variant={getHealthStatus(health.diskUsage, { warning: 80, danger: 90 }) === 'success' ? 'default' : 'destructive'}
            >
              {health.diskUsage}%
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm">Memory Usage</span>
            <Badge 
              variant={getHealthStatus(health.memoryUsage, { warning: 80, danger: 90 }) === 'success' ? 'default' : 'destructive'}
            >
              {health.memoryUsage}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Recent Activity Component
interface RecentActivityItem {
  id: string;
  action: string;
  resource: string;
  user: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
}

interface RecentActivityProps {
  activities: RecentActivityItem[];
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities }) => {
  const getStatusColor = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>
            Latest system activities and changes
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/admin/audit-logs">View All</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between py-2">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {activity.action} {activity.resource}
                </p>
                <p className="text-xs text-muted-foreground">
                  by {activity.user} • {activity.timestamp}
                </p>
              </div>
              <Badge className={`text-xs ${getStatusColor(activity.status)}`}>
                {activity.status}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Main Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await adminService.getDashboardAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load analytics</h3>
          <p className="text-muted-foreground mb-4">There was an error loading the dashboard data.</p>
          <Button onClick={fetchAnalytics}>Try Again</Button>
        </div>
      </div>
    );
  }

  // Mock recent activity data (in a real app, this would come from the API)
  const recentActivities: RecentActivityItem[] = [
    {
      id: '1',
      action: 'Created',
      resource: 'User Account',
      user: 'John Doe',
      timestamp: '2 minutes ago',
      status: 'success',
    },
    {
      id: '2',
      action: 'Updated',
      resource: 'System Config',
      user: 'Admin',
      timestamp: '15 minutes ago',
      status: 'success',
    },
    {
      id: '3',
      action: 'Failed Login',
      resource: 'Authentication',
      user: 'anonymous',
      timestamp: '32 minutes ago',
      status: 'error',
    },
    {
      id: '4',
      action: 'Published',
      resource: 'Blog Post',
      user: 'Content Manager',
      timestamp: '1 hour ago',
      status: 'success',
    },
  ];

  const quickActions = [
    {
      title: 'Manage Users',
      description: 'View and manage user accounts',
      icon: <Users className="h-5 w-5 text-white" />,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Organizations',
      description: 'Manage organization settings',
      icon: <Building2 className="h-5 w-5 text-white" />,
      href: '/admin/organizations',
      color: 'bg-green-500',
    },
    {
      title: 'Blog Management',
      description: 'Create and manage blog posts',
      icon: <FileText className="h-5 w-5 text-white" />,
      href: '/admin/blog',
      color: 'bg-purple-500',
    },
    {
      title: 'System Settings',
      description: 'Configure system preferences',
      icon: <Settings className="h-5 w-5 text-white" />,
      href: '/admin/settings',
      color: 'bg-gray-600',
    },
    {
      title: 'Security & Audit',
      description: 'View security logs and settings',
      icon: <Shield className="h-5 w-5 text-white" />,
      href: '/admin/security',
      color: 'bg-red-500',
    },
    {
      title: 'Analytics',
      description: 'View detailed system analytics',
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      href: '/admin/analytics',
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to the Deskive admin panel. Monitor your system and manage your platform.
        </p>
      </div>

      {/* Overview Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={analytics.overview.totalUsers.toLocaleString()}
          change={12}
          icon={<Users className="h-4 w-4" />}
          href="/admin/users"
          color="default"
        />
        <MetricCard
          title="Organizations"
          value={analytics.overview.totalOrganizations.toLocaleString()}
          change={8}
          icon={<Building2 className="h-4 w-4" />}
          href="/admin/organizations"
          color="success"
        />
        <MetricCard
          title="Active Users"
          value={analytics.overview.activeUsers.toLocaleString()}
          change={5}
          icon={<UserCheck className="h-4 w-4" />}
          color="success"
        />
        <MetricCard
          title="Revenue"
          value={`$${analytics.overview.revenue.toLocaleString()}`}
          change={15}
          icon={<DollarSign className="h-4 w-4" />}
          color="success"
        />
        <MetricCard
          title="Blog Posts"
          value={analytics.overview.totalBlogPosts.toLocaleString()}
          change={3}
          icon={<FileText className="h-4 w-4" />}
          href="/admin/blog"
          color="default"
        />
        <MetricCard
          title="Workspaces"
          value={analytics.overview.totalWorkspaces.toLocaleString()}
          change={7}
          icon={<Globe className="h-4 w-4" />}
          color="default"
        />
        <MetricCard
          title="Storage Used"
          value={`${(analytics.overview.storageUsed / 1024 / 1024 / 1024).toFixed(1)} GB`}
          change={-2}
          icon={<Database className="h-4 w-4" />}
          color="warning"
        />
        <MetricCard
          title="New Users Today"
          value={analytics.overview.newUsersToday.toLocaleString()}
          icon={<Calendar className="h-4 w-4" />}
          color="default"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks and management functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {quickActions.map((action) => (
              <QuickAction
                key={action.href}
                title={action.title}
                description={action.description}
                icon={action.icon}
                href={action.href}
                color={action.color}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Health & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealth health={analytics.systemHealth} />
        <RecentActivity activities={recentActivities} />
      </div>

      {/* Top Organizations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Top Organizations</CardTitle>
            <CardDescription>
              Organizations by user count and revenue
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/organizations">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.topOrganizations?.map((org, index) => (
              <div key={org.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {org.userCount} users • {org.subscriptionPlan}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">${org.revenue.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">revenue</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;