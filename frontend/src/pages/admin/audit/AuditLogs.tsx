/**
 * Audit Logs Component
 * Interface for viewing and filtering system audit logs
 */

import React, { useState, useEffect } from 'react';
import {
  Filter,
  Calendar,
  User,
  Activity,
  Database,
  FileText,
  Settings,
  Globe,
  Download,
  RefreshCw,
  Clock,
  MapPin,
  Monitor,
  CheckCircle,
  XCircle,
  Info,
  Upload,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { Avatar, AvatarFallback } from '../../../components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type { AuditLog, AuditLogFilters, PaginatedResponse } from '@/lib/api/admin-api';
import { formatDistanceToNow, format } from 'date-fns';

interface AuditLogDetailsDialogProps {
  log: AuditLog | null;
  open: boolean;
  onClose: () => void;
}

const AuditLogDetailsDialog: React.FC<AuditLogDetailsDialogProps> = ({ log, open, onClose }) => {
  if (!log) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Detailed information about this audit log entry
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium mb-2">Action</h4>
              <div className="flex items-center gap-2">
                {getActionIcon(log.action)}
                <span className="font-mono text-sm">{log.action}</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Resource</h4>
              <div className="flex items-center gap-2">
                {getResourceIcon(log.resource)}
                <span className="font-mono text-sm">{log.resource}</span>
              </div>
            </div>
          </div>

          {log.resourceId && (
            <div>
              <h4 className="font-medium mb-2">Resource ID</h4>
              <code className="bg-muted px-2 py-1 rounded text-sm">{log.resourceId}</code>
            </div>
          )}

          {/* User Information */}
          {log.user && (
            <div>
              <h4 className="font-medium mb-2">User</h4>
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {log.user.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{log.user.name}</p>
                  <p className="text-sm text-muted-foreground">{log.user.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {log.user.id}</p>
                </div>
              </div>
            </div>
          )}

          {/* Technical Details */}
          <div className="space-y-3">
            <h4 className="font-medium">Technical Details</h4>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Timestamp:</span>
                <span>{format(new Date(log.timestamp), 'PPpp')}</span>
              </div>
              {log.ipAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IP Address:</span>
                  <code className="bg-muted px-2 py-1 rounded">{log.ipAddress}</code>
                </div>
              )}
              {log.userAgent && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">User Agent:</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs break-all">
                    {log.userAgent}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Additional Data</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<PaginatedResponse<AuditLog> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 50,
  });

  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchAuditLogs();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.action, filters.resource, filters.userId, filters.startDate, filters.endDate]);

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await adminService.getAuditLogs({
        ...filters,
        page: currentPage,
      });
      setLogs(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch audit logs',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // This would typically generate and download an export file
      toast({
        title: 'Export Started',
        description: 'Your audit log export is being prepared',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export audit logs',
        variant: 'destructive',
      });
    }
  };

  const clearFilters = () => {
    setFilters({
      page: 1,
      limit: 50,
    });
  };

  if (loading && !logs) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-muted-foreground">
            Monitor system activities and user actions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchAuditLogs}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.pagination?.total || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs?.data.filter(log => 
                new Date(log.timestamp).toDateString() === new Date().toDateString()
              ).length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users Active</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs?.data.map(log => log.userId).filter(Boolean)).size || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resources</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(logs?.data.map(log => log.resource)).size || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Action</label>
              <Select
                value={filters.action || ''}
                onValueChange={(value) => setFilters({ ...filters, action: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Actions</SelectItem>
                  <SelectItem value="create">Create</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="update">Update</SelectItem>
                  <SelectItem value="delete">Delete</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="upload">Upload</SelectItem>
                  <SelectItem value="download">Download</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Resource</label>
              <Select
                value={filters.resource || ''}
                onValueChange={(value) => setFilters({ ...filters, resource: value || undefined })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Resources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Resources</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                  <SelectItem value="file">File</SelectItem>
                  <SelectItem value="blog_post">Blog Post</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User ID</label>
              <Input
                value={filters.userId || ''}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value || undefined })}
                placeholder="Enter user ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value || undefined })}
              />
            </div>
          </div>

          {(filters.action || filters.resource || filters.userId || filters.startDate || filters.endDate) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Active filters applied
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            Chronological record of system activities and user actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : logs?.data.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No audit logs found</h3>
              <p className="text-muted-foreground">
                {Object.values(filters).some(v => v)
                  ? 'Try adjusting your filter criteria.'
                  : 'No audit logs have been recorded yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.data.map((log) => (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(log.timestamp), 'MMM dd, HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {log.user.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{log.user.name}</p>
                            <p className="text-xs text-muted-foreground">{log.user.email}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-muted-foreground">System</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <Badge variant="outline" className="font-mono">
                          {log.action}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getResourceIcon(log.resource)}
                        <span className="font-mono text-sm">{log.resource}</span>
                        {log.resourceId && (
                          <code className="bg-muted px-1 py-0.5 rounded text-xs">
                            {log.resourceId.substring(0, 8)}...
                          </code>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {log.ipAddress ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <code className="text-sm">{log.ipAddress}</code>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailsDialog(true);
                        }}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {logs && logs.pagination && logs.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {logs.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === logs.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Audit Log Details Dialog */}
      <AuditLogDetailsDialog
        log={selectedLog}
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedLog(null);
        }}
      />
    </div>
  );
};

// Helper functions for icons
const getActionIcon = (action: string) => {
  switch (action.toLowerCase()) {
    case 'create':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'read':
      return <Info className="h-4 w-4 text-blue-600" />;
    case 'update':
      return <Settings className="h-4 w-4 text-orange-600" />;
    case 'delete':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'login':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'logout':
      return <XCircle className="h-4 w-4 text-gray-600" />;
    case 'upload':
      return <Upload className="h-4 w-4 text-blue-600" />;
    case 'download':
      return <Download className="h-4 w-4 text-blue-600" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" />;
  }
};

const getResourceIcon = (resource: string) => {
  switch (resource.toLowerCase()) {
    case 'user':
      return <User className="h-4 w-4 text-muted-foreground" />;
    case 'organization':
      return <Globe className="h-4 w-4 text-muted-foreground" />;
    case 'workspace':
      return <Globe className="h-4 w-4 text-muted-foreground" />;
    case 'project':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'file':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'blog_post':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'settings':
      return <Settings className="h-4 w-4 text-muted-foreground" />;
    case 'system':
      return <Monitor className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Database className="h-4 w-4 text-muted-foreground" />;
  }
};

export default AuditLogs;