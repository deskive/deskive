import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useWebSocket } from '@/contexts/WebSocketContext';
import {
  approvalsApi,
  type RequestType,
  type ApprovalRequest,
  type ApprovalStats,
  type Comment,
  type CustomFieldConfig,
  RequestStatus,
  RequestPriority,
  ApproverStatus,
  FieldType,
  type CreateApprovalRequestDto,
} from '@/lib/api/approvals-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Plus, ArrowLeft, Clock, CheckCircle, XCircle, AlertCircle, ClipboardCheck, FileText, Users, ChevronRight, Send, MessageSquare, Calendar, Trash2, Ban, Settings2, GripVertical, X, Paperclip, Upload, File, Sheet, ExternalLink, Link2, Unlink } from 'lucide-react';
import { storageApi } from '@/lib/api/storage-api';
import { googleSheetsApi, type GoogleSheetsConnection } from '@/lib/api/google-sheets-api';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';

// Helper Components
function StatusBadge({ status }: { status: RequestStatus }) {
  const { formatMessage } = useIntl();
  const config = {
    [RequestStatus.PENDING]: { label: formatMessage({ id: 'approvals.status.pending', defaultMessage: 'Pending' }), icon: Clock, className: 'text-yellow-600 border-yellow-600' },
    [RequestStatus.APPROVED]: { label: formatMessage({ id: 'approvals.status.approved', defaultMessage: 'Approved' }), icon: CheckCircle, className: 'text-green-600 border-green-600' },
    [RequestStatus.REJECTED]: { label: formatMessage({ id: 'approvals.status.rejected', defaultMessage: 'Rejected' }), icon: XCircle, className: 'text-red-600 border-red-600' },
    [RequestStatus.CANCELLED]: { label: formatMessage({ id: 'approvals.status.cancelled', defaultMessage: 'Cancelled' }), icon: AlertCircle, className: 'text-gray-600 border-gray-600' },
  }[status];
  const Icon = config.icon;
  return <Badge variant="outline" className={cn('gap-1', config.className)}><Icon className="w-3 h-3" />{config.label}</Badge>;
}

function PriorityBadge({ priority }: { priority: RequestPriority }) {
  const { formatMessage } = useIntl();
  const config = {
    [RequestPriority.LOW]: { label: formatMessage({ id: 'approvals.priority.low', defaultMessage: 'Low' }), className: 'bg-gray-100 text-gray-700' },
    [RequestPriority.NORMAL]: { label: formatMessage({ id: 'approvals.priority.normal', defaultMessage: 'Normal' }), className: 'bg-blue-100 text-blue-700' },
    [RequestPriority.HIGH]: { label: formatMessage({ id: 'approvals.priority.high', defaultMessage: 'High' }), className: 'bg-orange-100 text-orange-700' },
    [RequestPriority.URGENT]: { label: formatMessage({ id: 'approvals.priority.urgent', defaultMessage: 'Urgent' }), className: 'bg-red-100 text-red-700' },
  }[priority];
  return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
}

function ApproverStatusBadge({ status }: { status: ApproverStatus }) {
  const { formatMessage } = useIntl();
  const config = {
    [ApproverStatus.PENDING]: { label: formatMessage({ id: 'approvals.approverStatus.pending', defaultMessage: 'Pending' }), className: 'bg-yellow-100 text-yellow-700' },
    [ApproverStatus.APPROVED]: { label: formatMessage({ id: 'approvals.approverStatus.approved', defaultMessage: 'Approved' }), className: 'bg-green-100 text-green-700' },
    [ApproverStatus.REJECTED]: { label: formatMessage({ id: 'approvals.approverStatus.rejected', defaultMessage: 'Rejected' }), className: 'bg-red-100 text-red-700' },
  }[status];
  return <Badge variant="secondary" className={config.className}>{config.label}</Badge>;
}

