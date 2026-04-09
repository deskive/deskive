import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';
import { formsApi } from '@/lib/api/forms-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Users, Eye, Clock, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function FormAnalyticsPage() {
  const intl = useIntl();
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const navigate = useNavigate();

  const { data: form } = useQuery({
    queryKey: ['form', workspaceId, formId],
    queryFn: () => formsApi.getForm(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const { data: summary } = useQuery({
    queryKey: ['form-summary', workspaceId, formId],
    queryFn: () => formsApi.getSummary(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['form-analytics', workspaceId, formId],
    queryFn: () => formsApi.getAnalytics(workspaceId!, formId!),
    enabled: !!workspaceId && !!formId,
  });

  const { data: timeline } = useQuery({
    queryKey: ['form-timeline', workspaceId, formId],
    queryFn: () => formsApi.getTimeline(workspaceId!, formId!, 'day'),
    enabled: !!workspaceId && !!formId,
  });

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(`/workspaces/${workspaceId}/forms/${formId}/responses`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {intl.formatMessage({ id: 'modules.forms.actions.backToResponses', defaultMessage: 'Back to Responses' })}
        </Button>
      </div>

      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          {intl.formatMessage(
            { id: 'modules.forms.analytics.title', defaultMessage: '{formTitle} - Analytics' },
            { formTitle: form?.title || intl.formatMessage({ id: 'modules.forms.builder.untitledForm', defaultMessage: 'Untitled Form' }) }
          )}
        </h1>
        <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.description', defaultMessage: 'Insights and statistics for your form' })}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.analytics.totalViews', defaultMessage: 'Total Views' })}</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalViews || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.analytics.totalResponses', defaultMessage: 'Total Responses' })}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalResponses || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.analytics.completionRate', defaultMessage: 'Completion Rate' })}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.completionRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{intl.formatMessage({ id: 'modules.forms.analytics.avgTime', defaultMessage: 'Avg. Time' })}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.avgCompletionTimeSeconds
                ? `${Math.floor(summary.avgCompletionTimeSeconds / 60)}m ${summary.avgCompletionTimeSeconds % 60}s`
                : intl.formatMessage({ id: 'modules.forms.analytics.notAvailable', defaultMessage: 'N/A' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Response Timeline */}
      {timeline && timeline.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{intl.formatMessage({ id: 'modules.forms.analytics.responseTimeline', defaultMessage: 'Response Timeline' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  activeDot={{ r: 8 }}
                  name={intl.formatMessage({ id: 'modules.forms.analytics.responsesLabel', defaultMessage: 'Responses' })}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Field Statistics */}
      {analytics?.fieldStats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(analytics.fieldStats).map(([fieldId, stats]: [string, any]) => {
            const field = form?.fields.find((f) => f.id === fieldId);
            if (!field) return null;

            // Show charts for fields with topAnswers
            if (stats.topAnswers && stats.topAnswers.length > 0) {
              return (
                <Card key={fieldId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{field.label}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {intl.formatMessage(
                        { id: 'modules.forms.analytics.responseCountWithRate', defaultMessage: '{count} responses ({rate}%)' },
                        { count: stats.responseCount, rate: stats.responseRate }
                      )}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.topAnswers}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="value" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            }

            // Show rating distribution
            if (stats.ratingDistribution && stats.ratingDistribution.length > 0) {
              return (
                <Card key={fieldId}>
                  <CardHeader>
                    <CardTitle className="text-lg">{field.label}</CardTitle>
                    <p className="text-sm text-gray-600">
                      {intl.formatMessage(
                        { id: 'modules.forms.analytics.average', defaultMessage: 'Average: {value}' },
                        { value: stats.averageRating }
                      )} ({intl.formatMessage(
                        { id: 'modules.forms.analytics.responseCountPlain', defaultMessage: '{count} responses' },
                        { count: stats.responseCount }
                      )})
                    </p>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={stats.ratingDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="rating" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              );
            }

            // Show basic stats for other fields
            return (
              <Card key={fieldId}>
                <CardHeader>
                  <CardTitle className="text-lg">{field.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.responseCount', defaultMessage: 'Response Count:' })}</span>
                      <span className="font-medium">{stats.responseCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.responseRate', defaultMessage: 'Response Rate:' })}</span>
                      <span className="font-medium">{stats.responseRate}%</span>
                    </div>
                    {stats.average !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.averageLabel', defaultMessage: 'Average:' })}</span>
                        <span className="font-medium">{stats.average}</span>
                      </div>
                    )}
                    {stats.averageLength !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.avgLength', defaultMessage: 'Avg. Length:' })}</span>
                        <span className="font-medium">
                          {intl.formatMessage(
                            { id: 'modules.forms.analytics.chars', defaultMessage: '{value} chars' },
                            { value: stats.averageLength }
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!analytics?.fieldStats && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'modules.forms.analytics.noData', defaultMessage: 'No analytics data yet' })}</h3>
            <p className="text-gray-600">{intl.formatMessage({ id: 'modules.forms.analytics.noDataDescription', defaultMessage: 'Analytics will appear once responses are submitted' })}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
