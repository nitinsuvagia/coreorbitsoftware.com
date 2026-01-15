'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Plus,
  Search,
  MoreVertical,
  Building2,
  Users,
  ExternalLink,
  Filter,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  logo?: string | null;
  plan: string;
  status: 'PENDING' | 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'INACTIVE' | 'TERMINATED';
  userCount: number;
  createdAt: string;
  trialEndsAt?: string | null;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(pagination.page));
      params.append('pageSize', String(pagination.pageSize));
      if (debouncedSearch) params.append('search', debouncedSearch);
      if (statusFilter) params.append('status', statusFilter);

      const response = await apiClient.get<Tenant[]>(`/api/v1/platform/tenants?${params.toString()}`);

      if (response.success && response.data) {
        setTenants(response.data);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setError(response.error?.message || 'Failed to fetch tenants');
      }
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Failed to fetch tenants. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'trial':
        return 'warning';
      case 'suspended':
      case 'terminated':
        return 'destructive';
      case 'pending':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const handleStatusAction = async (tenantId: string, action: 'suspend' | 'activate') => {
    try {
      const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';
      const response = await apiClient.patch(`/api/v1/platform/tenants/${tenantId}`, {
        status: newStatus,
      });
      
      if (response.success) {
        fetchTenants();
      } else {
        alert(response.error?.message || 'Failed to update tenant status');
      }
    } catch (err) {
      console.error('Error updating tenant:', err);
      alert('Failed to update tenant status');
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await apiClient.delete(`/api/v1/platform/tenants/${deleteTarget.id}`);
      if (response.success) {
        toast.success('Tenant deleted');
        setDeleteTarget(null);
        fetchTenants();
      } else {
        toast.error(response.error?.message || 'Failed to delete tenant');
      }
    } catch (err) {
      console.error('Error deleting tenant:', err);
      toast.error('Failed to delete tenant');
    } finally {
      setDeleting(false);
    }
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>

        {/* Filters skeleton */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 flex-1 max-w-sm" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Table skeleton */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4"><Skeleton className="h-4 w-24" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-14" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-12" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                  <th className="text-left p-4"><Skeleton className="h-4 w-16" /></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4"><Skeleton className="h-5 w-16 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-8" /></td>
                    <td className="p-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Tenants</h2>
          <p className="text-muted-foreground">
            Manage all registered organizations ({pagination.total} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchTenants} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/tenants/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Tenant
            </Link>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={fetchTenants}>
            Retry
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
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
            <DropdownMenuItem onClick={() => setStatusFilter('ACTIVE')}>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('TRIAL')}>
              Trial
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('PENDING')}>
              Pending
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter('SUSPENDED')}>
              Suspended
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">No tenants found</p>
              <p className="text-sm">Get started by creating your first tenant.</p>
              <Button asChild className="mt-4">
                <Link href="/admin/tenants/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Link>
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-4 font-medium">Organization</th>
                  <th className="text-left p-4 font-medium">Plan</th>
                  <th className="text-left p-4 font-medium">Status</th>
                  <th className="text-left p-4 font-medium">Users</th>
                  <th className="text-left p-4 font-medium">Created</th>
                  <th className="text-left p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-b hover:bg-muted/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {tenant.logo ? (
                          <Avatar className="h-10 w-10 border-2 border-primary/20 shadow-sm">
                            <AvatarImage src={tenant.logo} alt={tenant.name} className="object-cover" />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {tenant.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium border-2 border-primary/20">
                            <Building2 className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tenant.slug}.localhost:3000
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline">{tenant.plan}</Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant={getStatusVariant(tenant.status) as any}>
                        {tenant.status.toLowerCase()}
                      </Badge>
                      {tenant.trialEndsAt && tenant.status === 'TRIAL' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires {formatDate(tenant.trialEndsAt)}
                        </p>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{tenant.userCount}</span>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDate(tenant.createdAt)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <a
                            href={`http://${tenant.slug}.localhost:3000`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/tenants/${tenant.id}`}>
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/tenants/${tenant.id}/edit`}>
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            {tenant.status === 'ACTIVE' || tenant.status === 'TRIAL' ? (
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleStatusAction(tenant.id, 'suspend')}
                              >
                                Suspend
                              </DropdownMenuItem>
                            ) : tenant.status === 'SUSPENDED' ? (
                              <DropdownMenuItem 
                                className="text-green-600"
                                onClick={() => handleStatusAction(tenant.id, 'activate')}
                              >
                                Activate
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteTarget(tenant)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tenant</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the tenant as deleted and revoke access. This action can be reversed by
              an administrator in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <div className="font-medium">{deleteTarget?.name}</div>
            <div className="text-muted-foreground">{deleteTarget?.slug}</div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTenant} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete tenant'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