// Main List
function ApprovalsList() {
  const { formatMessage } = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members } = useWorkspace();
  const { on, off, isConnected } = useWebSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [activeTab, setActiveTab] = useState('all');

  // Google Sheets integration state
  const [sheetsConnection, setSheetsConnection] = useState<GoogleSheetsConnection | null>(null);
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [connectingSheets, setConnectingSheets] = useState(false);

  // Check if current user is owner or admin
  const isOwnerOrAdmin = useMemo(() => {
    const currentUserMembership = members.find(m => m.user_id === user?.id);
    return currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
  }, [members, user?.id]);

  useEffect(() => {
    if (workspaceId) loadData();
  }, [workspaceId]);

  // WebSocket listeners for real-time updates on the list
  useEffect(() => {
    if (!isConnected || !workspaceId) return;

    // Handle status update events - update the request in the list
    const handleStatusUpdate = (data: any) => {
      console.log('[WebSocket] ApprovalsList received approval:status_updated', data);
      if (data.workspaceId === workspaceId) {
        // Update the request status in the list
        setRequests(prevRequests =>
          prevRequests.map(req =>
            req.id === data.requestId
              ? { ...req, status: data.status }
              : req
          )
        );
        // Reload stats to update counts
        approvalsApi.getStats(workspaceId).then(setStats).catch(console.error);
      }
    };

    // Handle request deleted events - remove from list
    const handleRequestDeleted = (data: any) => {
      console.log('[WebSocket] ApprovalsList received approval:request_deleted', data);
      if (data.workspaceId === workspaceId) {
        // Remove the deleted request from the list
        setRequests(prevRequests => prevRequests.filter(req => req.id !== data.requestId));
        // Reload stats to update counts
        approvalsApi.getStats(workspaceId).then(setStats).catch(console.error);
        toast.info(formatMessage({ id: 'approvals.detail.websocket.requestDeleted', defaultMessage: 'Request "{title}" was deleted' }, { title: data.title }));
      }
    };

    // Handle new request created events - add to list
    const handleRequestCreated = (data: any) => {
      console.log('[WebSocket] ApprovalsList received approval:request_created', data);
      if (data.workspaceId === workspaceId && data.request) {
        // Add the new request to the beginning of the list
        setRequests(prevRequests => {
          // Check if request already exists to avoid duplicates
          if (prevRequests.some(req => req.id === data.request.id)) {
            return prevRequests;
          }
          return [data.request, ...prevRequests];
        });
        // Reload stats to update counts
        approvalsApi.getStats(workspaceId).then(setStats).catch(console.error);
        toast.success(formatMessage({ id: 'approvals.detail.websocket.newRequest', defaultMessage: 'New approval request: "{title}"' }, { title: data.request.title }));
      }
    };

    // Subscribe to events
    on('approval:status_updated', handleStatusUpdate);
    on('approval:request_deleted', handleRequestDeleted);
    on('approval:request_created', handleRequestCreated);

    // Cleanup
    return () => {
      off('approval:status_updated', handleStatusUpdate);
      off('approval:request_deleted', handleRequestDeleted);
      off('approval:request_created', handleRequestCreated);
    };
  }, [on, off, isConnected, workspaceId]);

  // Load Google Sheets connection when user is owner/admin
  useEffect(() => {
    if (workspaceId && isOwnerOrAdmin) {
      loadSheetsConnection();
    }
  }, [workspaceId, isOwnerOrAdmin]);

  const loadData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [statsData, requestsData, typesData] = await Promise.all([
        approvalsApi.getStats(workspaceId),
        approvalsApi.getRequests(workspaceId),
        approvalsApi.getRequestTypes(workspaceId),
      ]);
      setStats(statsData);
      setRequests(requestsData.requests);
      setRequestTypes(typesData);
    } catch (error) {
      console.error('Failed to load:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSheetsConnection = async () => {
    if (!workspaceId) return;
    try {
      setSheetsLoading(true);
      const connection = await googleSheetsApi.getConnection(workspaceId);
      setSheetsConnection(connection);
    } catch (error) {
      console.error('Failed to load Google Sheets connection:', error);
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleConnectSheets = async () => {
    if (!workspaceId) return;
    try {
      setConnectingSheets(true);
      const returnUrl = window.location.href;
      const { authorizationUrl } = await googleSheetsApi.connect(workspaceId, returnUrl);
      window.location.href = authorizationUrl;
    } catch (error) {
      console.error('Failed to initiate Google Sheets connection:', error);
      toast.error(formatMessage({ id: 'approvals.googleSheets.connectFailed', defaultMessage: 'Failed to connect Google Sheets' }));
      setConnectingSheets(false);
    }
  };

  const handleDisconnectSheets = async () => {
    if (!workspaceId) return;
    try {
      setSheetsLoading(true);
      await googleSheetsApi.disconnect(workspaceId);
      setSheetsConnection(null);
      toast.success(formatMessage({ id: 'approvals.googleSheets.disconnected', defaultMessage: 'Google Sheets disconnected' }));
    } catch (error) {
      console.error('Failed to disconnect Google Sheets:', error);
      toast.error(formatMessage({ id: 'approvals.googleSheets.disconnectFailed', defaultMessage: 'Failed to disconnect Google Sheets' }));
    } finally {
      setSheetsLoading(false);
    }
  };

  // For regular members: show requests they created OR where they're an approver
  // For owners/admins: show all requests
  const filteredRequests = requests.filter((r) => {
    // First filter by ownership/approver for non-admin/owner members
    if (!isOwnerOrAdmin) {
      const isRequester = r.requesterId === user?.id;
      const isApprover = r.approvers?.some(a => a.approverId === user?.id);
      if (!isRequester && !isApprover) {
        return false;
      }
    }
    // Then filter by status tab
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return r.status === RequestStatus.PENDING;
    if (activeTab === 'approved') return r.status === RequestStatus.APPROVED;
    if (activeTab === 'rejected') return r.status === RequestStatus.REJECTED;
    return true;
  });

  if (loading) {
    return (
      <div className="p-6">
        <Skeleton className="w-48 h-6 mb-6" />
        {isOwnerOrAdmin && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
        )}
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${workspaceId}/more`)}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{formatMessage({ id: 'approvals.title', defaultMessage: 'Request & Approval' })}</h1>
              <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.subtitle', defaultMessage: 'Manage approval workflows' })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isOwnerOrAdmin && (
              <Button variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/types`)}><Settings2 className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.manageTypes', defaultMessage: 'Manage Types' })}</Button>
            )}
            <Button onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/new`)}><Plus className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.newRequest', defaultMessage: 'New Request' })}</Button>
          </div>
        </div>

        {/* Stats section - only visible to owners/admins */}
        {isOwnerOrAdmin && stats && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><ClipboardCheck className="w-5 h-5 text-primary" /></div><div><p className="text-2xl font-bold">{stats.totalRequests}</p><p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.stats.total', defaultMessage: 'Total' })}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-100"><Clock className="w-5 h-5 text-yellow-600" /></div><div><p className="text-2xl font-bold">{stats.pendingRequests}</p><p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.stats.pending', defaultMessage: 'Pending' })}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-orange-100"><AlertCircle className="w-5 h-5 text-orange-600" /></div><div><p className="text-2xl font-bold">{stats.pendingMyApproval}</p><p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.stats.awaitingMyApproval', defaultMessage: 'Awaiting My Approval' })}</p></div></CardContent></Card>
            <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-green-100"><CheckCircle className="w-5 h-5 text-green-600" /></div><div><p className="text-2xl font-bold">{stats.approvedRequests}</p><p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.stats.approved', defaultMessage: 'Approved' })}</p></div></CardContent></Card>
          </div>
        )}

        {/* Google Sheets Integration - only visible to owners/admins */}
        {isOwnerOrAdmin && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Sheet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{formatMessage({ id: 'approvals.googleSheets.title', defaultMessage: 'Google Sheets Integration' })}</h3>
                    {sheetsLoading ? (
                      <p className="text-xs text-muted-foreground">{formatMessage({ id: 'common.loading', defaultMessage: 'Loading...' })}</p>
                    ) : sheetsConnection?.isActive ? (
                      <p className="text-xs text-muted-foreground">
                        {formatMessage({ id: 'approvals.googleSheets.connected', defaultMessage: 'Connected as {email}' }, { email: sheetsConnection.googleEmail || sheetsConnection.googleName || 'Google Account' })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {formatMessage({ id: 'approvals.googleSheets.notConnected', defaultMessage: 'Auto-sync requests to Google Sheets when submitted' })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sheetsLoading ? (
                    <Button variant="outline" size="sm" disabled>
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </Button>
                  ) : sheetsConnection?.isActive ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnectSheets}
                        className="text-destructive hover:text-destructive"
                      >
                        <Unlink className="w-4 h-4 mr-1" />
                        {formatMessage({ id: 'approvals.googleSheets.disconnect', defaultMessage: 'Disconnect' })}
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectSheets}
                      disabled={connectingSheets}
                    >
                      {connectingSheets ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Link2 className="w-4 h-4 mr-1" />
                      )}
                      {formatMessage({ id: 'approvals.googleSheets.connect', defaultMessage: 'Connect Google Sheets' })}
                    </Button>
                  )}
                </div>
              </div>
              {sheetsConnection?.isActive && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {formatMessage({ id: 'approvals.googleSheets.description', defaultMessage: 'When a new request is submitted, it will automatically be added to a Google Sheet named "Deskive Approvals". Each request type will have its own sheet tab.' })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isOwnerOrAdmin && requestTypes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase">{formatMessage({ id: 'approvals.requestTypes', defaultMessage: 'Request Types' })}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/types`)}>{formatMessage({ id: 'approvals.manageTypes', defaultMessage: 'Manage Types' })}</Button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {requestTypes.slice(0, 3).map((type) => (
                <Card key={type.id} className="hover:border-primary/50 cursor-pointer" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/new?typeId=${type.id}`)}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}20` }}><FileText className="w-5 h-5" style={{ color: type.color }} /></div>
                    <div className="flex-1"><h3 className="font-semibold text-sm">{type.name}</h3><p className="text-xs text-muted-foreground truncate">{type.description || formatMessage({ id: 'approvals.list.noDescription', defaultMessage: 'No description' })}</p></div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">{formatMessage({ id: 'approvals.list.tabs.all', defaultMessage: 'All' })}</TabsTrigger>
            <TabsTrigger value="pending">{formatMessage({ id: 'approvals.list.tabs.pending', defaultMessage: 'Pending' })}</TabsTrigger>
            <TabsTrigger value="approved">{formatMessage({ id: 'approvals.list.tabs.approved', defaultMessage: 'Approved' })}</TabsTrigger>
            <TabsTrigger value="rejected">{formatMessage({ id: 'approvals.list.tabs.rejected', defaultMessage: 'Rejected' })}</TabsTrigger>
          </TabsList>
          <TabsContent value={activeTab} className="mt-0">
            {filteredRequests.length > 0 ? (
              <div className="space-y-3">
                {filteredRequests.map((req) => (
                  <Card key={req.id} className="hover:border-primary/50 cursor-pointer" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/${req.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1"><h3 className="font-semibold text-sm truncate">{req.title}</h3><PriorityBadge priority={req.priority} /></div>
                          {req.requestType && <div className="flex items-center gap-1.5 mb-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: req.requestType.color }} /><span className="text-xs text-muted-foreground">{req.requestType.name}</span></div>}
                          <p className="text-xs text-muted-foreground line-clamp-2">{req.description || formatMessage({ id: 'approvals.list.noDescription', defaultMessage: 'No description' })}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{formatMessage({ id: 'approvals.list.createdAgo', defaultMessage: 'Created {time}' }, { time: formatDistanceToNow(new Date(req.createdAt), { addSuffix: true }) })}</span>
                            {req.approvers && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{req.approvers.length}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2"><StatusBadge status={req.status} /><ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="flex flex-col items-center justify-center py-12"><ClipboardCheck className="w-12 h-12 text-muted-foreground/50 mb-4" /><h3 className="font-semibold mb-1">{formatMessage({ id: 'approvals.list.noRequests', defaultMessage: 'No requests found' })}</h3><p className="text-sm text-muted-foreground mb-4">{activeTab === 'all' ? formatMessage({ id: 'approvals.list.noRequestsAll', defaultMessage: 'Create your first request' }) : formatMessage({ id: 'approvals.list.noRequestsFiltered', defaultMessage: 'No {status} requests' }, { status: activeTab })}</p>{activeTab === 'all' && <Button onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals/new`)}><Plus className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.list.createRequest', defaultMessage: 'Create Request' })}</Button>}</CardContent></Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}

// Dynamic custom field for new request
interface DynamicField {
  id: string;
  name: string;
  value: string;
  type: 'text' | 'number' | 'date' | 'textarea';
}

// New Request Page
function NewRequestPage() {
  const { formatMessage } = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members } = useWorkspace();
  const preselectedTypeId = searchParams.get('typeId');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [requestTypes, setRequestTypes] = useState<RequestType[]>([]);
  const [selectedType, setSelectedType] = useState<RequestType | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>(RequestPriority.NORMAL);
  const [dueDate, setDueDate] = useState('');
  const [customFields, setCustomFields] = useState<Record<string, any>>({});
  const [dynamicFields, setDynamicFields] = useState<DynamicField[]>([]);
  const [attachments, setAttachments] = useState<{ id: string; name: string; url: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedApprovers, setSelectedApprovers] = useState<string[]>([]);

  // Get owners and admins as potential default approvers (excluding current user)
  const ownersAndAdmins = members.filter(
    m => (m.role === 'owner' || m.role === 'admin') && m.user_id !== user?.id
  );

  // All members except current user can be approvers
  const availableApprovers = members.filter(m => m.user_id !== user?.id);

  useEffect(() => { if (workspaceId) loadTypes(); }, [workspaceId]);
  useEffect(() => {
    if (preselectedTypeId && requestTypes.length > 0) {
      const type = requestTypes.find(t => t.id === preselectedTypeId);
      if (type) { setSelectedType(type); initFields(type); }
    }
  }, [preselectedTypeId, requestTypes]);

  const loadTypes = async () => {
    try {
      setLoading(true);
      const types = await approvalsApi.getRequestTypes(workspaceId!);
      setRequestTypes(types);
    } catch (e) { toast.error(formatMessage({ id: 'approvals.types.toast.loadFailed', defaultMessage: 'Failed to load types' })); }
    finally { setLoading(false); }
  };

  const initFields = (type: RequestType) => {
    const fields: Record<string, any> = {};
    type.fieldsConfig?.forEach(f => { fields[f.id] = f.defaultValue || ''; });
    setCustomFields(fields);
    setDynamicFields([]);
    setAttachments([]);
    // Set default approvers: use request type defaults, or fall back to owners/admins
    if (type.defaultApprovers && type.defaultApprovers.length > 0) {
      setSelectedApprovers(type.defaultApprovers);
    } else {
      // Default to owners and admins
      setSelectedApprovers(ownersAndAdmins.map(m => m.user_id));
    }
  };

  // Dynamic field management
  const addDynamicField = () => {
    const newField: DynamicField = {
      id: `dynamic_${Date.now()}`,
      name: '',
      value: '',
      type: 'text',
    };
    setDynamicFields([...dynamicFields, newField]);
  };

  const updateDynamicField = (id: string, updates: Partial<DynamicField>) => {
    setDynamicFields(dynamicFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeDynamicField = (id: string) => {
    setDynamicFields(dynamicFields.filter(f => f.id !== id));
  };

  // File attachment handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !workspaceId) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await storageApi.uploadFile(file, workspaceId);
        setAttachments(prev => [...prev, {
          id: result.id,
          name: result.name,
          url: result.url,
          size: parseInt(result.size) || 0,
        }]);
      }
      toast.success(formatMessage({ id: 'approvals.new.attachments.filesUploaded', defaultMessage: '{count} file(s) uploaded' }, { count: files.length }));
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(formatMessage({ id: 'common.uploadFailed', defaultMessage: 'Failed to upload file' }));
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(attachments.filter(a => a.id !== id));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId || !selectedType || !title.trim()) { toast.error(formatMessage({ id: 'approvals.new.fillRequired', defaultMessage: 'Please fill required fields' })); return; }

    // Merge predefined custom fields with dynamic fields
    const allData = { ...customFields };
    dynamicFields.forEach(f => {
      if (f.name.trim() && f.value.trim()) {
        allData[f.name.trim()] = f.value.trim();
      }
    });

    // Ensure at least one approver is selected
    const approverIds = selectedApprovers.length > 0
      ? selectedApprovers
      : ownersAndAdmins.map(m => m.user_id);

    if (approverIds.length === 0) {
      toast.error(formatMessage({ id: 'approvals.new.approvers.noApprovers', defaultMessage: 'No approvers available. Please contact workspace admin.' }));
      return;
    }

    try {
      setSubmitting(true);
      await approvalsApi.createRequest(workspaceId, {
        requestTypeId: selectedType.id,
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        data: allData,
        attachments: attachments.length > 0 ? attachments.map(a => a.url) : undefined,
        approverIds,
      });
      toast.success(formatMessage({ id: 'approvals.new.submitted', defaultMessage: 'Request submitted' }));
      navigate(`/workspaces/${workspaceId}/more/approvals`);
    } catch (e) { toast.error(formatMessage({ id: 'approvals.new.submitFailed', defaultMessage: 'Failed to submit' })); }
    finally { setSubmitting(false); }
  };

  const renderField = (field: CustomFieldConfig) => {
    const value = customFields[field.id] || '';
    const onChange = (v: any) => setCustomFields(prev => ({ ...prev, [field.id]: v }));

    switch (field.type) {
      case FieldType.TEXTAREA: return <Textarea value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={3} />;
      case FieldType.NUMBER: return <Input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
      case FieldType.DATE: return <Input type="date" value={value} onChange={e => onChange(e.target.value)} />;
      case FieldType.SELECT: return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select'} /></SelectTrigger>
          <SelectContent>{field.options?.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      );
      case FieldType.CURRENCY: return <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span><Input type="number" step="0.01" value={value} onChange={e => onChange(e.target.value)} className="pl-7" /></div>;
      default: return <Input value={value} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} />;
    }
  };

  const renderDynamicFieldInput = (field: DynamicField) => {
    const placeholder = formatMessage({ id: 'approvals.new.dynamicField.placeholder', defaultMessage: 'Enter value' });
    switch (field.type) {
      case 'textarea': return <Textarea value={field.value} onChange={e => updateDynamicField(field.id, { value: e.target.value })} placeholder={placeholder} rows={2} className="text-sm" />;
      case 'number': return <Input type="number" value={field.value} onChange={e => updateDynamicField(field.id, { value: e.target.value })} placeholder={placeholder} className="h-9 text-sm" />;
      case 'date': return <Input type="date" value={field.value} onChange={e => updateDynamicField(field.id, { value: e.target.value })} className="h-9 text-sm" />;
      default: return <Input value={field.value} onChange={e => updateDynamicField(field.id, { value: e.target.value })} placeholder={placeholder} className="h-9 text-sm" />;
    }
  };

  if (loading) return <div className="p-6"><Skeleton className="w-48 h-6 mb-6" /><div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div></div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals`)}><ArrowLeft className="w-4 h-4" /></Button>
          <h1 className="text-2xl font-bold">{formatMessage({ id: 'approvals.new.title', defaultMessage: 'New Request' })}</h1>
        </div>

        {!selectedType ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">{formatMessage({ id: 'approvals.new.selectType', defaultMessage: 'Select Request Type' })}</h2>
            {requestTypes.filter(t => t.isActive).length > 0 ? (
              <div className="grid gap-3">
                {requestTypes.filter(t => t.isActive).map(type => (
                  <Card key={type.id} className="hover:border-primary/50 cursor-pointer" onClick={() => { setSelectedType(type); initFields(type); }}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${type.color}20` }}><FileText className="w-6 h-6" style={{ color: type.color }} /></div>
                      <div className="flex-1"><h3 className="font-semibold">{type.name}</h3><p className="text-sm text-muted-foreground">{type.description || formatMessage({ id: 'approvals.list.noDescription', defaultMessage: 'No description' })}</p></div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="font-semibold mb-1">{formatMessage({ id: 'approvals.new.noTypes', defaultMessage: 'No request types' })}</h3><p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.new.noTypesDescription', defaultMessage: 'Ask an admin to create request types' })}</p></CardContent></Card>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card className="mb-6"><CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${selectedType.color}20` }}><FileText className="w-5 h-5" style={{ color: selectedType.color }} /></div>
              <div className="flex-1"><h3 className="font-semibold">{selectedType.name}</h3></div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedType(null)}>{formatMessage({ id: 'approvals.new.change', defaultMessage: 'Change' })}</Button>
            </CardContent></Card>

            <div className="space-y-4">
              <div><Label>{formatMessage({ id: 'approvals.new.fields.title', defaultMessage: 'Title' })} *</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder={formatMessage({ id: 'approvals.new.fields.titlePlaceholder', defaultMessage: 'Enter title' })} required /></div>
              <div><Label>{formatMessage({ id: 'approvals.new.fields.description', defaultMessage: 'Description' })}</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={formatMessage({ id: 'approvals.new.fields.descriptionPlaceholder', defaultMessage: 'Details...' })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>{formatMessage({ id: 'approvals.new.fields.priority', defaultMessage: 'Priority' })}</Label>
                  <Select value={priority} onValueChange={v => setPriority(v as RequestPriority)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={RequestPriority.LOW}>{formatMessage({ id: 'approvals.priority.low', defaultMessage: 'Low' })}</SelectItem>
                      <SelectItem value={RequestPriority.NORMAL}>{formatMessage({ id: 'approvals.priority.normal', defaultMessage: 'Normal' })}</SelectItem>
                      <SelectItem value={RequestPriority.HIGH}>{formatMessage({ id: 'approvals.priority.high', defaultMessage: 'High' })}</SelectItem>
                      <SelectItem value={RequestPriority.URGENT}>{formatMessage({ id: 'approvals.priority.urgent', defaultMessage: 'Urgent' })}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>{formatMessage({ id: 'approvals.new.fields.dueDate', defaultMessage: 'Due Date' })}</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
              </div>

              {/* Approvers Selection */}
              <Separator className="my-4" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      {formatMessage({ id: 'approvals.new.approvers.title', defaultMessage: 'Approvers' })} *
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.new.approvers.subtitle', defaultMessage: 'Select who needs to approve this request' })}</p>
                  </div>
                </div>
                {availableApprovers.length > 0 ? (
                  <div className="space-y-2">
                    {availableApprovers.map((member) => {
                      const isSelected = selectedApprovers.includes(member.user_id);
                      const isOwnerOrAdmin = member.role === 'owner' || member.role === 'admin';
                      return (
                        <div
                          key={member.user_id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                            isSelected ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                          )}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedApprovers(selectedApprovers.filter(id => id !== member.user_id));
                            } else {
                              setSelectedApprovers([...selectedApprovers, member.user_id]);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded"
                          />
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={member.avatar_url} />
                            <AvatarFallback>{member.name?.[0] || member.email?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name || member.email}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                          {isOwnerOrAdmin && (
                            <Badge variant="secondary" className="text-xs capitalize">{member.role}</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.new.approvers.noAvailable', defaultMessage: 'No other workspace members available' })}</p>
                    </CardContent>
                  </Card>
                )}
                {selectedApprovers.length === 0 && availableApprovers.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">{formatMessage({ id: 'approvals.new.approvers.selectAtLeastOne', defaultMessage: 'Please select at least one approver' })}</p>
                )}
              </div>

              {/* Predefined Custom Fields from Request Type */}
              {selectedType.fieldsConfig && selectedType.fieldsConfig.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-semibold mb-3">{formatMessage({ id: 'approvals.new.requiredInfo', defaultMessage: 'Required Information' })}</h3>
                  {selectedType.fieldsConfig.sort((a,b) => (a.order||0) - (b.order||0)).map(f => (
                    <div key={f.id} className="space-y-1">
                      <Label>{f.label}{f.required && ' *'}</Label>
                      {renderField(f)}
                    </div>
                  ))}
                </>
              )}

              {/* Dynamic Custom Fields */}
              <Separator className="my-4" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{formatMessage({ id: 'approvals.new.additionalFields.title', defaultMessage: 'Additional Fields' })}</h3>
                    <p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.new.additionalFields.subtitle', defaultMessage: 'Add any extra information for your request' })}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addDynamicField}>
                    <Plus className="w-3 h-3 mr-1" />{formatMessage({ id: 'approvals.new.additionalFields.addField', defaultMessage: 'Add Field' })}
                  </Button>
                </div>

                {dynamicFields.length > 0 ? (
                  <div className="space-y-3">
                    {dynamicFields.map((field) => (
                      <Card key={field.id} className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">{formatMessage({ id: 'approvals.new.additionalFields.fieldName', defaultMessage: 'Field Name' })}</Label>
                                <Input
                                  value={field.name}
                                  onChange={e => updateDynamicField(field.id, { name: e.target.value })}
                                  placeholder={formatMessage({ id: 'approvals.new.additionalFields.fieldNamePlaceholder', defaultMessage: 'e.g., Item Name' })}
                                  className="h-9 text-sm"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">{formatMessage({ id: 'approvals.new.additionalFields.type', defaultMessage: 'Type' })}</Label>
                                <Select value={field.type} onValueChange={v => updateDynamicField(field.id, { type: v as DynamicField['type'] })}>
                                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">{formatMessage({ id: 'approvals.new.additionalFields.types.text', defaultMessage: 'Text' })}</SelectItem>
                                    <SelectItem value="number">{formatMessage({ id: 'approvals.new.additionalFields.types.number', defaultMessage: 'Number' })}</SelectItem>
                                    <SelectItem value="date">{formatMessage({ id: 'approvals.new.additionalFields.types.date', defaultMessage: 'Date' })}</SelectItem>
                                    <SelectItem value="textarea">{formatMessage({ id: 'approvals.new.additionalFields.types.textarea', defaultMessage: 'Long Text' })}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs">{formatMessage({ id: 'approvals.new.additionalFields.value', defaultMessage: 'Value' })}</Label>
                              {renderDynamicFieldInput(field)}
                            </div>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive mt-5" onClick={() => removeDynamicField(field.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.new.additionalFields.noFields', defaultMessage: 'No additional fields' })}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatMessage({ id: 'approvals.new.additionalFields.noFieldsDescription', defaultMessage: 'Click "Add Field" to include extra information' })}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Attachments Section */}
              <Separator className="my-4" />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold flex items-center gap-2">
                      <Paperclip className="w-4 h-4" />
                      {formatMessage({ id: 'approvals.new.attachments.title', defaultMessage: 'Attachments' })}
                    </h3>
                    <p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.new.attachments.subtitle', defaultMessage: 'Attach documents, images, or other files' })}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      accept="*/*"
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploading}>
                      {uploading ? (
                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" />{formatMessage({ id: 'approvals.new.attachments.uploading', defaultMessage: 'Uploading...' })}</>
                      ) : (
                        <><Upload className="w-3 h-3 mr-1" />{formatMessage({ id: 'approvals.new.attachments.uploadFile', defaultMessage: 'Upload File' })}</>
                      )}
                    </Button>
                  </div>
                </div>

                {attachments.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <Card key={attachment.id} className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                            <File className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{attachment.name}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeAttachment(attachment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center">
                      <Paperclip className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.new.attachments.noFiles', defaultMessage: 'No files attached' })}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatMessage({ id: 'approvals.new.attachments.noFilesDescription', defaultMessage: 'Click "Upload File" to add attachments' })}</p>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals`)}>{formatMessage({ id: 'approvals.new.cancel', defaultMessage: 'Cancel' })}</Button>
                <Button type="submit" disabled={submitting}>{submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.new.submit', defaultMessage: 'Submit Request' })}</Button>
              </div>
            </div>
          </form>
        )}
      </div>
    </ScrollArea>
  );
}

// Request Detail Page
function RequestDetailPage() {
  const { formatMessage } = useIntl();
  const { workspaceId, requestId } = useParams<{ workspaceId: string; requestId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { members } = useWorkspace();
  const { on, off, isConnected } = useWebSocket();

  // Check if current user is owner or admin
  const isOwnerOrAdmin = useMemo(() => {
    const currentUserMembership = members.find(m => m.user_id === user?.id);
    return currentUserMembership?.role === 'owner' || currentUserMembership?.role === 'admin';
  }, [members, user?.id]);

  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState<ApprovalRequest | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { if (workspaceId && requestId) loadRequest(); }, [workspaceId, requestId]);

  // WebSocket listeners for real-time updates
  useEffect(() => {
    if (!isConnected || !requestId) return;

    // Handle status update events
    const handleStatusUpdate = (data: any) => {
      console.log('[WebSocket] Received approval:status_updated', data);
      if (data.requestId === requestId) {
        // Reload the full request to get updated data
        loadRequest();
        const statusMessage = data.status === 'approved' ? formatMessage({ id: 'approvals.status.approved', defaultMessage: 'approved' })
          : data.status === 'rejected' ? formatMessage({ id: 'approvals.status.rejected', defaultMessage: 'rejected' })
          : data.status === 'cancelled' ? formatMessage({ id: 'approvals.status.cancelled', defaultMessage: 'cancelled' })
          : data.status;
        toast.info(formatMessage({ id: 'approvals.detail.websocket.statusUpdated', defaultMessage: 'Request {status}{reason}' }, { status: statusMessage, reason: data.reason ? `: ${data.reason}` : '' }));
      }
    };

    // Handle new comment events
    const handleCommentAdded = (data: any) => {
      console.log('[WebSocket] Received approval:comment_added', data);
      if (data.requestId === requestId) {
        // Add the new comment to the list if not already present
        setComments(prevComments => {
          const exists = prevComments.some(c => c.id === data.comment.id);
          if (exists) return prevComments;
          return [...prevComments, {
            id: data.comment.id,
            requestId: data.requestId,
            userId: data.comment.userId,
            content: data.comment.content,
            isInternal: data.comment.isInternal,
            createdAt: data.comment.createdAt,
          } as Comment];
        });
      }
    };

    // Subscribe to events
    on('approval:status_updated', handleStatusUpdate);
    on('approval:comment_added', handleCommentAdded);

    // Cleanup
    return () => {
      off('approval:status_updated', handleStatusUpdate);
      off('approval:comment_added', handleCommentAdded);
    };
  }, [on, off, isConnected, requestId]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const [req, comm] = await Promise.all([
        approvalsApi.getRequest(workspaceId!, requestId!),
        approvalsApi.getComments(workspaceId!, requestId!),
      ]);
      setRequest(req);
      setComments(comm);
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.loadFailed', defaultMessage: 'Failed to load request' })); }
    finally { setLoading(false); }
  };

  const isExplicitApprover = request?.approvers?.some(a => a.approverId === user?.id && a.status === ApproverStatus.PENDING);
  const isRequester = request?.requesterId === user?.id;
  const canCancel = isRequester && request?.status === RequestStatus.PENDING;
  // Owners/admins can approve any pending request (except their own), or if they're explicitly an approver
  const canApproveOrReject = (isOwnerOrAdmin && !isRequester) || isExplicitApprover;
  // Owners/admins can delete completed requests (approved, rejected, cancelled)
  const canDelete = isOwnerOrAdmin && request?.status !== RequestStatus.PENDING;

  const handleApprove = async () => {
    try {
      setActionLoading(true);
      await approvalsApi.approveRequest(workspaceId!, requestId!, { comments: approveComment || undefined });
      toast.success(formatMessage({ id: 'approvals.detail.toast.approved', defaultMessage: 'Request approved' }));
      setShowApproveDialog(false);
      loadRequest();
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.approveFailed', defaultMessage: 'Failed to approve' })); }
    finally { setActionLoading(false); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await approvalsApi.rejectRequest(workspaceId!, requestId!, { reason: rejectReason.trim() });
      toast.success(formatMessage({ id: 'approvals.detail.toast.rejected', defaultMessage: 'Request rejected' }));
      setShowRejectDialog(false);
      loadRequest();
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.rejectFailed', defaultMessage: 'Failed to reject' })); }
    finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    try {
      setActionLoading(true);
      await approvalsApi.cancelRequest(workspaceId!, requestId!);
      toast.success(formatMessage({ id: 'approvals.detail.toast.cancelled', defaultMessage: 'Request cancelled' }));
      setShowCancelDialog(false);
      loadRequest();
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.cancelFailed', defaultMessage: 'Failed to cancel' })); }
    finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    try {
      setActionLoading(true);
      await approvalsApi.deleteRequest(workspaceId!, requestId!);
      toast.success(formatMessage({ id: 'approvals.detail.toast.deleted', defaultMessage: 'Request deleted' }));
      setShowDeleteDialog(false);
      navigate(`/workspaces/${workspaceId}/more/approvals`);
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.deleteFailed', defaultMessage: 'Failed to delete request' })); }
    finally { setActionLoading(false); }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      setSubmittingComment(true);
      await approvalsApi.addComment(workspaceId!, requestId!, { content: newComment.trim() });
      setNewComment('');
      const comm = await approvalsApi.getComments(workspaceId!, requestId!);
      setComments(comm);
    } catch (e) { toast.error(formatMessage({ id: 'approvals.detail.toast.commentFailed', defaultMessage: 'Failed to add comment' })); }
    finally { setSubmittingComment(false); }
  };

  if (loading) return <div className="p-6"><Skeleton className="w-48 h-6 mb-6" /><Skeleton className="h-64 mb-4" /><Skeleton className="h-48" /></div>;
  if (!request) return <div className="p-6"><Card><CardContent className="py-12 text-center"><AlertCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="font-semibold mb-2">{formatMessage({ id: 'approvals.detail.notFound', defaultMessage: 'Request not found' })}</h3><Button onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals`)}>{formatMessage({ id: 'approvals.detail.back', defaultMessage: 'Back' })}</Button></CardContent></Card></div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals`)}><ArrowLeft className="w-4 h-4" /></Button>
            <div>
              <h1 className="text-2xl font-bold">{request.title}</h1>
              <div className="flex items-center gap-2 mt-1"><StatusBadge status={request.status} /><PriorityBadge priority={request.priority} /></div>
            </div>
          </div>
          <div className="flex gap-2">
            {canApproveOrReject && request.status === RequestStatus.PENDING && (
              <>
                <Button variant="outline" onClick={() => setShowRejectDialog(true)}><XCircle className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.detail.reject', defaultMessage: 'Reject' })}</Button>
                <Button onClick={() => setShowApproveDialog(true)}><CheckCircle className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.detail.approve', defaultMessage: 'Approve' })}</Button>
              </>
            )}
            {canCancel && <Button variant="outline" onClick={() => setShowCancelDialog(true)}><Ban className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.detail.cancel', defaultMessage: 'Cancel' })}</Button>}
            {canDelete && <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => setShowDeleteDialog(true)}><Trash2 className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.detail.delete', defaultMessage: 'Delete' })}</Button>}
          </div>
        </div>

        {/* Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              {request.requestType && <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${request.requestType.color}20` }}><FileText className="w-5 h-5" style={{ color: request.requestType.color }} /></div>}
              <div><CardTitle>{request.requestType?.name}</CardTitle><CardDescription>By {request.requesterName} • {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}</CardDescription></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {request.description && <div><Label className="text-muted-foreground">{formatMessage({ id: 'approvals.detail.description', defaultMessage: 'Description' })}</Label><p className="mt-1">{request.description}</p></div>}
            {request.dueDate && <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{formatMessage({ id: 'approvals.detail.due', defaultMessage: 'Due' })}: {format(new Date(request.dueDate), 'PPP')}</span></div>}
            {request.data && Object.keys(request.data).length > 0 && (
              <><Separator />{Object.entries(request.data).map(([k, v]) => <div key={k}><Label className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</Label><p className="mt-1">{String(v)}</p></div>)}</>
            )}
            {request.status === RequestStatus.REJECTED && request.rejectionReason && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg"><Label className="text-red-600">{formatMessage({ id: 'approvals.detail.rejectionReason', defaultMessage: 'Rejection Reason' })}</Label><p className="mt-1 text-red-700 dark:text-red-300">{request.rejectionReason}</p></div>
            )}
            {/* Attachments */}
            {request.attachments && request.attachments.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground flex items-center gap-2 mb-2">
                    <Paperclip className="w-4 h-4" />
                    {formatMessage({ id: 'approvals.detail.attachmentsCount', defaultMessage: 'Attachments ({count})' }, { count: request.attachments.length })}
                  </Label>
                  <div className="space-y-2">
                    {request.attachments.map((url, index) => {
                      const fileName = url.split('/').pop() || formatMessage({ id: 'approvals.detail.attachmentItem', defaultMessage: 'Attachment {index}' }, { index: index + 1 });
                      return (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                            <File className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="text-sm text-primary hover:underline truncate flex-1">{fileName}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Approvers */}
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Users className="w-5 h-5" />{formatMessage({ id: 'approvals.detail.approvers', defaultMessage: 'Approvers' })}</CardTitle></CardHeader>
          <CardContent>
            {request.approvers?.length ? (
              <div className="space-y-3">
                {request.approvers.map(a => (
                  <div key={a.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8"><AvatarImage src={a.approverAvatar} /><AvatarFallback>{a.approverName?.[0] || 'A'}</AvatarFallback></Avatar>
                      <div><p className="font-medium text-sm">{a.approverName}</p><p className="text-xs text-muted-foreground">{a.approverEmail}</p></div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ApproverStatusBadge status={a.status} />
                      {a.respondedAt && <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.respondedAt), { addSuffix: true })}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.detail.noApprovers', defaultMessage: 'No approvers' })}</p>}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card>
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5" />{formatMessage({ id: 'approvals.detail.comments', defaultMessage: 'Comments' })} ({comments.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              {comments.length ? comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="w-8 h-8"><AvatarImage src={c.userAvatar} /><AvatarFallback>{c.userName?.[0]}</AvatarFallback></Avatar>
                  <div><div className="flex items-center gap-2"><span className="font-medium text-sm">{c.userName}</span><span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</span></div><p className="text-sm mt-1">{c.content}</p></div>
                </div>
              )) : <p className="text-sm text-muted-foreground text-center py-4">{formatMessage({ id: 'approvals.detail.noComments', defaultMessage: 'No comments' })}</p>}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <Input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder={formatMessage({ id: 'approvals.detail.addCommentPlaceholder', defaultMessage: 'Add comment...' })} disabled={submittingComment} />
              <Button type="submit" size="icon" disabled={!newComment.trim() || submittingComment}>{submittingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
            </form>
          </CardContent>
        </Card>

        {/* Dialogs */}
        <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{formatMessage({ id: 'approvals.detail.dialogs.approve.title', defaultMessage: 'Approve Request' })}</DialogTitle><DialogDescription>{formatMessage({ id: 'approvals.detail.dialogs.approve.description', defaultMessage: 'Confirm approval' })}</DialogDescription></DialogHeader>
            <div className="py-4"><Label>{formatMessage({ id: 'approvals.detail.dialogs.approve.commentLabel', defaultMessage: 'Comment (Optional)' })}</Label><Textarea value={approveComment} onChange={e => setApproveComment(e.target.value)} rows={3} /></div>
            <DialogFooter><Button variant="outline" onClick={() => setShowApproveDialog(false)}>{formatMessage({ id: 'approvals.detail.dialogs.approve.cancel', defaultMessage: 'Cancel' })}</Button><Button onClick={handleApprove} disabled={actionLoading}>{actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.detail.dialogs.approve.confirm', defaultMessage: 'Approve' })}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{formatMessage({ id: 'approvals.detail.dialogs.reject.title', defaultMessage: 'Reject Request' })}</DialogTitle><DialogDescription>{formatMessage({ id: 'approvals.detail.dialogs.reject.description', defaultMessage: 'Provide a reason' })}</DialogDescription></DialogHeader>
            <div className="py-4"><Label>{formatMessage({ id: 'approvals.detail.dialogs.reject.reasonLabel', defaultMessage: 'Reason' })} *</Label><Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} required /></div>
            <DialogFooter><Button variant="outline" onClick={() => setShowRejectDialog(false)}>{formatMessage({ id: 'approvals.detail.dialogs.reject.cancel', defaultMessage: 'Cancel' })}</Button><Button variant="destructive" onClick={handleReject} disabled={!rejectReason.trim() || actionLoading}>{actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.detail.dialogs.reject.confirm', defaultMessage: 'Reject' })}</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{formatMessage({ id: 'approvals.detail.dialogs.cancel.title', defaultMessage: 'Cancel Request?' })}</AlertDialogTitle><AlertDialogDescription>{formatMessage({ id: 'approvals.detail.dialogs.cancel.description', defaultMessage: 'This cannot be undone.' })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{formatMessage({ id: 'approvals.detail.dialogs.cancel.no', defaultMessage: 'No' })}</AlertDialogCancel><AlertDialogAction onClick={handleCancel} disabled={actionLoading}>{actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.detail.dialogs.cancel.yes', defaultMessage: 'Yes, cancel' })}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>{formatMessage({ id: 'approvals.detail.dialogs.delete.title', defaultMessage: 'Delete Request?' })}</AlertDialogTitle><AlertDialogDescription>{formatMessage({ id: 'approvals.detail.dialogs.delete.description', defaultMessage: 'This will permanently delete this request and all its comments. This action cannot be undone.' })}</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>{formatMessage({ id: 'approvals.detail.dialogs.delete.no', defaultMessage: 'No' })}</AlertDialogCancel><AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.detail.dialogs.delete.yes', defaultMessage: 'Yes, delete' })}</AlertDialogAction></AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ScrollArea>
  );
}

// Request Types Management
function RequestTypesPage() {
  const { formatMessage } = useIntl();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<RequestType[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [customFields, setCustomFields] = useState<CustomFieldConfig[]>([]);

  useEffect(() => { if (workspaceId) loadTypes(); }, [workspaceId]);

  const loadTypes = async () => {
    try { setLoading(true); setTypes(await approvalsApi.getRequestTypes(workspaceId!)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setName('');
    setDesc('');
    setColor('#3b82f6');
    setCustomFields([]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setCreating(true);
      await approvalsApi.createRequestType(workspaceId!, {
        name: name.trim(),
        description: desc.trim() || undefined,
        color,
        fieldsConfig: customFields.length > 0 ? customFields : undefined,
      });
      toast.success(formatMessage({ id: 'approvals.types.toast.created', defaultMessage: 'Created' }));
      setShowCreate(false);
      resetForm();
      loadTypes();
    } catch (e) { toast.error(formatMessage({ id: 'approvals.types.toast.createFailed', defaultMessage: 'Failed' })); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    try { await approvalsApi.deleteRequestType(workspaceId!, id); toast.success(formatMessage({ id: 'approvals.types.toast.deleted', defaultMessage: 'Deleted' })); loadTypes(); }
    catch (e) { toast.error(formatMessage({ id: 'approvals.types.toast.deleteFailed', defaultMessage: 'Failed' })); }
  };

  const handleToggle = async (type: RequestType) => {
    try { await approvalsApi.updateRequestType(workspaceId!, type.id, { isActive: !type.isActive }); toast.success(type.isActive ? formatMessage({ id: 'approvals.types.toast.deactivated', defaultMessage: 'Deactivated' }) : formatMessage({ id: 'approvals.types.toast.activated', defaultMessage: 'Activated' })); loadTypes(); }
    catch (e) { toast.error(formatMessage({ id: 'approvals.types.toast.updateFailed', defaultMessage: 'Failed' })); }
  };

  // Custom field management
  const addCustomField = () => {
    const newField: CustomFieldConfig = {
      id: `field_${Date.now()}`,
      label: '',
      type: FieldType.TEXT,
      required: false,
      placeholder: '',
      order: customFields.length,
    };
    setCustomFields([...customFields, newField]);
  };

  const updateCustomField = (id: string, updates: Partial<CustomFieldConfig>) => {
    setCustomFields(customFields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeCustomField = (id: string) => {
    setCustomFields(customFields.filter(f => f.id !== id));
  };

  const addFieldOption = (fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    if (!field) return;
    const newOption = { label: '', value: `option_${Date.now()}` };
    updateCustomField(fieldId, { options: [...(field.options || []), newOption] });
  };

  const updateFieldOption = (fieldId: string, optionIndex: number, label: string) => {
    const field = customFields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = [...field.options];
    newOptions[optionIndex] = { ...newOptions[optionIndex], label, value: label.toLowerCase().replace(/\s+/g, '_') };
    updateCustomField(fieldId, { options: newOptions });
  };

  const removeFieldOption = (fieldId: string, optionIndex: number) => {
    const field = customFields.find(f => f.id === fieldId);
    if (!field || !field.options) return;
    const newOptions = field.options.filter((_, i) => i !== optionIndex);
    updateCustomField(fieldId, { options: newOptions });
  };

  const colors = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'];

  const fieldTypeLabels: Record<FieldType, string> = {
    [FieldType.TEXT]: formatMessage({ id: 'approvals.types.create.customFields.types.text', defaultMessage: 'Text' }),
    [FieldType.TEXTAREA]: formatMessage({ id: 'approvals.types.create.customFields.types.textarea', defaultMessage: 'Long Text' }),
    [FieldType.NUMBER]: formatMessage({ id: 'approvals.types.create.customFields.types.number', defaultMessage: 'Number' }),
    [FieldType.DATE]: formatMessage({ id: 'approvals.types.create.customFields.types.date', defaultMessage: 'Date' }),
    [FieldType.DATETIME]: formatMessage({ id: 'approvals.types.create.customFields.types.datetime', defaultMessage: 'Date & Time' }),
    [FieldType.SELECT]: formatMessage({ id: 'approvals.types.create.customFields.types.select', defaultMessage: 'Dropdown' }),
    [FieldType.MULTISELECT]: formatMessage({ id: 'approvals.types.create.customFields.types.multiselect', defaultMessage: 'Multi-Select' }),
    [FieldType.CHECKBOX]: formatMessage({ id: 'approvals.types.create.customFields.types.checkbox', defaultMessage: 'Checkbox' }),
    [FieldType.FILE]: formatMessage({ id: 'approvals.types.create.customFields.types.file', defaultMessage: 'File Upload' }),
    [FieldType.USER]: formatMessage({ id: 'approvals.types.create.customFields.types.user', defaultMessage: 'User' }),
    [FieldType.CURRENCY]: formatMessage({ id: 'approvals.types.create.customFields.types.currency', defaultMessage: 'Currency' }),
  };

  if (loading) return <div className="p-6"><Skeleton className="w-48 h-6 mb-6" /><div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div></div>;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${workspaceId}/more/approvals`)}><ArrowLeft className="w-4 h-4" /></Button>
            <div><h1 className="text-2xl font-bold">{formatMessage({ id: 'approvals.types.title', defaultMessage: 'Request Types' })}</h1><p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.types.subtitle', defaultMessage: 'Create and manage types' })}</p></div>
          </div>
          <Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.types.newType', defaultMessage: 'New Type' })}</Button>
        </div>

        {types.length ? (
          <div className="space-y-3">
            {types.map(t => (
              <Card key={t.id} className={cn(!t.isActive && 'opacity-60')}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}20` }}><FileText className="w-5 h-5" style={{ color: t.color }} /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{t.name}</h3>
                        {!t.isActive && <Badge variant="secondary">{formatMessage({ id: 'approvals.types.inactive', defaultMessage: 'Inactive' })}</Badge>}
                        {t.fieldsConfig && t.fieldsConfig.length > 0 && (
                          <Badge variant="outline" className="text-xs">{formatMessage({ id: 'approvals.types.fieldsCount', defaultMessage: '{count} fields' }, { count: t.fieldsConfig.length })}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{t.description || formatMessage({ id: 'approvals.types.noDescription', defaultMessage: 'No description' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleToggle(t)}>{t.isActive ? formatMessage({ id: 'approvals.types.deactivate', defaultMessage: 'Deactivate' }) : formatMessage({ id: 'approvals.types.activate', defaultMessage: 'Activate' })}</Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" /><h3 className="font-semibold mb-2">{formatMessage({ id: 'approvals.types.noTypes', defaultMessage: 'No request types' })}</h3><Button onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" />{formatMessage({ id: 'approvals.types.createType', defaultMessage: 'Create Type' })}</Button></CardContent></Card>
        )}

        <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) resetForm(); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{formatMessage({ id: 'approvals.types.create.title', defaultMessage: 'Create Request Type' })}</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>{formatMessage({ id: 'approvals.types.create.name', defaultMessage: 'Name' })} *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder={formatMessage({ id: 'approvals.types.create.namePlaceholder', defaultMessage: 'e.g., Leave Request' })} required /></div>
                  <div>
                    <Label>{formatMessage({ id: 'approvals.types.create.color', defaultMessage: 'Color' })}</Label>
                    <div className="flex gap-2 mt-2">
                      {colors.map(c => (
                        <button key={c} type="button" className={cn('w-6 h-6 rounded-full', color === c && 'ring-2 ring-offset-2 ring-primary')} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                      ))}
                    </div>
                  </div>
                </div>
                <div><Label>{formatMessage({ id: 'approvals.types.create.description', defaultMessage: 'Description' })}</Label><Textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder={formatMessage({ id: 'approvals.types.create.descriptionPlaceholder', defaultMessage: 'Brief description of this request type' })} /></div>

                <Separator />

                {/* Custom Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <Label className="text-base">{formatMessage({ id: 'approvals.types.create.customFields.title', defaultMessage: 'Custom Fields' })}</Label>
                      <p className="text-xs text-muted-foreground">{formatMessage({ id: 'approvals.types.create.customFields.subtitle', defaultMessage: 'Add fields that users need to fill when submitting this request type' })}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addCustomField}>
                      <Plus className="w-3 h-3 mr-1" />{formatMessage({ id: 'approvals.types.create.customFields.addField', defaultMessage: 'Add Field' })}
                    </Button>
                  </div>

                  {customFields.length > 0 ? (
                    <div className="space-y-3">
                      {customFields.map((field, index) => (
                        <Card key={field.id} className="p-3">
                          <div className="flex items-start gap-2">
                            <div className="pt-2 text-muted-foreground cursor-move"><GripVertical className="w-4 h-4" /></div>
                            <div className="flex-1 space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">{formatMessage({ id: 'approvals.types.create.customFields.fieldLabel', defaultMessage: 'Field Label' })} *</Label>
                                  <Input
                                    value={field.label}
                                    onChange={e => updateCustomField(field.id, { label: e.target.value })}
                                    placeholder={formatMessage({ id: 'approvals.types.create.customFields.fieldLabelPlaceholder', defaultMessage: 'e.g., Start Date' })}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">{formatMessage({ id: 'approvals.types.create.customFields.fieldType', defaultMessage: 'Field Type' })}</Label>
                                  <Select value={field.type} onValueChange={v => updateCustomField(field.id, { type: v as FieldType, options: (v === FieldType.SELECT || v === FieldType.MULTISELECT) ? [] : undefined })}>
                                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {Object.entries(fieldTypeLabels).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <Label className="text-xs">{formatMessage({ id: 'approvals.types.create.customFields.placeholder', defaultMessage: 'Placeholder' })}</Label>
                                  <Input
                                    value={field.placeholder || ''}
                                    onChange={e => updateCustomField(field.id, { placeholder: e.target.value })}
                                    placeholder={formatMessage({ id: 'approvals.types.create.customFields.placeholderPlaceholder', defaultMessage: 'Placeholder text' })}
                                    className="h-8 text-sm"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={field.required || false}
                                      onChange={e => updateCustomField(field.id, { required: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span className="text-sm">{formatMessage({ id: 'approvals.types.create.customFields.required', defaultMessage: 'Required field' })}</span>
                                  </label>
                                </div>
                              </div>

                              {/* Options for SELECT/MULTISELECT */}
                              {(field.type === FieldType.SELECT || field.type === FieldType.MULTISELECT) && (
                                <div>
                                  <Label className="text-xs">{formatMessage({ id: 'approvals.types.create.customFields.options', defaultMessage: 'Options' })}</Label>
                                  <div className="space-y-2 mt-1">
                                    {(field.options || []).map((opt, optIndex) => (
                                      <div key={optIndex} className="flex items-center gap-2">
                                        <Input
                                          value={opt.label}
                                          onChange={e => updateFieldOption(field.id, optIndex, e.target.value)}
                                          placeholder={formatMessage({ id: 'approvals.types.create.customFields.optionPlaceholder', defaultMessage: 'Option {index}' }, { index: optIndex + 1 })}
                                          className="h-7 text-sm flex-1"
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFieldOption(field.id, optIndex)}>
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => addFieldOption(field.id)}>
                                      <Plus className="w-3 h-3 mr-1" />{formatMessage({ id: 'approvals.types.create.customFields.addOption', defaultMessage: 'Add Option' })}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCustomField(field.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">{formatMessage({ id: 'approvals.types.create.customFields.noFields', defaultMessage: 'No custom fields added' })}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatMessage({ id: 'approvals.types.create.customFields.noFieldsDescription', defaultMessage: 'Click "Add Field" to create custom form fields' })}</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setShowCreate(false); resetForm(); }}>{formatMessage({ id: 'approvals.types.create.cancel', defaultMessage: 'Cancel' })}</Button>
                <Button type="submit" disabled={!name.trim() || creating}>{creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{formatMessage({ id: 'approvals.types.create.create', defaultMessage: 'Create' })}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ScrollArea>
  );
}

// Main Export
export function ApprovalsPage() {
  return (
    <Routes>
      <Route path="/" element={<ApprovalsList />} />
      <Route path="/new" element={<NewRequestPage />} />
      <Route path="/types" element={<RequestTypesPage />} />
      <Route path="/:requestId" element={<RequestDetailPage />} />
    </Routes>
  );
}

export default ApprovalsPage;
