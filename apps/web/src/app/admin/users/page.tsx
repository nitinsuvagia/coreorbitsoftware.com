'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneInput } from '@/components/ui/phone-input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate, getInitials } from '@/lib/utils';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Search,
  Plus,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
  Shield,
  Filter,
  Download,
  Mail,
  Ban,
  Key,
  Loader2,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface PlatformAdmin {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: 'SUPER_ADMIN' | 'SUB_ADMIN' | 'ADMIN_USER' | 'BILLING_ADMIN' | 'SUPPORT_AGENT';
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'SUSPENDED';
  lastLoginAt?: string | null;
  createdAt: string;
  avatar?: string | null;
}

interface UserStats {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
  locked: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const roleLabels: Record<PlatformAdmin['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  SUB_ADMIN: 'Sub Admin',
  ADMIN_USER: 'Admin',
  BILLING_ADMIN: 'Billing Admin',
  SUPPORT_AGENT: 'Support Agent',
};

const statusLabels: Record<PlatformAdmin['status'], string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
  PENDING: 'Pending',
  LOCKED: 'Locked',
};

const getRoleBadge = (role: PlatformAdmin['role']) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <Badge className="bg-purple-500 text-white">Super Admin</Badge>;
    case 'SUB_ADMIN':
      return <Badge className="bg-indigo-500 text-white">Sub Admin</Badge>;
    case 'BILLING_ADMIN':
      return <Badge className="bg-blue-500 text-white">Billing</Badge>;
    case 'SUPPORT_AGENT':
      return <Badge variant="secondary">Support</Badge>;
    default:
      return <Badge variant="outline">Admin</Badge>;
  }
};

