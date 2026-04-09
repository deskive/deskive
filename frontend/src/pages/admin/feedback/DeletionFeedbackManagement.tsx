/**
 * Deletion Feedback Management Component
 * Interface for managing account deletion exit survey feedback
 */

import React, { useState, useEffect } from 'react';
import {
  UserMinus,
  Search,
  RefreshCw,
  Filter,
  Eye,
  MoreHorizontal,
  TrendingDown,
  TrendingUp,
  Users,
  AlertTriangle,
  Bug,
  Lightbulb,
  HelpCircle,
  Clock,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { useToast } from '../../../hooks/use-toast';
import { api } from '@/lib/fetch';
import { formatDistanceToNow, format } from 'date-fns';

// Types
interface DeletionFeedback {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  reason: string;
  reasonDetails?: string;
  feedbackResponse?: string;
  wasRetained: boolean;
  deletedAccount: boolean;
  status: string;
  priority: string;
  adminNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  createdAt: string;
  updatedAt: string;
}

interface DeletionFeedbackStats {
  total: number;
  byReason: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  retainedCount: number;
  deletedCount: number;
  retentionRate: number;
}

// Reason configuration
const REASON_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  found_alternative: { icon: <Sparkles className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700', label: 'Found Alternative' },
  privacy_concerns: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-orange-100 text-orange-700', label: 'Privacy Concerns' },
  bugs_errors: { icon: <Bug className="h-3 w-3" />, color: 'bg-red-100 text-red-700', label: 'Bugs/Errors' },
  missing_features: { icon: <Lightbulb className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700', label: 'Missing Features' },
  too_complicated: { icon: <HelpCircle className="h-3 w-3" />, color: 'bg-teal-100 text-teal-700', label: 'Too Complicated' },
  not_using: { icon: <Clock className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700', label: 'Not Using' },
  other: { icon: <MoreHorizontal className="h-3 w-3" />, color: 'bg-gray-100 text-gray-700', label: 'Other' },
};

// Reason badge component
const ReasonBadge: React.FC<{ reason: string }> = ({ reason }) => {
  const config = REASON_CONFIG[reason] || REASON_CONFIG.other;
  return (
    <Badge variant="secondary" className={`${config.color} gap-1`}>
      {config.icon}
      {config.label}
    </Badge>
  );
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-700', label: 'Pending' },
    reviewed: { color: 'bg-blue-100 text-blue-700', label: 'Reviewed' },
    actioned: { color: 'bg-purple-100 text-purple-700', label: 'Actioned' },
    resolved: { color: 'bg-green-100 text-green-700', label: 'Resolved' },
  };
  const { color, label } = config[status] || config.pending;
  return <Badge variant="secondary" className={color}>{label}</Badge>;
};

// Priority badge component
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-100 text-gray-600', label: 'Low' },
    normal: { color: 'bg-blue-100 text-blue-600', label: 'Normal' },
    high: { color: 'bg-orange-100 text-orange-600', label: 'High' },
    urgent: { color: 'bg-red-100 text-red-600', label: 'Urgent' },
  };
  const { color, label } = config[priority] || config.normal;
  return <Badge variant="outline" className={color}>{label}</Badge>;
};

// Outcome badge component
const OutcomeBadge: React.FC<{ wasRetained: boolean; deletedAccount: boolean }> = ({ wasRetained, deletedAccount }) => {
  if (wasRetained) {
    return <Badge className="bg-green-100 text-green-700">Retained</Badge>;
  }
  if (deletedAccount) {
    return <Badge className="bg-red-100 text-red-700">Deleted</Badge>;
  }
  return <Badge variant="outline">Pending</Badge>;
};

