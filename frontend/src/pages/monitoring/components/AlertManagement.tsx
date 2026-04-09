/**
 * Alert Management System
 * Real-time alerts, notifications, and alert rule configuration
 */

import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Bell,
  Plus,
  Eye,
  Clock,
  Mail,
  Slack,
  Webhook,
  Search,
  AlertCircle,
  Info,
  Shield,
  Server,
  Activity,
  Globe,
  User
} from 'lucide-react';

import type { 
  MonitoringAlert, 
  AlertRule
} from '@/lib/api/monitoring-api';

interface AlertManagementProps {
  alerts: MonitoringAlert[];
  workspaceId: string;
  onAcknowledgeAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onCreateRule: (rule: Partial<AlertRule>) => void;
  onUpdateRule: (rule: AlertRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

// Alert severity configuration
const ALERT_SEVERITY_CONFIG = {
  critical: { 
    color: 'red', 
    bg: 'bg-red-50', 
    border: 'border-red-200', 
    text: 'text-red-800',
    icon: XCircle,
    badge: 'bg-red-100'
  },
  high: { 
    color: 'orange', 
    bg: 'bg-orange-50', 
    border: 'border-orange-200', 
    text: 'text-orange-800',
    icon: AlertTriangle,
    badge: 'bg-orange-100'
  },
  medium: { 
    color: 'yellow', 
    bg: 'bg-yellow-50', 
    border: 'border-yellow-200', 
    text: 'text-yellow-800',
    icon: AlertCircle,
    badge: 'bg-yellow-100'
  },
  low: { 
    color: 'blue', 
    bg: 'bg-blue-50', 
    border: 'border-blue-200', 
    text: 'text-blue-800',
    icon: Info,
    badge: 'bg-blue-100'
  },
  info: { 
    color: 'gray', 
    bg: 'bg-gray-50', 
    border: 'border-gray-200', 
    text: 'text-gray-800',
    icon: Info,
    badge: 'bg-gray-100'
  }
};

// Alert type configuration
const ALERT_TYPE_CONFIG = {
  system: { icon: Server, label: 'System', color: 'blue' },
  application: { icon: Activity, label: 'Application', color: 'green' },
  user: { icon: User, label: 'User', color: 'purple' },
  api: { icon: Globe, label: 'API', color: 'orange' },
  security: { icon: Shield, label: 'Security', color: 'red' }
};

// Alert Card Component
const AlertCard: React.FC<{
  alert: MonitoringAlert;
  onAcknowledge: (alertId: string) => void;
  onResolve: (alertId: string) => void;
}> = ({ alert, onAcknowledge, onResolve }) => {
  const severityConfig = ALERT_SEVERITY_CONFIG[alert.severity];
  const typeConfig = ALERT_TYPE_CONFIG[(alert.type as keyof typeof ALERT_TYPE_CONFIG) || 'system']; // Default to 'system' if type is undefined
  const SeverityIcon = severityConfig.icon;
  const TypeIcon = typeConfig.icon;

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - alertTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className={`rounded-lg border p-4 transition-all hover:shadow-md ${severityConfig.bg} ${severityConfig.border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${severityConfig.badge} ${severityConfig.text}`}>
            <SeverityIcon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h4 className="font-semibold text-gray-900">{alert.title}</h4>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${severityConfig.badge} ${severityConfig.text}`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${typeConfig.color}-100 text-${typeConfig.color}-800`}>
                <TypeIcon className="w-3 h-3 mr-1" />
                {typeConfig.label}
              </span>
            </div>
            <p className="text-gray-700 text-sm mb-2">{alert.description}</p>
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatTimeAgo(alert.createdAt)}
              </span>
              <span>Metric: {alert.metric}</span>
              <span>Threshold: {alert.threshold}</span>
              <span>Current: {alert.currentValue}</span>
            </div>
            {(alert.tags?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {alert.tags?.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-800">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          {alert.status === 'active' && (
            <>
              <button
                onClick={() => onAcknowledge(alert.id)}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                title="Acknowledge alert"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => onResolve(alert.id)}
                className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                title="Resolve alert"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            </>
          )}
          {alert.status === 'acknowledged' && (
            <button
              onClick={() => onResolve(alert.id)}
              className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
              title="Resolve alert"
            >
              <CheckCircle className="w-4 h-4" />
            </button>
          )}
          {alert.status === 'resolved' && (
            <span className="text-green-600 text-xs font-medium">RESOLVED</span>
          )}
        </div>
      </div>

