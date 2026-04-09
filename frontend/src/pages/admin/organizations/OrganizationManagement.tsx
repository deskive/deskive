/**
 * Organization Management Component
 * Interface for managing organizations, subscriptions, and settings
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Search,
  Edit,
  Trash2,
  Users,
  Globe,
  Settings,
  MoreHorizontal,
  Download,
  TrendingUp,
  Database,
  Shield,
  Crown,
  Star,
  Eye,
  Activity,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
import { Progress } from '../../../components/ui/progress';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../../../components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { useToast } from '../../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type { Organization, PaginatedResponse } from '@/lib/api/admin-api';
import { formatDistanceToNow } from 'date-fns';

interface OrganizationFilters {
  search: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  size: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface OrganizationDetailsDialogProps {
  organization: Organization | null;
  open: boolean;
  onClose: () => void;
}

const OrganizationDetailsDialog: React.FC<OrganizationDetailsDialogProps> = ({
  organization,
  open,
  onClose,
}) => {
  if (!organization) return null;

  const storagePercentage = (organization.metrics.storageUsed / organization.metrics.storageLimit) * 100;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={organization.logo} />
              <AvatarFallback>
                {organization.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {organization.name}
          </DialogTitle>
          <DialogDescription>
            Organization details and metrics
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Name:</span>
                    <p className="font-medium">{organization.name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Slug:</span>
                    <p className="font-mono text-sm">{organization.slug}</p>
                  </div>
                  {organization.website && (
                    <div>
                      <span className="text-sm text-muted-foreground">Website:</span>
                      <p className="text-blue-600 hover:underline">
                        <a href={organization.website} target="_blank" rel="noopener noreferrer">
                          {organization.website}
                        </a>
                      </p>
                    </div>
                  )}
                  {organization.description && (
                    <div>
                      <span className="text-sm text-muted-foreground">Description:</span>
                      <p className="text-sm">{organization.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-muted-foreground">Industry:</span>
                    <p>{organization.industry || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Size:</span>
                    <Badge variant="outline">{organization.size}</Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <span className="text-sm text-muted-foreground">Plan:</span>
                    <Badge variant="default" className="ml-2">
                      {organization.subscriptionPlan}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <Badge 
                      variant={organization.subscriptionStatus === 'ACTIVE' ? 'default' : 'destructive'}
                      className="ml-2"
                    >
                      {organization.subscriptionStatus}
                    </Badge>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Created:</span>
                    <p>{formatDistanceToNow(new Date(organization.createdAt), { addSuffix: true })}</p>
                  </div>
                  {organization.updatedAt && (
                    <div>
                      <span className="text-sm text-muted-foreground">Updated:</span>
                      <p>{formatDistanceToNow(new Date(organization.updatedAt), { addSuffix: true })}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Public Signup</span>
                    <Badge variant={organization.settings.allowPublicSignup ? 'default' : 'secondary'}>
                      {organization.settings.allowPublicSignup ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Verification</span>
                    <Badge variant={organization.settings.requireEmailVerification ? 'default' : 'secondary'}>
                      {organization.settings.requireEmailVerification ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Two Factor Auth</span>
                    <Badge variant={organization.settings.enableTwoFactor ? 'default' : 'secondary'}>
                      {organization.settings.enableTwoFactor ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Session Timeout</span>
                    <span className="text-sm">{organization.settings.sessionTimeout} minutes</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Feature Access</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(organization.settings.features).map(([feature, enabled]) => (
                    <div key={feature} className="flex items-center justify-between">
                      <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <Badge variant={enabled ? 'default' : 'secondary'} className="text-xs">
                        {enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="metrics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organization.metrics.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {organization.metrics.activeUsers} active
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organization.metrics.totalWorkspaces}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Projects</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{organization.metrics.totalProjects}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Storage</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {(organization.metrics.storageUsed / 1024 / 1024 / 1024).toFixed(1)}GB
                  </div>
                  <div className="mt-2">
                    <Progress value={storagePercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {storagePercentage.toFixed(1)}% of {(organization.metrics.storageLimit / 1024 / 1024 / 1024).toFixed(0)}GB
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => window.open(`/admin/organizations/${organization.id}/edit`, '_blank')}>
            Edit Organization
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const OrganizationManagement: React.FC = () => {
  const [organizations, setOrganizations] = useState<PaginatedResponse<Organization> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<OrganizationFilters>({
    search: '',
    subscriptionPlan: '',
    subscriptionStatus: '',
    size: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchOrganizations();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    fetchOrganizations();
  }, [currentPage]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await adminService.getOrganizations({
        page: currentPage,
        limit: 20,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filters: {
          ...(filters.subscriptionPlan && { subscriptionPlan: filters.subscriptionPlan }),
          ...(filters.subscriptionStatus && { subscriptionStatus: filters.subscriptionStatus }),
          ...(filters.size && { size: filters.size }),
        },
      });
      setOrganizations(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch organizations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    try {
      await adminService.deleteOrganization(orgId);
      toast({
        title: 'Success',
        description: 'Organization deleted successfully',
      });
      fetchOrganizations();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete organization',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const blob = await adminService.exportOrganizations(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `organizations-export.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Export started successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export organizations',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return <Star className="h-4 w-4" />;
      case 'STARTER':
        return <TrendingUp className="h-4 w-4" />;
      case 'PROFESSIONAL':
        return <Crown className="h-4 w-4" />;
      case 'ENTERPRISE':
        return <Shield className="h-4 w-4" />;
      default:
        return <Star className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'FREE':
        return 'bg-gray-100 text-gray-800';
      case 'STARTER':
        return 'bg-blue-100 text-blue-800';
      case 'PROFESSIONAL':
        return 'bg-purple-100 text-purple-800';
      case 'ENTERPRISE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !organizations) {
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
          <h1 className="text-3xl font-bold tracking-tight">Organization Management</h1>
          <p className="text-muted-foreground">
            Manage organizations, subscriptions, and settings
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exporting}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export Format</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                CSV Format
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Excel Format
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{organizations?.pagination?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations?.data.filter(o => o.subscriptionStatus === 'ACTIVE').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enterprise</CardTitle>
            <Crown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations?.data.filter(o => o.subscriptionPlan === 'ENTERPRISE').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {organizations?.data.reduce((sum, org) => sum + org.metrics.totalUsers, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search organizations..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.subscriptionPlan}
                onValueChange={(value) => setFilters({ ...filters, subscriptionPlan: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Plans</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.subscriptionStatus}
                onValueChange={(value) => setFilters({ ...filters, subscriptionStatus: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.size}
                onValueChange={(value) => setFilters({ ...filters, size: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sizes</SelectItem>
                  <SelectItem value="STARTUP">Startup</SelectItem>
                  <SelectItem value="SMALL">Small</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LARGE">Large</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onValueChange={(value) => {
                  const [sortBy, sortOrder] = value.split('-');
                  setFilters({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt-desc">Newest First</SelectItem>
                  <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="totalUsers-desc">Most Users</SelectItem>
                  <SelectItem value="storageUsed-desc">Most Storage</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>
            Manage organization accounts and subscriptions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : organizations?.data.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No organizations found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.subscriptionPlan || filters.subscriptionStatus || filters.size
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No organizations have been created yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Storage</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations?.data.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={org.logo} />
                          <AvatarFallback>
                            {org.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{org.name}</p>
                          <p className="text-sm text-muted-foreground">@{org.slug}</p>
                          {org.website && (
                            <p className="text-xs text-blue-600 hover:underline">
                              <a href={org.website} target="_blank" rel="noopener noreferrer">
                                {new URL(org.website).hostname}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getPlanIcon(org.subscriptionPlan || 'FREE')}
                        <Badge className={getPlanColor(org.subscriptionPlan || 'FREE')}>
                          {org.subscriptionPlan || 'FREE'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(org.subscriptionStatus || 'ACTIVE')}>
                        {org.subscriptionStatus || 'ACTIVE'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{org.metrics.totalUsers}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {org.metrics.activeUsers} active
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Database className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {(org.metrics.storageUsed / 1024 / 1024 / 1024).toFixed(1)} GB
                          </span>
                        </div>
                        <Progress 
                          value={(org.metrics.storageUsed / org.metrics.storageLimit) * 100} 
                          className="h-1 w-16" 
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(org.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedOrganization(org);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/organizations/${org.id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Organization
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => navigate(`/admin/organizations/${org.id}/settings`)}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Settings
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Organization
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Organization</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete
                                  the organization "{org.name}" and all associated data including
                                  users, workspaces, and projects.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteOrganization(org.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete Organization
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {organizations && organizations.pagination && organizations.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {organizations.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === organizations.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Organization Details Dialog */}
      <OrganizationDetailsDialog
        organization={selectedOrganization}
        open={showDetailsDialog}
        onClose={() => {
          setShowDetailsDialog(false);
          setSelectedOrganization(null);
        }}
      />
    </div>
  );
};

export default OrganizationManagement;