// Detail Dialog
interface FeedbackDetailDialogProps {
  feedback: DeletionFeedback | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const FeedbackDetailDialog: React.FC<FeedbackDetailDialogProps> = ({ feedback, open, onClose, onUpdate }) => {
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (feedback) {
      setStatus(feedback.status);
      setPriority(feedback.priority);
      setAdminNotes(feedback.adminNotes || '');
    }
  }, [feedback]);

  const handleUpdate = async () => {
    if (!feedback) return;
    setUpdating(true);
    try {
      await api.patch(`/auth/deletion-feedback/${feedback.id}`, {
        status,
        priority,
        adminNotes,
      });
      toast({ title: 'Success', description: 'Feedback updated successfully' });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update feedback', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  if (!feedback) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 flex-wrap">
            <ReasonBadge reason={feedback.reason} />
            <StatusBadge status={feedback.status} />
            <PriorityBadge priority={feedback.priority} />
            <OutcomeBadge wasRetained={feedback.wasRetained} deletedAccount={feedback.deletedAccount} />
          </div>
          <DialogTitle className="text-xl mt-2">
            Deletion Feedback from {feedback.userName || feedback.userEmail}
          </DialogTitle>
          <DialogDescription>
            Submitted {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* User Info */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">User Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Email:</span> {feedback.userEmail}</div>
              <div><span className="text-muted-foreground">Name:</span> {feedback.userName || 'N/A'}</div>
              <div><span className="text-muted-foreground">User ID:</span> {feedback.userId}</div>
              <div><span className="text-muted-foreground">Outcome:</span> {feedback.deletedAccount ? 'Account Deleted' : feedback.wasRetained ? 'Retained' : 'Pending'}</div>
            </div>
          </div>

          {/* Reason Details */}
          {feedback.reasonDetails && (
            <div>
              <h4 className="font-medium mb-2">Reason Details</h4>
              <div className="bg-muted p-4 rounded-lg text-sm">
                {feedback.reasonDetails}
              </div>
            </div>
          )}

          {/* User Feedback */}
          {feedback.feedbackResponse && (
            <div>
              <h4 className="font-medium mb-2">User Feedback</h4>
              <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap">
                {feedback.feedbackResponse}
              </div>
            </div>
          )}

          {/* Admin Actions */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Admin Actions</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Status</label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="actioned">Actioned</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Priority</label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Admin Notes</label>
              <Textarea
                placeholder="Add notes about this feedback..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Review Info */}
          {feedback.reviewedAt && (
            <div className="text-sm text-muted-foreground">
              Last reviewed {format(new Date(feedback.reviewedAt), 'MMM d, yyyy h:mm a')}
              {feedback.reviewedBy && ` by ${feedback.reviewedBy}`}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleUpdate} disabled={updating}>
            {updating ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const DeletionFeedbackManagement: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<DeletionFeedback[]>([]);
  const [stats, setStats] = useState<DeletionFeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    status: '',
    reason: '',
    priority: '',
    wasRetained: '',
    deletedAccount: '',
    limit: 20,
    offset: 0,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<DeletionFeedback | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedback();
    loadStats();
  }, [filters]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== undefined) {
          params.append(key, String(value));
        }
      });

      const response = await api.get<{ data: DeletionFeedback[]; total: number }>(`/auth/deletion-feedback?${params.toString()}`);
      setFeedbackList(response.data || []);
      setTotal(response.total || 0);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load deletion feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get<DeletionFeedbackStats>('/auth/deletion-feedback/stats');
      setStats(response);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters({ ...filters, [key]: value, offset: 0 });
  };

  const handleViewFeedback = (feedback: DeletionFeedback) => {
    setSelectedFeedback(feedback);
    setDetailDialogOpen(true);
  };

  const handleRefresh = () => {
    loadFeedback();
    loadStats();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserMinus className="h-6 w-6" />
            Account Deletion Feedback
          </h1>
          <p className="text-muted-foreground">Review feedback from users who attempted to delete their accounts</p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Retained
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.retainedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <TrendingDown className="h-4 w-4 text-red-500" />
                Deleted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.deletedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Retention Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.retentionRate}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus?.pending || 0}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reason Breakdown */}
      {stats && stats.byReason && Object.keys(stats.byReason).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reasons Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byReason).map(([reason, count]) => (
                <div key={reason} className="flex items-center gap-2">
                  <ReasonBadge reason={reason} />
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <Select
              value={filters.reason || 'all'}
              onValueChange={(value) => handleFilterChange('reason', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Reasons</SelectItem>
                <SelectItem value="found_alternative">Found Alternative</SelectItem>
                <SelectItem value="privacy_concerns">Privacy Concerns</SelectItem>
                <SelectItem value="bugs_errors">Bugs/Errors</SelectItem>
                <SelectItem value="missing_features">Missing Features</SelectItem>
                <SelectItem value="too_complicated">Too Complicated</SelectItem>
                <SelectItem value="not_using">Not Using</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="actioned">Actioned</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => handleFilterChange('priority', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.deletedAccount || 'all'}
              onValueChange={(value) => handleFilterChange('deletedAccount', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outcomes</SelectItem>
                <SelectItem value="true">Deleted</SelectItem>
                <SelectItem value="false">Retained</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : feedbackList.length === 0 ? (
            <div className="text-center py-8">
              <UserMinus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No deletion feedback found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Outcome</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackList.map((feedback) => (
                    <TableRow key={feedback.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => handleViewFeedback(feedback)}>
                        <div>
                          <div className="font-medium">{feedback.userName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">{feedback.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <ReasonBadge reason={feedback.reason} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={feedback.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={feedback.priority} />
                      </TableCell>
                      <TableCell>
                        <OutcomeBadge wasRetained={feedback.wasRetained} deletedAccount={feedback.deletedAccount} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleViewFeedback(feedback)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {feedbackList.length} of {total} feedback
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.offset === 0}
                    onClick={() => setFilters({ ...filters, offset: Math.max(0, filters.offset - filters.limit) })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={filters.offset + filters.limit >= total}
                    onClick={() => setFilters({ ...filters, offset: filters.offset + filters.limit })}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <FeedbackDetailDialog
        feedback={selectedFeedback}
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        onUpdate={handleRefresh}
      />
    </div>
  );
};

export default DeletionFeedbackManagement;
