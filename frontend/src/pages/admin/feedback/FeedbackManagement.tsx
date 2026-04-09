/**
 * Feedback Management Component
 * Interface for managing user feedback, bugs, and feature requests
 */

import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Bug,
  Lightbulb,
  AlertTriangle,
  Sparkles,
  CheckCircle,
  Clock,
  MoreHorizontal,
  Eye,
  MessageCircle,
  Filter,
  RefreshCw,
  ExternalLink,
  Paperclip,
  Send,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Checkbox } from '../../../components/ui/checkbox';
import { useToast } from '../../../hooks/use-toast';
import { feedbackApi, type Feedback, type FeedbackFilters, type FeedbackResponse, type FeedbackStatus, type FeedbackPriority } from '@/lib/api/feedback-api';
import { formatDistanceToNow, format } from 'date-fns';

// Type badge component
const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const config: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
    bug: { icon: <Bug className="h-3 w-3" />, color: 'bg-red-100 text-red-700', label: 'Bug' },
    issue: { icon: <AlertTriangle className="h-3 w-3" />, color: 'bg-orange-100 text-orange-700', label: 'Issue' },
    improvement: { icon: <Lightbulb className="h-3 w-3" />, color: 'bg-blue-100 text-blue-700', label: 'Improvement' },
    feature_request: { icon: <Sparkles className="h-3 w-3" />, color: 'bg-purple-100 text-purple-700', label: 'Feature' },
  };
  const { icon, color, label } = config[type] || config.issue;
  return (
    <Badge variant="secondary" className={`${color} gap-1`}>
      {icon}
      {label}
    </Badge>
  );
};

// Status badge component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-gray-100 text-gray-700', label: 'Pending' },
    in_review: { color: 'bg-blue-100 text-blue-700', label: 'In Review' },
    in_progress: { color: 'bg-yellow-100 text-yellow-700', label: 'In Progress' },
    resolved: { color: 'bg-green-100 text-green-700', label: 'Resolved' },
    wont_fix: { color: 'bg-red-100 text-red-700', label: "Won't Fix" },
    duplicate: { color: 'bg-purple-100 text-purple-700', label: 'Duplicate' },
  };
  const { color, label } = config[status] || config.pending;
  return <Badge variant="secondary" className={color}>{label}</Badge>;
};

// Priority badge component
const PriorityBadge: React.FC<{ priority: string }> = ({ priority }) => {
  const config: Record<string, { color: string; label: string }> = {
    low: { color: 'bg-gray-100 text-gray-600', label: 'Low' },
    medium: { color: 'bg-blue-100 text-blue-600', label: 'Medium' },
    high: { color: 'bg-orange-100 text-orange-600', label: 'High' },
    critical: { color: 'bg-red-100 text-red-600', label: 'Critical' },
  };
  const { color, label } = config[priority] || config.medium;
  return <Badge variant="outline" className={color}>{label}</Badge>;
};

