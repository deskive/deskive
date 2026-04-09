/**
 * User Management Component
 * Interface for managing user accounts, roles, and permissions
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Edit,
  Trash2,
  Shield,
  Ban,
  CheckCircle,
  XCircle,
  Building2,
  MoreHorizontal,
  UserPlus,
  Download,
  Lock,
  Unlock,
  UserCheck,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Badge } from '../../../components/ui/badge';
import { LoadingSpinner } from '../../../components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '../../../components/ui/avatar';
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
import { useToast } from '../../../hooks/use-toast';
import { adminService } from '@/lib/api/admin-api';
import type { UserProfile, PaginatedResponse } from '@/lib/api/admin-api';
import { formatDistanceToNow } from 'date-fns';

interface UserFilters {
  search: string;
  status: string;
  role: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface UserActionsDialogProps {
  user: UserProfile | null;
  open: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const UserActionsDialog: React.FC<UserActionsDialogProps> = ({ user, open, onClose, onUpdate }) => {
  const [updatedUser, setUpdatedUser] = useState<Partial<UserProfile>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setUpdatedUser({
        name: user.name,
        email: user.email,
        status: user.status,
        role: user.role,
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await adminService.updateUser(user.id, updatedUser);
      toast({
        title: 'Success',
        description: 'User updated successfully',
      });
      onUpdate();
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user information and permissions
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={updatedUser.name || ''}
              onChange={(e) => setUpdatedUser({ ...updatedUser, name: e.target.value })}
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={updatedUser.email || ''}
              onChange={(e) => setUpdatedUser({ ...updatedUser, email: e.target.value })}
              placeholder="Email address"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Status</label>
            <Select
              value={updatedUser.status}
              onValueChange={(value: any) => setUpdatedUser({ ...updatedUser, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="BANNED">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Role</label>
            <Select
              value={updatedUser.role}
              onValueChange={(value: any) => setUpdatedUser({ ...updatedUser, role: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USER">User</SelectItem>
                <SelectItem value="MODERATOR">Moderator</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <LoadingSpinner size="sm" /> : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<PaginatedResponse<UserProfile> | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    status: '',
    role: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchUsers();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters]);

  useEffect(() => {
    fetchUsers();
  }, [currentPage]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers({
        page: currentPage,
        limit: 20,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        filters: {
          ...(filters.status && { status: filters.status }),
          ...(filters.role && { role: filters.role }),
        },
      });
      setUsers(response);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAction = async (userId: string, action: string) => {
    try {
      switch (action) {
        case 'suspend':
          await adminService.updateUser(userId, { status: 'SUSPENDED' });
          toast({ title: 'Success', description: 'User suspended successfully' });
          break;
        case 'activate':
          await adminService.updateUser(userId, { status: 'ACTIVE' });
          toast({ title: 'Success', description: 'User activated successfully' });
          break;
        case 'ban':
          await adminService.updateUser(userId, { status: 'BANNED' });
          toast({ title: 'Success', description: 'User banned successfully' });
          break;
      }
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await adminService.deleteUser(userId);
      toast({
        title: 'Success',
        description: 'User deleted successfully',
      });
      fetchUsers();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true);
      const blob = await adminService.exportUsers(format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-export.${format}`;
      link.click();
      URL.revokeObjectURL(url);
      toast({
        title: 'Success',
        description: 'Export started successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export users',
        variant: 'destructive',
      });
    } finally {
      setExporting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'SUSPENDED':
        return <Lock className="h-4 w-4 text-yellow-600" />;
      case 'INACTIVE':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'BANNED':
        return <Ban className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800';
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800';
      case 'BANNED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MODERATOR':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && !users) {
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
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts, roles, and permissions
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
          <Button onClick={() => navigate('/admin/users/create')}>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users?.pagination?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.data.filter(u => u.status === 'ACTIVE').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspended</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.data.filter(u => u.status === 'SUSPENDED').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admins</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users?.data.filter(u => u.role === 'ADMIN').length || 0}
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
                  placeholder="Search users by name or email..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                  <SelectItem value="BANNED">Banned</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filters.role}
                onValueChange={(value) => setFilters({ ...filters, role: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Roles</SelectItem>
                  <SelectItem value="USER">User</SelectItem>
                  <SelectItem value="MODERATOR">Moderator</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
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
                  <SelectItem value="lastLoginAt-desc">Recent Login</SelectItem>
                  <SelectItem value="email-asc">Email A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Manage user accounts and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : users?.data.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No users found</h3>
              <p className="text-muted-foreground">
                {filters.search || filters.status || filters.role
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No users have been created yet.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organizations</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.data.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback>
                            {user.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {user.emailVerified && (
                              <Badge variant="outline" className="text-xs">
                                Verified
                              </Badge>
                            )}
                            {user.twoFactorEnabled && (
                              <Badge variant="outline" className="text-xs">
                                2FA
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        <Badge className={getStatusColor(user.status)}>
                          {user.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {user.organizations?.slice(0, 2).map((org) => (
                          <div key={org.id} className="flex items-center gap-1 text-sm">
                            <Building2 className="h-3 w-3 text-muted-foreground" />
                            <span>{org.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {org.role}
                            </Badge>
                          </div>
                        ))}
                        {(user.organizations?.length || 0) > 2 && (
                          <p className="text-xs text-muted-foreground">
                            +{(user.organizations?.length || 0) - 2} more
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.lastLoginAt ? (
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(user.lastLoginAt), {
                            addSuffix: true,
                          })}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(new Date(user.createdAt), {
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
                              setSelectedUser(user);
                              setShowEditDialog(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit User
                          </DropdownMenuItem>
                          {user.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={() => handleQuickAction(user.id, 'suspend')}
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              Suspend
                            </DropdownMenuItem>
                          )}
                          {user.status === 'SUSPENDED' && (
                            <DropdownMenuItem
                              onClick={() => handleQuickAction(user.id, 'activate')}
                            >
                              <Unlock className="mr-2 h-4 w-4" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          {user.status !== 'BANNED' && (
                            <DropdownMenuItem
                              onClick={() => handleQuickAction(user.id, 'ban')}
                              className="text-red-600"
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Ban User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete User
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete User</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete
                                  the user account "{user.name}" and all associated data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete User
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
      {users && users.pagination && users.pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2 text-sm">
            Page {currentPage} of {users.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === users.pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit User Dialog */}
      <UserActionsDialog
        user={selectedUser}
        open={showEditDialog}
        onClose={() => {
          setShowEditDialog(false);
          setSelectedUser(null);
        }}
        onUpdate={fetchUsers}
      />
    </div>
  );
};

export default UserManagement;