const getStatusBadge = (status: PlatformAdmin['status']) => {
  switch (status) {
    case 'ACTIVE':
      return <Badge variant="success">Active</Badge>;
    case 'INACTIVE':
      return <Badge variant="secondary">Inactive</Badge>;
    case 'SUSPENDED':
      return <Badge variant="destructive">Suspended</Badge>;
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'LOCKED':
      return <Badge variant="outline">Locked</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const roleOptions: PlatformAdmin['role'][] = [
  'SUPER_ADMIN',
  'SUB_ADMIN',
  'ADMIN_USER',
  'BILLING_ADMIN',
  'SUPPORT_AGENT',
];

const statusOptions: PlatformAdmin['status'][] = [
  'ACTIVE',
  'INACTIVE',
  'SUSPENDED',
  'PENDING',
  'LOCKED',
];

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<PlatformAdmin[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    inactive: 0,
    suspended: 0,
    pending: 0,
    locked: 0,
  });
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [addSaving, setAddSaving] = useState(false);
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'ADMIN_USER' as PlatformAdmin['role'],
    password: '',
    phone: '',
  });

  const [roleTarget, setRoleTarget] = useState<PlatformAdmin | null>(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleSelection, setRoleSelection] = useState<PlatformAdmin['role']>('ADMIN_USER');

  const [emailTarget, setEmailTarget] = useState<PlatformAdmin | null>(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailForm, setEmailForm] = useState({ subject: '', message: '' });

  const [statusTarget, setStatusTarget] = useState<{
    user: PlatformAdmin;
    nextStatus: PlatformAdmin['status'];
  } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlatformAdmin | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('pageSize', String(pagination.pageSize));
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get<PlatformAdmin[]>(
        `/api/v1/platform/admins?${params.toString()}`
      );

      if (response.success && response.data) {
        setUsers(response.data);
        if ((response as any).stats) {
          setStats((response as any).stats);
        }
        if (response.pagination) {
          setPagination(response.pagination as Pagination);
        }
      } else {
        setError(response.error?.message || 'Failed to load platform users');
      }
    } catch (err) {
      console.error('Error loading platform users:', err);
      setError('Failed to load platform users');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, roleFilter, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const visibleUsers = useMemo(() => users, [users]);

  const updateAddForm = (field: string, value: string) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const validateAddForm = (): string | null => {
    if (!addForm.firstName.trim()) return 'First name is required';
    if (!addForm.lastName.trim()) return 'Last name is required';
    if (!addForm.email.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) return 'Invalid email format';
    if (!addForm.password) return 'Password is required';
    if (addForm.password.length < 8) return 'Password must be at least 8 characters';
    return null;
  };

  const handleCreateUser = async () => {
    const validationError = validateAddForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    setAddSaving(true);
    try {
      const response = await apiClient.post('/api/v1/platform/admins', {
        ...addForm,
        email: addForm.email.trim().toLowerCase(),
      });
      if (response.success) {
        toast.success('User created successfully');
        setAddOpen(false);
        setAddForm({
          firstName: '',
          lastName: '',
          email: '',
          role: 'ADMIN_USER',
          password: '',
          phone: '',
        });
        fetchUsers();
      } else {
        toast.error(response.error?.message || 'Failed to create user');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      toast.error('Failed to create user');
    } finally {
      setAddSaving(false);
    }
  };

  const handleRoleChange = async () => {
    if (!roleTarget) return;
    setRoleSaving(true);
    try {
      const response = await apiClient.patch(`/api/v1/platform/admins/${roleTarget.id}`, {
        role: roleSelection,
      });
      if (response.success) {
        toast.success('Role updated');
        setRoleTarget(null);
        fetchUsers();
      } else {
        toast.error(response.error?.message || 'Failed to update role');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Failed to update role');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleResetPassword = async (user: PlatformAdmin) => {
    try {
      const response = await apiClient.post(
        `/api/v1/platform/admins/${user.id}/reset-password`,
        {}
      );
      if (response.success) {
        toast.success('Password reset email triggered');
      } else {
        toast.error(response.error?.message || 'Failed to reset password');
      }
    } catch (err) {
      console.error('Error resetting password:', err);
      toast.error('Failed to reset password');
    }
  };

  const handleSendEmail = async () => {
    if (!emailTarget) return;
    setEmailSending(true);
    try {
      const response = await apiClient.post(`/api/v1/platform/admins/${emailTarget.id}/email`, {
        subject: emailForm.subject,
        message: emailForm.message,
      });
      if (response.success) {
        toast.success('Email request sent');
        setEmailTarget(null);
        setEmailForm({ subject: '', message: '' });
      } else {
        toast.error(response.error?.message || 'Failed to send email');
      }
    } catch (err) {
      console.error('Error sending email:', err);
      toast.error('Failed to send email');
    } finally {
      setEmailSending(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setStatusSaving(true);
    try {
      const response = await apiClient.patch(`/api/v1/platform/admins/${statusTarget.user.id}`, {
        status: statusTarget.nextStatus,
      });
      if (response.success) {
        toast.success('Status updated');
        setStatusTarget(null);
        fetchUsers();
      } else {
        toast.error(response.error?.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const response = await apiClient.delete(`/api/v1/platform/admins/${deleteTarget.id}`);
      if (response.success) {
        toast.success('User deleted successfully');
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toast.error(response.error?.message || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      toast.error('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Users</h2>
          <p className="text-muted-foreground">
            Manage platform administrators and support staff ({pagination.total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="flex items-center justify-between py-4">
            <span className="text-destructive">{error}</span>
            <Button variant="ghost" size="sm" onClick={fetchUsers}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? <Skeleton className="h-4 w-20 mb-2" /> : <p className="text-sm font-medium text-muted-foreground">Total Users</p>}
                {loading ? <Skeleton className="h-8 w-12 mt-2" /> : <h3 className="text-3xl font-bold mt-2">{stats.total}</h3>}
              </div>
              <div className="p-4 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? <Skeleton className="h-4 w-14 mb-2" /> : <p className="text-sm font-medium text-muted-foreground">Active</p>}
                {loading ? <Skeleton className="h-8 w-12 mt-2" /> : <h3 className="text-3xl font-bold mt-2">{stats.active}</h3>}
              </div>
              <div className="p-4 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
                <UserCheck className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? <Skeleton className="h-4 w-16 mb-2" /> : <p className="text-sm font-medium text-muted-foreground">Inactive</p>}
                {loading ? <Skeleton className="h-8 w-12 mt-2" /> : <h3 className="text-3xl font-bold mt-2">{stats.inactive}</h3>}
              </div>
              <div className="p-4 rounded-full bg-gray-500/10 text-gray-600 dark:text-gray-400">
                <UserX className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? <Skeleton className="h-4 w-16 mb-2" /> : <p className="text-sm font-medium text-muted-foreground">Pending</p>}
                {loading ? <Skeleton className="h-8 w-12 mt-2" /> : <h3 className="text-3xl font-bold mt-2">{stats.pending}</h3>}
              </div>
              <div className="p-4 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                <Shield className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                {loading ? <Skeleton className="h-4 w-20 mb-2" /> : <p className="text-sm font-medium text-muted-foreground">Suspended</p>}
                {loading ? <Skeleton className="h-8 w-12 mt-2" /> : <h3 className="text-3xl font-bold mt-2">{stats.suspended}</h3>}
              </div>
              <div className="p-4 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                <Ban className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {roleFilter || 'All Roles'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setRoleFilter('')}>
              All Roles
            </DropdownMenuItem>
            {roleOptions.map((role) => (
              <DropdownMenuItem key={role} onClick={() => setRoleFilter(role)}>
                {roleLabels[role]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              {statusFilter || 'All Statuses'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setStatusFilter('')}>
              All Statuses
            </DropdownMenuItem>
            {statusOptions.map((status) => (
              <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                {statusLabels[status]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button variant="outline" size="icon" title="Export">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          {visibleUsers.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No users found</p>
              <p className="text-sm">Get started by adding your first platform user.</p>
              <Button onClick={() => setAddOpen(true)} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add User
              </Button>
            </div>
          ) : loading ? (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-10" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-20" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-44" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-8 rounded" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">User</th>
                  <th className="text-left p-4 font-medium">Role</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Last Login</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={user.avatar || undefined} />
                          <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.displayName}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">{getRoleBadge(user.role)}</td>
                    <td className="p-4">{getStatusBadge(user.status)}</td>
                    <td className="p-4 text-muted-foreground">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'N/A'}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="p-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setRoleTarget(user);
                              setRoleSelection(user.role);
                            }}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Change Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                            <Key className="mr-2 h-4 w-4" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEmailTarget(user)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.status === 'ACTIVE' ? (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setStatusTarget({ user, nextStatus: 'SUSPENDED' })
                              }
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Suspend User
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() =>
                                setStatusTarget({ user, nextStatus: 'ACTIVE' })
                              }
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Activate User
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setDeleteTarget(user)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Platform User</DialogTitle>
            <DialogDescription>Create a new platform admin account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name <span className="text-destructive">*</span></Label>
                <Input
                  id="firstName"
                  value={addForm.firstName}
                  onChange={(e) => updateAddForm('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name <span className="text-destructive">*</span></Label>
                <Input
                  id="lastName"
                  value={addForm.lastName}
                  onChange={(e) => updateAddForm('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={addForm.email}
                onChange={(e) => updateAddForm('email', e.target.value)}
                placeholder="user@example.com"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={addForm.role}
                  onValueChange={(value) => updateAddForm('role', value)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role} value={role}>
                        {roleLabels[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <PhoneInput
                  value={addForm.phone}
                  onChange={(value) => updateAddForm('phone', value)}
                  defaultCountry="IN"
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                value={addForm.password}
                onChange={(e) => updateAddForm('password', e.target.value)}
                placeholder="Min 8 characters"
              />
              <p className="text-xs text-muted-foreground">Minimum 8 characters required</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={addSaving}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateUser} 
              disabled={addSaving || !addForm.firstName || !addForm.lastName || !addForm.email || addForm.password.length < 8}
            >
              {addSaving ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!roleTarget} onOpenChange={(open) => !open && setRoleTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for {roleTarget?.displayName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="roleSelect">Role</Label>
            <Select value={roleSelection} onValueChange={(value) => setRoleSelection(value as PlatformAdmin['role'])}>
              <SelectTrigger id="roleSelect">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleTarget(null)} disabled={roleSaving}>
              Cancel
            </Button>
            <Button onClick={handleRoleChange} disabled={roleSaving}>
              {roleSaving ? 'Saving...' : 'Update Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!emailTarget} onOpenChange={(open) => !open && setEmailTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Email</DialogTitle>
            <DialogDescription>Send a message to {emailTarget?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={emailForm.subject}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={emailForm.message}
                onChange={(e) => setEmailForm((prev) => ({ ...prev, message: e.target.value }))}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTarget(null)} disabled={emailSending}>
              Cancel
            </Button>
            <Button onClick={handleSendEmail} disabled={emailSending}>
              {emailSending ? 'Sending...' : 'Send Email'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update status</AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget?.nextStatus === 'SUSPENDED'
                ? 'Suspending this user will block access to platform admin tools.'
                : 'Reactivating this user will restore access.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div className="font-medium">{statusTarget?.user.displayName}</div>
            <div className="text-muted-foreground">{statusTarget?.user.email}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={statusSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={statusSaving}>
              {statusSaving ? 'Updating...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div className="font-medium">{deleteTarget?.displayName}</div>
            <div className="text-muted-foreground">{deleteTarget?.email}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={deleteLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