// Feedback Detail Dialog
interface FeedbackDetailDialogProps {
  feedback: Feedback | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const FeedbackDetailDialog: React.FC<FeedbackDetailDialogProps> = ({ feedback, open, onClose, onUpdate }) => {
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [newResponse, setNewResponse] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [statusChange, setStatusChange] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notifyUser, setNotifyUser] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (feedback && open) {
      loadResponses();
      setResolutionNotes(feedback.resolutionNotes || '');
    }
  }, [feedback, open]);

  const loadResponses = async () => {
    if (!feedback) return;
    setLoadingResponses(true);
    try {
      const data = await feedbackApi.getResponses(feedback.id);
      setResponses(data);
    } catch (error) {
      console.error('Failed to load responses:', error);
    } finally {
      setLoadingResponses(false);
    }
  };

  const handleSendResponse = async () => {
    if (!feedback || !newResponse.trim()) return;
    setSending(true);
    try {
      await feedbackApi.addResponse(feedback.id, {
        content: newResponse,
        isInternal,
        statusChange: statusChange as FeedbackStatus || undefined,
      });
      toast({ title: 'Success', description: 'Response added successfully' });
      setNewResponse('');
      setStatusChange('');
      setIsInternal(false);
      loadResponses();
      onUpdate();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to add response', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: FeedbackStatus) => {
    if (!feedback) return;
    setUpdating(true);
    try {
      await feedbackApi.updateFeedback(feedback.id, { status });
      toast({ title: 'Success', description: 'Status updated successfully' });
      onUpdate();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePriority = async (priority: FeedbackPriority) => {
    if (!feedback) return;
    setUpdating(true);
    try {
      await feedbackApi.updateFeedback(feedback.id, { priority });
      toast({ title: 'Success', description: 'Priority updated successfully' });
      onUpdate();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update priority', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  const handleResolve = async () => {
    if (!feedback) return;
    setUpdating(true);
    try {
      await feedbackApi.resolveFeedback(feedback.id, {
        resolutionNotes,
        notifyUser,
      });
      toast({ title: 'Success', description: 'Feedback resolved successfully' });
      onUpdate();
      onClose();
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to resolve feedback', variant: 'destructive' });
    } finally {
      setUpdating(false);
    }
  };

  if (!feedback) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <TypeBadge type={feedback.type} />
            <StatusBadge status={feedback.status} />
            <PriorityBadge priority={feedback.priority} />
          </div>
          <DialogTitle className="text-xl mt-2">{feedback.title}</DialogTitle>
          <DialogDescription>
            Submitted {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
            {feedback.user && ` by ${feedback.user.email}`}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="responses">Responses ({responses.length})</TabsTrigger>
            <TabsTrigger value="resolve">Resolve</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {/* Description */}
            <div>
              <h4 className="font-medium mb-2">Description</h4>
              <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap">
                {feedback.description}
              </div>
            </div>

            {/* Attachments */}
            {feedback.attachments && feedback.attachments.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Attachments</h4>
                <div className="flex flex-wrap gap-2">
                  {feedback.attachments.map((attachment, index) => (
                    <a
                      key={index}
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg hover:bg-muted/80"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="text-sm">{attachment.name}</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Device Info */}
            {feedback.deviceInfo && Object.keys(feedback.deviceInfo).length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Device Information</h4>
                <div className="bg-muted p-4 rounded-lg text-sm space-y-1">
                  {feedback.appVersion && <div>App Version: {feedback.appVersion}</div>}
                  {feedback.deviceInfo.platform && <div>Platform: {feedback.deviceInfo.platform}</div>}
                  {feedback.deviceInfo.osVersion && <div>OS Version: {feedback.deviceInfo.osVersion}</div>}
                  {feedback.deviceInfo.deviceModel && <div>Device: {feedback.deviceInfo.deviceModel}</div>}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-4">
              <div>
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={feedback.status}
                  onValueChange={(value) => handleUpdateStatus(value as FeedbackStatus)}
                  disabled={updating}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_review">In Review</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="wont_fix">Won't Fix</SelectItem>
                    <SelectItem value="duplicate">Duplicate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Update Priority</label>
                <Select
                  value={feedback.priority}
                  onValueChange={(value) => handleUpdatePriority(value as FeedbackPriority)}
                  disabled={updating}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="responses" className="space-y-4">
            {/* Responses List */}
            <div className="space-y-4 max-h-60 overflow-y-auto">
              {loadingResponses ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner />
                </div>
              ) : responses.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No responses yet</p>
              ) : (
                responses.map((response) => (
                  <div
                    key={response.id}
                    className={`p-4 rounded-lg ${response.isInternal ? 'bg-yellow-50 border border-yellow-200' : 'bg-muted'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">Admin</span>
                        {response.isInternal && (
                          <Badge variant="outline" className="text-yellow-600">Internal</Badge>
                        )}
                        {response.statusChange && (
                          <StatusBadge status={response.statusChange} />
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(response.createdAt), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{response.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Add Response */}
            <div className="border-t pt-4 space-y-3">
              <Textarea
                placeholder="Write a response..."
                value={newResponse}
                onChange={(e) => setNewResponse(e.target.value)}
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="internal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setIsInternal(checked as boolean)}
                    />
                    <label htmlFor="internal" className="text-sm">Internal note</label>
                  </div>
                  <Select value={statusChange} onValueChange={setStatusChange}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Change status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No change</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleSendResponse} disabled={sending || !newResponse.trim()}>
                  {sending ? <LoadingSpinner size="sm" /> : <><Send className="h-4 w-4 mr-2" /> Send</>}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="resolve" className="space-y-4">
            <div>
              <label className="text-sm font-medium">Resolution Notes</label>
              <Textarea
                placeholder="Explain how this feedback was addressed..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="notify"
                checked={notifyUser}
                onCheckedChange={(checked) => setNotifyUser(checked as boolean)}
              />
              <label htmlFor="notify" className="text-sm">Notify user about resolution</label>
            </div>
            <Button onClick={handleResolve} disabled={updating} className="w-full">
              {updating ? <LoadingSpinner size="sm" /> : <><CheckCircle className="h-4 w-4 mr-2" /> Mark as Resolved</>}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

// Main Component
const FeedbackManagement: React.FC = () => {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<FeedbackFilters>({
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFeedback();
  }, [filters]);

  const loadFeedback = async () => {
    setLoading(true);
    try {
      const response = await feedbackApi.getAllFeedback(filters);
      setFeedbackList(response.data);
      setTotal(response.total);
      setPage(response.page);
      setTotalPages(response.totalPages);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load feedback',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters({ ...filters, search: searchTerm, page: 1 });
  };

  const handleFilterChange = (key: keyof FeedbackFilters, value: string) => {
    setFilters({ ...filters, [key]: value || undefined, page: 1 });
  };

  const handleViewFeedback = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setDetailDialogOpen(true);
  };

  const stats = {
    total: total,
    pending: feedbackList.filter(f => f.status === 'pending').length,
    inProgress: feedbackList.filter(f => f.status === 'in_progress' || f.status === 'in_review').length,
    resolved: feedbackList.filter(f => f.status === 'resolved').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground">Manage user feedback, bug reports, and feature requests</p>
        </div>
        <Button onClick={loadFeedback} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filters.type || 'all'}
              onValueChange={(value) => handleFilterChange('type', value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="bug">Bug</SelectItem>
                <SelectItem value="issue">Issue</SelectItem>
                <SelectItem value="improvement">Improvement</SelectItem>
                <SelectItem value="feature_request">Feature</SelectItem>
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
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="wont_fix">Won't Fix</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
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
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
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
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No feedback found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feedback</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedbackList.map((feedback) => (
                    <TableRow key={feedback.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell onClick={() => handleViewFeedback(feedback)}>
                        <div className="max-w-md">
                          <div className="font-medium truncate">{feedback.title}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {feedback.description.substring(0, 100)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={feedback.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={feedback.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={feedback.priority} />
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(feedback.createdAt), { addSuffix: true })}
                        </div>
                        {feedback.attachments && feedback.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            {feedback.attachments.length}
                          </div>
                        )}
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
                            <DropdownMenuItem onClick={() => handleViewFeedback(feedback)}>
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Add Response
                            </DropdownMenuItem>
                            {feedback.status !== 'resolved' && (
                              <DropdownMenuItem onClick={() => handleViewFeedback(feedback)}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark Resolved
                              </DropdownMenuItem>
                            )}
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
                    disabled={page <= 1}
                    onClick={() => setFilters({ ...filters, page: page - 1 })}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setFilters({ ...filters, page: page + 1 })}
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
        onUpdate={loadFeedback}
      />
    </div>
  );
};

export default FeedbackManagement;
