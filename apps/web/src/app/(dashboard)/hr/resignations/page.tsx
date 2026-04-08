'use client';

import { useState } from 'react';
import { useResignations, useResignationStats, useActivateResignation, Resignation, ResignationStatus } from '@/hooks/use-resignation';
import { useEmployees, Employee } from '@/hooks/use-employees';
import { usePermissions } from '@/hooks/use-permissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { getInitials, cn } from '@/lib/utils';
import {
  Search,
  UserMinus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  ArrowRight,
  Plus,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { format, formatDistanceToNow } from 'date-fns';

// Status badge configs
const STATUS_CONFIG: Record<ResignationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  ACTIVATED: { label: 'Activated', variant: 'outline', icon: AlertCircle },
  SUBMITTED: { label: 'Submitted', variant: 'default', icon: FileText },
  UNDER_REVIEW: { label: 'Under Review', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'destructive', icon: CheckCircle2 },
  WITHDRAWN: { label: 'Withdrawn', variant: 'outline', icon: XCircle },
  CANCELLED: { label: 'Cancelled', variant: 'outline', icon: XCircle },
};

type StatusTab = 'all' | 'active' | 'ACTIVATED' | 'SUBMITTED' | 'APPROVED' | 'closed';

export default function ResignationsPage() {
  const { isAdmin, hasAnyRole } = usePermissions();
  const isHR = hasAnyRole('hr_admin', 'hr_manager', 'tenant_admin');

  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<StatusTab>('active');
  const [page, setPage] = useState(1);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [activationNotes, setActivationNotes] = useState('');
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Map tab to filter status
  const statusFilter = statusTab === 'all' ? undefined :
    statusTab === 'active' ? undefined : // special handling below
    statusTab === 'closed' ? undefined :
    statusTab;

  const { data: resignationsData, isLoading } = useResignations({
    search: search || undefined,
    status: statusFilter,
    page,
    limit: 20,
  });

  const { data: stats } = useResignationStats();
  const activateResignation = useActivateResignation();

  // Employees for activation dialog
  const { data: employeesData } = useEmployees({
    search: employeeSearch || undefined,
    excludeStatuses: 'TERMINATED,RESIGNED,RETIRED,NOTICE_PERIOD',
    limit: 50,
    enabled: activateDialogOpen,
  });

  // Filter active resignations on client side
  const resignations = resignationsData?.items?.filter((r) => {
    if (statusTab === 'active') return !['WITHDRAWN', 'CANCELLED'].includes(r.status);
    if (statusTab === 'closed') return ['WITHDRAWN', 'CANCELLED'].includes(r.status);
    return true;
  }) || [];

  const total = resignationsData?.total || 0;
  const totalPages = resignationsData?.totalPages || 1;

  const handleActivate = async () => {
    if (!selectedEmployee) {
      toast.error('Please select an employee');
      return;
    }

    try {
      await activateResignation.mutateAsync({
        employeeId: selectedEmployee,
        activationNotes: activationNotes || undefined,
      });
      toast.success('Resignation activated successfully');
      setActivateDialogOpen(false);
      setSelectedEmployee('');
      setActivationNotes('');
      setEmployeeSearch('');
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to activate resignation');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Resignations</h1>
          <p className="text-muted-foreground">Manage employee resignations and offboarding</p>
        </div>
        {isHR && (
          <Button onClick={() => setActivateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Activate Resignation
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.resignations.active_count}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.resignations.activated_count}</div>
              <p className="text-xs text-muted-foreground">Awaiting Submission</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.resignations.submitted_count}</div>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.resignations.approved_count}</div>
              <p className="text-xs text-muted-foreground">On Notice Period</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.offboardings.in_progress_count}</div>
              <p className="text-xs text-muted-foreground">Offboarding</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{stats.resignations.this_month_count}</div>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={statusTab} onValueChange={(v) => { setStatusTab(v as StatusTab); setPage(1); }}>
          <TabsList>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ACTIVATED">Activated</TabsTrigger>
            <TabsTrigger value="SUBMITTED">Submitted</TabsTrigger>
            <TabsTrigger value="APPROVED">Notice Period</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, code, email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Resignation List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : resignations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserMinus className="h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium text-muted-foreground">No resignations found</p>
            <p className="text-sm text-muted-foreground">
              {statusTab === 'active' ? 'No active resignations at the moment.' : 'Try a different filter or search.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resignations.map((resignation) => (
            <ResignationCard key={resignation.id} resignation={resignation} isHR={isHR} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Activate Resignation Dialog */}
      <Dialog open={activateDialogOpen} onOpenChange={setActivateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Activate Resignation</DialogTitle>
            <DialogDescription>
              Select an employee to activate the resignation process. The employee will then be able to submit their resignation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Search Employee</Label>
              <Input
                placeholder="Search by name..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
              />
            </div>

            {employeesData && (
              <div className="max-h-48 overflow-y-auto rounded-md border">
                {(employeesData as any)?.items?.length === 0 ? (
                  <p className="p-3 text-sm text-muted-foreground">No employees found</p>
                ) : (
                  ((employeesData as any)?.items || []).map((emp: Employee) => (
                    <button
                      key={emp.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
                        selectedEmployee === emp.id && 'bg-primary/10 border-l-2 border-primary'
                      )}
                      onClick={() => setSelectedEmployee(emp.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={emp.avatar || undefined} />
                        <AvatarFallback>{getInitials(`${emp.firstName} ${emp.lastName}`)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.employeeCode} · {emp.designation?.name}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any notes about this resignation activation..."
                value={activationNotes}
                onChange={(e) => setActivationNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActivateDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleActivate}
              disabled={!selectedEmployee || activateResignation.isPending}
            >
              {activateResignation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Activate Resignation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// RESIGNATION CARD COMPONENT
// ============================================================================

function ResignationCard({ resignation, isHR }: { resignation: Resignation; isHR: boolean }) {
  const config = STATUS_CONFIG[resignation.status];
  const Icon = config.icon;

  return (
    <Link href={`/hr/resignations/${resignation.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            {/* Employee Avatar & Info */}
            <Avatar className="h-10 w-10">
              <AvatarImage src={resignation.employee_avatar || undefined} />
              <AvatarFallback>{getInitials(resignation.employee_name || '')}</AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium truncate">{resignation.employee_name}</p>
                <Badge variant={config.variant} className="shrink-0">
                  <Icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {resignation.employee_code} · {resignation.department_name} · {resignation.designation_name}
              </p>
            </div>

            {/* Key Dates */}
            <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
              {resignation.status === 'APPROVED' && resignation.last_working_date && (
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Last Working Day</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(resignation.last_working_date), 'MMM dd, yyyy')}
                  </p>
                </div>
              )}
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {resignation.status === 'ACTIVATED' ? 'Activated' : 'Updated'}
                </p>
                <p>{formatDistanceToNow(new Date(resignation.updated_at), { addSuffix: true })}</p>
              </div>
            </div>

            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