      {(alert.affectedComponents?.length || 0) > 0 && (
        <div className="border-t pt-2">
          <span className="text-xs text-gray-500">Affected Components:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {alert.affectedComponents?.map((component, index) => (
              <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
                {component}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Alert Rule Form Component
const AlertRuleForm: React.FC<{
  rule?: AlertRule | null;
  onSave: (rule: Partial<AlertRule>) => void;
  onCancel: () => void;
}> = ({ rule, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    metric: rule?.metric || '',
    condition: rule?.condition || 'greater_than' as const,
    threshold: rule?.threshold || 0,
    duration: rule?.duration || 300,
    severity: rule?.severity || 'medium' as const,
    enabled: rule?.enabled !== undefined ? rule.enabled : true,
    notifications: {
      email: rule?.notifications?.email !== undefined ? rule.notifications.email : true,
      slack: rule?.notifications?.slack !== undefined ? rule.notifications.slack : false,
      webhook: (typeof rule?.notifications?.webhook === 'string' ? rule.notifications.webhook : '') || ''
    }
  });

  const metrics = [
    'system.cpu.usage',
    'system.memory.usage',
    'system.disk.usage',
    'application.response_time',
    'application.error_rate',
    'api.response_time',
    'api.error_rate',
    'security.failed_logins'
  ];

  const conditions = [
    { value: 'greater_than', label: 'Greater than' },
    { value: 'less_than', label: 'Less than' },
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not equals' }
  ];

  const severities = [
    { value: 'low', label: 'Low', color: 'blue' },
    { value: 'medium', label: 'Medium', color: 'yellow' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as unknown as Partial<AlertRule>);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">
        {rule ? 'Edit Alert Rule' : 'Create Alert Rule'}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rule Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="High CPU Usage Alert"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Metric
            </label>
            <select
              required
              value={formData.metric}
              onChange={(e) => setFormData({ ...formData, metric: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Select metric</option>
              {metrics.map((metric) => (
                <option key={metric} value={metric}>
                  {metric}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            rows={3}
            placeholder="Alert when CPU usage exceeds threshold"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Condition
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              {conditions.map((condition) => (
                <option key={condition.value} value={condition.value}>
                  {condition.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Threshold
            </label>
            <input
              type="number"
              required
              value={formData.threshold}
              onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="80"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              required
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity
          </label>
          <div className="flex space-x-2">
            {severities.map((severity) => (
              <button
                key={severity.value}
                type="button"
                onClick={() => setFormData({ ...formData, severity: severity.value as any })}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  formData.severity === severity.value
                    ? `bg-${severity.color}-600 text-white`
                    : `bg-${severity.color}-100 text-${severity.color}-800 hover:bg-${severity.color}-200`
                }`}
              >
                {severity.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notifications
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.email}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, email: e.target.checked }
                })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Mail className="w-4 h-4 ml-2 mr-1 text-gray-500" />
              <span className="text-sm text-gray-700">Email notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications.slack}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, slack: e.target.checked }
                })}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Slack className="w-4 h-4 ml-2 mr-1 text-gray-500" />
              <span className="text-sm text-gray-700">Slack notifications</span>
            </label>
            <div className="flex items-center space-x-2">
              <Webhook className="w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={formData.notifications.webhook || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, webhook: e.target.value }
                })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://hooks.slack.com/..."
              />
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="enabled"
            checked={formData.enabled}
            onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="enabled" className="ml-2 text-sm text-gray-700">
            Enable this alert rule
          </label>
        </div>

        <div className="flex items-center space-x-3 pt-4 border-t">
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            {rule ? 'Update Rule' : 'Create Rule'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

// Main Alert Management Component
export const AlertManagement: React.FC<AlertManagementProps> = ({
  alerts,
  workspaceId: _workspaceId,
  onAcknowledgeAlert,
  onResolveAlert,
  onCreateRule,
  onUpdateRule,
  onDeleteRule: _onDeleteRule
}) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [_alertRules, _setAlertRules] = useState<AlertRule[]>([]);

  // Filter alerts based on status and search
  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = activeFilter === 'all' || alert.status === activeFilter || alert.severity === activeFilter;
    const matchesSearch = searchQuery === '' ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.metric?.toLowerCase() || '').includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  // Group alerts by severity for summary
  const alertSummary = alerts.reduce((acc, alert) => {
    acc[alert.severity] = (acc[alert.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleCreateRule = (rule: Partial<AlertRule>) => {
    onCreateRule(rule);
    setShowRuleForm(false);
  };

  const handleUpdateRule = (rule: Partial<AlertRule>) => {
    if (editingRule) {
      onUpdateRule({ ...editingRule, ...rule });
      setEditingRule(null);
      setShowRuleForm(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(ALERT_SEVERITY_CONFIG).map(([severity, config]) => (
          <div key={severity} className={`rounded-lg border p-4 ${config.bg} ${config.border}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {severity.charAt(0).toUpperCase() + severity.slice(1)}
                </p>
                <p className={`text-2xl font-bold ${config.text}`}>
                  {alertSummary[severity] || 0}
                </p>
              </div>
              <config.icon className={`w-6 h-6 ${config.text}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search alerts..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Filter */}
          <select
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Alerts</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
            <option value="critical">Critical</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowRuleForm(true)}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Alert Rule
          </button>
        </div>
      </div>

      {/* Alert Rule Form */}
      {showRuleForm && (
        <AlertRuleForm
          rule={editingRule}
          onSave={editingRule ? handleUpdateRule : handleCreateRule}
          onCancel={() => {
            setShowRuleForm(false);
            setEditingRule(null);
          }}
        />
      )}

      {/* Alerts List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">
            Active Alerts ({filteredAlerts.length})
          </h3>
          {alerts.some(a => a.status === 'active') && (
            <div className="flex items-center space-x-2 text-sm text-amber-600">
              <Bell className="w-4 h-4 animate-pulse" />
              <span>{alerts.filter(a => a.status === 'active').length} unresolved alerts</span>
            </div>
          )}
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No alerts found</p>
            <p className="text-sm">Your systems are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onAcknowledge={onAcknowledgeAlert}
                onResolve={onResolveAlert}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};