import { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  Search,
  Users,
  FileText,
  Activity,
  Calendar,
  Target,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import type { SearchAnalytics as SearchAnalyticsType } from '../../types/search';
import { formatRelativeTime } from '../../lib/utils';

interface SearchAnalyticsProps {
  onClose: () => void;
}

export function SearchAnalytics({ onClose }: SearchAnalyticsProps) {
  const [timeframe, setTimeframe] = useState('30d');
  const [analytics, setAnalytics] = useState<SearchAnalyticsType | null>(null);

  // Placeholder function for loading analytics (to be connected to backend later)
  const loadAnalytics = async (timeframe: string) => {
    // TODO: Connect to backend API
    console.log('Loading analytics for timeframe:', timeframe);

    // Mock data for now
    const mockData: SearchAnalyticsType = {
      totalSearches: 1247,
      searchGrowth: 12.5,
      avgResults: 23,
      successRate: 94,
      avgSearchTime: 145,
      fastestSearch: 42,
      slowestSearch: 892,
      totalDocuments: 15420,
      indexSize: '2.4 GB',
      lastIndexUpdate: new Date().toISOString(),
      mostActiveDay: 'Monday',
      peakHour: '10:00 AM',
      avgDailySearches: 42,
      topSearches: [
        { query: 'project roadmap', count: 156 },
        { query: 'team meeting notes', count: 134 },
        { query: 'budget proposal', count: 98 },
        { query: 'design system', count: 87 },
        { query: 'Q3 report', count: 73 }
      ],
      topUsers: [
        { name: 'Sarah Johnson', searchCount: 234 },
        { name: 'Mike Chen', searchCount: 198 },
        { name: 'Emma Davis', searchCount: 176 },
        { name: 'James Wilson', searchCount: 142 },
        { name: 'Lisa Anderson', searchCount: 129 }
      ],
      peakHours: [
        { time: '9:00 AM', percentage: 85 },
        { time: '10:00 AM', percentage: 95 },
        { time: '2:00 PM', percentage: 78 },
        { time: '3:00 PM', percentage: 82 },
        { time: '11:00 AM', percentage: 70 }
      ],
      searchModes: [
        { mode: 'full-text', percentage: 65 },
        { mode: 'semantic', percentage: 25 },
        { mode: 'hybrid', percentage: 10 }
      ],
      contentTypes: [
        { type: 'messages', percentage: 45, count: 6939 },
        { type: 'files', percentage: 30, count: 4626 },
        { type: 'notes', percentage: 15, count: 2313 },
        { type: 'projects', percentage: 10, count: 1542 }
      ],
      topContent: [
        { title: 'Q3 Marketing Strategy', type: 'document', views: 342, searchCount: 87 },
        { title: 'Team Onboarding Guide', type: 'note', views: 298, searchCount: 76 },
        { title: 'Product Roadmap 2024', type: 'project', views: 276, searchCount: 71 },
        { title: 'Budget Allocation Q3', type: 'file', views: 254, searchCount: 65 },
        { title: 'Design System v2', type: 'document', views: 231, searchCount: 59 }
      ]
    };

    return mockData;
  };

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const data = await loadAnalytics(timeframe);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    };

    fetchAnalytics();
  }, [timeframe]);

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Search Analytics</h1>
            <p className="text-muted-foreground">
              Insights into your workspace search patterns and performance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 3 months</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="content">Content Types</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
                  <Search className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSearches?.toLocaleString() || '0'}</div>
                  <p className="text-xs text-muted-foreground">
                    {analytics.searchGrowth > 0 ? '+' : ''}{analytics.searchGrowth}% from last period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Results</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avgResults || '0'}</div>
                  <p className="text-xs text-muted-foreground">
                    Per search query
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.successRate || '0'}%</div>
                  <p className="text-xs text-muted-foreground">
                    Searches with clicks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avgSearchTime || '0'}ms</div>
                  <p className="text-xs text-muted-foreground">
                    Search response time
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Top Searches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Most Popular Searches
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topSearches?.map((search, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{search.query}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{search.count} searches</Badge>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Active Searchers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topUsers?.map((user, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">
                            #{index + 1}
                          </span>
                          <span className="font-medium">{user.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{user.searchCount} searches</Badge>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Search Volume Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Chart visualization would go here
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Peak Search Times</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.peakHours?.map((hour, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span>{hour.time}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${hour.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {hour.percentage}%
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Search Modes Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.searchModes?.map((mode, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="capitalize">{mode.mode}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${mode.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {mode.percentage}%
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Type Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.contentTypes?.map((type, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="capitalize">{type.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-muted rounded-full h-2">
                            <div
                              className="bg-primary rounded-full h-2"
                              style={{ width: `${type.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {type.count} results
                          </span>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Most Searched Content</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topContent?.map((content, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{content.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {content.type} • {content.views} views
                            </p>
                          </div>
                          <Badge variant="outline">
                            {content.searchCount} searches
                          </Badge>
                        </div>
                      </div>
                    )) || []}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Average Response Time</span>
                      <span className="font-medium">{analytics.avgSearchTime || '0'}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Fastest Search</span>
                      <span className="font-medium">{analytics.fastestSearch || '0'}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Slowest Search</span>
                      <span className="font-medium">{analytics.slowestSearch || '0'}ms</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Index Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Documents</span>
                      <span className="font-medium">{analytics.totalDocuments?.toLocaleString() || '0'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Index Size</span>
                      <span className="font-medium">{analytics.indexSize || '0 MB'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Updated</span>
                      <span className="font-medium">
                        {analytics.lastIndexUpdate ? formatRelativeTime(analytics.lastIndexUpdate) : 'Unknown'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Usage Patterns</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm">Most Active Day</span>
                      <span className="font-medium">{analytics.mostActiveDay || 'Monday'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Peak Hour</span>
                      <span className="font-medium">{analytics.peakHour || '10:00 AM'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Avg. Daily Searches</span>
                      <span className="font-medium">{analytics.avgDailySearches || '0'}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
